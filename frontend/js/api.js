/**
 * api.js — the ONLY place that knows the backend URL and how to call it.
 * Every other script calls window.api.get/post/put/del/upload instead of
 * using fetch() directly, so auth headers and error handling stay consistent.
 */

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

async function handleResponse(response, path) {
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

  return handleResponse(response, path);
}

// File uploads: send FormData and let the browser set the multipart header itself.
async function upload(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers, body: formData });
  } catch (err) {
    throw new Error("Can't reach the server. Is the FastAPI backend running?");
  }

  return handleResponse(response, path);
}

window.api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  del: (path) => request("DELETE", path),
  upload,
  getToken,
  getStoredUser,
  saveSession,
  clearSession,
};