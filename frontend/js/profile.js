/**
 * profile.js — three modes on one page: View (read-only), Edit (the form),
 * and ID Card (a rendered digital ID built from the same profile data).
 * Requires colleges.js (for the department/program dropdowns) to load first.
 */
let currentProfile = null;
let pendingPhoto = null;

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function renderPhoto(container, photoDataUrl) {
  if (photoDataUrl) {
    container.innerHTML = `<img src="${photoDataUrl}" class="w-full h-full object-cover">`;
  } else {
    container.innerHTML = `<span>No Photo</span>`;
  }
}

function renderView(p) {
  const fullName = `${p.first_name} ${p.middle_name ? p.middle_name + " " : ""}${p.last_name}`;
  document.querySelector('[data-view="fullName"]').textContent = fullName;
  document.querySelector('[data-view="idNumber"]').textContent = p.id_number;
  document.querySelector('[data-view="idNumber2"]').textContent = p.id_number;
  document.querySelector('[data-view="birthdate"]').textContent = p.birthdate ? fmtDate(p.birthdate) : "—";
  document.querySelector('[data-view="gender"]').textContent = p.gender || "—";
  document.querySelector('[data-view="department"]').textContent = p.department || "—";
  document.querySelector('[data-view="yearLevel"]').textContent = p.role === "student" ? (p.year_level || "—") : "N/A";
  document.querySelector('[data-view="course"]').textContent = p.role === "student" ? (p.course || "—") : "N/A";
  document.querySelector('[data-view="enrolledSince"]').textContent = fmtDate(p.created_at);
  renderPhoto(document.getElementById("viewPhotoWrap"), p.photo_id);
}

function renderIdCard(p) {
  document.querySelector('[data-id="fullName"]').textContent = `${p.first_name} ${p.last_name}`;
  document.querySelector('[data-id="department"]').textContent = p.department || "—";
  document.querySelector('[data-id="course"]').textContent = p.role === "student" ? (p.course || "—") : "N/A";
  document.querySelector('[data-id="role"]').textContent = p.role === "teacher" ? "Professor" : "Student";
  document.querySelector('[data-id="roleLabel"]').textContent = p.role === "teacher" ? "Professor" : "Student";
  document.querySelector('[data-id="idNumber"]').textContent = p.id_number;
  renderPhoto(document.getElementById("idCardPhotoWrap"), p.photo_id);
}

function fillEditForm(p) {
  document.getElementById("pFirstName").value = p.first_name || "";
  document.getElementById("pLastName").value = p.last_name || "";
  document.getElementById("pMiddleName").value = p.middle_name || "";
  document.getElementById("pIdNumber").value = p.id_number || "";
  document.getElementById("pRole").value = p.role === "teacher" ? "Professor" : "Student";
  document.getElementById("pBirthdate").value = p.birthdate || "";
  document.getElementById("pGender").value = p.gender || "";

  populateDepartmentDropdown(document.getElementById("pDepartment"));
  document.getElementById("pDepartment").value = p.department || "";

  const studentBlock = document.getElementById("studentOnlyFields");
  if (p.role === "student") {
    studentBlock.classList.remove("hidden");
    document.getElementById("pYearLevel").value = p.year_level || "";
    populateProgramDropdown(document.getElementById("pCourse"), p.department);
    document.getElementById("pCourse").value = p.course || "";
  } else {
    studentBlock.classList.add("hidden");
  }

  renderPhoto(document.getElementById("editPhotoPreview"), p.photo_id);
}

function showMode(mode) {
  document.getElementById("viewMode").classList.toggle("hidden", mode !== "view");
  document.getElementById("editMode").classList.toggle("hidden", mode !== "edit");
  document.getElementById("idCardMode").classList.toggle("hidden", mode !== "id");
}

async function loadProfile() {
  try {
    currentProfile = await window.api.get("/profile");
    renderView(currentProfile);
    renderIdCard(currentProfile);
  } catch (err) {
    document.getElementById("profileError").textContent = err.message;
    document.getElementById("profileError").classList.remove("hidden");
  }
}

document.getElementById("btnEdit").addEventListener("click", () => {
  pendingPhoto = null;
  fillEditForm(currentProfile);
  showMode("edit");
});

document.getElementById("btnShowId").addEventListener("click", () => showMode("id"));
document.getElementById("btnCloseId").addEventListener("click", () => showMode("view"));
document.getElementById("btnCancelEdit").addEventListener("click", () => showMode("view"));

document.getElementById("pDepartment").addEventListener("change", (e) => {
  populateProgramDropdown(document.getElementById("pCourse"), e.target.value);
});

document.getElementById("photoInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingPhoto = reader.result;
    renderPhoto(document.getElementById("editPhotoPreview"), pendingPhoto);
  };
  reader.readAsDataURL(file);
});

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const successBox = document.getElementById("profileSuccess");
  const errorBox = document.getElementById("profileError");
  successBox.classList.add("hidden");
  errorBox.classList.add("hidden");

  const payload = {
    first_name: document.getElementById("pFirstName").value.trim(),
    last_name: document.getElementById("pLastName").value.trim(),
    middle_name: document.getElementById("pMiddleName").value.trim(),
    department: document.getElementById("pDepartment").value,
    birthdate: document.getElementById("pBirthdate").value,
    gender: document.getElementById("pGender").value,
  };
  if (window.currentUser.role === "student") {
    payload.year_level = document.getElementById("pYearLevel").value;
    payload.course = document.getElementById("pCourse").value;
  }
  if (pendingPhoto) {
    payload.photo_id = pendingPhoto;
  }

  try {
    const updated = await window.api.put("/profile", payload);
    window.api.saveSession(window.api.getToken(), updated);
    currentProfile = updated;
    renderView(updated);
    renderIdCard(updated);
    showMode("view");
    successBox.classList.remove("hidden");
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove("hidden");
  }
});

document.addEventListener("DOMContentLoaded", loadProfile);