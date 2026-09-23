/**
 * schedule.js — teachers get the full manage table + add form.
 * Students get a simpler course/program/professor list, filtered
 * server-side to just their own department+program.
 */
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function populateCourseDropdown() {
  const select = document.getElementById("scheduleCourse");
  if (!select) return;
  try {
    const courses = await window.api.get("/courses");
    if (!courses.length) {
      select.innerHTML = `<option value="">No courses yet — add one on the Courses page first</option>`;
      return;
    }
    select.innerHTML = `<option value="">Choose…</option>` +
      courses.map((c) => `<option value="${c.id}">${c.code} — ${c.title}${c.program ? " (" + c.program + ")" : ""}</option>`).join("");
  } catch (err) {
    select.innerHTML = `<option value="">Couldn't load courses (${err.message})</option>`;
  }
}

async function loadTeacherSchedule() {
  const tbody = document.getElementById("scheduleTableBody");
  if (!tbody) return;
  try {
    let items = await window.api.get("/schedule");
    items.sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week));

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">No schedule entries yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((s) => `
      <tr>
        <td class="px-4 py-3">${s.day_of_week}</td>
        <td class="px-4 py-3 font-mono">${s.start_time} – ${s.end_time}</td>
        <td class="px-4 py-3 font-mono">${s.course_code || ""}</td>
        <td class="px-4 py-3">${s.course_title || ""}</td>
        <td class="px-4 py-3">${s.room || "—"}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button class="text-sm border border-danger text-danger rounded px-2 py-1 hover:bg-danger hover:text-white transition" data-delete-id="${s.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        showConfirm("Delete this schedule entry?", async () => {
          await window.api.del(`/schedule/${btn.dataset.deleteId}`);
          loadTeacherSchedule();
        }, { confirmLabel: "Delete", danger: true });
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">Couldn't load schedule (${err.message}).</td></tr>`;
  }
}

async function loadStudentSchedule() {
  const tbody = document.getElementById("studentScheduleBody");
  if (!tbody) return;
  try {
    let items = await window.api.get("/schedule");
    items.sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week));

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">No schedule for your enrolled courses yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((s) => `
      <tr>
        <td class="px-4 py-3">${s.day_of_week}</td>
        <td class="px-4 py-3 font-mono">${s.start_time} – ${s.end_time}</td>
        <td class="px-4 py-3 font-mono">${s.course_code || ""}</td>
        <td class="px-4 py-3">${s.course_title || ""}</td>
        <td class="px-4 py-3">${s.room || "—"}</td>
        <td class="px-4 py-3">${s.professor_name || "—"}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">Couldn't load schedule (${err.message}).</td></tr>`;
  }
}

const scheduleForm = document.getElementById("scheduleForm");
if (scheduleForm) {
  scheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("scheduleError");
    errorBox.classList.add("hidden");

    const course_id = document.getElementById("scheduleCourse").value;
    const days = Array.from(document.querySelectorAll(".schedule-day-check:checked")).map((el) => el.value);
    const start_time = document.getElementById("scheduleStart").value;
    const end_time = document.getElementById("scheduleEnd").value;
    const room = document.getElementById("scheduleRoom").value.trim();

    if (!course_id) {
      errorBox.textContent = "Please choose a course.";
      errorBox.classList.remove("hidden");
      return;
    }
    if (!days.length) {
      errorBox.textContent = "Please choose at least one day.";
      errorBox.classList.remove("hidden");
      return;
    }

    try {
      for (const day_of_week of days) {
        await window.api.post("/schedule", { course_id, day_of_week, start_time, end_time, room });
      }
      scheduleForm.reset();
      loadTeacherSchedule();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateCourseDropdown();
  loadTeacherSchedule();
  loadStudentSchedule();
});