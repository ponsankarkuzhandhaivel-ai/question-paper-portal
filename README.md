# Gnanamani College of Technology - Question Paper Portal

A complete, production-ready, secure, and high-performance Question Paper Management Portal built for **Gnanamani College of Technology (GCT)** with a **React.js + Vite** single-page application frontend and a modern **FastAPI + Uvicorn** ASGI backend.

---

## 🏛️ Features & Access Roles

- **⚡ Modern FastAPI Backend & ASGI High Performance:**
  - Built with **FastAPI**, **Uvicorn**, **Pydantic**, and **Starlette**.
  - Asynchronous request handling with automatic OpenAPI documentation.
  - Interactive API Explorer (Swagger UI) at `http://127.0.0.1:5000/docs` and ReDoc at `http://127.0.0.1:5000/redoc`.
  - Type-safe request validation and standardized JSON error formatting.

- **⚛️ Modern React.js Frontend:**
  - Built with **React 18**, **React Router v6**, and **Vite**.
  - Includes **Lucide React** iconography and responsive institutional styling.
  - Features the official **Gnanamani College of Technology** emblem and branding.
  - Client-side route guarding (`ProtectedRoute`) ensuring unauthorized users cannot access role-specific dashboards.
  - Dual-mode operation: Vite Dev Server with proxy (`http://localhost:5173`) or direct FastAPI production serving (`http://127.0.0.1:5000`).

- **🛡️ Three-Tier Role-Based Authorization:**
  - **Administrator (`admin`):**
    - Superuser access to institutional controls.
    - Exclusively create and delete **Student accounts**.
    - Exclusively create and delete **Staff accounts**.
    - Upload, view, and delete Question Papers.
    - Full Student & Staff directories with management controls.
  - **👨‍🏫 Faculty / Staff (`staff`):**
    - Upload semester question papers with PDF validation.
    - Manage and delete uploaded question papers.
    - View student directory (Read-only).
  - **👨‍🎓 Student (`student`):**
    - Personalized dashboard matching their department.
    - Cascading filters by Regulation (`R2023`), Semester (1 to 7), Academic Year, and Subject.
    - Live client-side search.
    - Inline browser PDF viewing and one-click downloading.

- **Automated Student ID Generation:** Follows institutional formula: `YY + DEPARTMENT_CODE + STUDENT_NUMBER` (e.g., `23CS001`, `24CS025`).
- **Department Subject Segregation:**
  - Semesters 1 and 2: Common subjects across all 9 departments.
  - Semesters 3 to 7: Department-specific (e.g., CSE subjects are strictly restricted to CSE students).
  - Semester 6 (strictly 6 subjects) and Semester 7 (strictly 5 subjects) strictly segregated.
  - Semester 8 is completely removed as per curriculum requirements.
- **Session Security:** Resilient session cookie (`credentials: 'include'`) and `X-User-Id` header authentication fallback.

---

## 📁 Project Structure

```
Question-Paper-Portal/
│
├── frontend-react/                   # Modern React.js SPA (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Institutional header with logo & user status
│   │   │   └── ProtectedRoute.jsx    # Role-based route guard
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Authentication state & session manager
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx         # Modern login page with official logo
│   │   │   ├── StudentDashboard.jsx  # Student paper search, view & download
│   │   │   └── AdminDashboard.jsx    # Admin/Staff overview, uploads & management
│   │   ├── services/
│   │   │   └── api.js                # Centralized REST API client
│   │   ├── App.jsx                   # React Router routing configuration
│   │   ├── App.css                   # Responsive component styling
│   │   ├── index.css                 # Base theme and typography
│   │   └── main.jsx                  # React application root
│   ├── public/
│   │   └── gnanamani_logo.jpg        # Official institutional logo
│   ├── dist/                         # Compiled production bundle served by Flask
│   ├── package.json                  # React dependencies & build scripts
│   └── vite.config.js                # Vite configuration with /api backend proxy
│
├── backend/
│   ├── __init__.py
│   ├── app.py                        # Flask server entry point & static routes
│   ├── config.py                     # Root-relative paths & configuration
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth_helpers.py           # @login_required, @staff_required, @admin_required
│   │   ├── auth_routes.py            # /api/login, /api/logout, /api/users/me
│   │   ├── subject_routes.py         # /api/departments, /api/subjects
│   │   ├── paper_routes.py           # /api/papers, view, download
│   │   └── staff_routes.py           # Student & staff management, upload & delete papers
│   └── database/
│       ├── __init__.py               # SQLite connection helper
│       ├── init_db.py                # Table schemas, constraints, auto-migration
│       ├── seed_db.py                # Database seeding script (Admin, Staff, Student)
│       └── seed_subjects.sql         # SQL seed data for R2023 & 9 departments
│
├── papers/                           # Safe storage for uploaded question paper PDFs
├── sample_papers/                    # Realistic test question papers
├── create_admin.py                   # CLI utility to create Administrator accounts
├── create_staff.py                   # CLI utility to create Staff accounts
├── create_dummy_papers.py            # Script to generate sample PDF papers
├── question_portal.db                # SQLite database
├── requirements.txt                  # Python dependencies
├── test_portal.py                    # 20-step comprehensive integration test suite
└── README.md                         # Project documentation
```

