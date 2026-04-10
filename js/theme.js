// ---------------------------------------------------------------------------
// Theme management
// ---------------------------------------------------------------------------

const LOGO_DARK  = "assets/images/White RAiD (Reg).svg";
const LOGO_LIGHT = "assets/images/Black RAiD (Reg).svg";

function getEffectiveTheme() {
  const manual = document.documentElement.dataset.theme;
  if (manual) return manual;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const logo   = document.getElementById("header-logo");
  const toggle = document.getElementById("theme-toggle");
  logo.src     = theme === "light" ? LOGO_LIGHT : LOGO_DARK;
  toggle.textContent = theme === "light" ? "☾" : "☀";
  toggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
}

// Initialise from saved preference (or follow system)
(function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
  } else {
    const sys = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const toggle = document.getElementById("theme-toggle");
    toggle.textContent = sys === "light" ? "☾" : "☀";
    toggle.setAttribute("aria-label", sys === "light" ? "Switch to dark mode" : "Switch to light mode");
  }
})();

document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = getEffectiveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("theme", next);
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    const sys = e.matches ? "light" : "dark";
    const logo   = document.getElementById("header-logo");
    const toggle = document.getElementById("theme-toggle");
    logo.src = sys === "light" ? LOGO_LIGHT : LOGO_DARK;
    toggle.textContent = sys === "light" ? "☾" : "☀";
  }
});
