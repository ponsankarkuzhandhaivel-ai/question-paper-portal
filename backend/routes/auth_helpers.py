from fastapi import Request, HTTPException, Depends
from backend.database import get_db_connection

def restore_session_from_header(request: Request) -> dict | None:
    """Fallback to restore session if browser dropped cookie cross-origin or in new tab."""
    session_uid = request.session.get("user_id")
    target_uid = session_uid or request.headers.get("X-User-Id") or request.query_params.get("user_id")
    
    if not target_uid:
        return None

    # If already in session and matches, return session data
    if session_uid and request.session.get("role"):
        return {
            "user_id": request.session.get("user_id"),
            "role": request.session.get("role"),
            "department": request.session.get("department"),
            "name": request.session.get("name"),
        }

    conn = get_db_connection()
    try:
        user = conn.execute("SELECT * FROM users WHERE user_id = ?", (target_uid,)).fetchone()
        if user:
            request.session["user_id"] = user["user_id"]
            request.session["role"] = user["role"]
            request.session["department"] = user["department"]
            request.session["name"] = user["name"]
            return {
                "user_id": user["user_id"],
                "role": user["role"],
                "department": user["department"],
                "name": user["name"],
            }
        return None
    finally:
        conn.close()

def get_current_user(request: Request) -> dict | None:
    return restore_session_from_header(request)

def login_required(request: Request) -> dict:
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized. Please log in to continue."
        )
    return user

def staff_required(request: Request, current_user: dict = Depends(login_required)) -> dict:
    if current_user.get("role") not in ("staff", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden. Staff or Admin access required."
        )
    return current_user

def admin_required(request: Request, current_user: dict = Depends(login_required)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Forbidden. Administrator access required."
        )
    return current_user
