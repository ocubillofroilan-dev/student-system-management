/**
 * course.js — teachers manage the full catalog (unchanged). Students
 * see "My Courses" (enrolled only) plus "Available Courses" they can
 * enroll into; enrolling removes a course from the available list.
 */
let editingCourseId = null;
let deptDropdown, progDropdown;

// ---------- Student: My Courses ----------
async function loadMyCourses() {
  const tbody = document.getElementById("myCoursesBody");
  if (!tbody) return;
  try {
    const courses = await window.api.get("/courses");
    if (!courses.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-6">You haven't enrolled in any courses yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = courses.map((c) => `
      <tr>
        <td class="px-4 py-3 font-mono">${c.code}</td>
        <td class="px-4 py-3">${c.title}</td>
        <td class="px-4 py-3">${c.program || "—"}</td>
        <td class="px-4 py-3">${c.units}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-6">Couldn't load your courses (${err.message}).</td></tr>`;
  }
}

// ---------- Student: Available Courses ----------
async function loadAvailableCourses() {
  const tbody = document.getElementById("availableCoursesBody");
  if (!tbody) return;
  try {
    const courses = await window.api.get("/courses/available");
    if (!courses.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-6">No more courses available to enroll in.</td></tr>`;
      return;
    }
    tbody.innerHTML = courses.map((c) => `
      <tr>
        <td class="px-4 py-3 font-mono">${c.code}</td>
        <td class="px-4 py-3">${c.title}</td>
        <td class="px-4 py-3">${c.program || "—"}</td>
        <td class="px-4 py-3">${c.units}</td>
        <td class="px-4 py-3 text-right">
          <button class="text-sm bg-gold text-navy-dark font-semibold rounded px-3 py-1 hover:bg-gold-light transition" data-enroll-id="${c.id}">Enroll</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-enroll-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const errorBox = document.getElementById("availableError");
        errorBox.classList.add("hidden");
        try {
          await window.api.post(`/courses/${btn.dataset.enrollId}/enroll`, {});
          loadMyCourses();
          loadAvailableCourses();
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.classList.remove("hidden");
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-6">Couldn't load available courses (${err.message}).</td></tr>`;
  }
}

// ---------- Teacher: manage catalog ----------
async function loadCourses() {
  const tbody = document.getElementById("courseTableBody");
  if (!tbody) return;
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
        <td class="px-4 py-3">${c.program || "—"}</td>
        <td class="px-4 py-3">${c.units}</td>
        <td class="px-4 py-3">${c.description || "—"}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
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
  document.getElementById("courseUnits").value = course.units;
  document.getElementById("courseDescription").value = course.description || "";
  document.getElementById("courseFormTitle").textContent = "Edit Course";
  document.getElementById("courseCancelEdit").classList.remove("hidden");

  deptDropdown.setValue(course.department || "");
  const college = COLLEGES.find((c) => c.name === course.department);
  const programs = college ? college.programs.map((p) => ({ value: p, label: p })) : [];
  progDropdown = createSearchableDropdown("courseProgDropdown", programs, "Choose…", () => {});
  progDropdown.setValue(course.program || "");

  document.getElementById("courseCode")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetCourseForm() {
  editingCourseId = null;
  document.getElementById("courseForm").reset();
  document.getElementById("courseFormTitle").textContent = "Add Course";
  document.getElementById("courseCancelEdit").classList.add("hidden");
  deptDropdown.setValue("");
  progDropdown = createSearchableDropdown("courseProgDropdown", [], "Choose a department first…", () => {});
}

document.addEventListener("DOMContentLoaded", () => {
  loadMyCourses();
  loadAvailableCourses();
  loadCourses();

  if (document.getElementById("courseDeptDropdown")) {
    progDropdown = createSearchableDropdown("courseProgDropdown", [], "Choose a department first…", () => {});
    deptDropdown = createSearchableDropdown(
      "courseDeptDropdown",
      COLLEGES.map((c) => ({ value: c.name, label: `${c.code} — ${c.name}` })),
      "Choose…",
      (deptName) => {
        const college = COLLEGES.find((c) => c.name === deptName);
        const programs = college ? college.programs.map((p) => ({ value: p, label: p })) : [];
        progDropdown = createSearchableDropdown("courseProgDropdown", programs, "Choose…", () => {});
      }
    );
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
        department: deptDropdown.getValue(),
        program: progDropdown.getValue(),
        units: parseInt(document.getElementById("courseUnits").value, 10) || 0,
        description: document.getElementById("courseDescription").value.trim(),
      };

      if (!payload.department || !payload.program) {
        errorBox.textContent = "Please choose both a department and a program.";
        errorBox.classList.remove("hidden");
        return;
      }

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
});