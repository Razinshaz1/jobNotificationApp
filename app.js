const ROUTES = {
  "/": "Landing",
  "/dashboard": "Dashboard",
  "/settings": "Settings",
  "/saved": "Saved",
  "/digest": "Digest",
  "/proof": "Proof",
};

const DEFAULT_ROUTE = "/";
const STORAGE_KEY = "jobNotificationTracker_savedIds";

function getJobs() {
  return Array.isArray(window.JOBS) ? window.JOBS : [];
}

function getCurrentPath() {
  const path = window.location.pathname || DEFAULT_ROUTE;
  return path === "/" ? DEFAULT_ROUTE : path;
}

function isKnownRoute(path) {
  return Object.prototype.hasOwnProperty.call(ROUTES, path);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSavedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSavedIds(ids) {
  const unique = [...new Set(ids)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

function isJobSaved(id) {
  return getSavedIds().includes(id);
}

function toggleSaveJob(id) {
  const ids = getSavedIds();
  const idx = ids.indexOf(id);
  if (idx === -1) {
    ids.push(id);
  } else {
    ids.splice(idx, 1);
  }
  setSavedIds(ids);
}

function formatPostedDays(days) {
  const d = Number(days);
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function uniqueSortedLocations(jobs) {
  return [...new Set(jobs.map((j) => j.location))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function filterAndSortJobs(jobs, filters) {
  const keyword = (filters.keyword || "").trim().toLowerCase();
  const { location, mode, experience, source, sort } = filters;

  let list = jobs.filter((job) => {
    if (keyword) {
      const hay = `${job.title} ${job.company}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    if (location && job.location !== location) return false;
    if (mode && job.mode !== mode) return false;
    if (experience && job.experience !== experience) return false;
    if (source && job.source !== source) return false;
    return true;
  });

  if (sort === "oldest") {
    list = [...list].sort((a, b) => b.postedDaysAgo - a.postedDaysAgo);
  } else if (sort === "company") {
    list = [...list].sort((a, b) => {
      const c = a.company.localeCompare(b.company, undefined, { sensitivity: "base" });
      if (c !== 0) return c;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
  } else {
    list = [...list].sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  }

  return list;
}

function jobCardHtml(job) {
  const saved = isJobSaved(job.id);
  const saveLabel = saved ? "Saved" : "Save";
  const saveClass = saved ? "btn btn-secondary" : "btn btn-primary";
  return `
    <article class="job-card" aria-label="${escapeHtml(job.title)} at ${escapeHtml(job.company)}">
      <h3 class="job-card-title">${escapeHtml(job.title)}</h3>
      <p class="job-card-company">${escapeHtml(job.company)}</p>
      <p class="job-card-meta">${escapeHtml(job.location)} · ${escapeHtml(job.mode)}</p>
      <p class="job-card-detail"><span class="job-card-label">Experience</span> ${escapeHtml(job.experience)}</p>
      <p class="job-card-detail"><span class="job-card-label">Salary</span> ${escapeHtml(job.salaryRange)}</p>
      <div class="job-card-row">
        <span class="source-badge">${escapeHtml(job.source)}</span>
        <span class="job-card-posted">${escapeHtml(formatPostedDays(job.postedDaysAgo))}</span>
      </div>
      <div class="job-card-actions">
        <button type="button" class="btn btn-secondary" data-job-action="view" data-job-id="${escapeHtml(job.id)}">View</button>
        <button type="button" class="${saveClass}" data-job-action="save" data-job-id="${escapeHtml(
    job.id
  )}">${saveLabel}</button>
        <button type="button" class="btn btn-secondary" data-job-action="apply" data-job-id="${escapeHtml(
    job.id
  )}">Apply</button>
      </div>
    </article>
  `;
}

function readDashboardFilters() {
  const root = document.getElementById("dashboard-filters");
  if (!root) {
    return {
      keyword: "",
      location: "",
      mode: "",
      experience: "",
      source: "",
      sort: "latest",
    };
  }
  return {
    keyword: root.querySelector('[data-filter="keyword"]').value,
    location: root.querySelector('[data-filter="location"]').value,
    mode: root.querySelector('[data-filter="mode"]').value,
    experience: root.querySelector('[data-filter="experience"]').value,
    source: root.querySelector('[data-filter="source"]').value,
    sort: root.querySelector('[data-filter="sort"]').value,
  };
}

function applyDashboardFilters() {
  const grid = document.getElementById("job-grid");
  const empty = document.getElementById("job-empty");
  if (!grid || !empty) return;

  const jobs = getJobs();
  const filtered = filterAndSortJobs(jobs, readDashboardFilters());

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = filtered.map((job) => jobCardHtml(job)).join("");
}

function bindDashboardFilters() {
  const root = document.getElementById("dashboard-filters");
  if (!root) return;
  root.addEventListener("input", applyDashboardFilters);
  root.addEventListener("change", applyDashboardFilters);
}

function renderDashboard() {
  const routeView = document.getElementById("route-view");
  const jobs = getJobs();
  const locations = uniqueSortedLocations(jobs);

  routeView.innerHTML = `
    <section class="route-content dashboard-route" aria-labelledby="route-title">
      <h1 id="route-title" class="route-title">Dashboard</h1>
      <p class="route-subtext">Browse openings from Indian tech employers. Refine the list, inspect details, and save roles to revisit later.</p>
      <div id="dashboard-filters" class="filter-bar" role="search" aria-label="Filter jobs">
        <div class="filter-field filter-field-grow">
          <label for="filter-keyword">Keyword</label>
          <input id="filter-keyword" type="search" data-filter="keyword" placeholder="Search title or company" autocomplete="off" />
        </div>
        <div class="filter-field">
          <label for="filter-location">Location</label>
          <select id="filter-location" data-filter="location">
            <option value="">All locations</option>
            ${locations.map((loc) => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`).join("")}
          </select>
        </div>
        <div class="filter-field">
          <label for="filter-mode">Mode</label>
          <select id="filter-mode" data-filter="mode">
            <option value="">All modes</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Onsite">Onsite</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="filter-experience">Experience</label>
          <select id="filter-experience" data-filter="experience">
            <option value="">All levels</option>
            <option value="Fresher">Fresher</option>
            <option value="0-1">0-1</option>
            <option value="1-3">1-3</option>
            <option value="3-5">3-5</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="filter-source">Source</label>
          <select id="filter-source" data-filter="source">
            <option value="">All sources</option>
            <option value="Linkedin">Linkedin</option>
            <option value="Naukri">Naukri</option>
            <option value="Indeed">Indeed</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="filter-sort">Sort</label>
          <select id="filter-sort" data-filter="sort">
            <option value="latest" selected>Latest</option>
            <option value="oldest">Oldest</option>
            <option value="company">Company A–Z</option>
          </select>
        </div>
      </div>
      <p id="job-empty" class="empty-search" hidden>No jobs match your search.</p>
      <div id="job-grid" class="job-grid"></div>
    </section>
  `;

  bindDashboardFilters();
  applyDashboardFilters();
}

function renderSaved() {
  const routeView = document.getElementById("route-view");
  const jobs = getJobs();
  const saved = getSavedIds();
  const savedJobs = saved
    .map((id) => jobs.find((j) => j.id === id))
    .filter(Boolean);

  if (savedJobs.length === 0) {
    routeView.innerHTML = `
      <section class="route-content" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">Saved</h1>
        <div class="empty-state" role="status">
          <p class="empty-state-lead">Your shortlist is empty.</p>
          <p class="route-subtext">Save roles from the dashboard to compare them calmly. Everything you save stays on this device, even after you refresh the page.</p>
        </div>
      </section>
    `;
    return;
  }

  routeView.innerHTML = `
    <section class="route-content" aria-labelledby="route-title">
      <h1 id="route-title" class="route-title">Saved</h1>
      <p class="route-subtext">${savedJobs.length} role${savedJobs.length === 1 ? "" : "s"} saved on this device.</p>
      <div class="job-grid">${savedJobs.map((job) => jobCardHtml(job)).join("")}</div>
    </section>
  `;
}

function closeJobModal() {
  const modal = document.getElementById("job-modal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function openJobModal(job) {
  const modal = document.getElementById("job-modal");
  if (!modal) return;

  const titleEl = modal.querySelector("[data-modal-title]");
  const metaEl = modal.querySelector("[data-modal-meta]");
  const descEl = modal.querySelector("[data-modal-description]");
  const skillsEl = modal.querySelector("[data-modal-skills]");

  titleEl.textContent = job.title;
  metaEl.textContent = `${job.company} · ${job.location} · ${job.mode}`;
  descEl.textContent = job.description;
  skillsEl.innerHTML = job.skills
    .map((s) => `<li><span class="skill-chip">${escapeHtml(s)}</span></li>`)
    .join("");

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");

  const closeBtn = modal.querySelector("[data-close-modal]");
  if (closeBtn) closeBtn.focus();
}

function refreshVisibleJobLists() {
  const path = getCurrentPath();
  if (path === "/dashboard") {
    applyDashboardFilters();
  } else if (path === "/saved") {
    renderSaved();
    setActiveLink(path);
  }
}

function renderRoute(path) {
  closeJobModal();
  const routeView = document.getElementById("route-view");
  if (path === "/") {
    routeView.innerHTML = `
      <section class="route-content" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">Stop Missing The Right Jobs.</h1>
        <p class="route-subtext">Precision-matched job discovery delivered daily at 9AM.</p>
        <a href="/settings" data-route="/settings" class="cta-link">Start Tracking</a>
      </section>
    `;
    return;
  }

  if (path === "/settings") {
    routeView.innerHTML = `
      <section class="route-content" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">Settings</h1>
        <p class="route-subtext">This section will be built in the next step.</p>
        <ul class="placeholder-list" aria-label="Preference placeholders">
          <li>Role keywords</li>
          <li>Preferred locations</li>
          <li>Mode (Remote/Hybrid/Onsite)</li>
          <li>Experience level</li>
        </ul>
      </section>
    `;
    return;
  }

  if (path === "/dashboard") {
    renderDashboard();
    return;
  }

  if (path === "/saved") {
    renderSaved();
    return;
  }

  if (path === "/digest") {
    routeView.innerHTML = `
      <section class="route-content" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">Digest</h1>
        <p class="route-subtext">Daily summary previews will be introduced here in the next step.</p>
      </section>
    `;
    return;
  }

  if (path === "/proof") {
    routeView.innerHTML = `
      <section class="route-content" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">Proof</h1>
        <p class="route-subtext">Artifact collection placeholders will be built in the next step.</p>
      </section>
    `;
    return;
  }

  routeView.innerHTML = `
    <section class="route-content" aria-labelledby="route-title">
      <h1 id="route-title" class="route-title">Page Not Found</h1>
      <p class="route-subtext">The page you are looking for does not exist.</p>
    </section>
  `;
}

function setActiveLink(path) {
  const links = document.querySelectorAll("[data-route]");
  links.forEach((link) => {
    if (link.getAttribute("data-route") === path) {
      link.classList.add("active-link");
      link.setAttribute("aria-current", "page");
    } else {
      link.classList.remove("active-link");
      link.removeAttribute("aria-current");
    }
  });
}

function closeMobileMenu() {
  const menu = document.getElementById("mobile-nav-panel");
  const menuButton = document.querySelector(".menu-toggle");
  menu.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}

function navigateTo(path, replace = false) {
  const safePath = path;
  const currentPath = getCurrentPath();

  if (safePath === currentPath) {
    closeMobileMenu();
    return;
  }

  if (replace) {
    window.history.replaceState({}, "", safePath);
  } else {
    window.history.pushState({}, "", safePath);
  }

  renderRoute(safePath);
  setActiveLink(safePath);
  closeMobileMenu();
}

function bindNavigation() {
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[data-route]");
    if (anchor) {
      event.preventDefault();
      const nextPath = anchor.getAttribute("data-route");
      navigateTo(nextPath);
      return;
    }

    if (event.target.closest("[data-close-modal]")) {
      event.preventDefault();
      closeJobModal();
      return;
    }

    if (event.target.classList.contains("modal-backdrop")) {
      closeJobModal();
      return;
    }

    const actionBtn = event.target.closest("[data-job-action]");
    if (!actionBtn) return;

    const id = actionBtn.getAttribute("data-job-id");
    const action = actionBtn.getAttribute("data-job-action");
    const job = getJobs().find((j) => j.id === id);
    if (!job) return;

    if (action === "view") {
      openJobModal(job);
    } else if (action === "save") {
      toggleSaveJob(id);
      refreshVisibleJobLists();
    } else if (action === "apply") {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    }
  });

  window.addEventListener("popstate", () => {
    const path = getCurrentPath();
    renderRoute(path);
    setActiveLink(path);
    closeMobileMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeJobModal();
    }
  });

  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.getElementById("mobile-nav-panel");
  menuButton.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

function initializeRouting() {
  const currentPath = getCurrentPath();
  const initialPath = currentPath || DEFAULT_ROUTE;
  navigateTo(initialPath, true);
}

bindNavigation();
initializeRouting();
