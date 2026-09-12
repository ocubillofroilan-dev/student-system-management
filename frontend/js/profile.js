/**
 * profile.js — everyone (student or teacher) can view and edit
 * their OWN profile here. There is no way to edit anyone else's.
 */
async function loadProfile() {
  try {
    const me = await window.api.get("/profile");
    document.getElementById("pFirstName").value = me.first_name || "";
    document.getElementById("pLastName").value = me.last_name || "";
    document.getElementById("pMiddleName").value = me.middle_name || "";
    document.getElementById("pIdNumber").value = me.id_number || "";
    document.getElementById("pRole").value = me.role === "teacher" ? "Teacher" : "Student";
    document.getElementById("pDepartment").value = me.department || "";

    const studentBlock = document.getElementById("studentOnlyFields");
    if (me.role === "student") {
      studentBlock.classList.remove("hidden");
      document.getElementById("pYearLevel").value = me.year_level || "";
      document.getElementById("pCourse").value = me.course || "";
    } else {
      studentBlock.classList.add("hidden");
    }
  } catch (err) {
    document.getElementById("profileError").textContent = err.message;
    document.getElementById("profileError").classList.remove("hidden");
  }
}

const profileForm = document.getElementById("profileForm");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const successBox = document.getElementById("profileSuccess");
    const errorBox = document.getElementById("profileError");
    successBox.classList.add("hidden");
    errorBox.classList.add("hidden");

    const payload = {
      first_name: document.getElementById("pFirstName").value.trim(),
      last_name: document.getElementById("pLastName").value.trim(),
      middle_name: document.getElementById("pMiddleName").value.trim(),
      department: document.getElementById("pDepartment").value.trim(),
    };
    if (window.currentUser.role === "student") {
      payload.year_level = document.getElementById("pYearLevel").value;
      payload.course = document.getElementById("pCourse").value.trim();
    }

    try {
      const updated = await window.api.put("/profile", payload);
      // keep localStorage in sync so the navbar name updates immediately
      window.api.saveSession(window.api.getToken(), updated);
      successBox.classList.remove("hidden");
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", loadProfile);