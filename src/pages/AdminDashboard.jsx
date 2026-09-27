import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  apiGetDepartments,
  apiGetRegulations,
  apiGetSubjects,
  apiGetStaffPapers,
  apiUploadPaper,
  apiDeletePaper,
  apiGetStudents,
  apiCreateStudent,
  apiDeleteStudent,
  apiGetStaffMembers,
  apiCreateStaffMember,
  apiDeleteStaffMember,
  getPaperViewUrl,
  getPaperDownloadUrl,
} from '../services/api';

const DEPT_ID_PREFIX = {
  CSE: 'CS',
  ECE: 'EC',
  EEE: 'EE',
  MECH: 'ME',
  'AI&DS': 'AD',
  BME: 'BM',
  AGRI: 'AG',
  PHARMA: 'PH',
  IT: 'IT',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Metadata
  const [departments, setDepartments] = useState([]);
  const [regulations, setRegulations] = useState([]);

  // Data lists
  const [papers, setPapers] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Form states: Create Student
  const [studentForm, setStudentForm] = useState({
    name: '',
    joining_year: '2024',
    department: 'CSE',
    student_number: '001',
    password: '',
    confirm_password: '',
  });
  const [studentAlert, setStudentAlert] = useState(null);

  // Form states: Create Staff
  const [staffForm, setStaffForm] = useState({
    name: '',
    staff_id: '',
    department: 'CSE',
    password: '',
    confirm_password: '',
  });
  const [staffAlert, setStaffAlert] = useState(null);

  // Form states: Upload Paper
  const [uploadDept, setUploadDept] = useState('CSE');
  const [uploadReg, setUploadReg] = useState('R2023');
  const [uploadSem, setUploadSem] = useState('1');
  const [uploadSubId, setUploadSubId] = useState('');
  const [uploadYear, setUploadYear] = useState('2025');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSubjects, setUploadSubjects] = useState([]);
  const [uploadAlert, setUploadAlert] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Load Common Metadata on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [dRes, rRes] = await Promise.all([
          apiGetDepartments(),
          apiGetRegulations(),
        ]);
        if (dRes?.success && Array.isArray(dRes.departments)) {
          setDepartments(dRes.departments);
        }
        if (rRes?.success && Array.isArray(rRes.regulations)) {
          setRegulations(rRes.regulations);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Dashboard Overview & Lists
  const refreshAll = async () => {
    try {
      const [pRes, sRes, staffRes] = await Promise.all([
        apiGetStaffPapers(),
        apiGetStudents(),
        apiGetStaffMembers(),
      ]);
      if (pRes?.success) setPapers(pRes.papers || []);
      if (sRes?.success) setStudents(sRes.students || []);
      if (staffRes?.success) setStaffList(staffRes.staff || []);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Fetch subjects for Paper Upload whenever uploadDept, uploadReg, or uploadSem changes
  useEffect(() => {
    async function loadSubjs() {
      try {
        const data = await apiGetSubjects(uploadDept, uploadReg, uploadSem);
        if (data?.success && Array.isArray(data.subjects)) {
          setUploadSubjects(data.subjects);
          if (data.subjects.length > 0) {
            setUploadSubId(data.subjects[0].id.toString());
          } else {
            setUploadSubId('');
          }
        } else {
          setUploadSubjects([]);
          setUploadSubId('');
        }
      } catch (err) {
        console.error('Failed to load upload subjects:', err);
        setUploadSubjects([]);
      }
    }
    loadSubjs();
  }, [uploadDept, uploadReg, uploadSem]);

  // Live Student ID calculation
  const computedStudentId = (() => {
    const yr = (studentForm.joining_year || '').trim();
    let yy = '23';
    if (yr.length === 4 && /^\d+$/.test(yr)) yy = yr.slice(-2);
    else if (yr.length === 2 && /^\d+$/.test(yr)) yy = yr;

    const deptCode = studentForm.department || 'CSE';
    const prefix = DEPT_ID_PREFIX[deptCode] || deptCode.slice(0, 2).toUpperCase();
    const cleanNum = (studentForm.student_number || '').replace(/\D/g, '') || '001';
    const padded = cleanNum.padStart(3, '0');
    return `${yy}${prefix}${padded}`;
  })();

  // 1. Submit Create Student
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setStudentAlert(null);

    if (studentForm.password !== studentForm.confirm_password) {
      setStudentAlert({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      const data = await apiCreateStudent(studentForm);
      setStudentAlert({
        type: 'success',
        message: `Student account created successfully! Student ID: ${data.user_id}`,
      });
      setStudentForm((prev) => ({
        ...prev,
        name: '',
        password: '',
        confirm_password: '',
        student_number: String(parseInt(prev.student_number || '1', 10) + 1).padStart(3, '0'),
      }));
      refreshAll();
    } catch (err) {
      setStudentAlert({ type: 'error', message: err.message || 'Failed to create student account.' });
    }
  };

  // 2. Submit Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffAlert(null);

    if (staffForm.password !== staffForm.confirm_password) {
      setStaffAlert({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      const data = await apiCreateStaffMember(staffForm);
      setStaffAlert({
        type: 'success',
        message: `Staff account created successfully! Staff ID: ${data.user_id}`,
      });
      setStaffForm({
        name: '',
        staff_id: '',
        department: 'CSE',
        password: '',
        confirm_password: '',
      });
      refreshAll();
    } catch (err) {
      setStaffAlert({ type: 'error', message: err.message || 'Failed to create staff account.' });
    }
  };

  // 3. Submit Upload Paper
  const handleUploadPaper = async (e) => {
    e.preventDefault();
    setUploadAlert(null);

    if (!uploadSubId) {
      setUploadAlert({ type: 'error', message: 'Please select a valid subject.' });
      return;
    }
    if (!uploadFile) {
      setUploadAlert({ type: 'error', message: 'Please select a PDF file to upload.' });
      return;
    }
    if (!uploadFile.name.toLowerCase().endsWith('.pdf')) {
      setUploadAlert({ type: 'error', message: 'Only PDF documents are allowed (.pdf).' });
      return;
    }

    const formData = new FormData();
    formData.append('subject_id', uploadSubId);
    formData.append('academic_year', uploadYear);
    formData.append('semester', uploadSem);
    formData.append('file', uploadFile);

    setUploading(true);
    try {
      const res = await apiUploadPaper(formData);
      setUploadAlert({
        type: 'success',
        message: `Question paper '${res.file_name}' uploaded successfully.`,
      });
      setUploadFile(null);
      // Reset file input
      const fileInput = document.getElementById('paperFileInput');
      if (fileInput) fileInput.value = '';
      refreshAll();
    } catch (err) {
      setUploadAlert({ type: 'error', message: err.message || 'Failed to upload question paper.' });
    } finally {
      setUploading(false);
    }
  };

  // 4. Delete Paper
  const handleDeletePaper = async (id, fileName) => {
    if (!window.confirm(`Are you sure you want to delete question paper "${fileName}"?\nThis permanently removes the file.`)) {
      return;
    }
    try {
      await apiDeletePaper(id);
      refreshAll();
    } catch (err) {
      alert(err.message || 'Failed to delete question paper.');
    }
  };

  // 5. Delete Student
  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete student "${studentName}" (${studentId})?\nThis permanently deletes the student account.`)) {
      return;
    }
    try {
      await apiDeleteStudent(studentId);
      refreshAll();
    } catch (err) {
      alert(err.message || 'Failed to delete student.');
    }
  };

  // 6. Delete Staff
  const handleDeleteStaff = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to delete staff member "${staffName}" (${staffId})?\nThis permanently removes the account.`)) {
      return;
    }
    try {
      await apiDeleteStaffMember(staffId);
      refreshAll();
    } catch (err) {
      alert(err.message || 'Failed to delete staff member.');
    }
  };

  const isAdmin = user?.role === 'admin';

  // Restrict admin-only tabs
  useEffect(() => {
    if (!isAdmin && (activeTab === 'create_student' || activeTab === 'create_staff')) {
      setActiveTab('overview');
    }
  }, [isAdmin, activeTab]);

  return (
    <div className="dashboard-layout">
      <Navbar />

      <div className="admin-shell">
        {/* Sidebar Tabs */}
        <aside className="sidebar-nav">
          <ul className="sidebar-menu">
            <li>
              <button
                className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <span>🏛️</span> Institutional Overview
              </button>
            </li>
            {isAdmin && (
              <>
                <li>
                  <button
                    className={`nav-tab-btn ${activeTab === 'create_student' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create_student')}
                  >
                    <span>👤</span> Create Student
                  </button>
                </li>
                <li>
                  <button
                    className={`nav-tab-btn ${activeTab === 'create_staff' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create_staff')}
                  >
                    <span>👔</span> Create Staff
                  </button>
                </li>
              </>
            )}
            <li>
              <button
                className={`nav-tab-btn ${activeTab === 'upload_paper' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload_paper')}
              >
                <span>📤</span> Upload Paper
              </button>
            </li>
            <li>
              <button
                className={`nav-tab-btn ${activeTab === 'manage_papers' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage_papers')}
              >
                <span>📑</span> Manage Papers
              </button>
            </li>
            <li>
              <button
                className={`nav-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                <span>👥</span> Student Directory
              </button>
            </li>
          </ul>
        </aside>

        {/* Main Panels */}
        <main className="admin-main-panel">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <section className="panel-card">
              <h2 className="panel-title"><span>🏛️</span> Institutional Overview</h2>
              <p className="panel-subtitle">Welcome to the Gnanamani College Question Paper repository control center.</p>

              <div className="stats-grid">
                <div className="stat-card stat-blue">
                  <div className="stat-icon">📄</div>
                  <div className="stat-info">
                    <h4>{papers.length}</h4>
                    <p>Uploaded Question Papers</p>
                  </div>
                </div>

                <div className="stat-card stat-green">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-info">
                    <h4>{students.length}</h4>
                    <p>Registered Students</p>
                  </div>
                </div>

                <div className="stat-card stat-purple">
                  <div className="stat-icon">👔</div>
                  <div className="stat-info">
                    <h4>{staffList.length}</h4>
                    <p>Staff & Faculty</p>
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', color: '#0f2b5c', marginTop: '28px', marginBottom: '12px' }}>
                Recent Question Paper Uploads
              </h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Dept</th>
                      <th>Subject</th>
                      <th>Academic Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {papers.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.file_name}</strong></td>
                        <td><span className="badge-tag badge-dept">{p.department_code}</span></td>
                        <td>[{p.subject_code}] {p.subject_name}</td>
                        <td><strong>{p.academic_year}</strong></td>
                      </tr>
                    ))}
                    {papers.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                          No question papers uploaded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 2: CREATE STUDENT (ADMIN ONLY) */}
          {activeTab === 'create_student' && isAdmin && (
            <section className="panel-card">
              <h2 className="panel-title"><span>👤</span> Create Student Account</h2>
              <p className="panel-subtitle">
                System dynamically assigns student ID based on Formula: <code>YY + DEPT + NUMBER</code>.
              </p>

              {studentAlert && (
                <div className={`alert-box ${studentAlert.type}`}>
                  {studentAlert.message}
                </div>
              )}

              <form onSubmit={handleCreateStudent}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Student Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Priya Ramesh"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Joining Year *</label>
                    <input
                      type="text"
                      placeholder="e.g. 2024"
                      value={studentForm.joining_year}
                      onChange={(e) => setStudentForm({ ...studentForm, joining_year: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      value={studentForm.department}
                      onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                      required
                    >
                      {departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Student Number (Roll) *</label>
                    <input
                      type="text"
                      placeholder="e.g. 025"
                      value={studentForm.student_number}
                      onChange={(e) => setStudentForm({ ...studentForm, student_number: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      placeholder="Enter student password"
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm Password *</label>
                    <input
                      type="password"
                      placeholder="Confirm student password"
                      value={studentForm.confirm_password}
                      onChange={(e) => setStudentForm({ ...studentForm, confirm_password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="id-preview-box">
                  <div className="id-preview-info">
                    <strong>Auto Computed Student ID:</strong> System will assign this identifier.
                  </div>
                  <div className="id-preview-badge">{computedStudentId}</div>
                </div>

                <button type="submit" className="btn-submit">
                  <span>➕ Create Student Account</span>
                </button>
              </form>
            </section>
          )}

          {/* TAB 3: CREATE STAFF (ADMIN ONLY) */}
          {activeTab === 'create_staff' && isAdmin && (
            <section className="panel-card">
              <h2 className="panel-title"><span>👔</span> Create Staff Account</h2>
              <p className="panel-subtitle">Register new faculty or administrative staff members for Gnanamani College.</p>

              {staffAlert && (
                <div className={`alert-box ${staffAlert.type}`}>
                  {staffAlert.message}
                </div>
              )}

              <form onSubmit={handleCreateStaff}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Staff Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. K. Ramesh"
                      value={staffForm.name}
                      onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Staff ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. STAFF002"
                      value={staffForm.staff_id}
                      onChange={(e) => setStaffForm({ ...staffForm, staff_id: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      value={staffForm.department}
                      onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                      required
                    >
                      {departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={staffForm.password}
                      onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm Password *</label>
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={staffForm.confirm_password}
                      onChange={(e) => setStaffForm({ ...staffForm, confirm_password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit">
                  <span>➕ Create Staff Account</span>
                </button>
              </form>

              <h3 style={{ fontSize: '1.1rem', color: '#0f2b5c', marginTop: '30px', marginBottom: '12px' }}>
                Current Staff Directory
              </h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Staff ID</th>
                      <th>Staff Name</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((s, idx) => {
                      const isSelf = user?.user_id === s.user_id;
                      return (
                        <tr key={s.id || s.user_id}>
                          <td>{idx + 1}</td>
                          <td><strong style={{ fontFamily: 'monospace', color: '#0f2b5c' }}>{s.user_id}</strong></td>
                          <td>{s.name}</td>
                          <td><span className="badge-tag badge-dept">{s.department}</span></td>
                          <td><span className="badge-tag badge-sem">{s.role}</span></td>
                          <td>
                            {isSelf ? (
                              <span style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                Current Account
                              </span>
                            ) : isAdmin ? (
                              <button
                                className="btn-sm-delete"
                                onClick={() => handleDeleteStaff(s.user_id, s.name)}
                              >
                                Delete
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Restricted</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {staffList.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                          No staff accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 4: UPLOAD PAPER */}
          {activeTab === 'upload_paper' && (
            <section className="panel-card">
              <h2 className="panel-title"><span>📤</span> Upload Question Paper</h2>
              <p className="panel-subtitle">Upload verified Anna University semester exam question papers in PDF format.</p>

              {uploadAlert && (
                <div className={`alert-box ${uploadAlert.type}`}>
                  {uploadAlert.message}
                </div>
              )}

              <form onSubmit={handleUploadPaper}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      value={uploadDept}
                      onChange={(e) => setUploadDept(e.target.value)}
                      required
                    >
                      {departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Regulation *</label>
                    <select
                      value={uploadReg}
                      onChange={(e) => setUploadReg(e.target.value)}
                      required
                    >
                      {regulations.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Semester *</label>
                    <select
                      value={uploadSem}
                      onChange={(e) => setUploadSem(e.target.value)}
                      required
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Subject *</label>
                    <select
                      value={uploadSubId}
                      onChange={(e) => setUploadSubId(e.target.value)}
                      required
                    >
                      {uploadSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject_code} - {s.subject_name}
                        </option>
                      ))}
                      {uploadSubjects.length === 0 && (
                        <option value="">No subjects found for this selection</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Academic Year *</label>
                    <select
                      value={uploadYear}
                      onChange={(e) => setUploadYear(e.target.value)}
                      required
                    >
                      {['2023', '2024', '2025', '2026'].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Question Paper PDF File *</label>
                    <input
                      id="paperFileInput"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setUploadFile(e.target.files[0] || null)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={uploading}>
                  {uploading ? (
                    <>
                      <span className="spinner"></span> Uploading PDF...
                    </>
                  ) : (
                    <>
                      <span>🚀 Upload Question Paper</span>
                    </>
                  )}
                </button>
              </form>
            </section>
          )}

          {/* TAB 5: MANAGE PAPERS */}
          {activeTab === 'manage_papers' && (
            <section className="panel-card">
              <h2 className="panel-title"><span>📑</span> Manage Question Papers</h2>
              <p className="panel-subtitle">Review, preview, download, or delete stored question paper documents.</p>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Dept</th>
                      <th>Subject</th>
                      <th>Sem</th>
                      <th>Year</th>
                      <th>Uploaded At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {papers.map((p) => {
                      const viewUrl = getPaperViewUrl(p.id, user?.user_id);
                      const downloadUrl = getPaperDownloadUrl(p.id, user?.user_id);

                      return (
                        <tr key={p.id}>
                          <td><strong>{p.file_name}</strong></td>
                          <td><span className="badge-tag badge-dept">{p.department_code}</span></td>
                          <td>[{p.subject_code}] {p.subject_name}</td>
                          <td><span className="badge-tag badge-sem">Sem {p.semester}</span></td>
                          <td><strong>{p.academic_year}</strong></td>
                          <td>{p.uploaded_at?.slice(0, 16)}</td>
                          <td>
                            <div className="table-actions">
                              <a
                                href={viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-sm-view"
                              >
                                View
                              </a>
                              <a
                                href={downloadUrl}
                                download
                                className="btn-sm-download"
                              >
                                Download
                              </a>
                              <button
                                className="btn-sm-delete"
                                onClick={() => handleDeletePaper(p.id, p.file_name)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {papers.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                          No question papers uploaded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 6: STUDENT DIRECTORY */}
          {activeTab === 'students' && (
            <section className="panel-card">
              <h2 className="panel-title"><span>👥</span> Registered Students Directory</h2>
              <p className="panel-subtitle">Comprehensive list of student accounts provisioned by staff.</p>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => (
                      <tr key={s.id || s.user_id}>
                        <td>{idx + 1}</td>
                        <td><strong style={{ fontFamily: 'monospace', color: '#0f2b5c' }}>{s.user_id}</strong></td>
                        <td>{s.name}</td>
                        <td><span className="badge-tag badge-dept">{s.department}</span></td>
                        <td><span className="badge-tag badge-sem">{s.role}</span></td>
                        <td>
                          {isAdmin ? (
                            <button
                              className="btn-sm-delete"
                              onClick={() => handleDeleteStudent(s.user_id, s.name)}
                            >
                              Delete
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>View Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                          No student accounts created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
