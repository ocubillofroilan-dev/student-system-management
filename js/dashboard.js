/**
 * dashboard.js — the logged-in home page. Shows announcements to everyone;
 * only teachers see the "post announcement" form (enforced here in the UI
 * AND on the backend, which is the real gatekeeper).
 */
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function loadAnnouncements() {
  const list = document.getElementById("dashAnnouncements");
  try {
    const announcements = await window.api.get("/announcements");
    if (!announcements.length) {
      list.innerHTML = `<div class="text-center text-muted py-8">No announcements yet.</div>`;
      return;
    }
    list.innerHTML = announcements.map((a) => `
      <div class="bulletin-item pl-4 pr-4 py-4">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-mono text-xs uppercase tracking-wide text-muted">${formatDate(a.created_at)}${a.posted_by_name ? " &middot; " + a.posted_by_name : ""}</div>
            <h3 class="font-display font-semibold mb-1">${a.title}</h3>
            <p class="mb-0 text-muted">${a.body}</p>
          </div>
          <button class="teacher-only text-sm border border-danger text-danger rounded px-2 py-1 ml-3 hover:bg-danger hover:text-white transition" data-delete-id="${a.id}">Delete</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this announcement?")) return;
        try {
          await window.api.del(`/announcements/${btn.dataset.deleteId}`);
          loadAnnouncements();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<div class="text-center text-muted py-8">Couldn't load announcements (${err.message}).</div>`;
  }
}

const postForm = document.getElementById("postAnnouncementForm");
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("annTitle").value.trim();
    const body = document.getElementById("annBody").value.trim();
    const errBox = document.getElementById("annError");
    errBox.classList.add("hidden");

    try {
      await window.api.post("/announcements", { title, body });
      postForm.reset();
      loadAnnouncements();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", loadAnnouncements);