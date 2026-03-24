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
const PREFS_KEY = "jobTracker Preferences";
const STATUS_STORAGE_KEY = "jobTrackerStatus";
const STATUS_UPDATES_KEY = "jobTrackerStatusUpdates";
const JOB_STATUSES = ["Not Applied", "Applied", "Rejected", "Selected"];

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

function getStatusMap() {
  try {
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    const out = {};
    Object.keys(o).forEach((k) => {
      const v = o[k];
      if (JOB_STATUSES.includes(v)) out[k] = v;
    });
    return out;
  } catch {
    return {};
  }
}

function persistStatusMap(map) {
  try {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

function getJobStatus(jobId) {
  const s = getStatusMap()[jobId];
  return JOB_STATUSES.includes(s) ? s : "Not Applied";
}

function setJobStatus(jobId, nextStatus, job) {
  if (!JOB_STATUSES.includes(nextStatus) || !job) return false;
  const prev = getJobStatus(jobId);
  if (prev === nextStatus) return false;
  const map = getStatusMap();
  map[jobId] = nextStatus;
  persistStatusMap(map);
  appendStatusUpdate({
    jobId,
    title: job.title || "",
    company: job.company || "",
    status: nextStatus,
    changedAt: new Date().toISOString(),
  });
  return true;
}

function getStatusUpdates() {
  try {
    const raw = localStorage.getItem(STATUS_UPDATES_KEY);
    if (!raw) return [];
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function appendStatusUpdate(entry) {
  const list = getStatusUpdates();
  list.unshift(entry);
  try {
    localStorage.setItem(STATUS_UPDATES_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

function jobStatusChipClass(status) {
  if (status === "Applied") return "job-status-chip job-status-chip--applied";
  if (status === "Rejected") return "job-status-chip job-status-chip--rejected";
  if (status === "Selected") return "job-status-chip job-status-chip--selected";
  return "job-status-chip job-status-chip--neutral";
}

function statusButtonGroupHtml(jobId, current) {
  const chip = `<span class="${jobStatusChipClass(current)}">${escapeHtml(current)}</span>`;
  const buttons = JOB_STATUSES.map((s) => {
    const active = current === s ? " status-btn--active" : "";
    return `<button type="button" class="status-btn${active}" data-job-action="status" data-job-id="${escapeHtml(jobId)}" data-status="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
  }).join("");
  return `
    <div class="job-status-block">
      <p class="job-status-label">Status</p>
      <div class="status-chip-row">${chip}</div>
      <div class="status-btn-group" role="group" aria-label="Application status">
        ${buttons}
      </div>
    </div>
  `;
}

let toastHideTimer = null;

function showStatusToast(status) {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = `Status updated: ${status}`;
  region.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.add("toast--show");
  });
  clearTimeout(toastHideTimer);
  toastHideTimer = setTimeout(() => {
    el.classList.remove("toast--show");
    setTimeout(() => {
      el.remove();
    }, 200);
  }, 2800);
}

function renderRecentStatusUpdatesSection() {
  const updates = getStatusUpdates().filter((u) => u && u.jobId && u.status && u.changedAt);
  if (updates.length === 0) {
    return `
      <section class="digest-status-section" aria-labelledby="digest-status-heading">
        <h2 id="digest-status-heading" class="digest-status-title">Recent Status Updates</h2>
        <p class="digest-status-empty">No status changes yet. Update a job from the dashboard or Saved list.</p>
      </section>
    `;
  }
  return `
    <section class="digest-status-section" aria-labelledby="digest-status-heading">
      <h2 id="digest-status-heading" class="digest-status-title">Recent Status Updates</h2>
      <ul class="digest-status-list">
        ${updates
          .map((u) => {
            const dt = new Date(u.changedAt);
            const dateStr = Number.isNaN(dt.getTime())
              ? String(u.changedAt)
              : dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
            const inlineClass =
              u.status === "Applied"
                ? "digest-status-pill digest-status-pill--applied"
                : u.status === "Rejected"
                  ? "digest-status-pill digest-status-pill--rejected"
                  : u.status === "Selected"
                    ? "digest-status-pill digest-status-pill--selected"
                    : "digest-status-pill digest-status-pill--neutral";
            return `<li class="digest-status-item">
              <p class="digest-status-job">${escapeHtml(u.title)} — ${escapeHtml(u.company)}</p>
              <p class="digest-status-meta">
                <span class="${inlineClass}">${escapeHtml(u.status)}</span>
                <span class="digest-status-date">${escapeHtml(dateStr)}</span>
              </p>
            </li>`;
          })
          .join("")}
      </ul>
    </section>
  `;
}

function emptyPreferences() {
  return {
    roleKeywords: "",
    preferredLocations: [],
    preferredMode: [],
    experienceLevel: "",
    skills: "",
    minMatchScore: 40,
  };
}

function getPreferencesRaw() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function preferencesAreSaved() {
  return localStorage.getItem(PREFS_KEY) !== null;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function getMergedPreferences() {
  const raw = getPreferencesRaw() || {};
  const merged = Object.assign(emptyPreferences(), raw);
  merged.preferredLocations = Array.isArray(merged.preferredLocations)
    ? merged.preferredLocations
    : [];
  merged.preferredMode = Array.isArray(merged.preferredMode) ? merged.preferredMode : [];
  const minRaw = Number(merged.minMatchScore);
  merged.minMatchScore = clamp(Number.isFinite(minRaw) ? minRaw : 40, 0, 100);
  return merged;
}

function savePreferencesFromForm(form) {
  const roleKeywords = (form.querySelector('[name="roleKeywords"]')?.value || "").trim();
  const select = form.querySelector('[name="preferredLocations"]');
  const preferredLocations = select
    ? Array.from(select.selectedOptions)
        .map((o) => o.value)
        .filter(Boolean)
    : [];
  const preferredMode = Array.from(form.querySelectorAll('[name="preferredMode"]:checked')).map((c) =>
    c.value.trim()
  );
  const experienceLevel = form.querySelector('[name="experienceLevel"]')?.value || "";
  const skills = (form.querySelector('[name="skills"]')?.value || "").trim();
  const rawMin = Number(form.querySelector('[name="minMatchScore"]')?.value);
  const minMatchScore = clamp(Number.isFinite(rawMin) ? rawMin : 40, 0, 100);

  const payload = {
    roleKeywords,
    preferredLocations,
    preferredMode,
    experienceLevel,
    skills,
    minMatchScore,
  };
  localStorage.setItem(PREFS_KEY, JSON.stringify(payload));
}

function parseCommaKeywords(text) {
  return String(text || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseCommaSkills(text) {
  return String(text || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Deterministic match score per specification (+25 title, +15 desc, +15 location,
 * +10 mode, +10 experience, +15 skill overlap, +5 recent, +5 LinkedIn). Cap 100.
 */
function computeMatchScore(job, prefs) {
  const p = prefs || emptyPreferences();
  let score = 0;

  const keywords = parseCommaKeywords(p.roleKeywords);
  const titleLower = (job.title || "").toLowerCase();
  const descLower = (job.description || "").toLowerCase();

  if (keywords.length > 0 && keywords.some((k) => titleLower.includes(k))) {
    score += 25;
  }
  if (keywords.length > 0 && keywords.some((k) => descLower.includes(k))) {
    score += 15;
  }

  const locs = Array.isArray(p.preferredLocations) ? p.preferredLocations : [];
  if (locs.length > 0 && locs.includes(job.location)) {
    score += 15;
  }

  const modes = Array.isArray(p.preferredMode) ? p.preferredMode : [];
  if (modes.length > 0 && modes.includes(job.mode)) {
    score += 10;
  }

  const expLevel = (p.experienceLevel || "").trim();
  if (expLevel && job.experience === expLevel) {
    score += 10;
  }

  const userSkills = parseCommaSkills(p.skills);
  const jobSkillSet = (job.skills || []).map((s) => String(s).trim().toLowerCase());
  if (
    userSkills.length > 0 &&
    userSkills.some((us) => jobSkillSet.some((js) => js === us))
  ) {
    score += 15;
  }

  if (Number(job.postedDaysAgo) <= 2) {
    score += 5;
  }
  if (job.source === "Linkedin") {
    score += 5;
  }

  return Math.min(100, score);
}

function salarySortKey(range) {
  const s = String(range || "");
  let m = s.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return parseInt(m[1], 10);
  m = s.match(/₹\s*(\d+)\s*k/i);
  if (m) return parseInt(m[1], 10);
  m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function matchBadgeClass(score) {
  if (score >= 80) return "match-badge match-badge--high";
  if (score >= 60) return "match-badge match-badge--mid";
  if (score >= 40) return "match-badge match-badge--neutral";
  return "match-badge match-badge--low";
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

function passesBarFilters(job, filters) {
  const keyword = (filters.keyword || "").trim().toLowerCase();
  if (keyword) {
    const hay = `${job.title} ${job.company}`.toLowerCase();
    if (!hay.includes(keyword)) return false;
  }
  if (filters.location && job.location !== filters.location) return false;
  if (filters.mode && job.mode !== filters.mode) return false;
  if (filters.experience && job.experience !== filters.experience) return false;
  if (filters.source && job.source !== filters.source) return false;
  if (filters.status) {
    const st = getJobStatus(job.id);
    if (st !== filters.status) return false;
  }
  return true;
}

function sortDashboardItems(items, sort) {
  const copy = [...items];
  if (sort === "oldest") {
    copy.sort(
      (a, b) =>
        b.job.postedDaysAgo - a.job.postedDaysAgo || a.job.id.localeCompare(b.job.id)
    );
  } else if (sort === "company") {
    copy.sort((a, b) => {
      const c = a.job.company.localeCompare(b.job.company, undefined, { sensitivity: "base" });
      if (c !== 0) return c;
      return a.job.title.localeCompare(b.job.title, undefined, { sensitivity: "base" });
    });
  } else if (sort === "match") {
    copy.sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        a.job.postedDaysAgo - b.job.postedDaysAgo ||
        a.job.id.localeCompare(b.job.id)
    );
  } else if (sort === "salary") {
    copy.sort(
      (a, b) =>
        salarySortKey(b.job.salaryRange) - salarySortKey(a.job.salaryRange) ||
        a.job.id.localeCompare(b.job.id)
    );
  } else {
    copy.sort(
      (a, b) =>
        a.job.postedDaysAgo - b.job.postedDaysAgo || a.job.id.localeCompare(b.job.id)
    );
  }
  return copy;
}

function jobCardHtml(job, matchScore) {
  const saved = isJobSaved(job.id);
  const saveLabel = saved ? "Saved" : "Save";
  const saveClass = saved ? "btn btn-secondary" : "btn btn-primary";
  const badge = `<span class="${matchBadgeClass(matchScore)}"><span class="match-badge-label">Match</span> ${matchScore}</span>`;
  const status = getJobStatus(job.id);
  const statusBlock = statusButtonGroupHtml(job.id, status);
  return `
    <article class="job-card" aria-label="${escapeHtml(job.title)} at ${escapeHtml(job.company)}">
      <div class="job-card-top">
        ${badge}
      </div>
      <h3 class="job-card-title">${escapeHtml(job.title)}</h3>
      <p class="job-card-company">${escapeHtml(job.company)}</p>
      <p class="job-card-meta">${escapeHtml(job.location)} · ${escapeHtml(job.mode)}</p>
      <p class="job-card-detail"><span class="job-card-label">Experience</span> ${escapeHtml(job.experience)}</p>
      <p class="job-card-detail"><span class="job-card-label">Salary</span> ${escapeHtml(job.salaryRange)}</p>
      <div class="job-card-row">
        <span class="source-badge">${escapeHtml(job.source)}</span>
        <span class="job-card-posted">${escapeHtml(formatPostedDays(job.postedDaysAgo))}</span>
      </div>
      ${statusBlock}
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
      status: "",
      sort: "latest",
    };
  }
  return {
    keyword: root.querySelector('[data-filter="keyword"]').value,
    location: root.querySelector('[data-filter="location"]').value,
    mode: root.querySelector('[data-filter="mode"]').value,
    experience: root.querySelector('[data-filter="experience"]').value,
    source: root.querySelector('[data-filter="source"]').value,
    status: root.querySelector('[data-filter="status"]').value,
    sort: root.querySelector('[data-filter="sort"]').value,
  };
}

let dashboardRafStep = null;
let lastDashboardSignature = "";

function scheduleDashboardRefresh() {
  if (dashboardRafStep !== null) return;
  dashboardRafStep = requestAnimationFrame(() => {
    dashboardRafStep = null;
    applyDashboardFilters();
  });
}

function buildDashboardSignature(items, filters, onlyMatches, minThreshold) {
  return JSON.stringify({
    f: filters,
    o: onlyMatches,
    m: minThreshold,
    p: getMergedPreferences(),
    ids: items.map((i) => i.job.id),
    s: items.map((i) => i.matchScore),
    saved: getSavedIds(),
    statuses: getStatusMap(),
  });
}

function applyDashboardFilters() {
  const grid = document.getElementById("job-grid");
  const empty = document.getElementById("job-empty");
  if (!grid || !empty) return;

  const filters = readDashboardFilters();
  const prefsMerged = getMergedPreferences();
  const onlyMatchesEl = document.getElementById("dashboard-only-matches");
  const onlyMatches = onlyMatchesEl ? onlyMatchesEl.checked : false;
  const minRaw = Number(prefsMerged.minMatchScore);
  const minThreshold = clamp(Number.isFinite(minRaw) ? minRaw : 40, 0, 100);

  let jobs = getJobs().filter((job) => passesBarFilters(job, filters));
  let items = jobs.map((job) => ({
    job,
    matchScore: computeMatchScore(job, prefsMerged),
  }));

  if (onlyMatches) {
    items = items.filter((x) => x.matchScore >= minThreshold);
  }

  items = sortDashboardItems(items, filters.sort);

  const sig = buildDashboardSignature(items, filters, onlyMatches, minThreshold);
  if (sig === lastDashboardSignature && grid.childElementCount === items.length) {
    return;
  }
  lastDashboardSignature = sig;

  if (items.length === 0) {
    grid.innerHTML = "";
    empty.hidden = false;
    empty.textContent =
      "No roles match your criteria. Adjust filters or lower threshold.";
    return;
  }

  empty.hidden = true;
  grid.innerHTML = items.map(({ job, matchScore }) => jobCardHtml(job, matchScore)).join("");
}

function resetDashboardCache() {
  lastDashboardSignature = "";
}

function bindDashboardFilters() {
  const root = document.getElementById("dashboard-filters");
  if (!root) return;
  root.addEventListener("input", scheduleDashboardRefresh);
  root.addEventListener("change", scheduleDashboardRefresh);

  const toggle = document.getElementById("dashboard-only-matches");
  if (toggle) {
    toggle.addEventListener("change", () => {
      resetDashboardCache();
      scheduleDashboardRefresh();
    });
  }
}

function renderDashboard() {
  resetDashboardCache();
  dashboardRafStep = null;
  const routeView = document.getElementById("route-view");
  const jobs = getJobs();
  const locations = uniqueSortedLocations(jobs);
  const showPrefsBanner = !preferencesAreSaved();

  routeView.innerHTML = `
    <section class="route-content dashboard-route" aria-labelledby="route-title">
      <h1 id="route-title" class="route-title">Dashboard</h1>
      <p class="route-subtext">Browse openings from Indian tech employers. Refine the list, inspect details, and save roles to revisit later.</p>
      ${
        showPrefsBanner
          ? `<div class="prefs-banner" role="status">Set your preferences to activate intelligent matching.</div>`
          : ""
      }
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
          <label for="filter-status">Status</label>
          <select id="filter-status" data-filter="status">
            <option value="">All</option>
            <option value="Not Applied">Not Applied</option>
            <option value="Applied">Applied</option>
            <option value="Rejected">Rejected</option>
            <option value="Selected">Selected</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="filter-sort">Sort</label>
          <select id="filter-sort" data-filter="sort">
            <option value="latest" selected>Latest</option>
            <option value="oldest">Oldest</option>
            <option value="company">Company A–Z</option>
            <option value="match">Match score</option>
            <option value="salary">Salary</option>
          </select>
        </div>
      </div>
      <div class="dashboard-threshold">
        <label class="threshold-label">
          <input type="checkbox" id="dashboard-only-matches" />
          <span>Show only jobs above my threshold</span>
        </label>
      </div>
      <p id="job-empty" class="empty-search" hidden>No roles match your criteria. Adjust filters or lower threshold.</p>
      <div id="job-grid" class="job-grid"></div>
    </section>
  `;

  bindDashboardFilters();
  applyDashboardFilters();
}

function renderSettings() {
  const routeView = document.getElementById("route-view");
  const jobs = getJobs();
  const locations = uniqueSortedLocations(jobs);
  const prefs = getMergedPreferences();
  const prefLocs = prefs.preferredLocations;
  const prefModes = prefs.preferredMode;

  routeView.innerHTML = `
    <section class="route-content" aria-labelledby="route-title">
      <h1 id="route-title" class="route-title">Settings</h1>
      <p class="route-subtext">Define how roles are scored on the dashboard. Preferences stay on this device.</p>
      <form id="settings-form" class="settings-form" novalidate>
        <div class="settings-field">
          <label for="settings-role-keywords">Role keywords (comma-separated)</label>
          <input id="settings-role-keywords" name="roleKeywords" type="text" autocomplete="off" placeholder="e.g. React, Backend intern" value="${escapeHtml(prefs.roleKeywords)}" />
        </div>
        <div class="settings-field">
          <label for="settings-locations">Preferred locations</label>
          <select id="settings-locations" name="preferredLocations" multiple size="6">
            ${locations
              .map((loc) => {
                const sel = prefLocs.includes(loc) ? " selected" : "";
                return `<option value="${escapeHtml(loc)}"${sel}>${escapeHtml(loc)}</option>`;
              })
              .join("")}
          </select>
          <p class="settings-hint">Hold Ctrl or Cmd to select multiple.</p>
        </div>
        <fieldset class="settings-fieldset">
          <legend>Preferred mode</legend>
          <label class="settings-check"><input type="checkbox" name="preferredMode" value="Remote" ${prefModes.includes("Remote") ? "checked" : ""} /> Remote</label>
          <label class="settings-check"><input type="checkbox" name="preferredMode" value="Hybrid" ${prefModes.includes("Hybrid") ? "checked" : ""} /> Hybrid</label>
          <label class="settings-check"><input type="checkbox" name="preferredMode" value="Onsite" ${prefModes.includes("Onsite") ? "checked" : ""} /> Onsite</label>
        </fieldset>
        <div class="settings-field">
          <label for="settings-experience">Experience level</label>
          <select id="settings-experience" name="experienceLevel">
            <option value=""${prefs.experienceLevel === "" ? " selected" : ""}>Any (no filter in score)</option>
            <option value="Fresher"${prefs.experienceLevel === "Fresher" ? " selected" : ""}>Fresher</option>
            <option value="0-1"${prefs.experienceLevel === "0-1" ? " selected" : ""}>0-1</option>
            <option value="1-3"${prefs.experienceLevel === "1-3" ? " selected" : ""}>1-3</option>
            <option value="3-5"${prefs.experienceLevel === "3-5" ? " selected" : ""}>3-5</option>
          </select>
        </div>
        <div class="settings-field">
          <label for="settings-skills">Skills (comma-separated)</label>
          <input id="settings-skills" name="skills" type="text" autocomplete="off" placeholder="e.g. JavaScript, SQL" value="${escapeHtml(prefs.skills)}" />
        </div>
        <div class="settings-field">
          <label for="settings-min-score">Minimum match score threshold: <span id="settings-min-score-value">${escapeHtml(String(prefs.minMatchScore))}</span></label>
          <input id="settings-min-score" name="minMatchScore" type="range" min="0" max="100" step="1" value="${escapeHtml(String(prefs.minMatchScore))}" />
        </div>
        <div class="settings-actions">
          <button type="submit" class="btn btn-primary">Save preferences</button>
        </div>
      </form>
    </section>
  `;

  const form = document.getElementById("settings-form");
  const range = document.getElementById("settings-min-score");
  const rangeOut = document.getElementById("settings-min-score-value");
  if (range && rangeOut) {
    range.addEventListener("input", () => {
      rangeOut.textContent = range.value;
    });
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    savePreferencesFromForm(form);
    resetDashboardCache();
    rangeOut.textContent = String(clamp(Number(range.value), 0, 100));
  });
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function digestStorageKey(ymd) {
  return `jobTrackerDigest_${ymd}`;
}

function formatDigestDateLong(ymd) {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3) return ymd;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return dt.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildTopDigestJobs() {
  const jobs = getJobs();
  if (jobs.length === 0) return [];
  const prefs = getMergedPreferences();
  const scored = jobs.map((job) => ({
    job,
    matchScore: computeMatchScore(job, prefs),
  }));
  scored.sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      a.job.postedDaysAgo - b.job.postedDaysAgo ||
      a.job.id.localeCompare(b.job.id)
  );
  return scored.slice(0, 10);
}

function persistDigestPayload(ymd, scoredItems) {
  const payload = {
    date: ymd,
    items: scoredItems.map(({ job, matchScore }) => ({
      id: job.id,
      matchScore,
    })),
  };
  localStorage.setItem(digestStorageKey(ymd), JSON.stringify(payload));
}

function readDigestPayload(ymd) {
  try {
    const raw = localStorage.getItem(digestStorageKey(ymd));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

function hydrateDigestPayload(payload) {
  const jobs = getJobs();
  const byId = new Map(jobs.map((j) => [j.id, j]));
  return payload.items
    .map((row) => {
      const job = byId.get(row.id);
      if (!job) return null;
      return { job, matchScore: Number(row.matchScore) || 0 };
    })
    .filter(Boolean);
}

let digestPlainTextCache = "";

function buildDigestPlainText(ymd, hydrated) {
  const header = "Top 10 Jobs For You 9AM Digest";
  const dateLine = formatDigestDateLong(ymd);
  let body = `${header}\n${dateLine}\n\n`;
  hydrated.forEach((row, i) => {
    const { job, matchScore } = row;
    body += `${i + 1}. ${job.title} — ${job.company}\n`;
    body += `   Location: ${job.location}\n`;
    body += `   Experience: ${job.experience}\n`;
    body += `   Match score: ${matchScore}\n`;
    body += `   Apply: ${job.applyUrl}\n\n`;
  });
  body += "This digest was generated based on your preferences.\n";
  return body;
}

function setDigestToolbarVisible(visible) {
  const toolbar = document.querySelector(".digest-toolbar");
  if (toolbar) toolbar.hidden = !visible;
}

function renderDigestCardInDom(ymd, hydrated) {
  const card = document.getElementById("digest-email-card");
  const empty = document.getElementById("digest-empty");
  if (!card || !empty) return;

  if (hydrated.length === 0) {
    card.hidden = true;
    card.innerHTML = "";
    empty.hidden = false;
    setDigestToolbarVisible(false);
    digestPlainTextCache = "";
    return;
  }

  empty.hidden = true;
  card.hidden = false;
  setDigestToolbarVisible(true);

  digestPlainTextCache = buildDigestPlainText(ymd, hydrated);

  const dateLong = formatDigestDateLong(ymd);
  card.innerHTML = `
    <header class="digest-email-header">
      <h2 class="digest-email-title">Top 10 Jobs For You 9AM Digest</h2>
      <p class="digest-email-date">${escapeHtml(dateLong)}</p>
    </header>
    <div class="digest-email-body">
      ${hydrated
        .map(
          ({ job, matchScore }) => `
        <div class="digest-email-item">
          <h3 class="digest-item-title">${escapeHtml(job.title)}</h3>
          <p class="digest-item-company">${escapeHtml(job.company)}</p>
          <p class="digest-item-line"><span class="digest-item-label">Location</span> ${escapeHtml(job.location)}</p>
          <p class="digest-item-line"><span class="digest-item-label">Experience</span> ${escapeHtml(job.experience)}</p>
          <p class="digest-item-line"><span class="digest-item-label">Match score</span> ${matchScore}</p>
          <p class="digest-item-apply"><a class="btn btn-secondary" href="${escapeHtml(job.applyUrl)}" target="_blank" rel="noopener noreferrer">Apply</a></p>
        </div>
      `
        )
        .join("")}
    </div>
    <footer class="digest-email-footer">
      <p>This digest was generated based on your preferences.</p>
    </footer>
  `;
}

function refreshDigestPanel() {
  if (!preferencesAreSaved() || getCurrentPath() !== "/digest") return;
  const ymd = todayYmd();
  const existing = readDigestPayload(ymd);
  if (!existing || !existing.items || existing.items.length === 0) {
    const card = document.getElementById("digest-email-card");
    const empty = document.getElementById("digest-empty");
    if (card) {
      card.hidden = true;
      card.innerHTML = "";
    }
    if (empty) empty.hidden = true;
    setDigestToolbarVisible(false);
    digestPlainTextCache = "";
    return;
  }
  const hydrated = hydrateDigestPayload(existing);
  renderDigestCardInDom(ymd, hydrated);
}

function handleDigestGenerate() {
  if (!preferencesAreSaved()) return;
  const ymd = todayYmd();
  const existing = readDigestPayload(ymd);
  if (existing && existing.items && existing.items.length > 0) {
    const hydrated = hydrateDigestPayload(existing);
    renderDigestCardInDom(ymd, hydrated.length ? hydrated : []);
    return;
  }
  const top = buildTopDigestJobs();
  if (top.length === 0) {
    renderDigestCardInDom(ymd, []);
    return;
  }
  persistDigestPayload(ymd, top);
  renderDigestCardInDom(ymd, top);
}

function handleDigestCopy() {
  const text = digestPlainTextCache;
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

function handleDigestEmail() {
  const text = digestPlainTextCache;
  if (!text) return;
  const subject = encodeURIComponent("My 9AM Job Digest");
  const body = encodeURIComponent(text);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function renderDigest() {
  digestPlainTextCache = "";
  const routeView = document.getElementById("route-view");
  if (!preferencesAreSaved()) {
    routeView.innerHTML = `
      <section class="route-content digest-route" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">Digest</h1>
        <div class="digest-block" role="alert">
          <p class="digest-block-title">Set preferences to generate a personalized digest.</p>
          <p class="route-subtext">Save your role criteria in Settings, then return here to build your 9AM summary.</p>
          <a href="/settings" data-route="/settings" class="btn btn-primary">Open Settings</a>
        </div>
        ${renderRecentStatusUpdatesSection()}
      </section>
    `;
    return;
  }

  routeView.innerHTML = `
    <section class="route-content digest-route" aria-labelledby="route-title">
      <h1 id="route-title" class="route-title">Digest</h1>
      <p class="digest-sim-note">Demo Mode: Daily 9AM trigger simulated manually.</p>
      <div class="digest-controls">
        <button type="button" class="btn btn-primary" data-digest-action="generate">Generate Today's 9AM Digest (Simulated)</button>
        <div class="digest-toolbar" hidden>
          <button type="button" class="btn btn-secondary" data-digest-action="copy">Copy Digest to Clipboard</button>
          <button type="button" class="btn btn-secondary" data-digest-action="email">Create Email Draft</button>
        </div>
      </div>
      <div class="digest-panel-outer">
        <p id="digest-empty" class="digest-empty-message" hidden>No matching roles today. Check again tomorrow.</p>
        <article class="digest-email-card" id="digest-email-card" hidden aria-label="Digest contents"></article>
      </div>
      ${renderRecentStatusUpdatesSection()}
    </section>
  `;
  refreshDigestPanel();
}

function renderSaved() {
  const routeView = document.getElementById("route-view");
  const jobs = getJobs();
  const saved = getSavedIds();
  const prefsMerged = getMergedPreferences();
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
      <div class="job-grid">${savedJobs
        .map((job) => jobCardHtml(job, computeMatchScore(job, prefsMerged)))
        .join("")}</div>
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
  resetDashboardCache();
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
    renderSettings();
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
    renderDigest();
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

    const digestBtn = event.target.closest("[data-digest-action]");
    if (digestBtn) {
      event.preventDefault();
      const act = digestBtn.getAttribute("data-digest-action");
      if (act === "generate") handleDigestGenerate();
      else if (act === "copy") handleDigestCopy();
      else if (act === "email") handleDigestEmail();
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
    } else if (action === "status") {
      const nextStatus = actionBtn.getAttribute("data-status");
      if (!nextStatus) return;
      if (setJobStatus(id, nextStatus, job)) {
        refreshVisibleJobLists();
        if (nextStatus === "Applied" || nextStatus === "Rejected" || nextStatus === "Selected") {
          showStatusToast(nextStatus);
        }
      }
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
