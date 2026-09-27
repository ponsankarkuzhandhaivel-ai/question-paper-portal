"""
Gnanamani College of Technology - Comprehensive Test Suite
Tests all 24 core specifications and business rules.
"""

import io
import sys
import json
import unittest
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import create_app
from backend.database.init_db import init_db
from backend.database.seed_db import seed_db
from backend.config import PAPERS_DIR, DATABASE_PATH

from starlette.testclient import TestClient

class AdaptedResponse:
    def __init__(self, response):
        self._resp = response
        self.status_code = response.status_code
        self.headers = response.headers
        content_type = response.headers.get("content-type", "")
        self.mimetype = content_type.split(";")[0].strip() if content_type else ""

    def get_json(self):
        try:
            return self._resp.json()
        except Exception:
            return None

    def close(self):
        try:
            self._resp.close()
        except Exception:
            pass

    @property
    def content(self):
        return self._resp.content

class FastAPITestClientAdapter:
    def __init__(self, app):
        self._client = TestClient(app)

    def post(self, url, json=None, data=None, content_type=None, headers=None):
        if data and "file" in data:
            form_data = dict(data)
            file_item = form_data.pop("file")
            if isinstance(file_item, tuple):
                files = {"file": (file_item[1], file_item[0], "application/pdf")}
            else:
                files = {"file": file_item}
            resp = self._client.post(url, data=form_data, files=files, headers=headers)
        else:
            resp = self._client.post(url, json=json, data=data, headers=headers)
        return AdaptedResponse(resp)

    def get(self, url, headers=None):
        resp = self._client.get(url, headers=headers)
        return AdaptedResponse(resp)

    def delete(self, url, headers=None):
        resp = self._client.delete(url, headers=headers)
        return AdaptedResponse(resp)

