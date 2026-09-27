/**
 * Gnanamani College of Technology - Question Paper Portal
 * Student Dashboard Script
 */

const API_BASE_URL = window.location.origin.includes(':5000')
  ? window.location.origin
  : 'http://127.0.0.1:5000';

let currentStudent = null;
let allLoadedPapers = [];

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
  // 1. Verify Authentication & Retrieve Profile
  const authOk = await verifyStudentAuth();
  if (!authOk) return;

  // 2. Initialize Filter Dropdowns
  await loadRegulations();
  populateAcademicYears();
  
  // Set up event listeners
  setupEventListeners();

  // 3. Initial load of subjects and papers
  await loadSubjects();
  await searchPapers();
});

/**
 * Verify current session. Only redirects if session is genuinely invalid.
 */
async function verifyStudentAuth() {
  const cached = sessionStorage.getItem('gct_user') || localStorage.getItem('gct_user');
  let cachedUser = null;
  if (cached) {
    try {
      cachedUser = JSON.parse(cached);
      if (cachedUser && cachedUser.role === 'student') {
        currentStudent = cachedUser;
        updateProfileUI(currentStudent);
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

    if (data.user.role !== 'student') {
      window.location.href = '../admin/dashboard.html';
      return false;
    }

    currentStudent = data.user;
    sessionStorage.setItem('gct_user', JSON.stringify(currentStudent));
    localStorage.setItem('gct_user', JSON.stringify(currentStudent));
    updateProfileUI(currentStudent);
    return true;
  } catch (err) {
    console.warn('Network error in verifyStudentAuth, using cached session:', err);
    if (cachedUser && cachedUser.role === 'student') {
      currentStudent = cachedUser;
      updateProfileUI(currentStudent);
      return true;
    }
    return false;
  }
}

function updateProfileUI(student) {
  const nameEl = document.getElementById('studentName');
  const idEl = document.getElementById('studentId');
  const deptEl = document.getElementById('studentDept');
  const navName = document.getElementById('navStudentName');
  const navMeta = document.getElementById('navStudentMeta');
  const avatarEl = document.getElementById('userAvatar');

  if (nameEl) nameEl.textContent = student.name;
  if (idEl) idEl.textContent = student.user_id;
  if (deptEl) deptEl.textContent = student.department;
  if (navName) navName.textContent = student.name;
  if (navMeta) navMeta.textContent = `${student.user_id} (${student.department})`;
  if (avatarEl && student.name) {
    avatarEl.textContent = student.name.charAt(0).toUpperCase();
  }
}

/**
 * Fetch available regulations
 */
async function loadRegulations() {
  const regSelect = document.getElementById('filterRegulation');
  if (!regSelect) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects/regulations`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.regulations)) {
      regSelect.innerHTML = '';
      data.regulations.forEach(reg => {
        const opt = document.createElement('option');
        opt.value = reg.code;
        opt.textContent = `${reg.name} (${reg.code})`;
        if (reg.code === 'R2023') opt.selected = true;
        regSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load regulations:', err);
  }
}

function populateAcademicYears() {
  const yearSelect = document.getElementById('filterYear');
  if (!yearSelect) return;

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  
  yearSelect.innerHTML = '<option value="">All Academic Years</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y.toString();
    opt.textContent = y.toString();
    yearSelect.appendChild(opt);
  });
}

/**
 * Load subjects based on Regulation and Semester
 */
async function loadSubjects() {
  const regSelect = document.getElementById('filterRegulation');
  const semSelect = document.getElementById('filterSemester');
  const subSelect = document.getElementById('filterSubject');
  if (!subSelect) return;

  const reg = regSelect ? regSelect.value : 'R2023';
  const sem = semSelect ? semSelect.value : '';

  subSelect.innerHTML = '<option value="">Loading subjects...</option>';

  let url = `${API_BASE_URL}/api/subjects?regulation=${encodeURIComponent(reg)}`;
  if (sem) {
    url += `&semester=${encodeURIComponent(sem)}`;
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    subSelect.innerHTML = '<option value="">All Subjects</option>';

    if (data.success && Array.isArray(data.subjects)) {
      data.subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.subject_code} - ${s.subject_name} (Sem ${s.semester})`;
        subSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load subjects:', err);
    subSelect.innerHTML = '<option value="">All Subjects</option>';
  }
}

/**
 * Fetch and display Question Papers
 */
async function searchPapers() {
  const reg = document.getElementById('filterRegulation')?.value || '';
  const sem = document.getElementById('filterSemester')?.value || '';
  const year = document.getElementById('filterYear')?.value || '';
  const subId = document.getElementById('filterSubject')?.value || '';

  const papersContainer = document.getElementById('papersContainer');
  if (papersContainer) {
    papersContainer.innerHTML = '<div class="empty-state"><p>Searching question papers...</p></div>';
  }

  let queryParams = new URLSearchParams();
  if (reg) queryParams.append('regulation', reg);
  if (sem) queryParams.append('semester', sem);
  if (year) queryParams.append('academic_year', year);
  if (subId) queryParams.append('subject_id', subId);

  try {
    const res = await fetch(`${API_BASE_URL}/api/papers?${queryParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.papers)) {
      allLoadedPapers = data.papers;
      renderPapers(allLoadedPapers);
    } else {
      allLoadedPapers = [];
      renderPapers([]);
    }
  } catch (err) {
    console.error('Failed to search papers:', err);
    allLoadedPapers = [];
    renderPapers([]);
  }
}

function renderPapers(papers) {
  const container = document.getElementById('papersContainer');
  const countEl = document.getElementById('resultsCount');
  if (!container) return;

  if (countEl) {
    countEl.textContent = `${papers.length} Question Paper${papers.length === 1 ? '' : 's'} Found`;
  }

  if (papers.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📂</div>
        <h4>No Question Papers Found</h4>
        <p>Try adjusting your filter options or selecting another semester or subject.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  papers.forEach(p => {
    const card = document.createElement('div');
    card.className = 'paper-card';

    const currentUid = (currentStudent && currentStudent.user_id) || '';
    const uidParam = currentUid ? `?user_id=${encodeURIComponent(currentUid)}` : '';
    const viewUrl = `${API_BASE_URL}/api/papers/${p.id}/view${uidParam}`;
    const downloadUrl = `${API_BASE_URL}/api/papers/${p.id}/download${uidParam}`;

    card.innerHTML = `
      <div class="paper-header">
        <div class="paper-badges">
          <span class="badge badge-code">${escapeHtml(p.subject_code)}</span>
          <span class="badge badge-sem">Semester ${p.semester}</span>
          <span class="badge badge-year">${escapeHtml(p.academic_year)}</span>
        </div>
        <h4 class="paper-title">${escapeHtml(p.subject_name)}</h4>
        <p class="paper-meta">Regulation: ${escapeHtml(p.regulation_code || 'R2023')} &bull; Dept: ${escapeHtml(p.department_code || '')}</p>
      </div>
      <div class="paper-actions">
        <a href="${viewUrl}" target="_blank" rel="noopener" class="btn-view">
          <span>👁️</span> View PDF
        </a>
        <a href="${downloadUrl}" class="btn-download">
          <span>📥</span> Download
        </a>
      </div>
    `;

    container.appendChild(card);
  });
}

function setupEventListeners() {
  const regSelect = document.getElementById('filterRegulation');
  const semSelect = document.getElementById('filterSemester');
  const searchBtn = document.getElementById('btnSearch');
  const resetBtn = document.getElementById('btnReset');
  const liveSearchInput = document.getElementById('liveSearch');
  const logoutBtn = document.getElementById('btnLogout');

  if (regSelect) regSelect.addEventListener('change', loadSubjects);
  if (semSelect) semSelect.addEventListener('change', loadSubjects);
  if (searchBtn) searchBtn.addEventListener('click', searchPapers);

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (semSelect) semSelect.value = '';
      if (document.getElementById('filterYear')) document.getElementById('filterYear').value = '';
      if (liveSearchInput) liveSearchInput.value = '';
      await loadSubjects();
      await searchPapers();
    });
  }

  if (liveSearchInput) {
    liveSearchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (!term) {
        renderPapers(allLoadedPapers);
        return;
      }

      const filtered = allLoadedPapers.filter(p => {
        return (
          (p.subject_name && p.subject_name.toLowerCase().includes(term)) ||
          (p.subject_code && p.subject_code.toLowerCase().includes(term)) ||
          (p.academic_year && p.academic_year.toString().toLowerCase().includes(term))
        );
      });
      renderPapers(filtered);
    });
  }

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
