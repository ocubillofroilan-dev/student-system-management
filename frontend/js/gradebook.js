/**
 * gradebook.js — professor-only page. Pick a course, then build a
 * spreadsheet: CATEGORIES (Assignments, Projects, Exam, Participation,
 * or anything else) each with a weight, COLUMNS inside a category
 * (e.g. individual assignments) with a max score, and an editable
 * SCORE per student per column. Add or remove a category or a column
 * any time.
 *
 * The Total column is computed on the backend (GET /gradebook/{id}
 * already returns it worked out), so this file never duplicates that
 * math — it renders what the server sends and re-fetches after every
 * change so Total always reflects the latest scores.
 *
 * This page redirects away anyone who isn't a professor, even if they
 * reach the URL directly — the backend enforces the real restriction
 * on every write, this is just so a student never sees an empty
 * teacher-only page.
 *
 * Requires modal.js (showConfirm/showAlert) loaded before this file.
 */
if (!window.currentUser || window.currentUser.role !== "teacher") {
  window.location.href = "dashboard.html";
}

let currentCourseId = null;
let currentGradebook = null;
let pendingCategoryId = null;
let pendingCategoryForItem = null;

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function loadCourseOptions() {
  const select = document.getElementById("courseSelect");
  try {
    const courses = await window.api.get("/courses");
    if (!courses.length) {
      select.innerHTML = "<option value=''>No courses yet - add one on the Courses page first</option>";
      document.getElementById("gradebookEmpty").classList.remove("hidden");
      return;
    }
    select.innerHTML = "<option value=''>Choose a course...</option>" +
      courses.map((c) => "<option value='" + c.id + "'>" + esc(c.code) + " - " + esc(c.title) + "</option>").join("");
  } catch (err) {
    select.innerHTML = "<option value=''>Couldn't load courses</option>";
  }
}

document.getElementById("courseSelect").addEventListener("change", (e) => {
  currentCourseId = e.target.value || null;
  if (currentCourseId) {
    loadGradebook();
  } else {
    currentGradebook = null;
    document.getElementById("gradebookWrap").classList.add("hidden");
    document.getElementById("gradebookEmpty").classList.remove("hidden");
  }
});

async function loadGradebook() {
  const errorBox = document.getElementById("gradebookError");
  errorBox.classList.add("hidden");
  try {
    currentGradebook = await window.api.get("/gradebook/" + currentCourseId);
    renderGradebook();
    document.getElementById("gradebookEmpty").classList.add("hidden");
    document.getElementById("gradebookWrap").classList.remove("hidden");
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove("hidden");
    document.getElementById("gradebookWrap").classList.add("hidden");
  }
}

function renderWeightWarning() {
  const el = document.getElementById("weightWarning");
  if (!currentGradebook || !currentGradebook.categories.length) {
    el.classList.add("hidden");
    return;
  }
  const sum = currentGradebook.categories.reduce((total, c) => total + Number(c.weight || 0), 0);
  if (Math.round(sum) === 100) {
    el.classList.add("hidden");
    return;
  }
  el.textContent = "Category weights add up to " + sum + "%, not 100% - the Total still scales correctly to whatever weights are in use.";
  el.classList.remove("hidden");
}