class TestQuestionPaperPortal(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # 1 & 2. Initialize and Seed Database
        init_db()
        seed_db()
        cls.app = create_app()

    def setUp(self):
        self.client = FastAPITestClientAdapter(self.app)

    def test_01_init_and_seed_db(self):
        """Verify database exists and has seeded tables."""
        self.assertTrue(DATABASE_PATH.exists(), "Database file should exist")
        self.assertTrue(PAPERS_DIR.exists(), "Papers directory should exist")

    def test_02_staff_login(self):
        """Staff login with test credentials STAFF001 / staff123."""
        res = self.client.post("/api/login", json={
            "user_id": "STAFF001",
            "password": "staff123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["role"], "staff")

    def test_03_student_login(self):
        """Student login with test credentials 23CS001 / student123."""
        res = self.client.post("/api/login", json={
            "user_id": "23CS001",
            "password": "student123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["role"], "student")
        self.assertEqual(data["user"]["department"], "CSE")

    def test_04_users_me_session(self):
        """Verify /api/users/me reads active session and returns 401 when logged out."""
        # Unauthenticated
        res = self.client.get("/api/users/me")
        self.assertEqual(res.status_code, 401)

        # Login as student
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        res2 = self.client.get("/api/users/me")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertTrue(data2["success"])
        self.assertEqual(data2["user"]["user_id"], "23CS001")

    def test_05_department_api(self):
        """Verify /api/departments returns all 9 supported departments."""
        res = self.client.get("/api/departments")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        dept_codes = [d["code"] for d in data["departments"]]
        expected = ["CSE", "ECE", "EEE", "MECH", "AI&DS", "BME", "AGRI", "PHARMA", "IT"]
        for exp in expected:
            self.assertIn(exp, dept_codes, f"Department {exp} must be present")

    def test_06_regulation_api(self):
        """Verify /api/subjects/regulations returns R2023."""
        res = self.client.get("/api/subjects/regulations")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        reg_codes = [r["code"] for r in data["regulations"]]
        self.assertIn("R2023", reg_codes)

    def test_07_semester_1_common_subjects(self):
        """Semester 1 must return exactly 7 common subjects for student."""
        # Login as CSE student
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        res = self.client.get("/api/subjects?regulation=R2023&semester=1")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        subjects = data["subjects"]
        self.assertEqual(len(subjects), 7, f"Expected 7 common Sem 1 subjects, got {len(subjects)}")
        codes = [s["subject_code"] for s in subjects]
        expected = ["SUB101", "SUB102", "SUB103", "SUB104", "SUB105", "SUB106", "SUB107"]
        self.assertEqual(sorted(codes), sorted(expected))

    def test_08_semester_2_common_subjects(self):
        """Semester 2 must return exactly 8 common subjects for student."""
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        res = self.client.get("/api/subjects?regulation=R2023&semester=2")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        subjects = data["subjects"]
        self.assertEqual(len(subjects), 8, f"Expected 8 common Sem 2 subjects, got {len(subjects)}")
        codes = [s["subject_code"] for s in subjects]
        expected = ["SUB201", "SUB202", "SUB203", "SUB204", "SUB205", "SUB206", "SUB207", "SUB208"]
        self.assertEqual(sorted(codes), sorted(expected))

    def test_09_cse_semester_3_4_5(self):
        """Verify CSE Semester 3 (7), 4 (7), 5 (6) subjects."""
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        
        # Sem 3
        res3 = self.client.get("/api/subjects?regulation=R2023&semester=3")
        self.assertEqual(len(res3.get_json()["subjects"]), 7)

        # Sem 4
        res4 = self.client.get("/api/subjects?regulation=R2023&semester=4")
        self.assertEqual(len(res4.get_json()["subjects"]), 7)

        # Sem 5
        res5 = self.client.get("/api/subjects?regulation=R2023&semester=5")
        self.assertEqual(len(res5.get_json()["subjects"]), 6)

    def test_10_cse_semester_6_exact_subjects(self):
        """
        VERY IMPORTANT TEST:
        R2023 + Semester 6 must have EXACTLY 6 subjects:
        SUB601, SUB602, SUB603, SUB604, SUB605, SUB606
        """
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        res = self.client.get("/api/subjects?regulation=R2023&semester=6")
        self.assertEqual(res.status_code, 200)
        subjects = res.get_json()["subjects"]
        self.assertEqual(len(subjects), 6, f"Expected exactly 6 subjects for CSE Sem 6, got {len(subjects)}")
        codes = [s["subject_code"] for s in subjects]
        expected = ["SUB601", "SUB602", "SUB603", "SUB604", "SUB605", "SUB606"]
        self.assertEqual(sorted(codes), sorted(expected))

    def test_11_cse_semester_7_exact_subjects(self):
        """
        VERY IMPORTANT TEST:
        R2023 + Semester 7 must have EXACTLY 5 subjects:
        SUB709, SUB710, SUB711, SUB712, SUB713
        Must NOT be combined with Semester 6!
        """
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        res = self.client.get("/api/subjects?regulation=R2023&semester=7")
        self.assertEqual(res.status_code, 200)
        subjects = res.get_json()["subjects"]
        self.assertEqual(len(subjects), 5, f"Expected exactly 5 subjects for CSE Sem 7, got {len(subjects)}")
        codes = [s["subject_code"] for s in subjects]
        expected = ["SUB709", "SUB710", "SUB711", "SUB712", "SUB713"]
        self.assertEqual(sorted(codes), sorted(expected))
        # Ensure no overlap with Sem 6
        sem6_codes = ["SUB601", "SUB602", "SUB603", "SUB604", "SUB605", "SUB606"]
        for c in codes:
            self.assertNotIn(c, sem6_codes, f"Semester 7 subject {c} must NOT be in Semester 6")

    def test_12_ece_department_isolation(self):
        """Staff querying ECE for Semester 3 must NOT return CSE subjects."""
        self.client.post("/api/login", json={"user_id": "STAFF001", "password": "staff123"})
        res = self.client.get("/api/subjects?department=ECE&regulation=R2023&semester=3")
        self.assertEqual(res.status_code, 200)
        subjects = res.get_json()["subjects"]
        # In the spec, Sem 3 subjects given are CSE-specific. ECE Sem 3 has 0 CSE subjects.
        self.assertEqual(len(subjects), 0, "ECE Sem 3 should not return CSE subjects")

    def test_13_create_student_account_and_auto_id(self):
        """Staff receives 403; Admin creates student account with automatic ID computation (e.g. 24CS025)."""
        # 1. Staff tries to create student -> must return 403 Forbidden
        self.client.post("/api/login", json={"user_id": "STAFF001", "password": "staff123"})
        staff_res = self.client.post("/api/staff/students", json={
            "name": "Unauthorized Staff Student Create",
            "joining_year": "2024",
            "department": "CSE",
            "student_number": "025",
            "password": "priya123",
            "confirm_password": "priya123"
        })
        self.assertEqual(staff_res.status_code, 403, "Staff must NOT be permitted to create student accounts")

        # 2. Admin creates student -> succeeds
        self.client.post("/api/login", json={"user_id": "ADMIN001", "password": "admin123"})
        res = self.client.post("/api/staff/students", json={
            "name": "Priya Ramesh",
            "joining_year": "2024",
            "department": "CSE",
            "student_number": "025",
            "password": "priya123",
            "confirm_password": "priya123"
        })
        self.assertIn(res.status_code, [201, 409])
        if res.status_code == 201:
            data = res.get_json()
            self.assertTrue(data["success"])
            self.assertEqual(data["user_id"], "24CS025")

            # Verify new student can now log in
            login_res = self.client.post("/api/login", json={
                "user_id": "24CS025",
                "password": "priya123"
            })
            self.assertEqual(login_res.status_code, 200)

    def test_14_duplicate_student_id_prevention(self):
        """Admin creating an account with an existing ID must return 409 'Student ID already exists.'"""
        self.client.post("/api/login", json={"user_id": "ADMIN001", "password": "admin123"})
        # 23CS001 already exists from seed
        res = self.client.post("/api/staff/students", json={
            "name": "Duplicate Test",
            "joining_year": "2023",
            "department": "CSE",
            "student_number": "001",
            "password": "pass",
            "confirm_password": "pass"
        })
        self.assertEqual(res.status_code, 409)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertIn("already exists", data["message"].lower())

    def test_15_upload_paper_view_and_download(self):
        """Staff uploads a question paper PDF, student views & downloads it, staff deletes it."""
        # 1. Staff login
        self.client.post("/api/login", json={"user_id": "STAFF001", "password": "staff123"})
        
        # Get a subject ID for CSE Sem 3 (e.g. SUB302 Database Management System)
        subj_res = self.client.get("/api/subjects?department=CSE&regulation=R2023&semester=3")
        subj_id = subj_res.get_json()["subjects"][0]["id"]

        # Fake PDF content
        pdf_content = b"%PDF-1.4 sample question paper test content %EOF"
        pdf_file = (io.BytesIO(pdf_content), "DBMS_May2025.pdf")

        # 2. Upload Paper
        upload_res = self.client.post("/api/staff/papers", data={
            "subject_id": str(subj_id),
            "academic_year": "2025",
            "semester": "3",
            "file": pdf_file
        }, content_type="multipart/form-data")
        self.assertEqual(upload_res.status_code, 201)
        paper_id = upload_res.get_json()["paper_id"]

        # 3. Student views paper
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        view_res = self.client.get(f"/api/papers/{paper_id}/view")
        self.assertEqual(view_res.status_code, 200)
        self.assertEqual(view_res.mimetype, "application/pdf")
        view_res.close()

        # 4. Student downloads paper
        dl_res = self.client.get(f"/api/papers/{paper_id}/download")
        self.assertEqual(dl_res.status_code, 200)
        self.assertIn("attachment", dl_res.headers.get("Content-Disposition", ""))
        dl_res.close()

        # 5. Staff deletes paper
        self.client.post("/api/login", json={"user_id": "STAFF001", "password": "staff123"})
        del_res = self.client.delete(f"/api/staff/papers/{paper_id}")
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.get_json()["success"])

        # 6. Verify paper is now gone
        view_after = self.client.get(f"/api/papers/{paper_id}/view")
        self.assertEqual(view_after.status_code, 404)

    def test_16_student_forbidden_from_staff_routes(self):
        """Students must receive 403 Forbidden on staff endpoints."""
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        
        # Student trying to create student
        res1 = self.client.post("/api/staff/students", json={})
        self.assertEqual(res1.status_code, 403)

        # Student trying to upload paper
        res2 = self.client.post("/api/staff/papers", data={})
        self.assertEqual(res2.status_code, 403)

    def test_17_logout(self):
        """Logout invalidates session."""
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        res = self.client.post("/api/logout")
        self.assertEqual(res.status_code, 200)

        # /api/users/me should now return 401
        res_me = self.client.get("/api/users/me")
        self.assertEqual(res_me.status_code, 401)

    def test_18_admin_login(self):
        """Admin login with credentials ADMIN001 / admin123."""
        res = self.client.post("/api/login", json={"user_id": "ADMIN001", "password": "admin123"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["role"], "admin")

        # Verify /api/users/me returns role = 'admin'
        res_me = self.client.get("/api/users/me")
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.get_json()["user"]["role"], "admin")

    def test_19_admin_create_and_delete_student(self):
        """Admin creates a student account and deletes it."""
        # 1. Login as Admin
        self.client.post("/api/login", json={"user_id": "ADMIN001", "password": "admin123"})

        # 2. Create student
        new_student = {
            "name": "Temp Test Student",
            "joining_year": "2024",
            "department": "ECE",
            "student_number": "999",
            "password": "pass123",
            "confirm_password": "pass123"
        }
        res_create = self.client.post("/api/staff/students", json=new_student)
        self.assertEqual(res_create.status_code, 201)
        student_id = res_create.get_json()["user_id"]
        self.assertEqual(student_id, "24EC999")

        # 3. Delete student as Admin
        res_del = self.client.delete(f"/api/staff/students/{student_id}")
        self.assertEqual(res_del.status_code, 200)
        self.assertTrue(res_del.get_json()["success"])

        # 4. Verify login as deleted student fails with 401
        res_login = self.client.post("/api/login", json={"user_id": student_id, "password": "pass123"})
        self.assertEqual(res_login.status_code, 401)

    def test_20_admin_create_and_delete_staff(self):
        """Admin creates staff account and deletes it, verify student and staff restrictions."""
        new_staff = {
            "name": "Prof. Test Staff",
            "staff_id": "STAFF999",
            "department": "MECH",
            "password": "staffpass123",
            "confirm_password": "staffpass123"
        }

        # 1. Staff tries to create staff member -> must return 403 Forbidden
        self.client.post("/api/login", json={"user_id": "STAFF001", "password": "staff123"})
        staff_unauth = self.client.post("/api/staff/staff-members", json=new_staff)
        self.assertEqual(staff_unauth.status_code, 403)

        # 2. Login as Admin & Create staff member
        self.client.post("/api/login", json={"user_id": "ADMIN001", "password": "admin123"})
        res_create = self.client.post("/api/staff/staff-members", json=new_staff)
        self.assertEqual(res_create.status_code, 201)
        self.assertTrue(res_create.get_json()["success"])

        # 3. Student tries to delete staff member -> must return 403
        self.client.post("/api/login", json={"user_id": "23CS001", "password": "student123"})
        res_unauth = self.client.delete("/api/staff/staff-members/STAFF999")
        self.assertEqual(res_unauth.status_code, 403)

        # 4. Regular staff tries to delete staff member -> must return 403 (Admin-only)
        self.client.post("/api/login", json={"user_id": "STAFF001", "password": "staff123"})
        res_staff_del = self.client.delete("/api/staff/staff-members/STAFF999")
        self.assertEqual(res_staff_del.status_code, 403)

        # 5. Admin deletes staff member
        self.client.post("/api/login", json={"user_id": "ADMIN001", "password": "admin123"})
        res_del = self.client.delete("/api/staff/staff-members/STAFF999")
        self.assertEqual(res_del.status_code, 200)
        self.assertTrue(res_del.get_json()["success"])

        # 6. Verify login as deleted staff fails with 401
        res_login = self.client.post("/api/login", json={"user_id": "STAFF999", "password": "staffpass123"})
        self.assertEqual(res_login.status_code, 401)


if __name__ == "__main__":
    unittest.main(verbosity=2)
