/**
 * dashboard.js — Facebook-style announcement feed.
 * - Everyone: reads posts (text + optional photo/video) and replies.
 * - Professors: create posts, edit their OWN posts, delete posts. The
 *   same "post window" is used for both creating and editing.
 * - The file is uploaded only when the professor presses Post/Save, so
 *   cancelling never leaves stray files in storage.
 * - All user-written text is escaped before going into innerHTML, so a
 *   reply can't inject code into someone else's page.
 * Requires modal.js (showConfirm) loaded before this file.
 */
const me = window.currentUser;
const isTeacher = !!me && me.role === "teacher";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

let composerMode = "create"; // "create" | "edit"
let editingId = null;
let existingMedia = null;    // {url, type} already saved on the post being edited
let pendingFile = null;      // a newly chosen File, not uploaded yet
let pendingObjectUrl = null;
const announcementsById = new Map();

// ---------- helpers ----------
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  const secs = Math.floor((Date.now() - then.getTime()) / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function mediaHtml(a) {
  if (!a.media_url) return "";
  if (a.media_type === "video") {
    return `<video src="${esc(a.media_url)}" controls preload="metadata" class="w-full max-h-[28rem] bg-black mt-3"></video>`;
  }
  return `<img src="${esc(a.media_url)}" alt="Announcement photo" loading="lazy" class="w-full max-h-[32rem] object-cover mt-3">`;
}

// ---------- comments ----------
async function loadComments(announcementId, listEl) {
  try {
    const comments = await window.api.get(`/announcements/${announcementId}/comments`);
    if (!comments.length) {
      listEl.innerHTML = `<div class="text-xs text-muted">No replies yet.</div>`;
      return;
    }
    listEl.innerHTML = comments.map((c) => `
      <div class="flex gap-2 items-start">
        <div class="w-8 h-8 rounded-full ${c.author_role === "teacher" ? "bg-navy text-white" : "bg-gold text-navy-dark"} flex items-center justify-center text-xs font-semibold flex-shrink-0">${esc(initials(c.author_name))}</div>
        <div class="bg-[#F5F0E4] rounded-2xl px-3 py-2 min-w-0">
          <div class="text-xs font-semibold">${esc(c.author_name)} <span class="font-normal text-muted">${c.author_role === "teacher" ? "Professor" : "Student"}</span></div>
          <div class="text-sm whitespace-pre-wrap break-words">${esc(c.body)}</div>
          <div class="text-[0.65rem] text-muted mt-0.5">${timeAgo(c.created_at)}</div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<div class="text-xs text-muted">Couldn't load replies.</div>`;
  }
}

// ---------- feed ----------
function postCard(a) {
  const canEdit = isTeacher && a.posted_by === me.id;
  const canDelete = isTeacher;
  const name = a.posted_by_name || "Professor";

  const menu = (canEdit || canDelete) ? `
    <div class="relative">
      <button type="button" class="w-8 h-8 rounded-full hover:bg-[#FAF6EC] text-muted text-lg leading-none" data-menu="${a.id}" aria-label="Post options">&#8943;</button>
      <div class="hidden absolute right-0 mt-1 w-36 bg-white border border-border rounded-md shadow-lg z-10 py-1" data-menu-panel="${a.id}">
        ${canEdit ? `<button type="button" class="block w-full text-left px-3 py-1.5 text-sm hover:bg-[#FAF6EC]" data-edit-id="${a.id}">Edit post</button>` : ""}
        ${canDelete ? `<button type="button" class="block w-full text-left px-3 py-1.5 text-sm text-danger hover:bg-[#FAF6EC]" data-delete-id="${a.id}">Delete post</button>` : ""}
      </div>
    </div>` : "";

  return `
    <article class="bg-white border border-border rounded-lg overflow-hidden">
      <div class="px-4 pt-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">${esc(initials(name))}</div>
            <div class="min-w-0">
              <div class="font-semibold text-sm truncate">${esc(name)}</div>
              <div class="text-xs text-muted">${timeAgo(a.created_at)}${a.edited_at ? " · Edited" : ""}</div>
            </div>
          </div>
          ${menu}
        </div>

        <div class="mt-3">
          ${a.title ? `<h3 class="font-display font-semibold text-base mb-1">${esc(a.title)}</h3>` : ""}
          ${a.body ? `<p class="text-sm whitespace-pre-wrap break-words mb-0">${esc(a.body)}</p>` : ""}
        </div>
      </div>

      ${mediaHtml(a)}

      <div class="px-4 py-3 mt-3 border-t border-border">
        <div class="space-y-2 mb-3" data-comment-list="${a.id}"></div>
        <form class="flex gap-2 items-center" data-comment-form="${a.id}">
          <input type="text" placeholder="Write a reply…" required
                 class="flex-1 border border-border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold">
          <button type="submit" class="bg-navy text-white text-sm rounded-full px-4 py-1.5 hover:bg-navy-dark transition">Reply</button>
        </form>
      </div>
    </article>
  `;
}

function closeMenus() {
  document.querySelectorAll("[data-menu-panel]").forEach((p) => p.classList.add("hidden"));
}
document.addEventListener("click", closeMenus);

async function loadAnnouncements() {
  const list = document.getElementById("dashAnnouncements");
  try {
    const announcements = await window.api.get("/announcements");
    announcementsById.clear();
    announcements.forEach((a) => announcementsById.set(a.id, a));

    if (!announcements.length) {
      list.innerHTML = `<div class="bg-white border border-border rounded-lg text-center text-muted py-8">No announcements yet.</div>`;
      return;
    }
    list.innerHTML = announcements.map(postCard).join("");

    list.querySelectorAll("[data-menu]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = list.querySelector(`[data-menu-panel="${btn.dataset.menu}"]`);
        const wasHidden = panel.classList.contains("hidden");
        closeMenus();
        if (wasHidden) panel.classList.remove("hidden");
      });
    });

    list.querySelectorAll("[data-edit-id]").forEach((btn) => {
      btn.addEventListener("click", () => openComposer("edit", announcementsById.get(btn.dataset.editId)));
    });

    list.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        showConfirm("Are you sure you want to delete this post? Its replies will be removed too.", async () => {
          try {
            await window.api.del(`/announcements/${btn.dataset.deleteId}`);
            loadAnnouncements();
          } catch (err) {
            showAlert(err.message);
          }
        }, { confirmLabel: "Delete Post", danger: true });
      });
    });

    list.querySelectorAll("[data-comment-list]").forEach((el) => loadComments(el.dataset.commentList, el));

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
          loadComments(announcementId, list.querySelector(`[data-comment-list="${announcementId}"]`));
        } catch (err) {
          showAlert(err.message);
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<div class="bg-white border border-border rounded-lg text-center text-muted py-8">Couldn't load announcements (${esc(err.message)}).</div>`;
  }
}