function renderGradebook() {
  const categories = currentGradebook.categories;
  const students = currentGradebook.students;
  const scores = currentGradebook.scores;
  const totals = currentGradebook.totals;
  renderWeightWarning();

  const catHead = document.getElementById("gbHeadCategories");
  const itemHead = document.getElementById("gbHeadItems");
  const body = document.getElementById("gbBody");

  let catHtml = "<tr class='bg-navy-dark text-white font-mono text-xs uppercase tracking-wide'>" +
    "<th class='text-left px-4 py-3 font-medium sticky left-0 bg-navy-dark' rowspan='2'>Student</th>";
  categories.forEach((cat) => {
    const span = Math.max(cat.items.length, 1);
    catHtml += "<th colspan='" + span + "' class='px-3 py-2 text-center font-medium border-l border-navy-soft'>" +
      "<div class='flex items-center justify-center gap-2'>" +
      "<span class='normal-case font-display text-[0.85rem]'>" + esc(cat.name) + " <span class='text-gold-light'>(" + cat.weight + "%)</span></span>" +
      "<button type='button' class='text-white/70 hover:text-white' data-edit-category='" + cat.id + "' title='Edit category'>&#9998;</button>" +
      "<button type='button' class='text-white/70 hover:text-danger' data-delete-category='" + cat.id + "' title='Delete category'>&#10005;</button>" +
      "</div></th>";
  });
  catHtml += "<th class='px-4 py-3 text-center font-medium border-l border-navy-soft' rowspan='2'>Total</th></tr>";
  catHead.innerHTML = catHtml;

  let itemHtml = "<tr class='bg-navy text-white text-xs'>";
  categories.forEach((cat) => {
    if (!cat.items.length) {
      itemHtml += "<th class='px-2 py-2 border-l border-navy-soft font-normal text-white/50'>" +
        "<button type='button' class='hover:text-gold-light' data-add-item='" + cat.id + "'>+ Add column</button></th>";
    } else {
      cat.items.forEach((item, idx) => {
        const isLast = idx === cat.items.length - 1;
        itemHtml += "<th class='px-2 py-2 border-l border-navy-soft font-normal whitespace-nowrap'>" +
          "<div class='flex items-center justify-center gap-1'>" +
          "<span>" + esc(item.title) + " <span class='text-white/60'>/" + item.max_score + "</span></span>" +
          "<button type='button' class='text-white/70 hover:text-danger' data-delete-item='" + item.id + "' title='Delete column'>&#10005;</button>" +
          "</div>" +
          (isLast ? "<button type='button' class='block mx-auto mt-1 text-[0.65rem] text-gold-light hover:text-gold' data-add-item='" + cat.id + "'>+ column</button>" : "") +
          "</th>";
      });
    }
  });
  itemHtml += "</tr>";
  itemHead.innerHTML = itemHtml;

  if (!students.length) {
    let colCount = 2;
    categories.forEach((c) => { colCount += Math.max(c.items.length, 1); });
    body.innerHTML = "<tr><td colspan='" + colCount + "' class='text-center text-muted py-8'>No students enrolled in this course yet.</td></tr>";
    return;
  }

  body.innerHTML = students.map((student) => {
    let row = "<tr class='border-t border-border'>" +
      "<td class='px-4 py-2 font-semibold sticky left-0 bg-white whitespace-nowrap'>" + esc(student.last_name) + ", " + esc(student.first_name) + "</td>";

    categories.forEach((cat) => {
      if (!cat.items.length) {
        row += "<td class='px-2 py-2 text-center text-muted border-l border-border'>&mdash;</td>";
      } else {
        cat.items.forEach((item) => {
          const perStudent = scores[item.id] || {};
          const value = perStudent[student.id];
          const valueAttr = (value === undefined || value === null) ? "" : value;
          row += "<td class='px-1 py-1 border-l border-border'>" +
            "<input type='number' min='0' max='" + item.max_score + "' step='any' value='" + valueAttr + "' placeholder='&mdash;' " +
            "class='w-16 text-center border border-border rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold' " +
            "data-score-item='" + item.id + "' data-score-student='" + student.id + "'></td>";
        });
      }
    });

    const total = totals[student.id];
    row += "<td class='px-4 py-2 text-center font-semibold border-l border-border " + (total !== null && total !== undefined ? "" : "text-muted") + "'>" +
      (total !== null && total !== undefined ? total + "%" : "&mdash;") + "</td></tr>";
    return row;
  }).join("");

  wireBodyInputs();
  wireHeaderButtons();
}

function wireBodyInputs() {
  document.querySelectorAll("[data-score-item]").forEach((input) => {
    input.addEventListener("change", async () => {
      const itemId = input.dataset.scoreItem;
      const studentId = input.dataset.scoreStudent;
      const raw = input.value.trim();
      const score = raw === "" ? null : Number(raw);

      try {
        await window.api.put("/gradebook/items/" + itemId + "/scores/" + studentId, { score: score });
        await loadGradebook();
      } catch (err) {
        showAlert(err.message);
        loadGradebook();
      }
    });
  });
}

