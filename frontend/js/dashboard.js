/**
 * dashboard.js — the logged-in home page. Everyone sees announcements
 * AND can comment on them. Only teachers see the "post announcement"
 * form and delete buttons — enforced here for UX, and on the backend
 * (the real gatekeeper) via require_role.
 */
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function loadComments(announcementId, listEl) {
  try {
    const comments = await window.api.get(`/announcements/${announcementId}/comments`);
    if (!comments.length) {
      listEl.innerHTML = `<div class="text-xs text-muted">No replies yet.</div>`;
      return;
    }
    listEl.innerHTML = comments.map((c) => `
      <div class="text-sm border-t border-border pt-2 mt-2 first:border-t-0 first:mt-0 first:pt-0">
        <span class="font-semibold">${c.author_name}</span>
        <span class="text-xs text-muted">${c.author_role === "teacher" ? "(Faculty)" : "(Student)"} &middot; ${formatDate(c.created_at)}</span>
        <p class="mb-0 mt-0.5">${c.body}</p>
      </div>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<div class="text-xs text-muted">Couldn't load replies.</div>`;
  }
}

async function loadAnnouncements() {
  const list = document.getElementById("dashAnnouncements");
  try {
    const announcements = await window.api.get("/announcements");
    if (!announcements.length) {
      list.innerHTML = `<div class="bg-white border border-border rounded-lg text-center text-muted py-8">No announcements yet.</div>`;
      return;
    }
    list.innerHTML = announcements.map((a) => `
      <div class="bulletin-item bg-white border border-border rounded-lg px-4 py-4">
        <div class="flex justify-between items-start">
          <div class="min-w-0">
            <div class="font-mono text-xs uppercase tracking-wide text-muted">${formatDate(a.created_at)}${a.posted_by_name ? " &middot; " + a.posted_by_name : ""}</div>
            <h3 class="font-display font-semibold mb-1">${a.title}</h3>
            <p class="mb-0 text-muted">${a.body}</p>
          </div>
          <button class="teacher-only text-sm border border-danger text-danger rounded px-2 py-1 ml-3 flex-shrink-0 hover:bg-danger hover:text-white transition" data-delete-id="${a.id}">Delete</button>
        </div>

        <div class="mt-3 pt-3 border-t border-border">
          <div class="comment-list mb-2" data-comment-list="${a.id}"></div>
          <form class="flex gap-2" data-comment-form="${a.id}">
            <input type="text" placeholder="Write a reply…" required class="flex-1 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold">
            <button type="submit" class="bg-navy text-white text-sm rounded-md px-3 py-1.5 hover:bg-navy-dark transition">Reply</button>
          </form>
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

    list.querySelectorAll("[data-comment-list]").forEach((el) => {
      loadComments(el.dataset.commentList, el);
    });

    list.querySelectorAll("[data-comment-form]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const announcementId = form.dataset.commentForm;
        const input = form.querySelector("input");
        const body = input.value.trim();
        if (!body) return;
        try {
          await window.api.post(`/announcements/${announcementId}/comments`, { body });
          input.value = "";
          const listEl = list.querySelector(`[data-comment-list="${announcementId}"]`);
          loadComments(announcementId, listEl);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<div class="bg-white border border-border rounded-lg text-center text-muted py-8">Couldn't load announcements (${err.message}).</div>`;
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