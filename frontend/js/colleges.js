/**
 * colleges.js — college/department + program data, plus a reusable
 * searchable custom dropdown component (native <select> can't be
 * restyled with a max-height + search box, so this builds one from
 * plain divs instead).
 */
const COLLEGES = [
  { code: "CCS", name: "College of Computing Studies", programs: ["BS Computer Science", "BS Information Technology", "BS Information Systems"] },
  { code: "COE", name: "College of Engineering", programs: ["BS Civil Engineering", "BS Mechanical Engineering", "BS Electrical Engineering", "BS Electronics Engineering", "BS Computer Engineering"] },
  { code: "CBA", name: "College of Business Administration", programs: ["BS Business Administration", "BS Marketing Management", "BS Financial Management", "BS Human Resource Management"] },
  { code: "COA", name: "College of Accountancy", programs: ["BS Accountancy", "BS Management Accounting"] },
  { code: "CAS", name: "College of Arts and Sciences", programs: ["BA Communication", "BA English Language", "BS Psychology", "BS Mathematics"] },
  { code: "COED", name: "College of Education", programs: ["Bachelor of Elementary Education", "Bachelor of Secondary Education", "Bachelor of Early Childhood Education"] },
  { code: "CON", name: "College of Nursing", programs: ["BS Nursing"] },
  { code: "CAH", name: "College of Allied Health", programs: ["BS Medical Technology", "BS Pharmacy", "BS Physical Therapy", "BS Radiologic Technology"] },
  { code: "CTHM", name: "College of Tourism and Hospitality Management", programs: ["BS Tourism Management", "BS Hospitality Management"] },
  { code: "CCJ", name: "College of Criminal Justice", programs: ["BS Criminology", "BS Forensic Science"] },
  { code: "CAF", name: "College of Agriculture and Fisheries", programs: ["BS Agriculture", "BS Fisheries", "BS Agricultural Technology"] },
  { code: "CA", name: "College of Architecture", programs: ["BS Architecture", "BS Interior Design"] },
  { code: "COC", name: "College of Communication", programs: ["BA Journalism", "BA Broadcasting", "BA Digital Media"] },
  { code: "CFAD", name: "College of Fine Arts and Design", programs: ["BS Multimedia Arts", "Bachelor of Fine Arts", "BS Industrial Design"] },
  { code: "DOY", name: "Department of Yearning", programs: ["BS Computer Engi-Yearning", "BS Rebound and Technology", "BS Backburner Psychology", "BS Dee Makausad Administration", "Bachelor of Situationship Management", "Bachelor of Moving On", "Bachelor of Delulu Studies", "Bachelor of Waiting for the Right One", "Bachelor of Commitment Issues"] },
];

/**
 * Turns a plain <div id="..."></div> into a searchable custom dropdown.
 * options: array of {value, label} objects
 * onSelect: function(value) called whenever the user picks an option
 * Returns an object with .setValue(value) and .getValue() for external control.
 */
function createSearchableDropdown(containerId, options, placeholder, onSelect) {
  const container = document.getElementById(containerId);
  let selectedValue = "";
  let filteredOptions = options;

  container.innerHTML = `
    <div class="relative">
      <button type="button" class="dropdown-toggle w-full flex items-center justify-between border border-border rounded-md px-3 py-2 bg-white text-left focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold">
        <span class="dropdown-label text-muted">${placeholder}</span>
        <span class="text-muted">▾</span>
      </button>
      <div class="dropdown-panel hidden absolute z-20 mt-1 w-full bg-white border border-border rounded-md shadow-lg">
        <div class="p-2 border-b border-border">
          <input type="text" placeholder="Search…" class="dropdown-search w-full border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40">
        </div>
        <div class="dropdown-list max-h-56 overflow-y-auto"></div>
      </div>
    </div>
  `;

  const toggle = container.querySelector(".dropdown-toggle");
  const panel = container.querySelector(".dropdown-panel");
  const search = container.querySelector(".dropdown-search");
  const list = container.querySelector(".dropdown-list");
  const label = container.querySelector(".dropdown-label");

  function renderList() {
    if (!filteredOptions.length) {
      list.innerHTML = `<div class="px-3 py-2 text-sm text-muted">No matches.</div>`;
      return;
    }
    list.innerHTML = filteredOptions.map((opt) => `
      <div class="dropdown-item px-3 py-2 text-sm cursor-pointer hover:bg-[#FAF6EC] ${opt.value === selectedValue ? "bg-[#FAF6EC] font-semibold" : ""}" data-value="${opt.value}">
        ${opt.label}
      </div>
    `).join("");

    list.querySelectorAll(".dropdown-item").forEach((item) => {
      item.addEventListener("click", () => {
        selectedValue = item.dataset.value;
        const chosen = options.find((o) => o.value === selectedValue);
        label.textContent = chosen ? chosen.label : placeholder;
        label.classList.remove("text-muted");
        panel.classList.add("hidden");
        onSelect(selectedValue);
      });
    });
  }

  toggle.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) {
      search.value = "";
      filteredOptions = options;
      renderList();
      search.focus();
    }
  });

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    filteredOptions = options.filter((o) => o.label.toLowerCase().includes(q));
    renderList();
  });

  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) panel.classList.add("hidden");
  });

  renderList();

  return {
    setValue(value) {
      selectedValue = value;
      const chosen = options.find((o) => o.value === value);
      label.textContent = chosen ? chosen.label : placeholder;
      label.classList.toggle("text-muted", !chosen);
    },
    getValue() {
      return selectedValue;
    },
  };
}