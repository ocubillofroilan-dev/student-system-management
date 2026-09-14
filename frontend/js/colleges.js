/**
 * colleges.js — college/department + program data, and the logic that
 * wires "Department" and "Course/Program" together as a cascading pair:
 * picking a department filters which programs show up.
 */
const COLLEGES = [
  { code: "CCS", name: "College of Computing Studies", programs: ["BS Computer Science", "BS Information Technology", "BS Information Systems"] },
  { code: "COE", name: "College of Engineering", programs: ["BS Civil Engineering", "BS Mechanical Engineering", "BS Electrical Engineering", "BS Electronics Engineering"] },
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
  { code: "DOY", name: "Department of Yearning", programs: ["Bachelor of Situationship Management", "Bachelor of Moving On", "Bachelor of Delulu Studies", "Bachelor of Waiting for the Right One", "Bachelor of Commitment Issues"] },
];

function populateDepartmentDropdown(selectEl) {
  selectEl.innerHTML =
    `<option value="">Choose…</option>` +
    COLLEGES.map((c) => `<option value="${c.name}">${c.code} — ${c.name}</option>`).join("");
}

function populateProgramDropdown(selectEl, departmentName) {
  const college = COLLEGES.find((c) => c.name === departmentName);
  if (!college) {
    selectEl.innerHTML = `<option value="">Choose a department first…</option>`;
    return;
  }
  selectEl.innerHTML =
    `<option value="">Choose…</option>` +
    college.programs.map((p) => `<option value="${p}">${p}</option>`).join("");
}