/**
 * attendance.js — students see their own attendance history.
 * Teachers additionally get a form to record attendance for any student.
 */
async function populateTeacherPickers() {
  const studentSelect = document.getElementById("attStudent");
  const courseSelect = document.getElementById("attCourse");
  if (!studentSelect || !courseSelect) return;

  try {
    const [students, courses] = await Promise.all([
      window.api.get("/students"),
      window.api.get("/courses"),
    ]);
    studentSelect.innerHTML = students.map((s) =>
      `<option value="${s.id}">${s.last_name}, ${s.first_name} (${s.id_number})</option>`
    ).join("");
    courseSelect.innerHTML = courses.map((c) =>
      `<option value="${c.id}">${c.code} — ${c.title}</option>`
    ).join("");
  } catch (err) {
    // Non-teachers get a 403 here, which is expected — the picker block is hidden for them anyway.
  }
}

async function loadAttendance() {
  const tbody = document.getElementById("attendanceTableBody");
  try {
    const records = await window.api.get("/attendance");
    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-8">No attendance records yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map((r) => `
      <tr>
        <td class="px-4 py-3 font-mono">${r.date}</td>
        <td class="px-4 py-3 teacher-only">${r.student_name || ""}</td>
        <td class="px-4 py-3 font-mono">${r.course_code || ""}</td>
        <td class="px-4 py-3"><span class="status-pill ${r.status}">${r.status}</span></td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-8">Couldn't load attendance (${err.message}).</td></tr>`;
  }
}

const attendanceForm = document.getElementById("attendanceForm");
if (attendanceForm) {
  attendanceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("attendanceError");
    const successBox = document.getElementById("attendanceSuccess");
    errorBox.classList.add("hidden");
    successBox.classList.add("hidden");

    const payload = {
      student_id: document.getElementById("attStudent").value,
      course_id: document.getElementById("attCourse").value,
      date: document.getElementById("attDate").value,
      status: document.getElementById("attStatus").value,
    };

    try {
      await window.api.post("/attendance", payload);
      successBox.textContent = "Attendance recorded.";
      successBox.classList.remove("hidden");
      loadAttendance();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateTeacherPickers();
  loadAttendance();
});