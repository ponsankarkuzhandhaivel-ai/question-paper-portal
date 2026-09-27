from fastapi import APIRouter, Request, Depends, status
from fastapi.responses import JSONResponse
from backend.database import get_db_connection
from backend.routes.auth_helpers import login_required

subject_router = APIRouter(prefix="/api", tags=["Academic Metadata"])

@subject_router.get("/departments")
async def get_departments():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT id, code, name FROM departments ORDER BY id ASC").fetchall()
        departments = [dict(row) for row in rows]
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"success": True, "departments": departments}
        )
    finally:
        conn.close()


@subject_router.get("/subjects/regulations")
async def get_regulations():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT id, code, name FROM regulations ORDER BY id ASC").fetchall()
        regulations = [dict(row) for row in rows]
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"success": True, "regulations": regulations}
        )
    finally:
        conn.close()


@subject_router.get("/subjects")
async def get_subjects(
    request: Request,
    department: str | None = None,
    regulation: str | None = None,
    semester: str | None = None,
    current_user: dict = Depends(login_required)
):
    user_role = current_user.get("role")
    user_dept = current_user.get("department")

    # If student, strictly enforce student's department from session
    if user_role == "student":
        target_department = user_dept
    else:
        # Staff can pass a department query param to manage/view subjects for any dept
        target_department = department or user_dept

    query = """
        SELECT s.id, s.subject_code, s.subject_name, s.semester,
               r.code AS regulation_code, r.name AS regulation_name,
               d.code AS department_code, d.name AS department_name
        FROM subjects s
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

    query += " ORDER BY s.semester ASC, s.subject_code ASC"

    conn = get_db_connection()
    try:
        rows = conn.execute(query, params).fetchall()
        subjects = [dict(row) for row in rows]
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "department": target_department,
                "subjects": subjects
            }
        )
    finally:
        conn.close()
