/**
 * Gnanamani College of Technology - Question Paper Portal
 * Login JavaScript
 */

const API_BASE_URL = window.location.origin.includes(':5000')
  ? window.location.origin
  : 'http://127.0.0.1:5000';

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

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const userIdInput = document.getElementById('userId');
  const passwordInput = document.getElementById('password');
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');

  // Check if session already exists
  checkExistingSession();

  // Quick chip click handlers for test credentials
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const u = chip.getAttribute('data-user');
      const p = chip.getAttribute('data-pass');
      if (u && p) {
        userIdInput.value = u;
        passwordInput.value = p;
        hideAlert();
      }
    });
  });

  // Handle Login submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const userId = userIdInput.value.trim();
      const password = passwordInput.value.trim();

      if (!userId || !password) {
        showAlert('Please enter both User ID and Password.', 'error');
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            user_id: userId,
            password: password
          })
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data && data.success) {
          // Persist user info in both storages to prevent cross-origin cookie drops
          sessionStorage.setItem('gct_user', JSON.stringify(data.user));
          localStorage.setItem('gct_user', JSON.stringify(data.user));

          showAlert(data.message || 'Login successful. Redirecting...', 'success');
          setTimeout(() => {
            if (data.role === 'staff' || data.role === 'admin') {
              window.location.href = 'admin/dashboard.html';
            } else {
              window.location.href = 'student/dashboard.html';
            }
          }, 300);
        } else if (response.status === 401) {
          showAlert((data && data.message) ? data.message : 'Invalid login details.', 'error');
        } else if (response.status === 403) {
          showAlert('Unauthorized access.', 'error');
        } else if (response.status === 404) {
          showAlert('Account not found.', 'error');
        } else {
          showAlert((data && data.message) ? data.message : 'Login failed. Please try again.', 'error');
        }
      } catch (err) {
        console.error('Login network error:', err);
        showAlert('Backend server is not connected. Ensure the Flask server is running at http://127.0.0.1:5000.', 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  async function checkExistingSession() {
    const raw = sessionStorage.getItem('gct_user') || localStorage.getItem('gct_user');
    if (!raw) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          sessionStorage.setItem('gct_user', JSON.stringify(data.user));
          localStorage.setItem('gct_user', JSON.stringify(data.user));
          if (data.user.role === 'staff' || data.user.role === 'admin') {
            window.location.href = 'admin/dashboard.html';
          } else {
            window.location.href = 'student/dashboard.html';
          }
        }
      }
    } catch (e) {
      // Backend not yet reached, remain on login page silently
    }
  }

  function showAlert(message, type) {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert-message ${type}`;
    alertBox.style.display = 'block';
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.style.display = 'none';
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading
      ? '<span class="spinner"></span> Authenticating...'
      : '<span>Sign In</span> &rarr;';
  }
});
