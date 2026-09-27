-- Seed Regulations
INSERT OR IGNORE INTO regulations (code, name) VALUES 
('R2023', 'Regulation 2023');

-- Seed Departments
INSERT OR IGNORE INTO departments (code, name) VALUES 
('CSE', 'Computer Science and Engineering'),
('ECE', 'Electronics and Communication Engineering'),
('EEE', 'Electrical and Electronics Engineering'),
('MECH', 'Mechanical Engineering'),
('AI&DS', 'Artificial Intelligence and Data Science'),
('BME', 'Biomedical Engineering'),
('AGRI', 'Agricultural Engineering'),
('PHARMA', 'Pharmaceutical Engineering'),
('IT', 'Information Technology');

-- ============================================================
-- COMMON SEMESTER 1 (All 9 Departments)
-- ============================================================
INSERT OR IGNORE INTO subjects (regulation_id, department_id, semester, subject_code, subject_name)
SELECT r.id, d.id, 1, s.code, s.name
FROM regulations r
CROSS JOIN departments d
CROSS JOIN (
    SELECT 'SUB101' AS code, 'Basics of Tamil' AS name UNION ALL
    SELECT 'SUB102', 'Communicative English' UNION ALL
    SELECT 'SUB103', 'Basic Electrical and Electronics Engineering' UNION ALL
    SELECT 'SUB104', 'Engineering Mathematics I' UNION ALL
    SELECT 'SUB105', 'Engineering Physics' UNION ALL
    SELECT 'SUB106', 'Engineering Chemistry' UNION ALL
    SELECT 'SUB107', 'Tamil Part I'
) s
WHERE r.code = 'R2023'
  AND d.code IN ('CSE', 'ECE', 'EEE', 'MECH', 'AI&DS', 'BME', 'AGRI', 'PHARMA', 'IT');

-- ============================================================
-- COMMON SEMESTER 2 (All 9 Departments)
-- ============================================================
INSERT OR IGNORE INTO subjects (regulation_id, department_id, semester, subject_code, subject_name)
SELECT r.id, d.id, 2, s.code, s.name
FROM regulations r
CROSS JOIN departments d
CROSS JOIN (
    SELECT 'SUB201' AS code, 'Engineering Chemistry I' AS name UNION ALL
    SELECT 'SUB202', 'Uniform Cross Science Engineering' UNION ALL
    SELECT 'SUB203', 'Statistical and Numerical Methods' UNION ALL
    SELECT 'SUB204', 'Physics for Information Science' UNION ALL
    SELECT 'SUB205', 'Tamil Part II' UNION ALL
    SELECT 'SUB206', 'Engineering Graphics' UNION ALL
    SELECT 'SUB207', 'Programming in C' UNION ALL
    SELECT 'SUB208', 'Professional English'
) s
WHERE r.code = 'R2023'
  AND d.code IN ('CSE', 'ECE', 'EEE', 'MECH', 'AI&DS', 'BME', 'AGRI', 'PHARMA', 'IT');

-- ============================================================
-- CSE SEMESTER 3 (CSE Only)
-- ============================================================
INSERT OR IGNORE INTO subjects (regulation_id, department_id, semester, subject_code, subject_name)
SELECT r.id, d.id, 3, s.code, s.name
FROM regulations r, departments d
CROSS JOIN (
    SELECT 'SUB301' AS code, 'Discrete Mathematics' AS name UNION ALL
    SELECT 'SUB302', 'Database Management System' UNION ALL
    SELECT 'SUB303', 'Data Structures and Algorithms' UNION ALL
    SELECT 'SUB304', 'Object Oriented Software Engineering' UNION ALL
    SELECT 'SUB305', 'Problem Solving Using Python' UNION ALL
    SELECT 'SUB306', 'Discrete Principles' UNION ALL
    SELECT 'SUB307', 'Computer Organization'
) s
WHERE r.code = 'R2023' AND d.code = 'CSE';

-- ============================================================
-- CSE SEMESTER 4 (CSE Only)
-- ============================================================
INSERT OR IGNORE INTO subjects (regulation_id, department_id, semester, subject_code, subject_name)
SELECT r.id, d.id, 4, s.code, s.name
FROM regulations r, departments d
CROSS JOIN (
    SELECT 'SUB401' AS code, 'Foundations of Data Science' AS name UNION ALL
    SELECT 'SUB402', 'Theory of Computation' UNION ALL
    SELECT 'SUB403', 'Object Oriented Programming' UNION ALL
    SELECT 'SUB404', 'Introduction to PHP' UNION ALL
    SELECT 'SUB405', 'Operating System' UNION ALL
    SELECT 'SUB406', 'Algorithm' UNION ALL
    SELECT 'SUB407', 'Microprocessor and Microcontroller'
) s
WHERE r.code = 'R2023' AND d.code = 'CSE';

-- ============================================================
-- CSE SEMESTER 5 (CSE Only)
-- ============================================================
INSERT OR IGNORE INTO subjects (regulation_id, department_id, semester, subject_code, subject_name)
SELECT r.id, d.id, 5, s.code, s.name
FROM regulations r, departments d
CROSS JOIN (
    SELECT 'SUB501' AS code, 'Cryptography and Cyber Security' AS name UNION ALL
    SELECT 'SUB502', 'Computer Networks' UNION ALL
    SELECT 'SUB503', 'Big Data Analytics' UNION ALL
    SELECT 'SUB504', 'Compiler Design' UNION ALL
    SELECT 'SUB505', 'Data Warehousing' UNION ALL
    SELECT 'SUB506', 'Digital Marketing'
) s
WHERE r.code = 'R2023' AND d.code = 'CSE';

-- ============================================================
-- CSE SEMESTER 6 (CSE Only - Exactly 6 Subjects)
-- ============================================================
INSERT OR IGNORE INTO subjects (regulation_id, department_id, semester, subject_code, subject_name)
SELECT r.id, d.id, 6, s.code, s.name
FROM regulations r, departments d
CROSS JOIN (
    SELECT 'SUB601' AS code, 'Artificial Intelligence and Machine Learning Engineering' AS name UNION ALL
    SELECT 'SUB602', 'Build Systems' UNION ALL
    SELECT 'SUB603', 'Internet of Things (IoT)' UNION ALL
    SELECT 'SUB604', 'Multimedia and Animation' UNION ALL
    SELECT 'SUB605', 'Software Design' UNION ALL
    SELECT 'SUB606', 'Computer Networks'
) s
WHERE r.code = 'R2023' AND d.code = 'CSE';

-- ============================================================
-- CSE SEMESTER 7 (CSE Only - Exactly 5 Subjects)
-- ============================================================
INSERT OR IGNORE INTO subjects (regulation_id, department_id, semester, subject_code, subject_name)
SELECT r.id, d.id, 7, s.code, s.name
FROM regulations r, departments d
CROSS JOIN (
    SELECT 'SUB709' AS code, 'Agriculture Waste Management System' AS name UNION ALL
    SELECT 'SUB710', 'Cloud Computing' UNION ALL
    SELECT 'SUB711', 'Data Computing' UNION ALL
    SELECT 'SUB712', 'Renewable Energy Resources' UNION ALL
    SELECT 'SUB713', 'Innovation, Incubation and Entrepreneurship'
) s
WHERE r.code = 'R2023' AND d.code = 'CSE';
