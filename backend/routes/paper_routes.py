import os
from pathlib import Path
from fastapi import APIRouter, Request, Depends, status
from fastapi.responses import JSONResponse, FileResponse
from backend.config import PAPERS_DIR
from backend.database import get_db_connection
from backend.routes.auth_helpers import login_required, restore_session_from_header

paper_router = APIRouter(prefix="/api/papers", tags=["Question Papers"])

@paper_router.get("")
async def get_papers(
    request: Request,
    regulation: str | None = None,
    semester: str | None = None,
    subject_id: str | None = None,
    academic_year: str | None = None,
    search: str | None = None,
    department: str | None = None,
    current_user: dict = Depends(login_required)
):
    user_role = current_user.get("role")
    user_dept = current_user.get("department")

    # Department filter: students are strictly locked to their own department
    if user_role == "student":
        target_department = user_dept
    else:
        target_department = department

    query = """
        SELECT p.id, p.subject_id, p.academic_year, p.file_name, p.file_path,
               p.uploaded_by, p.uploaded_at,
               s.subject_code, s.subject_name, s.semester,
               r.code AS regulation_code, r.name AS regulation_name,
               d.code AS department_code, d.name AS department_name
        FROM papers p
        JOIN subjects s ON p.subject_id = s.id
        JOIN regulations r ON s.regulation_id = r.id
        JOIN departments d ON s.department_id = d.id
        WHERE 1=1
    """
    params = []

    if target_department:
        query += " AND d.code = ?"
        params.append(target_department)

    if regulation:
        if regulation.isdigit():
            query += " AND r.id = ?"
            params.append(int(regulation))
        else:
            query += " AND r.code = ?"
            params.append(regulation)

    if semester:
        try:
            sem_val = int(semester)
            if sem_val < 1 or sem_val > 7:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"success": False, "message": "Invalid semester. Valid semesters are 1 to 7."}
                )
            query += " AND s.semester = ?"
            params.append(sem_val)
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"success": False, "message": "Invalid semester parameter."}
            )

    if subject_id:
        try:
            query += " AND s.id = ?"
            params.append(int(subject_id))
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"success": False, "message": "Invalid subject_id parameter."}
            )

    if academic_year:
        query += " AND p.academic_year = ?"
        params.append(academic_year)

    if search:
        search_pattern = f"%{search.strip()}%"
        query += """ AND (
            s.subject_code LIKE ? OR
            s.subject_name LIKE ? OR
            p.file_name LIKE ? OR
            p.academic_year LIKE ?
        )"""
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    query += " ORDER BY p.uploaded_at DESC, s.semester ASC, s.subject_code ASC"

    conn = get_db_connection()
    try:
        rows = conn.execute(query, params).fetchall()
        papers = [dict(row) for row in rows]
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"success": True, "count": len(papers), "papers": papers}
        )
    finally:
        conn.close()


def _get_paper_file_path(paper_id: int, current_user: dict | None):
    conn = get_db_connection()
    try:
        paper = conn.execute("""
            SELECT p.*, s.subject_code, s.subject_name, d.code AS department_code
            FROM papers p
            JOIN subjects s ON p.subject_id = s.id
            JOIN departments d ON s.department_id = d.id
            WHERE p.id = ?
        """, (paper_id,)).fetchone()

        if not paper:
            return None, "Question paper not found.", 404

        # Department authorization check for students
        if current_user and current_user.get("role") == "student" and paper["department_code"] != current_user.get("department"):
            return None, "Forbidden. You cannot access question papers from other departments.", 403

        raw_path = Path(paper["file_path"]).resolve()
        papers_root = PAPERS_DIR.resolve()

        try:
            raw_path.relative_to(papers_root)
        except ValueError:
            return None, "Invalid file location.", 400

        if not raw_path.exists():
            return None, "Physical paper file not found on server.", 404

        return (raw_path, paper["file_name"]), None, 200
    finally:
        conn.close()


@paper_router.get("/{paper_id}/view")
async def view_paper(paper_id: int, request: Request):
    user = restore_session_from_header(request)
    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": "Unauthorized. Please log in to view papers."}
        )

    file_info, error_msg, status_code = _get_paper_file_path(paper_id, user)
    if error_msg:
        return JSONResponse(
            status_code=status_code,
            content={"success": False, "message": error_msg}
        )

    path, filename = file_info
    return FileResponse(
        path=path,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


@paper_router.get("/{paper_id}/download")
async def download_paper(paper_id: int, request: Request):
    user = restore_session_from_header(request)
    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": "Unauthorized. Please log in to download papers."}
        )

    file_info, error_msg, status_code = _get_paper_file_path(paper_id, user)
    if error_msg:
        return JSONResponse(
            status_code=status_code,
            content={"success": False, "message": error_msg}
        )

    path, filename = file_info
    return FileResponse(
        path=path,
        media_type="application/pdf",
        filename=filename
    )