// ---------- post window (create + edit) ----------
function showPostError(msg) {
  const box = document.getElementById("postError");
  box.textContent = msg;
  box.classList.remove("hidden");
}
function hidePostError() {
  document.getElementById("postError").classList.add("hidden");
}

function clearPendingFile() {
  if (pendingObjectUrl) URL.revokeObjectURL(pendingObjectUrl);
  pendingObjectUrl = null;
  pendingFile = null;
  const input = document.getElementById("postFile");
  if (input) input.value = "";
}

function renderMediaPreview() {
  const box = document.getElementById("postMediaPreview");
  let url = null;
  let type = null;

  if (pendingFile) {
    url = pendingObjectUrl;
    type = pendingFile.type.startsWith("video/") ? "video" : "image";
  } else if (existingMedia) {
    url = existingMedia.url;
    type = existingMedia.type;
  }

  if (!url) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  const media = type === "video"
    ? `<video src="${esc(url)}" controls class="w-full max-h-64 bg-black"></video>`
    : `<img src="${esc(url)}" alt="" class="w-full max-h-64 object-cover">`;

  box.innerHTML = media + `<button type="button" id="btnRemoveMedia" class="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 leading-none hover:bg-black/80" aria-label="Remove attachment">&times;</button>`;
  box.classList.remove("hidden");

  document.getElementById("btnRemoveMedia").onclick = () => {
    clearPendingFile();
    existingMedia = null;
    renderMediaPreview();
  };
}

