/**
 * grades.js — teacher: filterable table (student/course/period) +
 * Excel export of whatever's currently filtered, using SheetJS
 * (loaded via CDN in grades.html as the global `XLSX`).
 * Student: own grades + a Professor filter, no export.
 */
let allGrades = [];

function applyTeacherFilters() {
  const student = document.getElementById("filterStudent").value;
  const course = document.getElementById("filterCourse").value;
  const period = document.getElementById("filterPeriod").value;

  return allGrades.filter((g) =>
    (!student || g.student_id === student) &&
    (!course || g.course_id === course) &&
    (!period || g.grading_period === period)
  );
}

function renderTeacherTable() {
  const tbody = document.getElementById("gradesTableBody");
  const rows = applyTeacherFilters();
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-8">No matching grades.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td class="px-4 py-3">${r.student_name || ""}</td>
      <td class="px-4 py-3 font-mono">${r.course_code || ""}</td>
      <td class="px-4 py-3">${r.course_title || ""}</td>
      <td class="px-4 py-3">${r.grading_period}</td>
      <td class="px-4 py-3 font-semibold">${r.grade}</td>
    </tr>
  `).join("");
}

async function loadTeacherGrades() {
  try {
    allGrades = await window.api.get("/grades");
    renderTeacherTable();
  } catch (err) {
    document.getElementById("gradesTableBody").innerHTML =
      `<tr><td colspan="5" class="text-center text-muted py-8">Couldn't load grades (${err.message}).</td></tr>`;
  }
}

async function populateTeacherFilters() {
  try {
    const [students, courses] = await Promise.all([window.api.get("/students"), window.api.get("/courses")]);
    document.getElementById("filterStudent").innerHTML =
      `<option value="">All Students</option>` +
      students.map((s) => `<option value="${s.id}">${s.last_name}, ${s.first_name}</option>`).join("");
    document.getElementById("filterCourse").innerHTML =
      `<option value="">All Courses</option>` +
      courses.map((c) => `<option value="${c.id}">${c.code} — ${c.title}</option>`).join("");

    document.getElementById("gradeStudent").innerHTML =
      students.map((s) => `<option value="${s.id}">${s.last_name}, ${s.first_name} (${s.id_number})</option>`).join("");
    document.getElementById("gradeCourse").innerHTML =
      courses.map((c) => `<option value="${c.id}">${c.code} — ${c.title}</option>`).join("");
  } catch (err) {
    // non-teachers get 403 on /students; harmless since this block only runs for teachers
  }
}

function downloadGradesExcel() {
  const rows = applyTeacherFilters().map((r) => ({
    Student: r.student_name || "",
    Code: r.course_code || "",
    Course: r.course_title || "",
    Period: r.grading_period,
    Grade: r.grade,
  }));
  if (!rows.length) { alert("No rows to export with the current filters."); return; }
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Grades");
  XLSX.writeFile(workbook, "grades_export.xlsx");
}

// ---------- Student ----------
let myGrades = [];

async function loadStudentGrades() {
  const tbody = document.getElementById("studentGradesBody");
  if (!tbody) return;
  try {
    myGrades = await window.api.get("/grades");
    const professors = [...new Set(myGrades.map((g) => g.professor_name).filter(Boolean))];
    document.getElementById("studentProfessorFilter").innerHTML =
      `<option value="">All Professors</option>` + professors.map((p) => `<option value="${p}">${p}</option>`).join("");
    renderStudentTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-8">Couldn't load grades (${err.message}).</td></tr>`;
  }
}

function renderStudentTable() {
  const tbody = document.getElementById("studentGradesBody");
  const filter = document.getElementById("studentProfessorFilter").value;
  const rows = myGrades.filter((g) => !filter || g.professor_name === filter);
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-8">No grades recorded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td class="px-4 py-3 font-mono">${r.course_code || ""}</td>
      <td class="px-4 py-3">${r.course_title || ""}</td>
      <td class="px-4 py-3">${r.professor_name || "—"}</td>
      <td class="px-4 py-3">${r.grading_period}</td>
      <td class="px-4 py-3 font-semibold">${r.grade}</td>
    </tr>
  `).join("");
}

// ---------- Wire up ----------
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("gradesTableBody")) {
    populateTeacherFilters().then(loadTeacherGrades);
    ["filterStudent", "filterCourse", "filterPeriod"].forEach((id) =>
      document.getElementById(id).addEventListener("change", renderTeacherTable)
    );
    document.getElementById("btnDownloadGrades").addEventListener("click", downloadGradesExcel);
  }

  loadStudentGrades();
  document.getElementById("studentProfessorFilter")?.addEventListener("change", renderStudentTable);

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
        loadTeacherGrades();
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove("hidden");
      }
    });
  }
});