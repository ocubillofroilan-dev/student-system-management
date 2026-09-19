/**
 * attendance.js — students see a simple read-only list of their own
 * attendance. Teachers pick a course and get a month calendar; each
 * date opens a modal listing every student in that course's program,
 * viewable and (via Edit) editable in one place. "Total Attendance"
 * opens a per-student monthly summary.
 */
let selectedCourse = null;
let courseStudents = [];
let courseAttendance = [];
let calendarMonth = new Date();
calendarMonth.setDate(1);
let modalDate = null;
let modalEditing = false;

function pad2(n) { return String(n).padStart(2, "0"); }
function toDateStr(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

// ---------- Student: simple read-only list ----------
async function loadMyAttendance() {
  const tbody = document.getElementById("attendanceTableBody");
  if (!tbody) return;
  try {
    const records = await window.api.get("/attendance");
    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-8">No attendance records yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = records.map((r) => `
      <tr>
        <td class="px-4 py-3 font-mono">${r.date}</td>
        <td class="px-4 py-3 font-mono">${r.course_code || ""}</td>
        <td class="px-4 py-3"><span class="status-pill ${r.status}">${r.status}</span></td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-8">Couldn't load attendance (${err.message}).</td></tr>`;
  }
}

// ---------- Teacher: course selector ----------
async function loadCoursesForSelect() {
  const select = document.getElementById("attCourseSelect");
  try {
    const courses = await window.api.get("/courses");
    select.innerHTML = `<option value="">Choose a course…</option>` +
      courses.map((c) => `<option value="${c.id}" data-department="${c.department || ""}" data-program="${c.program || ""}">${c.code} — ${c.title}</option>`).join("");
  } catch (err) {
    select.innerHTML = `<option value="">Couldn't load courses</option>`;
  }
}

async function onCourseChange() {
  const select = document.getElementById("attCourseSelect");
  const opt = select.selectedOptions[0];
  const section = document.getElementById("calendarSection");

  if (!opt || !opt.value) {
    selectedCourse = null;
    section.classList.add("hidden");
    return;
  }

  selectedCourse = { id: opt.value, department: opt.dataset.department, program: opt.dataset.program };
  section.classList.remove("hidden");

  const [students, attendance] = await Promise.all([
    window.api.get("/students"),
    window.api.get("/attendance"),
  ]);
  courseStudents = students.filter((s) => s.department === selectedCourse.department && s.course === selectedCourse.program);
  courseAttendance = attendance.filter((a) => a.course_id === selectedCourse.id);
  renderCalendar();
}

// ---------- Calendar ----------
function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const label = document.getElementById("calendarMonthLabel");
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  label.textContent = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let cells = "";
  for (let i = 0; i < firstWeekday; i++) cells += `<div></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(year, month, d);
    const dayRecords = courseAttendance.filter((a) => a.date === dateStr);
    cells += `
      <div class="border border-border rounded-md p-2 h-20 cursor-pointer hover:bg-[#FAF6EC] transition ${dayRecords.length ? "bg-[#FAF6EC]" : ""}" data-date="${dateStr}">
        <div class="text-sm font-semibold">${d}</div>
        ${dayRecords.length ? `<div class="text-[0.65rem] text-muted mt-1">${dayRecords.length} recorded</div>` : ""}
      </div>`;
  }
  grid.innerHTML = cells;

  grid.querySelectorAll("[data-date]").forEach((cell) => {
    cell.addEventListener("dblclick", () => openDateModal(cell.dataset.date));
  });
}

document.getElementById("prevMonth")?.addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonth")?.addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() + 1);
  renderCalendar();
});

// ---------- Date detail modal ----------
function openDateModal(dateStr) {
  modalDate = dateStr;
  modalEditing = false;
  renderDateModal();
  document.getElementById("dateModal").classList.remove("hidden");
}

function renderDateModal() {
  document.getElementById("dateModalTitle").textContent =
    new Date(modalDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const body = document.getElementById("dateModalBody");
  if (!courseStudents.length) {
    body.innerHTML = `<div class="text-sm text-muted py-4 text-center">No students found for this course's program.</div>`;
  } else {
    body.innerHTML = courseStudents.map((s) => {
      const record = courseAttendance.find((a) => a.student_id === s.id && a.date === modalDate);
      const status = record ? record.status : "";
      if (modalEditing) {
        return `
          <div class="flex items-center justify-between py-2 border-b border-border">
            <span class="text-sm">${s.last_name}, ${s.first_name}</span>
            <select class="border border-border rounded-md px-2 py-1 text-sm" data-student-id="${s.id}">
              <option value="">Not recorded</option>
              <option value="present" ${status === "present" ? "selected" : ""}>Present</option>
              <option value="late" ${status === "late" ? "selected" : ""}>Late</option>
              <option value="absent" ${status === "absent" ? "selected" : ""}>Absent</option>
            </select>
          </div>`;
      }
      return `
        <div class="flex items-center justify-between py-2 border-b border-border">
          <span class="text-sm">${s.last_name}, ${s.first_name}</span>
          ${status ? `<span class="status-pill ${status}">${status}</span>` : `<span class="text-xs text-muted">Not recorded</span>`}
        </div>`;
    }).join("");
  }

  document.getElementById("btnEditDate").classList.toggle("hidden", modalEditing);
  document.getElementById("btnSaveDate").classList.toggle("hidden", !modalEditing);
}

document.getElementById("btnEditDate")?.addEventListener("click", () => {
  modalEditing = true;
  renderDateModal();
});

document.getElementById("btnSaveDate")?.addEventListener("click", async () => {
  const selects = document.querySelectorAll("#dateModalBody select[data-student-id]");
  for (const sel of selects) {
    if (!sel.value) continue;
    await window.api.post("/attendance", {
      student_id: sel.dataset.studentId,
      course_id: selectedCourse.id,
      date: modalDate,
      status: sel.value,
    });
  }
  const attendance = await window.api.get("/attendance");
  courseAttendance = attendance.filter((a) => a.course_id === selectedCourse.id);
  modalEditing = false;
  renderDateModal();
  renderCalendar();
});

document.getElementById("btnCloseDateModal")?.addEventListener("click", () => {
  document.getElementById("dateModal").classList.add("hidden");
});

// ---------- Total Attendance modal ----------
document.getElementById("btnTotalAttendance")?.addEventListener("click", () => {
  if (!selectedCourse) {
    alert("Choose a course first.");
    return;
  }
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  document.getElementById("totalMonthPicker").value = `${year}-${pad2(month + 1)}`;
  renderTotalAttendance();
  document.getElementById("totalModal").classList.remove("hidden");
});

document.getElementById("btnCloseTotalModal")?.addEventListener("click", () => {
  document.getElementById("totalModal").classList.add("hidden");
});

document.getElementById("totalMonthPicker")?.addEventListener("change", renderTotalAttendance);

function renderTotalAttendance() {
  const monthValue = document.getElementById("totalMonthPicker").value; // "YYYY-MM"
  const tbody = document.getElementById("totalAttendanceBody");
  if (!monthValue) { tbody.innerHTML = ""; return; }

  if (!courseStudents.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No students.</td></tr>`;
    return;
  }

  tbody.innerHTML = courseStudents.map((s) => {
    const records = courseAttendance.filter((a) => a.student_id === s.id && a.date.startsWith(monthValue));
    const present = records.filter((a) => a.status === "present").length;
    const late = records.filter((a) => a.status === "late").length;
    const absent = records.filter((a) => a.status === "absent").length;
    return `<tr class="border-b border-border">
      <td class="py-2">${s.last_name}, ${s.first_name}</td>
      <td class="py-2 text-center">${present}</td>
      <td class="py-2 text-center">${late}</td>
      <td class="py-2 text-center">${absent}</td>
    </tr>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  if (document.getElementById("attCourseSelect")) {
    await loadCoursesForSelect();
    document.getElementById("attCourseSelect").addEventListener("change", onCourseChange);
  }
  loadMyAttendance();
});