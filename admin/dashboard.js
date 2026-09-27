/**
 * Gnanamani College of Technology - Question Paper Portal
 * Staff / Admin Dashboard Script
 */

const API_BASE_URL = window.location.origin.includes(':5000')
  ? window.location.origin
  : 'http://127.0.0.1:5000';

const DEPT_ID_PREFIX = {
  'CSE': 'CS',
  'ECE': 'EC',
  'EEE': 'EE',
  'MECH': 'ME',
  'AI&DS': 'AD',
  'BME': 'BM',
  'AGRI': 'AG',
  'PHARMA': 'PH',
  'IT': 'IT'
};

let currentStaff = null;
let allDepartments = [];
let allRegulations = [];

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const raw = sessionStorage.getItem('gct_user') || localStorage.getItem('gct_user');
  if (raw) {
    try {
      const u = JSON.parse(raw);
      if (u && u.user_id) {
        headers['X-User-Id'] = u.user_id;
      }
    } catch (e) {}
  }
  return headers;
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify Authentication & Role
  const authOk = await verifyStaffAuth();
  if (!authOk) return;

  // 2. Initialize Navigation Tabs
  setupTabNavigation();

  // 3. Load Common Meta (Departments, Regulations)
  await loadMetadata();

  // 4. Setup Forms and Listeners
  setupStudentCreationForm();
  setupStaffCreationForm();
  setupPaperUploadForm();
  setupLogout();

  // 5. Initial Data Load
  await refreshDashboardData();
});

/**
 * Check if logged-in user is staff.
 */
async function verifyStaffAuth() {
  const cached = sessionStorage.getItem('gct_user') || localStorage.getItem('gct_user');
  let cachedUser = null;
  if (cached) {
    try {
      cachedUser = JSON.parse(cached);
      if (cachedUser && (cachedUser.role === 'staff' || cachedUser.role === 'admin')) {
        currentStaff = cachedUser;
        updateStaffHeader(currentStaff);
      }
    } catch (e) {}
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (res.status === 401) {
      // If we don't even have a valid cached user, then redirect to login
      if (!cachedUser) {
        sessionStorage.removeItem('gct_user');
        localStorage.removeItem('gct_user');
        window.location.href = '../index.html';
        return false;
      }
      return true;
    }

    const data = await res.json();
    if (!data.success || !data.user) {
      if (!cachedUser) {
        sessionStorage.removeItem('gct_user');
        localStorage.removeItem('gct_user');
        window.location.href = '../index.html';
        return false;
      }
      return true;
    }

    if (data.user.role !== 'staff' && data.user.role !== 'admin') {
      window.location.href = '../student/dashboard.html';
      return false;
    }

    currentStaff = data.user;
    sessionStorage.setItem('gct_user', JSON.stringify(currentStaff));
    localStorage.setItem('gct_user', JSON.stringify(currentStaff));
    updateStaffHeader(currentStaff);
    return true;
  } catch (err) {
    console.warn('Network error in verifyStaffAuth, using cached session:', err);
    if (cachedUser && (cachedUser.role === 'staff' || cachedUser.role === 'admin')) {
      currentStaff = cachedUser;
      updateStaffHeader(currentStaff);
      return true;
    }
    return false;
  }
}

