/**
 * API Service for Gnanamani College Question Paper Portal
 */

export const API_BASE_URL = window.location.port === '5173'
  ? '' // Proxy handles it via vite.config.js
  : (window.location.origin.includes(':5000') ? window.location.origin : 'http://127.0.0.1:5000');

export function getAuthHeaders(extra = {}) {
  const headers = { ...extra };
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

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getAuthHeaders(options.headers || {});
  
  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Authentication
export const apiLogin = (user_id, password) =>
  request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, password }),
  });

export const apiLogout = () =>
  request('/api/logout', { method: 'POST' });

export const apiGetCurrentUser = (userId) => {
  const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return request(`/api/users/me${qs}`, { method: 'GET' });
};

// Academic Metadata
export const apiGetDepartments = () =>
  request('/api/departments', { method: 'GET' });

export const apiGetRegulations = () =>
  request('/api/subjects/regulations', { method: 'GET' });

export const apiGetSubjects = (dept, reg, sem) => {
  const params = new URLSearchParams();
  if (dept) params.append('department', dept);
  if (reg) params.append('regulation', reg);
  if (sem) params.append('semester', sem);
  return request(`/api/subjects?${params.toString()}`, { method: 'GET' });
};

// Question Papers
export const apiGetPapers = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      params.append(k, v);
    }
  });
  return request(`/api/papers?${params.toString()}`, { method: 'GET' });
};

export const apiGetStaffPapers = () =>
  request('/api/staff/papers', { method: 'GET' });

export const apiUploadPaper = (formData) => {
  const headers = getAuthHeaders();
  // Do NOT set Content-Type header manually for FormData, browser sets boundary automatically
  return fetch(`${API_BASE_URL}/api/staff/papers`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  }).then(async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.message || 'Upload failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  });
};

export const apiDeletePaper = (id) =>
  request(`/api/staff/papers/${id}`, { method: 'DELETE' });

// Students Management
export const apiGetStudents = () =>
  request('/api/staff/students', { method: 'GET' });

export const apiCreateStudent = (data) =>
  request('/api/staff/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const apiDeleteStudent = (userId) =>
  request(`/api/staff/students/${encodeURIComponent(userId)}`, { method: 'DELETE' });

// Staff Management
export const apiGetStaffMembers = () =>
  request('/api/staff/staff-members', { method: 'GET' });

export const apiCreateStaffMember = (data) =>
  request('/api/staff/staff-members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const apiDeleteStaffMember = (userId) =>
  request(`/api/staff/staff-members/${encodeURIComponent(userId)}`, { method: 'DELETE' });

// PDF URLs
export const getPaperViewUrl = (id, userId) => {
  const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const base = API_BASE_URL || 'http://127.0.0.1:5000';
  return `${base}/api/papers/${id}/view${qs}`;
};

export const getPaperDownloadUrl = (id, userId) => {
  const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  const base = API_BASE_URL || 'http://127.0.0.1:5000';
  return `${base}/api/papers/${id}/download${qs}`;
};