---

## 🚀 How to Run the Project

### Option 1: Running the Complete App via FastAPI (Recommended & Simplest)

The FastAPI backend runs on Uvicorn ASGI server and is pre-configured to directly serve both the REST API and the compiled React SPA from `frontend-react/dist`.

1. Open PowerShell / Command Prompt in the project folder:
   ```powershell
   cd "C:\Users\Pon Sankar\Question-Paper-Portal"
   ```

2. Start the FastAPI server:
   ```powershell
   python -m backend.app
   ```

3. Open your browser:
   - 👉 **Web Application:** `http://127.0.0.1:5000`
   - 👉 **Interactive API Docs (Swagger UI):** `http://127.0.0.1:5000/docs`
   - 👉 **API Reference (ReDoc):** `http://127.0.0.1:5000/redoc`

---

### Option 2: Running React Vite Dev Server (For Frontend Development)

You can run both the FastAPI backend and the React Vite development server concurrently for hot module reloading (HMR).

#### Terminal 1 — Start FastAPI Backend:
```powershell
cd "C:\Users\Pon Sankar\Question-Paper-Portal"
python -m backend.app
```
*(Runs on `http://127.0.0.1:5000`)*

#### Terminal 2 — Start React Vite Dev Server:
```powershell
cd "C:\Users\Pon Sankar\Question-Paper-Portal\frontend-react"
npm run dev
```
*(Runs on `http://localhost:5173`, automatically proxying `/api` requests to FastAPI on port 5000)*

👉 Open **`http://localhost:5173`** in your browser.

---

### Building the React Frontend for Production

Whenever you modify any code in `frontend-react/src`, re-bundle the production build:
```powershell
cd "C:\Users\Pon Sankar\Question-Paper-Portal\frontend-react"
npm run build
```
The output is automatically generated in `frontend-react/dist/` and will immediately be served by FastAPI at `http://127.0.0.1:5000`.

---

## 🔑 Pre-Configured Test Accounts

| Role | User ID | Password | Department | Capabilities |
|---|---|---|---|---|
| **Administrator** | `ADMIN001` | `admin123` | ADMIN | Superuser: Exclusively Create & Delete Students & Staff, Upload & Delete Papers |
| **Faculty / Staff** | `STAFF001` | `staff123` | CSE | Upload, Manage & Delete Papers, View Student Directory (Read-only) |
| **Student** | `23CS001` | `student123` | CSE | Search, Filter, View, and Download Question Papers |

*Note: All passwords stored in SQLite are cryptographically hashed using Werkzeug (`generate_password_hash`).*

---

## 🧪 Verification & Automated Tests

To run the complete automated 20-step integration test suite:
```powershell
cd "C:\Users\Pon Sankar\Question-Paper-Portal"
python test_portal.py
```
**Result:** 20/20 tests passing (`Ran 20 tests in ~15s OK`).

---

## 📋 API Endpoints Reference

### Authentication
- `POST /api/login` - Authenticate user, create session cookie.
- `POST /api/logout` - Invalidate session.
- `GET /api/users/me` - Retrieve authenticated user session details.

### Academic Metadata
- `GET /api/departments` - List all 9 departments.
- `GET /api/subjects/regulations` - List regulations (`R2023`).
- `GET /api/subjects` - List subjects filtered by regulation, semester, and department.

### Question Papers
- `GET /api/papers` - Search and list question papers with filters.
- `GET /api/papers/<id>/view` - Stream question paper PDF inline in browser.
- `GET /api/papers/<id>/download` - Download question paper PDF.

### Staff & Admin Management
- `POST /api/staff/students` - Create student account (Admin-only, auto-generated ID).
- `GET /api/staff/students` - List registered students.
- `DELETE /api/staff/students/<user_id>` - Delete a student account (Admin-only).
- `POST /api/staff/staff-members` - Create staff account (Admin-only).
- `GET /api/staff/staff-members` - List staff members.
- `DELETE /api/staff/staff-members/<user_id>` - Delete staff member (Admin-only).
- `POST /api/staff/papers` - Upload question paper PDF with metadata.
- `GET /api/staff/papers` - List all question papers.
- `DELETE /api/staff/papers/<id>` - Delete question paper from database and disk.

---

## 🔒 Security Best Practices Implemented
1. **Password Hashing:** Werkzeug `generate_password_hash` with secure PBKDF2 salting.
2. **Path Traversal Protection:** Validates that file access is strictly within the resolved `papers/` directory.
3. **MIME & Extension Validation:** Strictly accepts genuine `.pdf` documents.
4. **SQL Parameterization:** All SQLite queries use parameterized bindings against SQL injection.
5. **Role Guarding:** Granular FastAPI dependency injection (`Depends(login_required)`, `Depends(staff_required)`, `Depends(admin_required)`).
6. **Frontend Route Protection:** React `ProtectedRoute` prevents client-side access to unauthorized portals.
