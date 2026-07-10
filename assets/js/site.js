const header = document.querySelector(".site-header");
const toggle = document.querySelector(".nav-toggle");

if (header && toggle) {
  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    if (header && toggle) {
      header.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  if (link.getAttribute("href").startsWith("#")) return;
  const normalizePath = (path) => path.replace(/\/index\.html$/, "").replace(/\/$/, "");
  const currentPath = normalizePath(window.location.pathname);
  const linkPath = normalizePath(new URL(link.href, window.location.href).pathname);
  if (currentPath === linkPath || (linkPath && currentPath.startsWith(`${linkPath}/`))) {
    link.setAttribute("aria-current", "page");
  }
});

// 言語設定の記憶: ENを選んだ訪問者は、日本語トップ(index.html)の<head>スクリプトが/en/へ案内する
try {
  const LANG_KEY = "coconeru-lang";
  if (document.documentElement.lang === "en") {
    localStorage.setItem(LANG_KEY, "en");
  }
  document.addEventListener(
    "click",
    (event) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link) return;
      if (link.classList.contains("lang-switch") || link.getAttribute("hreflang") === "en") {
        localStorage.setItem(LANG_KEY, "en");
      } else if (link.getAttribute("lang") === "ja") {
        localStorage.setItem(LANG_KEY, "ja");
      }
    },
    true
  );
} catch (error) {
  // プライベートモード等でlocalStorageが使えない場合は、記憶なしのまま動作させる
}

if (
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const targets = document.querySelectorAll(
    ".section__head, .grid > *, .feature-row > *, .cta-band, .home-path-actions__inner"
  );
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  targets.forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });
}
