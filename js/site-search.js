/* FILE: js/site-search.js
   Purpose:
   - Client-side search using a JSON index (search-index.json)
   - Dropdown results under the search input
   - Keyboard navigation (↑ ↓ Enter Escape)
   Notes:
   - Does NOT close nav dropdowns (nav.js handles those)
*/

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("siteSearchForm");
  const input = document.getElementById("siteSearchInput");
  const resultsEl = document.getElementById("siteSearchResults");

  if (!form || !input || !resultsEl) return;

  let indexData = [];

  // Try root first, then fallback (in case you move it under /data)
  async function loadIndex() {
    const candidates = ["/search-index.json", "/data/search-index.json"];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json)) return json;
        if (json && Array.isArray(json.items)) return json.items;
      } catch (err) {
        // try next candidate
      }
    }
    return [];
  }

  indexData = await loadIndex();

  /* -------------------------
     Helpers
  ------------------------- */
  function normalize(str) {
    return (str || "").toLowerCase().trim();
  }

  function escapeHtml(str) {
    return (str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function highlight(text, query) {
    const t = text || "";
    const q = query.trim();
    if (!q) return escapeHtml(t);

    // Basic safe highlight (case-insensitive)
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    return escapeHtml(t).replace(re, "<mark>$1</mark>");
  }

  function scoreItem(item, q) {
    // Simple scoring: title matches > description matches > url matches
    const title = normalize(item.title);
    const desc = normalize(item.description);
    const url = normalize(item.url);

    let score = 0;
    if (title.includes(q)) score += 5;
    if (desc.includes(q)) score += 2;
    if (url.includes(q)) score += 1;

    // boost exact starts-with
    if (title.startsWith(q)) score += 2;

    return score;
  }

  function search(q) {
    const query = normalize(q);
    if (!query || query.length < 2) return [];

    const results = indexData
      .map((item) => ({
        ...item,
        _score: scoreItem(item, query),
      }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);

    return results;
  }

  function openResults() {
    resultsEl.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function closeResults() {
    resultsEl.hidden = true;
    input.setAttribute("aria-expanded", "false");
    resultsEl.innerHTML = "";
    clearActive();
  }

  function renderResults(q, results) {
    if (!results.length) {
      resultsEl.innerHTML = `
        <div class="nav-search-result nav-search-result--empty" role="option" aria-disabled="true" tabindex="-1">
          <div class="nav-search-result-title">No results</div>
          <div class="nav-search-result-desc">Try a different keyword.</div>
        </div>
      `;
      openResults();
      return;
    }

    resultsEl.innerHTML = results
      .map((r, i) => {
        const title = r.title || "Untitled";
        const desc = r.description || "";
        const url = r.url || "#";

        return `
          <a class="nav-search-result" role="option" tabindex="-1" data-idx="${i}" href="${escapeHtml(url)}">
            <div class="nav-search-result-title">${highlight(title, q)}</div>
            ${desc ? `<div class="nav-search-result-desc">${highlight(desc, q)}</div>` : ""}
          </a>
        `;
      })
      .join("");

    openResults();
  }

  /* -------------------------
     Keyboard navigation
  ------------------------- */
  function getItems() {
    return Array.from(resultsEl.querySelectorAll(".nav-search-result[role='option']"));
  }

  function clearActive() {
    getItems().forEach((el) => el.classList.remove("is-active"));
  }

  function setActive(index) {
    const items = getItems();
    if (!items.length) return;

    clearActive();
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    items[clamped].classList.add("is-active");
    items[clamped].scrollIntoView({ block: "nearest" });
  }

  function getActiveIndex() {
    const items = getItems();
    return items.findIndex((el) => el.classList.contains("is-active"));
  }

  /* -------------------------
     Events
  ------------------------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // If a result is active, go there
    const items = getItems();
    const active = items.find((el) => el.classList.contains("is-active"));
    if (active && active.href) window.location.href = active.href;
  });

  input.addEventListener("input", () => {
    const q = input.value;
    const results = search(q);

    // Close if cleared or too short
    if (!normalize(q) || normalize(q).length < 2) {
      closeResults();
      return;
    }

    renderResults(q, results);
  });

  input.addEventListener("focus", () => {
    const q = input.value;
    if (normalize(q).length >= 2) {
      renderResults(q, search(q));
    }
  });

  input.addEventListener("keydown", (e) => {
    if (resultsEl.hidden) return;

    const items = getItems();
    if (!items.length) {
      if (e.key === "Escape") closeResults();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = getActiveIndex();
      setActive(idx < 0 ? 0 : idx + 1);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = getActiveIndex();
      setActive(idx <= 0 ? 0 : idx - 1);
    }

    if (e.key === "Enter") {
      const idx = getActiveIndex();
      if (idx >= 0) {
        e.preventDefault();
        const el = items[idx];
        if (el && el.href) window.location.href = el.href;
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeResults();
    }
  });

  // Click inside results should not close before navigation happens
  resultsEl.addEventListener("click", (e) => {
    const link = e.target.closest("a.nav-search-result");
    if (!link) return;
    // allow navigation, but close visually
    closeResults();
  });

  // Click outside closes ONLY search results
  document.addEventListener("click", (e) => {
    if (e.target.closest("#siteSearchForm")) return;
    if (e.target.closest("#siteSearchResults")) return;
    closeResults();
  });

  // ESC closes search results even if focus is elsewhere
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeResults();
  });
});