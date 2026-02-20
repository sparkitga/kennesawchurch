/* FILE: js/nav.js
   Purpose:
   - Desktop dropdowns: click-to-open, click-outside to close, ESC closes
   - Mobile: hamburger panel + accordions
   Notes:
   - Does NOT touch search results (site-search.js handles that)
*/

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     Desktop dropdowns (click)
     ========================= */
  const dropdowns = document.querySelectorAll(".nav-dropdown");

  function closeAllDropdowns() {
    dropdowns.forEach((dd) => {
      dd.classList.remove("is-open");
      const btn = dd.querySelector(".nav-dropdown-toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  dropdowns.forEach((dd) => {
    const btn = dd.querySelector(".nav-dropdown-toggle");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = dd.classList.contains("is-open");

      // close others
      closeAllDropdowns();

      // toggle current
      if (!isOpen) {
        dd.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });

    // Prevent clicks inside the menu from closing it
    const menu = dd.querySelector(".nav-dropdown-menu");
    if (menu) {
      menu.addEventListener("click", (e) => e.stopPropagation());
    }
  });

  // Click outside closes dropdowns (but NOT if click is inside dropdown)
  document.addEventListener("click", (e) => {
    if (e.target.closest(".nav-dropdown")) return;
    closeAllDropdowns();
  });

  // ESC closes dropdowns
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeAllDropdowns();
  });

  /* =========================
     Mobile hamburger panel
     ========================= */
  const toggle = document.querySelector(".nav-toggle");
  const panel = document.getElementById("mobileMenu");

  function closeMobilePanel() {
    if (!toggle || !panel) return;
    toggle.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  }

  if (toggle && panel) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = toggle.getAttribute("aria-expanded") === "true";

      toggle.setAttribute("aria-expanded", String(!isOpen));
      panel.hidden = isOpen;

      // When opening, collapse ALL mobile accordions by default
      if (!isOpen) {
        const mobAccordions = document.querySelectorAll(".nav-mobile-accordion");
        mobAccordions.forEach((btn) => {
          const id = btn.getAttribute("aria-controls");
          const menu = id ? document.getElementById(id) : null;
          btn.setAttribute("aria-expanded", "false");
          if (menu) menu.hidden = true;
        });
      }
    });

    // Close mobile panel when clicking a normal link (not accordion buttons)
    panel.addEventListener("click", (e) => {
      if (e.target.closest(".nav-mobile-accordion")) return;
      const link = e.target.closest("a");
      if (!link) return;
      closeMobilePanel();
    });

    // ESC closes mobile panel too
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeMobilePanel();
    });
  }

  /* =========================
     Mobile accordions
     ========================= */
  const accordions = document.querySelectorAll(".nav-mobile-accordion");

  accordions.forEach((btn) => {
    const id = btn.getAttribute("aria-controls");
    const menu = id ? document.getElementById(id) : null;
    if (!menu) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      menu.hidden = isOpen;
    });
  });
});