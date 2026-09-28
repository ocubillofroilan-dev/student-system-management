/**
 * home.js — loads the public announcement feed on index.html.
 * No login required; GET /announcements is a public endpoint. Shows
 * the same card layout as the dashboard (with photo/video), but
 * read-only — replies are for logged-in users on the dashboard.
 */
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

function publicCard(a) {
  const name = a.posted_by_name || "Professor";
  return `
    <article class="bg-white border border-border rounded-lg overflow-hidden pb-4">
      <div class="px-4 pt-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">${esc(initials(name))}</div>
          <div class="min-w-0">
            <div class="font-semibold text-sm truncate">${esc(name)}</div>
            <div class="text-xs text-muted">${timeAgo(a.created_at)}${a.edited_at ? " · Edited" : ""}</div>
          </div>
        </div>
        <div class="mt-3">
          ${a.title ? `<h3 class="font-display font-semibold text-base mb-1">${esc(a.title)}</h3>` : ""}
          ${a.body ? `<p class="text-sm whitespace-pre-wrap break-words mb-0">${esc(a.body)}</p>` : ""}
        </div>
      </div>
      ${mediaHtml(a)}
    </article>
  `;
}

async function loadPublicAnnouncements() {
  const list = document.getElementById("publicAnnouncements");
  list.className = "space-y-4"; // cards manage their own borders, so drop the old single-box styling
  try {
    const announcements = await window.api.get("/announcements");
    if (!announcements.length) {
      list.innerHTML = `<div class="bg-white border border-border rounded-lg text-center text-muted py-8">No announcements posted yet. Check back soon.</div>`;
      return;
    }
    list.innerHTML = announcements.slice(0, 6).map(publicCard).join("");
  } catch (err) {
    list.innerHTML = `<div class="bg-white border border-border rounded-lg text-center text-muted py-8">Couldn't load announcements right now (${esc(err.message)}).</div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadPublicAnnouncements);