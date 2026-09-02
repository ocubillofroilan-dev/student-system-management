/**
 * schedule.js — read-only weekly schedule for students,
 * add/delete controls for teachers.
 */
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function populateCourseDropdown() {
  const select = document.getElementById("scheduleCourse");
  if (!select) return;
  try {
    const courses = await window.api.get("/courses");
    select.innerHTML = courses.map((c) => `<option value="${c.id}">${c.code} — ${c.title}</option>`).join("");
  } catch (err) {
    select.innerHTML = `<option value="">Couldn't load courses</option>`;
  }
}

async function loadSchedule() {
  const tbody = document.getElementById("scheduleTableBody");
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
        <td class="px-4 py-3 text-right teacher-only whitespace-nowrap">
          <button class="text-sm border border-danger text-danger rounded px-2 py-1 hover:bg-danger hover:text-white transition" data-delete-id="${s.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this schedule entry?")) return;
        await window.api.del(`/schedule/${btn.dataset.deleteId}`);
        loadSchedule();
      });
    });
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

    const payload = {
      course_id: document.getElementById("scheduleCourse").value,
      day_of_week: document.getElementById("scheduleDay").value,
      start_time: document.getElementById("scheduleStart").value,
      end_time: document.getElementById("scheduleEnd").value,
      room: document.getElementById("scheduleRoom").value.trim(),
    };

    try {
      await window.api.post("/schedule", payload);
      scheduleForm.reset();
      loadSchedule();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateCourseDropdown();
  loadSchedule();
});