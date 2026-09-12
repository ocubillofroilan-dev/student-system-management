function showError(boxId, message) {
  const box = document.getElementById(boxId);
  box.textContent = message;
  box.classList.remove("hidden");
}

function hideError(boxId) {
  document.getElementById(boxId).classList.add("hidden");
}

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