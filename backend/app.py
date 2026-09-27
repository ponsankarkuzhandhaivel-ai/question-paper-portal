import os
import sys
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import (
    BASE_DIR,
    SECRET_KEY,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_SECURE,
    PERMANENT_SESSION_LIFETIME
)
from backend.routes import auth_router, subject_router, paper_router, staff_router

def create_app() -> FastAPI:
    app = FastAPI(
        title="Gnanamani College of Technology - Question Paper Portal",
        description="FastAPI Backend for Gnanamani College Question Paper Portal",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # 1. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://127.0.0.1:5000",
            "http://localhost:5000",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Session Middleware for Cookie Authentication
    app.add_middleware(
        SessionMiddleware,
        secret_key=SECRET_KEY,
        session_cookie=SESSION_COOKIE_NAME,
        max_age=PERMANENT_SESSION_LIFETIME,
        same_site="lax",
        https_only=SESSION_COOKIE_SECURE
    )

    # 3. Include API Routers
    app.include_router(auth_router)
    app.include_router(subject_router)
    app.include_router(paper_router)
    app.include_router(staff_router)

    REACT_DIST = BASE_DIR / "frontend-react" / "dist"

    # 4. Mount Static Assets
    if (REACT_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(REACT_DIST / "assets")), name="react-assets")
    elif (BASE_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(BASE_DIR / "assets")), name="legacy-assets")

    if (BASE_DIR / "css").exists():
        app.mount("/css", StaticFiles(directory=str(BASE_DIR / "css")), name="legacy-css")
    if (BASE_DIR / "js").exists():
        app.mount("/js", StaticFiles(directory=str(BASE_DIR / "js")), name="legacy-js")

    # 5. Frontend Navigation & Logo Endpoints
    @app.get("/gnanamani_logo.jpg")
    async def serve_root_logo():
        if (REACT_DIST / "gnanamani_logo.jpg").exists():
            return FileResponse(str(REACT_DIST / "gnanamani_logo.jpg"))
        return FileResponse(str(BASE_DIR / "assets" / "images" / "gnanamani_logo.jpg"))

    @app.get("/")
    @app.get("/login")
    @app.get("/index.html")
    async def serve_root():
        if (REACT_DIST / "index.html").exists():
            return FileResponse(str(REACT_DIST / "index.html"))
        return FileResponse(str(BASE_DIR / "index.html"))

    @app.get("/student/dashboard")
    @app.get("/admin/dashboard")
    async def serve_react_dashboards(request: Request):
        if (REACT_DIST / "index.html").exists():
            return FileResponse(str(REACT_DIST / "index.html"))
        if "student" in request.url.path:
            return FileResponse(str(BASE_DIR / "student" / "dashboard.html"))
        return FileResponse(str(BASE_DIR / "admin" / "dashboard.html"))

    # 6. Global Exception Handlers Returning Consistent JSON
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # If not an API route and 404, fallback to React index.html
        if exc.status_code == 404 and not request.url.path.startswith("/api/"):
            if (REACT_DIST / "index.html").exists():
                return FileResponse(str(REACT_DIST / "index.html"))
            return FileResponse(str(BASE_DIR / "index.html"))

        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.detail or "Request error."}
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Internal Server Error: {str(exc)}"}
        )

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    print("Starting Gnanamani College Question Paper Portal FastAPI Backend on http://127.0.0.1:5000 ...")
    uvicorn.run("backend.app:app", host="127.0.0.1", port=5000, reload=True)
