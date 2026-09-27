from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from werkzeug.security import check_password_hash
from backend.database import get_db_connection
from backend.routes.auth_helpers import get_current_user

auth_router = APIRouter(prefix="/api", tags=["Authentication"])

@auth_router.post("/login")
async def login(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}

    user_id = (data.get("user_id") or "").strip()
    password = (data.get("password") or "").strip()

    if not user_id or not password:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "User ID and password are required."}
        )

    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE user_id = ?",
            (user_id,)
        ).fetchone()

        if not user:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"success": False, "message": "Invalid login details."}
            )

        if not check_password_hash(user["password"], password):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"success": False, "message": "Invalid login details."}
            )

        # Set session attributes
        request.session["user_id"] = user["user_id"]
        request.session["role"] = user["role"]
        request.session["department"] = user["department"]
        request.session["name"] = user["name"]

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": "Login successful.",
                "role": user["role"],
                "user": {
                    "user_id": user["user_id"],
                    "name": user["name"],
                    "role": user["role"],
                    "department": user["department"]
                }
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": f"Server error: {str(e)}"}
        )
    finally:
        conn.close()


@auth_router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"success": True, "message": "Logged out successfully."}
    )


@auth_router.get("/users/me")
async def get_current_user_profile(request: Request):
    user = get_current_user(request)
    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": "Unauthorized."}
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "user": {
                "user_id": user.get("user_id"),
                "name": user.get("name"),
                "role": user.get("role"),
                "department": user.get("department")
            }
        }
    )
