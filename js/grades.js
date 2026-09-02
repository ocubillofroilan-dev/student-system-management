/**
 * grades.js — students see their own grades. Teachers additionally
 * get a form to record a grade for any student, in any course.
 */
async function populateTeacherPickers() {
  const studentSelect = document.getElementById("gradeStudent");
  const courseSelect = document.getElementById("gradeCourse");
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
    // Students get a 403 here, which is fine — the picker is hidden for them.
  }
}

async function loadGrades() {
  const tbody = document.getElementById("gradesTableBody");
  try {
    const records = await window.api.get("/grades");
    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-8">No grades recorded yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map((r) => `
      <tr>
        <td class="px-4 py-3 teacher-only">${r.student_name || ""}</td>
        <td class="px-4 py-3 font-mono">${r.course_code || ""}</td>
        <td class="px-4 py-3">${r.course_title || ""}</td>
        <td class="px-4 py-3">${r.grading_period}</td>
        <td class="px-4 py-3 font-semibold">${r.grade}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-8">Couldn't load grades (${err.message}).</td></tr>`;
  }
}

const gradeForm = document.getElementById("gradeForm");
if (gradeForm) {
  gradeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("gradeError");
    const successBox = document.getElementById("gradeSuccess");
    errorBox.classList.add("hidden");
    successBox.classList.add("hidden");

    const payload = {
      student_id: document.getElementById("gradeStudent").value,
      course_id: document.getElementById("gradeCourse").value,
      grading_period: document.getElementById("gradePeriod").value,
      grade: document.getElementById("gradeValue").value.trim(),
    };

    try {
      await window.api.post("/grades", payload);
      successBox.textContent = "Grade saved.";
      successBox.classList.remove("hidden");
      gradeForm.reset();
      loadGrades();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateTeacherPickers();
  loadGrades();
});