function updateStaffHeader(staff) {
  const nameEl = document.getElementById('navStaffName');
  const avatarEl = document.getElementById('staffAvatar');
  const roleLabel = staff.role === 'admin' ? 'Administrator' : 'Staff';
  if (nameEl) nameEl.textContent = `${staff.name || staff.user_id} (${roleLabel})`;
  if (avatarEl && (staff.name || staff.user_id)) {
    const letter = (staff.name || staff.user_id).charAt(0).toUpperCase();
    avatarEl.textContent = letter;
  }

  // Admin-only controls: Only Admin can create Student and Staff accounts
  const createStudentTabBtn = document.querySelector('[data-tab="tabCreateStudent"]');
  const createStaffTabBtn = document.querySelector('[data-tab="tabCreateStaff"]');
  if (staff.role !== 'admin') {
    if (createStudentTabBtn && createStudentTabBtn.parentElement) {
      createStudentTabBtn.parentElement.style.display = 'none';
    }
    if (createStaffTabBtn && createStaffTabBtn.parentElement) {
      createStaffTabBtn.parentElement.style.display = 'none';
    }
  } else {
    if (createStudentTabBtn && createStudentTabBtn.parentElement) {
      createStudentTabBtn.parentElement.style.display = '';
    }
    if (createStaffTabBtn && createStaffTabBtn.parentElement) {
      createStaffTabBtn.parentElement.style.display = '';
    }
  }
}

/**
 * Setup Tab Navigation (Sidebar)
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPanels = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      if (!targetId) return;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');

      // Refresh specific tab data when activated
      if (targetId === 'tabManagePapers') loadManagePapersTable();
      if (targetId === 'tabStudents') loadStudentsTable();
      if (targetId === 'tabCreateStaff') loadStaffTable();
      if (targetId === 'tabOverview') refreshDashboardData();
    });
  });
}

/**
 * Load Departments and Regulations
 */
async function loadMetadata() {
  try {
    const [deptRes, regRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/departments`, { headers: getAuthHeaders(), credentials: 'include' }),
      fetch(`${API_BASE_URL}/api/subjects/regulations`, { headers: getAuthHeaders(), credentials: 'include' })
    ]);

    const deptData = await deptRes.json();
    const regData = await regRes.json();

    if (deptData.success) {
      allDepartments = deptData.departments;
      populateDepartmentSelects(allDepartments);
    }

    if (regData.success) {
      allRegulations = regData.regulations;
      populateRegulationSelects(allRegulations);
    }
  } catch (err) {
    console.error('Metadata load error:', err);
  }
}

function populateDepartmentSelects(depts) {
  const createDeptSelect = document.getElementById('studentDept');
  const uploadDeptSelect = document.getElementById('uploadDept');

  const populate = (selectEl, defaultVal) => {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.code;
      opt.textContent = `${d.code} - ${d.name}`;
      if (d.code === defaultVal) opt.selected = true;
      selectEl.appendChild(opt);
    });
  };

  populate(createDeptSelect, 'CSE');
  populate(uploadDeptSelect, 'CSE');
  populate(document.getElementById('newStaffDept'), 'CSE');
}

function populateRegulationSelects(regs) {
  const uploadRegSelect = document.getElementById('uploadRegulation');
  if (!uploadRegSelect) return;

  uploadRegSelect.innerHTML = '';
  regs.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.code;
    opt.textContent = `${r.name} (${r.code})`;
    if (r.code === 'R2023') opt.selected = true;
    uploadRegSelect.appendChild(opt);
  });
}

/**
 * ============================================================
 * CREATE STUDENT ACCOUNT LOGIC
 * ============================================================
 */
function setupStudentCreationForm() {
  const form = document.getElementById('createStudentForm');
  const nameInput = document.getElementById('studentName');
  const yearInput = document.getElementById('studentYear');
  const deptSelect = document.getElementById('studentDept');
  const numInput = document.getElementById('studentNum');
  const passInput = document.getElementById('studentPass');
  const confirmPassInput = document.getElementById('studentConfirmPass');
  const previewBadge = document.getElementById('generatedIdPreview');
  const alertBox = document.getElementById('createStudentAlert');

  // Live ID generator preview calculation
  const updateGeneratedIdPreview = () => {
    const yearVal = (yearInput?.value || '').trim();
    const deptVal = (deptSelect?.value || 'CSE').trim();
    const numVal = (numInput?.value || '').trim();

    let yy = '23';
    if (yearVal.length === 4 && /^\d+$/.test(yearVal)) {
      yy = yearVal.slice(-2);
    } else if (yearVal.length === 2 && /^\d+$/.test(yearVal)) {
      yy = yearVal;
    }

    const deptPrefix = DEPT_ID_PREFIX[deptVal.toUpperCase()] || deptVal.slice(0, 2).toUpperCase();
    const cleanNum = numVal.replace(/\D/g, '') || '001';
    const paddedNum = cleanNum.padStart(3, '0');

    const generatedId = `${yy}${deptPrefix}${paddedNum}`;
    if (previewBadge) previewBadge.textContent = generatedId;
    return generatedId;
  };

  [yearInput, deptSelect, numInput].forEach(el => {
    if (el) el.addEventListener('input', updateGeneratedIdPreview);
    if (el) el.addEventListener('change', updateGeneratedIdPreview);
  });

  updateGeneratedIdPreview();

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(alertBox);

      const name = nameInput.value.trim();
      const joining_year = yearInput.value.trim();
      const department = deptSelect.value.trim();
      const student_number = numInput.value.trim();
      const password = passInput.value.trim();
      const confirm_password = confirmPassInput.value.trim();

      if (!name || !joining_year || !department || !student_number || !password) {
        showStaffAlert(alertBox, 'All fields are required.', 'error');
        return;
      }

      if (password !== confirm_password) {
        showStaffAlert(alertBox, 'Passwords do not match.', 'error');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/staff/students`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({
            name,
            joining_year,
            department,
            student_number,
            password,
            confirm_password
          })
        });

        const data = await res.json();

        if (res.status === 201 && data.success) {
          showStaffAlert(alertBox, `Student account created successfully. Student ID: ${data.user_id}`, 'success');
          nameInput.value = '';
          passInput.value = '';
          confirmPassInput.value = '';
          const currentNum = parseInt(student_number, 10);
          if (!isNaN(currentNum)) {
            numInput.value = String(currentNum + 1).padStart(3, '0');
          }
          updateGeneratedIdPreview();
          refreshDashboardData();
        } else if (res.status === 409) {
          showStaffAlert(alertBox, 'Student ID already exists.', 'error');
        } else {
          showStaffAlert(alertBox, data.message || 'Failed to create student account.', 'error');
        }
      } catch (err) {
        console.error('Create student error:', err);
        showStaffAlert(alertBox, 'Network error. Could not connect to backend.', 'error');
      }
    });
  }
}

