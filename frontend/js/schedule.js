/**
 * schedule.js — the database stores one row per day, but the tables
 * show them grouped: rows with the same course, time, room (and
 * professor) collapse into one line with a compact day label —
 * "Mon, Thu, Sat", or "Mon - Fri" when 3 or more days in a row.
 * Times display in 12-hour AM/PM. Deleting a grouped line removes
 * every day inside it, after a confirmation popup (modal.js).
 * Professors see the manage table + form; students see a read-only
 * table of the courses they're enrolled in.
 */
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
const MIN_RUN_FOR_RANGE = 3; // this many consecutive days or more becomes "Mon - Fri"

let teacherGroups = [];

function to12Hour(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDays(dayNames) {
  const idx = [...new Set(dayNames.map((d) => DAY_ORDER.indexOf(d)))]
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);

  const parts = [];
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j++;
    if (j - i + 1 >= MIN_RUN_FOR_RANGE) {
      parts.push(`${DAY_ABBR[DAY_ORDER[idx[i]]]} - ${DAY_ABBR[DAY_ORDER[idx[j]]]}`);
    } else {
      for (let k = i; k <= j; k++) parts.push(DAY_ABBR[DAY_ORDER[idx[k]]]);
    }
    i = j + 1;
  }
  return parts.join(", ");
}

function groupSchedule(items) {
  const groups = new Map();
  items.forEach((s) => {
    const key = [s.course_id, s.start_time, s.end_time, (s.room || "").trim().toLowerCase(), s.professor_name || ""].join("|");
    if (!groups.has(key)) groups.set(key, { ...s, days: [], ids: [] });
    const g = groups.get(key);
    g.days.push(s.day_of_week);
    g.ids.push(s.id);
  });

  const list = Array.from(groups.values());
  list.forEach((g) => {
    g.daysLabel = formatDays(g.days);
    g.firstDay = Math.min(...g.days.map((d) => DAY_ORDER.indexOf(d)));
  });
  list.sort((a, b) => a.firstDay - b.firstDay || String(a.start_time).localeCompare(String(b.start_time)));
  return list;
}

// ---------- Professor ----------
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
    const items = await window.api.get("/schedule");
    teacherGroups = groupSchedule(items);

    if (!teacherGroups.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">No schedule entries yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = teacherGroups.map((g, i) => `
      <tr>
        <td class="px-4 py-3 whitespace-nowrap font-semibold">${g.daysLabel}</td>
        <td class="px-4 py-3 whitespace-nowrap">${to12Hour(g.start_time)} – ${to12Hour(g.end_time)}</td>
        <td class="px-4 py-3 font-mono whitespace-nowrap">${g.course_code || ""}</td>
        <td class="px-4 py-3">${g.course_title || ""}</td>
        <td class="px-4 py-3 whitespace-nowrap">${g.room || "—"}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button class="text-sm border border-danger text-danger rounded px-3 py-1 hover:bg-danger hover:text-white transition" data-group="${i}">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = teacherGroups[Number(btn.dataset.group)];
        const label = `${g.course_code} — ${g.course_title} (${g.daysLabel}, ${to12Hour(g.start_time)} – ${to12Hour(g.end_time)})`;
        showConfirm(`Are you sure you want to delete the schedule for ${label}?`, async () => {
          try {
            for (const id of g.ids) await window.api.del(`/schedule/${id}`);
            loadTeacherSchedule();
          } catch (err) {
            showAlert(err.message);
          }
        }, { confirmLabel: "Delete Schedule", danger: true });
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

    const course_id = document.getElementById("scheduleCourse").value;
    const days = Array.from(document.querySelectorAll(".schedule-day-check:checked")).map((el) => el.value);
    const start_time = document.getElementById("scheduleStart").value;
    const end_time = document.getElementById("scheduleEnd").value;
    const room = document.getElementById("scheduleRoom").value.trim();

    const fail = (msg) => {
      errorBox.textContent = msg;
      errorBox.classList.remove("hidden");
    };

    if (!course_id) return fail("Please choose a course.");
    if (!days.length) return fail("Please choose at least one day.");
    if (!start_time || !end_time) return fail("Please set a start and end time.");
    if (end_time <= start_time) return fail("End time must be later than the start time.");

    try {
      for (const day_of_week of days) {
        await window.api.post("/schedule", { course_id, day_of_week, start_time, end_time, room });
      }
      scheduleForm.reset();
      loadTeacherSchedule();
    } catch (err) {
      fail(err.message);
    }
  });
}

// ---------- Student ----------
async function loadStudentSchedule() {
  const tbody = document.getElementById("studentScheduleBody");
  if (!tbody) return;
  try {
    const items = await window.api.get("/schedule");
    const groups = groupSchedule(items);

    if (!groups.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">No schedule for your enrolled courses yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = groups.map((g) => `
      <tr>
        <td class="px-4 py-3 whitespace-nowrap font-semibold">${g.daysLabel}</td>
        <td class="px-4 py-3 whitespace-nowrap">${to12Hour(g.start_time)} – ${to12Hour(g.end_time)}</td>
        <td class="px-4 py-3 font-mono whitespace-nowrap">${g.course_code || ""}</td>
        <td class="px-4 py-3">${g.course_title || ""}</td>
        <td class="px-4 py-3 whitespace-nowrap">${g.room || "—"}</td>
        <td class="px-4 py-3 whitespace-nowrap">${g.professor_name || "—"}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">Couldn't load schedule (${err.message}).</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.currentUser && window.currentUser.role === "teacher") {
    populateCourseDropdown();
    loadTeacherSchedule();
  } else {
    loadStudentSchedule();
  }
});