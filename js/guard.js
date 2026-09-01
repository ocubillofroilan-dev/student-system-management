/**
 * guard.js — include this on every page that requires login
 * (dashboard, profile, course, schedule, attendance, grades).
 * It redirects to login.html if there's no session, applies the
 * role-based CSS classes, fills in the navbar name, and wires logout.
 */
(function () {
  const user = window.api.getStoredUser();
  const token = window.api.getToken();

  if (!user || !token) {
    window.location.href = "login.html";
    return;
  }

  // Let CSS show/hide .teacher-only / .student-only elements
  document.body.classList.add(user.role === "teacher" ? "role-teacher" : "role-student");

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-user-name]").forEach((el) => {
      el.textContent = `${user.first_name} ${user.last_name}`;
    });
    document.querySelectorAll("[data-user-id]").forEach((el) => {
      el.textContent = user.id_number;
    });
    document.querySelectorAll("[data-user-role]").forEach((el) => {
      el.textContent = user.role === "teacher" ? "Teacher" : "Student";
      el.classList.add("role-badge", user.role);
    });
    document.querySelectorAll("[data-logout]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.api.clearSession();
        window.location.href = "index.html";
      });
    });

    // Highlight the current page in the nav
    const current = window.location.pathname.split("/").pop();
    document.querySelectorAll(".app-navbar .nav-link").forEach((link) => {
      if (link.getAttribute("href") === current) link.classList.add("active");
    });
  });

  window.currentUser = user;
})();