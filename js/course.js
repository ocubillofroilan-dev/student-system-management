/**
 * course.js — students get a read-only course catalog.
 * Teachers additionally see add / edit / delete controls.
 */
let editingCourseId = null;

async function loadCourses() {
  const tbody = document.getElementById("courseTableBody");
  try {
    const courses = await window.api.get("/courses");
    if (!courses.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">No courses added yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = courses.map((c) => `
      <tr>
        <td class="px-4 py-3 font-mono">${c.code}</td>
        <td class="px-4 py-3">${c.title}</td>
        <td class="px-4 py-3">${c.department || "—"}</td>
        <td class="px-4 py-3">${c.units}</td>
        <td class="px-4 py-3">${c.description || "—"}</td>
        <td class="px-4 py-3 text-right teacher-only whitespace-nowrap">
          <button class="text-sm border border-navy text-navy rounded px-2 py-1 mr-1 hover:bg-navy hover:text-white transition" data-edit='${JSON.stringify(c)}'>Edit</button>
          <button class="text-sm border border-danger text-danger rounded px-2 py-1 hover:bg-danger hover:text-white transition" data-delete-id="${c.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this course?")) return;
        await window.api.del(`/courses/${btn.dataset.deleteId}`);
        loadCourses();
      });
    });
    tbody.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => fillFormForEdit(JSON.parse(btn.dataset.edit)));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-8">Couldn't load courses (${err.message}).</td></tr>`;
  }
}

function fillFormForEdit(course) {
  editingCourseId = course.id;
  document.getElementById("courseCode").value = course.code;
  document.getElementById("courseTitle").value = course.title;
  document.getElementById("courseDepartment").value = course.department || "";
  document.getElementById("courseUnits").value = course.units;
  document.getElementById("courseDescription").value = course.description || "";
  document.getElementById("courseFormTitle").textContent = "Edit Course";
  document.getElementById("courseCancelEdit").classList.remove("hidden");
  document.getElementById("courseCode")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetCourseForm() {
  editingCourseId = null;
  document.getElementById("courseForm").reset();
  document.getElementById("courseFormTitle").textContent = "Add Course";
  document.getElementById("courseCancelEdit").classList.add("hidden");
}

const courseForm = document.getElementById("courseForm");
if (courseForm) {
  courseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("courseError");
    errorBox.classList.add("hidden");

    const payload = {
      code: document.getElementById("courseCode").value.trim(),
      title: document.getElementById("courseTitle").value.trim(),
      department: document.getElementById("courseDepartment").value.trim(),
      units: parseInt(document.getElementById("courseUnits").value, 10) || 0,
      description: document.getElementById("courseDescription").value.trim(),
    };

    try {
      if (editingCourseId) {
        await window.api.put(`/courses/${editingCourseId}`, payload);
      } else {
        await window.api.post("/courses", payload);
      }
      resetCourseForm();
      loadCourses();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  });

  document.getElementById("courseCancelEdit").addEventListener("click", resetCourseForm);
}

document.addEventListener("DOMContentLoaded", loadCourses);