function wireHeaderButtons() {
  document.querySelectorAll("[data-add-item]").forEach((btn) => {
    btn.addEventListener("click", () => openItemModal(btn.dataset.addItem));
  });
  document.querySelectorAll("[data-delete-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showConfirm("Delete this column? Every student's score in it will be removed too.", async () => {
        try {
          await window.api.del("/gradebook/items/" + btn.dataset.deleteItem);
          loadGradebook();
        } catch (err) {
          showAlert(err.message);
        }
      }, { confirmLabel: "Delete Column", danger: true });
    });
  });
  document.querySelectorAll("[data-edit-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = currentGradebook.categories.find((c) => c.id === btn.dataset.editCategory);
      openCategoryModal(cat);
    });
  });
  document.querySelectorAll("[data-delete-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showConfirm("Delete this category, its columns, and every score in it?", async () => {
        try {
          await window.api.del("/gradebook/categories/" + btn.dataset.deleteCategory);
          loadGradebook();
        } catch (err) {
          showAlert(err.message);
        }
      }, { confirmLabel: "Delete Category", danger: true });
    });
  });
}

function openCategoryModal(category) {
  pendingCategoryId = category ? category.id : null;
  document.getElementById("categoryModalTitle").textContent = category ? "Edit Category" : "Add Category";
  document.getElementById("categoryName").value = category ? category.name : "";
  document.getElementById("categoryWeight").value = category ? category.weight : "";
  document.getElementById("categoryError").classList.add("hidden");
  document.getElementById("categoryModal").classList.remove("hidden");
  document.getElementById("categoryName").focus();
}
function closeCategoryModal() {
  document.getElementById("categoryModal").classList.add("hidden");
}

document.getElementById("btnAddCategory").addEventListener("click", () => {
  if (!currentCourseId) {
    showAlert("Choose a course first.");
    return;
  }
  openCategoryModal(null);
});
document.getElementById("btnCancelCategory").addEventListener("click", closeCategoryModal);

document.getElementById("btnSaveCategory").addEventListener("click", async () => {
  const errorBox = document.getElementById("categoryError");
  errorBox.classList.add("hidden");
  const name = document.getElementById("categoryName").value.trim();
  const weight = Number(document.getElementById("categoryWeight").value);

  if (!name) { errorBox.textContent = "Please enter a name."; errorBox.classList.remove("hidden"); return; }
  if (Number.isNaN(weight) || weight < 0 || weight > 100) {
    errorBox.textContent = "Weight must be a number between 0 and 100.";
    errorBox.classList.remove("hidden");
    return;
  }

  try {
    if (pendingCategoryId) {
      await window.api.put("/gradebook/categories/" + pendingCategoryId, { name: name, weight: weight });
    } else {
      await window.api.post("/gradebook/" + currentCourseId + "/categories", { name: name, weight: weight });
    }
    closeCategoryModal();
    loadGradebook();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove("hidden");
  }
});

function openItemModal(categoryId) {
  pendingCategoryForItem = categoryId;
  document.getElementById("itemTitle").value = "";
  document.getElementById("itemMaxScore").value = 100;
  document.getElementById("itemError").classList.add("hidden");
  document.getElementById("itemModal").classList.remove("hidden");
  document.getElementById("itemTitle").focus();
}
function closeItemModal() {
  document.getElementById("itemModal").classList.add("hidden");
}

document.getElementById("btnCancelItem").addEventListener("click", closeItemModal);

document.getElementById("btnSaveItem").addEventListener("click", async () => {
  const errorBox = document.getElementById("itemError");
  errorBox.classList.add("hidden");
  const title = document.getElementById("itemTitle").value.trim();
  const maxScore = Number(document.getElementById("itemMaxScore").value);

  if (!title) { errorBox.textContent = "Please enter a title."; errorBox.classList.remove("hidden"); return; }
  if (Number.isNaN(maxScore) || maxScore <= 0) {
    errorBox.textContent = "Max score must be a positive number.";
    errorBox.classList.remove("hidden");
    return;
  }

  try {
    await window.api.post("/gradebook/categories/" + pendingCategoryForItem + "/items", { title: title, max_score: maxScore });
    closeItemModal();
    loadGradebook();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove("hidden");
  }
});

document.addEventListener("DOMContentLoaded", loadCourseOptions);