function openComposer(mode, announcement) {
  composerMode = mode;
  editingId = announcement ? announcement.id : null;
  clearPendingFile();
  existingMedia = announcement && announcement.media_url
    ? { url: announcement.media_url, type: announcement.media_type }
    : null;

  document.getElementById("postTitle").value = announcement ? (announcement.title || "") : "";
  document.getElementById("postBody").value = announcement ? (announcement.body || "") : "";
  document.getElementById("postModalTitle").textContent = mode === "edit" ? "Edit post" : "Create post";
  document.getElementById("postSubmit").textContent = mode === "edit" ? "Save" : "Post";
  hidePostError();
  renderMediaPreview();
  document.getElementById("postModal").classList.remove("hidden");
  document.getElementById("postBody").focus();
}

function closeComposer() {
  document.getElementById("postModal").classList.add("hidden");
  clearPendingFile();
  existingMedia = null;
  editingId = null;
}

document.getElementById("openComposer")?.addEventListener("click", () => openComposer("create"));
document.getElementById("openComposerMedia")?.addEventListener("click", () => {
  openComposer("create");
  document.getElementById("postFile").click();
});
document.getElementById("btnClosePostModal").addEventListener("click", closeComposer);
document.getElementById("postModal").addEventListener("click", (e) => {
  if (e.target.id === "postModal") closeComposer();
});
document.getElementById("btnPickMedia").addEventListener("click", () => document.getElementById("postFile").click());

document.getElementById("postFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  hidePostError();

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    showPostError("Only JPG, PNG, GIF, WEBP images and MP4, WEBM, MOV videos are allowed.");
    e.target.value = "";
    return;
  }
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    showPostError(`That file is too large (max ${limit / (1024 * 1024)} MB for ${isVideo ? "videos" : "photos"}).`);
    e.target.value = "";
    return;
  }

  if (pendingObjectUrl) URL.revokeObjectURL(pendingObjectUrl);
  pendingFile = file;
  pendingObjectUrl = URL.createObjectURL(file);
  renderMediaPreview();
});

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hidePostError();

  const title = document.getElementById("postTitle").value.trim();
  const body = document.getElementById("postBody").value.trim();
  if (!body && !pendingFile && !existingMedia) {
    showPostError("Write something or attach a photo/video.");
    return;
  }

  const submit = document.getElementById("postSubmit");
  const idleLabel = composerMode === "edit" ? "Save" : "Post";
  submit.disabled = true;

  try {
    let media = existingMedia;
    if (pendingFile) {
      submit.textContent = "Uploading…";
      const formData = new FormData();
      formData.append("file", pendingFile);
      const uploaded = await window.api.upload("/announcements/upload", formData);
      media = { url: uploaded.url, type: uploaded.media_type };
    }

    submit.textContent = composerMode === "edit" ? "Saving…" : "Posting…";
    const payload = {
      title,
      body,
      media_url: media ? media.url : null,
      media_type: media ? media.type : null,
    };

    if (composerMode === "edit") {
      await window.api.put(`/announcements/${editingId}`, payload);
    } else {
      await window.api.post("/announcements", payload);
    }

    closeComposer();
    loadAnnouncements();
  } catch (err) {
    showPostError(err.message);
  } finally {
    submit.disabled = false;
    submit.textContent = idleLabel;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (me) {
    document.querySelectorAll("[data-user-initials]").forEach((el) => {
      el.textContent = initials(`${me.first_name} ${me.last_name}`);
    });
  }
  loadAnnouncements();
});