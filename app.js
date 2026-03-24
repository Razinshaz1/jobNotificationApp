const ROUTES = {
  "/dashboard": "Dashboard",
  "/settings": "Settings",
  "/saved": "Saved",
  "/digest": "Digest",
  "/proof": "Proof",
};

const DEFAULT_ROUTE = "/dashboard";

function getCurrentPath() {
  const path = window.location.pathname || DEFAULT_ROUTE;
  return path === "/" ? DEFAULT_ROUTE : path;
}

function isKnownRoute(path) {
  return Object.prototype.hasOwnProperty.call(ROUTES, path);
}

function renderRoute(path) {
  const routeView = document.getElementById("route-view");
  const pageName = ROUTES[path];

  if (pageName) {
    routeView.innerHTML = `
      <section class="route-content" aria-labelledby="route-title">
        <h1 id="route-title" class="route-title">${pageName}</h1>
        <p class="route-subtext">This section will be built in the next step.</p>
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
  const safePath = isKnownRoute(path) ? path : path;
  const currentPath = getCurrentPath();

  if (safePath === currentPath && isKnownRoute(safePath)) {
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
  const initialPath = currentPath === "/" ? DEFAULT_ROUTE : currentPath;
  navigateTo(initialPath, true);
}

bindNavigation();
initializeRouting();
