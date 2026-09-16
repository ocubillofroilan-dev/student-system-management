/**
 * auth.js — handles the login form (login.html) and signup form (signup.html).
 * Signup's Department/Course fields use the searchable dropdown component
 * from colleges.js, so colleges.js must load before this file.
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
  }
  roleInputs.forEach((input) => input.addEventListener("change", toggleStudentFields));
  toggleStudentFields();

  // Searchable Department / Course dropdowns
  let courseDropdown = createSearchableDropdown(
    "courseDropdown", [], "Choose a department first…", () => {}
  );
  const departmentDropdown = createSearchableDropdown(
    "departmentDropdown",
    COLLEGES.map((c) => ({ value: c.name, label: `${c.code} — ${c.name}` })),
    "Choose…",
    (deptName) => {
      const college = COLLEGES.find((c) => c.name === deptName);
      const programs = college ? college.programs.map((p) => ({ value: p, label: p })) : [];
      courseDropdown = createSearchableDropdown("courseDropdown", programs, "Choose…", () => {});
    }
  );

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

    const department = departmentDropdown.getValue();
    if (!department) {
      showError("signupError", "Please choose a department.");
      return;
    }
    if (role === "student" && !courseDropdown.getValue()) {
      showError("signupError", "Please choose a course/program.");
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
      department,
      course: role === "student" ? courseDropdown.getValue() : null,
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