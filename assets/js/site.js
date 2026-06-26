const header = document.querySelector(".site-header");
const toggle = document.querySelector(".nav-toggle");

if (header && toggle) {
  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll(".site-nav a").forEach((link) => {
  const normalizePath = (path) => path.replace(/\/index\.html$/, "").replace(/\/$/, "");
  const currentPath = normalizePath(window.location.pathname);
  const linkPath = normalizePath(new URL(link.href, window.location.href).pathname);
  if (currentPath === linkPath || (linkPath && currentPath.startsWith(`${linkPath}/`))) {
    link.setAttribute("aria-current", "page");
  }
});
