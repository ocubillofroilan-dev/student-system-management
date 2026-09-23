/**
 * modal.js — a single reusable confirm/alert modal, styled to match
 * the university theme, always centered on screen. Include this on
 * any page that needs to replace native confirm()/alert() calls.
 */
function ensureModalRoot() {
  if (document.getElementById("eduModalRoot")) return;
  const root = document.createElement("div");
  root.id = "eduModalRoot";
  root.className = "hidden fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[9999]";
  root.innerHTML = `
    <div class="bg-white rounded-lg max-w-sm w-full p-5 border-t-4 border-gold shadow-xl">
      <p id="eduModalMessage" class="text-sm text-ink mb-5"></p>
      <div id="eduModalButtons" class="flex justify-end gap-2"></div>
    </div>
  `;
  document.body.appendChild(root);
}

function showConfirm(message, onConfirm, options = {}) {
  ensureModalRoot();
  const root = document.getElementById("eduModalRoot");
  document.getElementById("eduModalMessage").textContent = message;

  const confirmLabel = options.confirmLabel || "Confirm";
  const cancelLabel = options.cancelLabel || "Cancel";
  const confirmClass = options.danger
    ? "bg-danger text-white hover:opacity-90"
    : "bg-gold text-navy-dark hover:bg-gold-light";

  document.getElementById("eduModalButtons").innerHTML = `
    <button id="eduModalCancel" class="border border-muted text-muted rounded-md px-4 py-1.5 text-sm hover:bg-muted hover:text-white transition">${cancelLabel}</button>
    <button id="eduModalConfirm" class="${confirmClass} rounded-md px-4 py-1.5 text-sm font-semibold transition">${confirmLabel}</button>
  `;
  root.classList.remove("hidden");

  document.getElementById("eduModalCancel").onclick = () => root.classList.add("hidden");
  document.getElementById("eduModalConfirm").onclick = () => {
    root.classList.add("hidden");
    onConfirm();
  };
}

function showAlert(message) {
  ensureModalRoot();
  const root = document.getElementById("eduModalRoot");
  document.getElementById("eduModalMessage").textContent = message;
  document.getElementById("eduModalButtons").innerHTML = `
    <button id="eduModalOk" class="bg-navy text-white rounded-md px-4 py-1.5 text-sm font-semibold hover:bg-navy-dark transition">OK</button>
  `;
  root.classList.remove("hidden");
  document.getElementById("eduModalOk").onclick = () => root.classList.add("hidden");
}