/**
 * ============================================================
 * CREATE STAFF ACCOUNT LOGIC
 * ============================================================
 */
function setupStaffCreationForm() {
  const form = document.getElementById('createStaffForm');
  const nameInput = document.getElementById('newStaffName');
  const idInput = document.getElementById('newStaffId');
  const deptSelect = document.getElementById('newStaffDept');
  const passInput = document.getElementById('newStaffPass');
  const confirmPassInput = document.getElementById('newStaffConfirmPass');
  const alertBox = document.getElementById('createStaffAlert');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(alertBox);

      const name = nameInput.value.trim();
      const staff_id = idInput.value.trim().toUpperCase();
      const department = deptSelect.value.trim();
      const password = passInput.value.trim();
      const confirm_password = confirmPassInput.value.trim();

      if (!name || !staff_id || !department || !password) {
        showStaffAlert(alertBox, 'All fields are required.', 'error');
        return;
      }

      if (password !== confirm_password) {
        showStaffAlert(alertBox, 'Passwords do not match.', 'error');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/staff/staff-members`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({
            name,
            staff_id,
            department,
            password,
            confirm_password
          })
        });

        const data = await res.json();

        if (res.status === 201 && data.success) {
          showStaffAlert(alertBox, `Staff account created successfully! Staff ID: ${data.user_id}`, 'success');
          nameInput.value = '';
          idInput.value = '';
          passInput.value = '';
          confirmPassInput.value = '';
          loadStaffTable();
        } else if (res.status === 409) {
          showStaffAlert(alertBox, 'Staff ID already exists.', 'error');
        } else {
          showStaffAlert(alertBox, data.message || 'Failed to create staff account.', 'error');
        }
      } catch (err) {
        console.error('Create staff error:', err);
        showStaffAlert(alertBox, 'Network error. Could not connect to backend.', 'error');
      }
    });
  }
}

async function loadStaffTable() {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px;">Loading staff directory...</td></tr>';

  try {
    const res = await fetch(`${API_BASE_URL}/api/staff/staff-members`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();

    if (data.success && Array.isArray(data.staff)) {
      if (data.staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color:#64748b;">No staff accounts found.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.staff.forEach((s, idx) => {
        const tr = document.createElement('tr');
        const isSelf = currentStaff && (currentStaff.user_id === s.user_id);
        const isAdmin = currentStaff && (currentStaff.role === 'admin');

        let actionHtml = '';
        if (isSelf) {
          actionHtml = '<span style="color:#64748b; font-size:0.85rem; font-style:italic;">Current Account</span>';
        } else if (isAdmin) {
          actionHtml = `<button class="btn-sm-delete" onclick="handleDeleteStaff('${escapeHtml(s.user_id)}', '${escapeHtml(s.name)}')">Delete</button>`;
        } else {
          actionHtml = '<span style="color:#94a3b8; font-size:0.85rem;">Restricted</span>';
        }

        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><strong style="color:var(--primary-navy); font-family:monospace; font-size:1rem;">${escapeHtml(s.user_id)}</strong></td>
          <td>${escapeHtml(s.name)}</td>
          <td><span class="badge-tag badge-dept">${escapeHtml(s.department)}</span></td>
          <td><span class="badge-tag badge-sem">${escapeHtml(s.role)}</span></td>
          <td>
            <div class="table-actions">
              ${actionHtml}
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Load staff error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color:#dc2626;">Error loading staff.</td></tr>';
  }
}

/**
 * ============================================================
 * UPLOAD QUESTION PAPER LOGIC
 * ============================================================
 */
function setupPaperUploadForm() {
  const form = document.getElementById('uploadPaperForm');
  const deptSelect = document.getElementById('uploadDept');
  const regSelect = document.getElementById('uploadRegulation');
  const semSelect = document.getElementById('uploadSemester');
  const subSelect = document.getElementById('uploadSubject');
  const fileInput = document.getElementById('paperFile');
  const alertBox = document.getElementById('uploadPaperAlert');

  const updateUploadSubjects = async () => {
    if (!subSelect) return;
    const dept = deptSelect ? deptSelect.value : 'CSE';
    const reg = regSelect ? regSelect.value : 'R2023';
    const sem = semSelect ? semSelect.value : '1';

    subSelect.innerHTML = '<option value="">Loading subjects...</option>';

    try {
      const res = await fetch(`${API_BASE_URL}/api/subjects?department=${encodeURIComponent(dept)}&regulation=${encodeURIComponent(reg)}&semester=${encodeURIComponent(sem)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const data = await res.json();

      subSelect.innerHTML = '';
      if (data.success && Array.isArray(data.subjects) && data.subjects.length > 0) {
        data.subjects.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.subject_code} - ${s.subject_name}`;
          subSelect.appendChild(opt);
        });
      } else {
        subSelect.innerHTML = '<option value="">No subjects found for this selection</option>';
      }
    } catch (err) {
      console.error('Error fetching subjects for upload:', err);
      subSelect.innerHTML = '<option value="">Failed to load subjects</option>';
    }
  };

  [deptSelect, regSelect, semSelect].forEach(el => {
    if (el) el.addEventListener('change', updateUploadSubjects);
  });

  updateUploadSubjects();

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert(alertBox);

      const subjectId = subSelect?.value;
      const academicYear = document.getElementById('uploadAcademicYear')?.value;
      const file = fileInput?.files[0];

      if (!subjectId) {
        showStaffAlert(alertBox, 'Please select a valid subject.', 'error');
        return;
      }
      if (!academicYear) {
        showStaffAlert(alertBox, 'Please select an academic year.', 'error');
        return;
      }
      if (!file) {
        showStaffAlert(alertBox, 'Please select a PDF file to upload.', 'error');
        return;
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showStaffAlert(alertBox, 'Only PDF files are accepted (.pdf).', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('subject_id', subjectId);
      formData.append('academic_year', academicYear);
      formData.append('semester', semSelect?.value || '1');
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE_URL}/api/staff/papers`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: formData
        });

        const data = await res.json();

        if (res.status === 201 && data.success) {
          showStaffAlert(alertBox, `Question paper '${data.file_name}' uploaded successfully.`, 'success');
          form.reset();
          updateUploadSubjects();
          refreshDashboardData();
        } else {
          showStaffAlert(alertBox, data.message || 'Failed to upload question paper.', 'error');
        }
      } catch (err) {
        console.error('Upload error:', err);
        showStaffAlert(alertBox, 'Network error. Could not upload question paper.', 'error');
      }
    });
  }
}

/**
 * ============================================================
 * MANAGE QUESTION PAPERS LOGIC (TABLE & DELETE)
 * ============================================================
 */
async function loadManagePapersTable() {
  const tbody = document.getElementById('managePapersTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Loading question papers...</td></tr>';

  try {
    const res = await fetch(`${API_BASE_URL}/api/staff/papers`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();

    if (data.success && Array.isArray(data.papers)) {
      if (data.papers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#64748b;">No question papers uploaded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.papers.forEach(p => {
        const tr = document.createElement('tr');
        const currentUid = (currentStaff && currentStaff.user_id) || '';
        const uidParam = currentUid ? `?user_id=${encodeURIComponent(currentUid)}` : '';
        const viewUrl = `${API_BASE_URL}/api/papers/${p.id}/view${uidParam}`;
        const downloadUrl = `${API_BASE_URL}/api/papers/${p.id}/download${uidParam}`;

        tr.innerHTML = `
          <td><strong>${escapeHtml(p.file_name)}</strong></td>
          <td><span class="badge-tag badge-dept">${escapeHtml(p.department_code || '')}</span></td>
          <td>[${escapeHtml(p.subject_code)}] ${escapeHtml(p.subject_name)}</td>
          <td><span class="badge-tag badge-sem">Sem ${p.semester}</span></td>
          <td><strong>${escapeHtml(p.academic_year)}</strong></td>
          <td>${escapeHtml(p.uploaded_at || '').slice(0, 16)}</td>
          <td>
            <div class="table-actions">
              <a href="${viewUrl}" target="_blank" class="btn-sm-view" title="View PDF">View</a>
              <a href="${downloadUrl}" class="btn-sm-download" title="Download PDF">Download</a>
              <button class="btn-sm-delete" onclick="handleDeletePaper(${p.id}, '${escapeHtml(p.file_name)}')">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Load papers error:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#dc2626;">Error loading question papers.</td></tr>';
  }
}

window.handleDeletePaper = async function(paperId, fileName) {
  if (!confirm(`Are you sure you want to delete question paper: "${fileName}"?\nThis will permanently remove the database record and file from the server.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/staff/papers/${paperId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert('Question paper deleted successfully.');
      loadManagePapersTable();
      refreshDashboardData();
    } else {
      alert(data.message || 'Failed to delete question paper.');
    }
  } catch (err) {
    console.error('Delete paper error:', err);
    alert('Network error while deleting paper.');
  }
};

/**
 * ============================================================
 * STUDENTS DIRECTORY LOGIC
 * ============================================================
 */
async function loadStudentsTable() {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Loading student directory...</td></tr>';

  try {
    const res = await fetch(`${API_BASE_URL}/api/staff/students`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();

    if (data.success && Array.isArray(data.students)) {
      if (data.students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No student accounts created yet.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.students.forEach((s, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><strong style="color:var(--primary-navy); font-family:monospace; font-size:1rem;">${escapeHtml(s.user_id)}</strong></td>
          <td>${escapeHtml(s.name)}</td>
          <td><span class="badge-tag badge-dept">${escapeHtml(s.department)}</span></td>
          <td><span class="badge-tag badge-sem">${escapeHtml(s.role)}</span></td>
          <td>
            <div class="table-actions">
              ${currentStaff && currentStaff.role === 'admin'
                ? `<button class="btn-sm-delete" onclick="handleDeleteStudent('${escapeHtml(s.user_id)}', '${escapeHtml(s.name)}')">Delete</button>`
                : `<span style="color:#94a3b8; font-size:0.85rem;">View Only</span>`
              }
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Load students error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#dc2626;">Error loading students.</td></tr>';
  }
}

window.handleDeleteStudent = async function(userId, studentName) {
  if (!confirm(`Are you sure you want to delete student account "${studentName}" (${userId})?\nThis will permanently delete the student account from the system.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/staff/students/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert(data.message || 'Student account deleted successfully.');
      loadStudentsTable();
      refreshDashboardData();
    } else {
      alert(data.message || 'Failed to delete student account.');
    }
  } catch (err) {
    console.error('Delete student error:', err);
    alert('Network error while deleting student account.');
  }
};

window.handleDeleteStaff = async function(userId, staffName) {
  if (!confirm(`Are you sure you want to delete staff account "${staffName}" (${userId})?\nThis will permanently remove the staff member from the system.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/staff/staff-members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert(data.message || 'Staff account deleted successfully.');
      loadStaffTable();
      refreshDashboardData();
    } else {
      alert(data.message || 'Failed to delete staff account.');
    }
  } catch (err) {
    console.error('Delete staff error:', err);
    alert('Network error while deleting staff account.');
  }
};

/**
 * ============================================================
 * DASHBOARD OVERVIEW & STATS
 * ============================================================
 */
async function refreshDashboardData() {
  try {
    const [papersRes, studentsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/staff/papers`, { headers: getAuthHeaders(), credentials: 'include' }),
      fetch(`${API_BASE_URL}/api/staff/students`, { headers: getAuthHeaders(), credentials: 'include' })
    ]);

    const papersData = await papersRes.json();
    const studentsData = await studentsRes.json();

    const papersCountEl = document.getElementById('statTotalPapers');
    const studentsCountEl = document.getElementById('statTotalStudents');

    if (papersCountEl && papersData.success) {
      papersCountEl.textContent = papersData.papers.length;
    }
    if (studentsCountEl && studentsData.success) {
      studentsCountEl.textContent = studentsData.students.length;
    }

    const recentTableBody = document.getElementById('recentPapersTableBody');
    if (recentTableBody && papersData.success) {
      const recent = papersData.papers.slice(0, 5);
      if (recent.length === 0) {
        recentTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:16px; color:#64748b;">No question papers uploaded yet.</td></tr>';
      } else {
        recentTableBody.innerHTML = '';
        recent.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${escapeHtml(p.file_name)}</strong></td>
            <td>${escapeHtml(p.department_code || '')}</td>
            <td>[${escapeHtml(p.subject_code)}] ${escapeHtml(p.subject_name)}</td>
            <td>${escapeHtml(p.academic_year)}</td>
          `;
          recentTableBody.appendChild(tr);
        });
      }
    }
  } catch (err) {
    console.error('Refresh stats error:', err);
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      sessionStorage.removeItem('gct_user');
      localStorage.removeItem('gct_user');
      try {
        await fetch(`${API_BASE_URL}/api/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.error('Logout error:', e);
      } finally {
        window.location.href = '../index.html';
      }
    });
  }
}

function showStaffAlert(box, message, type) {
  if (!box) return;
  box.textContent = message;
  box.className = `alert-box ${type}`;
}

function hideAlert(box) {
  if (!box) return;
  box.className = 'alert-box';
  box.style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
