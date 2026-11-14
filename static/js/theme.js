// Loaded in <head> (not deferred) so the saved theme applies before the first paint.
(() => {
  const root = document.documentElement;
  const KEY = "tidytext-theme";
  const system = window.matchMedia("(prefers-color-scheme: dark)");

  const read = () => {
    try {
      const saved = localStorage.getItem(KEY);
      return saved === "light" || saved === "dark" ? saved : "auto";
    } catch {
      return "auto";
    }
  };
  const write = (value) => {
    try {
      if (value === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, value);
    } catch {
      /* storage unavailable (private mode): the choice lasts for this page only */
    }
  };
  const applyTheme = (value) => {
    if (value === "auto") delete root.dataset.theme;
    else root.dataset.theme = value;
  };
  // The theme on screen right now: the saved choice, or else the device setting.
  const shown = () => root.dataset.theme || (system.matches ? "dark" : "light");

  root.classList.add("js");
  applyTheme(read());

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector("[data-theme-toggle]");
    if (!button) return;
    const render = () => {
      button.setAttribute("aria-label", shown() === "dark" ? "Switch to light theme" : "Switch to dark theme");
    };
    render();
    // One click always flips what's on screen. Choosing the device's own theme goes back to
    // following the device, so the page keeps up if that setting changes later.
    button.addEventListener("click", () => {
      const next = shown() === "dark" ? "light" : "dark";
      const value = next === (system.matches ? "dark" : "light") ? "auto" : next;
      write(value);
      applyTheme(value);
      render();
    });
    system.addEventListener("change", render);
  });
})();
