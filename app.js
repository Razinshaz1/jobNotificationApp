const ROUTES = {
  "/": "Landing",
  "/dashboard": "Dashboard",
  "/settings": "Settings",
  "/saved": "Saved",
  "/digest": "Digest",
  "/proof": "Proof",
};

const DEFAULT_ROUTE = "/";

function getCurrentPath() {
  const path = window.location.pathname || DEFAULT_ROUTE;
  return path === "/" ? DEFAULT_ROUTE : path;
}

function isKnownRoute(path) {
  return Object.prototype.hasOwnProperty.call(ROUTES, path);
}

function renderRoute(path) {
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
    routeView.innerHTML = `
      <section class="route-content" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">Dashboard</h1>
        <p class="route-subtext">No jobs yet. In the next step, you will load a realistic dataset.</p>
      </section>
    `;
    return;
  }

  if (path === "/saved") {
    routeView.innerHTML = `
      <section class="route-content" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">Saved</h1>
        <p class="route-subtext">Saved jobs will appear here once this section is connected in the next step.</p>
      </section>
    `;
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
    if (!anchor) {
      return;
    }
    event.preventDefault();
    const nextPath = anchor.getAttribute("data-route");
    navigateTo(nextPath);
  });

  window.addEventListener("popstate", () => {
    const path = getCurrentPath();
    renderRoute(path);
    setActiveLink(path);
    closeMobileMenu();
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
