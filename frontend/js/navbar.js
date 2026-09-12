/**
 * navbar.js — the app navbar's HTML lives here ONCE. Every logged-in
 * page includes a <div id="navbar-slot"></div> and this script fills
 * it in, so adding/changing a nav link only needs to happen in this
 * one file instead of six.
 */
function renderNavbar() {
  const slot = document.getElementById("navbar-slot");
  if (!slot) return;

  slot.innerHTML = `
    <nav class="app-navbar bg-navy-dark border-b-[3px] border-gold py-2">
      <div class="max-w-6xl mx-auto px-4 flex items-center justify-between flex-wrap">
        <a href="dashboard.html" class="font-display text-white font-semibold">Northbridge</a>
        <button id="navToggle" class="lg:hidden inline-flex border border-white/40 rounded px-2.5 py-1.5">
          <span class="block w-5 h-0.5 bg-white relative
                       before:content-[''] before:absolute before:w-5 before:h-0.5 before:bg-white before:-top-1.5
                       after:content-[''] after:absolute after:w-5 after:h-0.5 after:bg-white after:top-1.5"></span>
        </button>
        <div id="appNav" class="hidden lg:flex w-full lg:w-auto lg:items-center lg:justify-between lg:flex-1 lg:ml-8 mt-3 lg:mt-0">
          <ul class="flex flex-col lg:flex-row gap-1 lg:gap-5 list-none m-0 p-0">
            <li><a class="nav-link" href="dashboard.html">Home</a></li>
            <li><a class="nav-link" href="profile.html">Profile</a></li>
            <li><a class="nav-link" href="course.html">Course</a></li>
            <li><a class="nav-link" href="schedule.html">Schedule</a></li>
            <li><a class="nav-link" href="attendance.html">Attendance</a></li>
            <li><a class="nav-link" href="grades.html">Grades</a></li>
          </ul>
          <div class="flex items-center gap-3 mt-3 lg:mt-0">
            <span class="text-white/60 text-sm"><span data-user-name></span> &middot; <span data-user-role></span></span>
            <a href="#" data-logout class="px-3 py-1.5 text-sm rounded border border-white/50 text-white hover:bg-white/10 hover:border-white transition">Log Out</a>
          </div>
        </div>
      </div>
    </nav>
  `;

  document.getElementById("navToggle").addEventListener("click", () => {
    document.getElementById("appNav").classList.toggle("hidden");
  });
}

document.addEventListener("DOMContentLoaded", renderNavbar);