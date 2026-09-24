/**
 * profile.js — three modes: View, Edit, ID Card. The card flips to
 * show its back purely via CSS :hover (see the <style> block in
 * profile.html) — no JS needed for the flip itself. Two separate
 * download buttons capture the front and back as PNGs; the back is
 * temporarily un-rotated before capture so it isn't saved mirrored,
 * then restored right after. Requires colleges.js for the department/
 * program dropdowns, and html2canvas (loaded in profile.html) for
 * downloads.
 */
let currentProfile = null;
let pendingPhoto = null;

const DEFAULT_QUOTE = "Where learning becomes growth, and dreams become achievements.";

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
  document.querySelector('[data-view="status"]').textContent = p.status || "—";
  document.querySelector('[data-view="department"]').textContent = p.department || "—";
  document.querySelector('[data-view="programLabel"]').textContent = p.role === "teacher" ? "Program / Specialization" : "Course / Program";
  document.querySelector('[data-view="course"]').textContent = p.course || "—";
  document.querySelector('[data-view="yearLevel"]').textContent = p.role === "student" ? (p.year_level || "—") : "N/A";
  document.querySelector('[data-view="validUntil"]').textContent = p.valid_until ? fmtDate(p.valid_until) : "—";
  document.querySelector('[data-view="contactNumber"]').textContent = p.contact_number || "—";
  document.querySelector('[data-view="email"]').textContent = p.email || "—";
  document.querySelector('[data-view="address"]').textContent = p.address || "—";
  document.querySelector('[data-view="emergencyName"]').textContent = p.emergency_contact_name || "—";
  document.querySelector('[data-view="emergencyNumber"]').textContent = p.emergency_contact_number || "—";
  document.querySelector('[data-view="quote"]').textContent = p.personal_quote || "—";
  document.querySelector('[data-view="enrolledSince"]').textContent = fmtDate(p.created_at);
  renderPhoto(document.getElementById("viewPhotoWrap"), p.photo_id);
}

function renderIdCard(p) {
  const fullName = `${p.first_name} ${p.last_name}`;
  document.querySelector('[data-id="fullName"]').textContent = fullName;
  document.querySelector('[data-id="fullNameBack"]').textContent = fullName;
  document.querySelector('[data-id="department"]').textContent = p.department || "—";
  document.querySelector('[data-id="yearLevel"]').textContent = p.role === "student" ? (p.year_level || "—") : "N/A";
  document.querySelector('[data-id="idNumber"]').textContent = p.role === "teacher" ? `${p.id_number}-P` : p.id_number;
  document.querySelector('[data-id="roleLabel"]').textContent = p.role === "teacher" ? "Professor ID" : "Student ID";
  document.querySelector('[data-id="programLabel"]').textContent = p.role === "teacher" ? "Specialization" : "Program";
  document.querySelector('[data-id="program"]').textContent = p.course || "—";
  document.querySelector('[data-id="status"]').textContent = p.status || "—";
  document.querySelector('[data-id="validUntil"]').textContent = p.valid_until ? fmtDate(p.valid_until) : "—";
  document.querySelector('[data-id="contactNumber"]').textContent = p.contact_number || "—";
  document.querySelector('[data-id="email"]').textContent = p.email || "—";
  document.querySelector('[data-id="address"]').textContent = p.address || "—";
  document.querySelector('[data-id="emergencyName"]').textContent = p.emergency_contact_name || "—";
  document.querySelector('[data-id="emergencyNumber"]').textContent = p.emergency_contact_number || "—";
  document.querySelector('[data-id="quoteCard"]').textContent = `"${p.personal_quote || DEFAULT_QUOTE}"`;
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
  document.getElementById("pStatus").value = p.status || "";
  document.getElementById("pValidUntil").value = p.valid_until || "";
  document.getElementById("pContactNumber").value = p.contact_number || "";
  document.getElementById("pEmail").value = p.email || "";
  document.getElementById("pAddress").value = p.address || "";
  document.getElementById("pEmergencyName").value = p.emergency_contact_name || "";
  document.getElementById("pEmergencyNumber").value = p.emergency_contact_number || "";
  document.getElementById("pQuote").value = p.personal_quote || "";

  populateDepartmentDropdown(document.getElementById("pDepartment"));
  document.getElementById("pDepartment").value = p.department || "";

  const studentBlock = document.getElementById("studentOnlyFields");
  const teacherBlock = document.getElementById("teacherOnlyFields");

  if (p.role === "student") {
    studentBlock.classList.remove("hidden");
    teacherBlock.classList.add("hidden");
    document.getElementById("pYearLevel").value = p.year_level || "";
    populateProgramDropdown(document.getElementById("pCourse"), p.department);
    document.getElementById("pCourse").value = p.course || "";
  } else {
    studentBlock.classList.add("hidden");
    teacherBlock.classList.remove("hidden");
    document.getElementById("pSpecialization").value = p.course || "";
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
    birthdate: document.getElementById("pBirthdate").value || null,
    gender: document.getElementById("pGender").value,
    status: document.getElementById("pStatus").value.trim(),
    valid_until: document.getElementById("pValidUntil").value || null,
    contact_number: document.getElementById("pContactNumber").value.trim(),
    email: document.getElementById("pEmail").value.trim(),
    address: document.getElementById("pAddress").value.trim(),
    emergency_contact_name: document.getElementById("pEmergencyName").value.trim(),
    emergency_contact_number: document.getElementById("pEmergencyNumber").value.trim(),
    personal_quote: document.getElementById("pQuote").value.trim(),
  };

  if (window.currentUser.role === "student") {
    payload.year_level = document.getElementById("pYearLevel").value;
    payload.course = document.getElementById("pCourse").value;
  } else {
    payload.course = document.getElementById("pSpecialization").value.trim();
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

async function downloadElementAsPng(element, filename) {
  const canvas = await html2canvas(element, { backgroundColor: "#FFFFFF", scale: 2 });
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

document.getElementById("btnDownloadFront").addEventListener("click", () => {
  downloadElementAsPng(document.getElementById("idCardCapture"), `${currentProfile.id_number}-school-id-front.png`);
});

document.getElementById("btnDownloadBack").addEventListener("click", async () => {
  const back = document.getElementById("idCardBack");
  const originalTransform = back.style.transform;
  back.style.transform = "none"; // un-rotate so it isn't captured mirrored
  await downloadElementAsPng(back, `${currentProfile.id_number}-school-id-back.png`);
  back.style.transform = originalTransform; // restore the flip position
});

document.addEventListener("DOMContentLoaded", loadProfile);