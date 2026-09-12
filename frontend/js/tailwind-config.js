tailwind.config = {
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A4A',
          dark: '#121D33',
          soft: '#2A3D63',
        },
        gold: {
          DEFAULT: '#C9A227',
          light: '#E7CE7E',
        },
        ink: '#1F2430',
        muted: '#5B6472',
        border: '#E2E5EA',
        success: '#2F8F5B',
        danger: '#C4453A',
        late: '#B8791A',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
};

js
/**
 * api.js — the ONLY place that knows the backend URL and how to call it.
 * Every other script calls window.api.get/post/put/del instead of using
 * fetch() directly, so auth headers and error handling stay consistent.
 */

// CHANGE THIS to your deployed FastAPI URL once it's live on Render, e.g.
// "https://northbridge-api.onrender.com"
const API_BASE_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("ns_token");
}

function getStoredUser() {
  const raw = localStorage.getItem("ns_user");
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem("ns_token", token);
  localStorage.setItem("ns_user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("ns_token");
  localStorage.removeItem("ns_user");
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error("Can't reach the server. Is the FastAPI backend running?");
  }

  // Session expired / invalid token -> send back to login
  if (response.status === 401 && path !== "/auth/login") {
    clearSession();
    window.location.href = "login.html";
    return;
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = null; }
  }

  if (!response.ok) {
    const message = (data && data.detail) ? data.detail : `Request failed (${response.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return data;
}

window.api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  del: (path) => request("DELETE", path),
  getToken,
  getStoredUser,
  saveSession,
  clearSession,
};

/**
 * auth.js — handles the login form (login.html) and signup form (signup.html).
 * Both forms call the FastAPI /auth endpoints via api.js.
 */

function showError(boxId, message) {
  const box = document.getElementById(boxId);
  box.textContent = message;
  box.classList.remove("hidden");
}

function hideError(boxId) {
  document.getElementById(boxId).classList.add("hidden");
}

// ---------- LOGIN ----------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError("loginError");

    const id_number = document.getElementById("loginId").value.trim();
    const password = document.getElementById("loginPassword").value;
    const button = document.getElementById("loginButton");

    button.disabled = true;
    button.textContent = "Signing in...";

    try {
      const data = await window.api.post("/auth/login", { id_number, password });
      window.api.saveSession(data.access_token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      showError("loginError", err.message);
    } finally {
      button.disabled = false;
      button.textContent = "Log In";
    }
  });
}

// ---------- SIGNUP ----------
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  const roleInputs = document.querySelectorAll('input[name="role"]');
  const studentFields = document.getElementById("studentFields");

  function toggleStudentFields() {
    const role = document.querySelector('input[name="role"]:checked').value;
    studentFields.classList.toggle("hidden", role !== "student");
    studentFields.querySelectorAll("select").forEach((el) => {
      el.required = role === "student";
    });
  }
  roleInputs.forEach((input) => input.addEventListener("change", toggleStudentFields));
  toggleStudentFields();

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError("signupError");

    const role = document.querySelector('input[name="role"]:checked').value;
    const password = document.getElementById("signupPassword").value;
    const confirm_password = document.getElementById("signupConfirmPassword").value;

    if (password !== confirm_password) {
      showError("signupError", "Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      showError("signupError", "Password must be at least 6 characters.");
      return;
    }

    const payload = {
      role,
      first_name: document.getElementById("firstName").value.trim(),
      last_name: document.getElementById("lastName").value.trim(),
      middle_name: document.getElementById("middleName").value.trim(),
      id_number: document.getElementById("idNumber").value.trim(),
      password,
      confirm_password,
      year_level: role === "student" ? document.getElementById("yearLevel").value : null,
      department: document.getElementById("department").value.trim(),
      course: role === "student" ? document.getElementById("course").value.trim() : null,
    };

    const button = document.getElementById("signupButton");
    button.disabled = true;
    button.textContent = "Creating account...";

    try {
      const data = await window.api.post("/auth/signup", payload);
      window.api.saveSession(data.access_token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      showError("signupError", err.message);
    } finally {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  });
}