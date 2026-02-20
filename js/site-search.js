/* ==============================
   Simple client-side search
   JSON index + scoring
   ============================== */

const INDEX_URL = "/search-index.json";
const MAX_RESULTS = 8;
const MIN_QUERY_LEN = 2;

let cachedIndex = null;

function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlight(text, q) {
  const safe = escapeHtml(text);
  if (!q) return safe;
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(`(${escapedQ})`, "ig"), "<mark>$1</mark>");
}

async function loadIndex() {
  if (cachedIndex) return cachedIndex;
  const res = await fetch(INDEX_URL, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Search index failed: ${res.status}`);
  cachedIndex = await res.json();
  return cachedIndex;
}

function scoreItem(item, q) {
  const title = normalize(item.title);
  const desc = normalize(item.description);
  const keywords = Array.isArray(item.keywords) ? item.keywords.map(normalize).join(" ") : "";

  let score = 0;

  // Strong matches
  if (title === q) score += 100;
  if (title.startsWith(q)) score += 60;
  if (title.includes(q)) score += 45;

  // Medium matches
  if (keywords.includes(q)) score += 30;
  if (desc.includes(q)) score += 18;

  // Token-based bonus (handles multi-word queries)
  const tokens = q.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (title.includes(t)) score += 12;
    if (keywords.includes(t)) score += 8;
    if (desc.includes(t)) score += 5;
  }

  return score;
}

function renderResults(container, query, results) {
  if (!results.length) {
    container.innerHTML = `
      <div class="nav-search-result" tabindex="-1" aria-disabled="true">
        <div class="nav-search-result-title">No results</div>
        <p class="nav-search-result-desc">Try a different keyword.</p>
      </div>
    `;
    return;
  }

  const q = normalize(query);

  container.innerHTML = results
    .map((r, i) => {
      const title = r.title || "Untitled";
      const desc = r.description || "";
      return `
        <a class="nav-search-result" role="option" data-index="${i}" href="${r.url}">
          <div class="nav-search-result-title">${highlight(title, q)}</div>
          <p class="nav-search-result-desc">${highlight(desc, q)}</p>
        </a>
      `;
    })
    .join("");
}

function openResults(inputEl, resultsEl) {
  resultsEl.hidden = false;
  inputEl.setAttribute("aria-expanded", "true");
}

document.addEventListener("click", (e) => {
  // If click is inside ANY dropdown (button or menu), do nothing
  if (e.target.closest(".nav-dropdown")) return;

  // Otherwise close all
  dropdowns.forEach((dd) => {
    dd.classList.remove("is-open");
    const btn = dd.querySelector(".nav-dropdown-toggle");
    if (btn) btn.setAttribute("aria-expanded", "false");
  });
});

function moveFocus(resultsEl, direction) {
  const items = Array.from(resultsEl.querySelectorAll('a.nav-search-result[role="option"]'));
  if (!items.length) return;

  const active = document.activeElement;
  const currentIndex = items.indexOf(active);
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + direction + items.length) % items.length;

  items[nextIndex].focus();
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("siteSearchForm");
  const input = document.getElementById("siteSearchInput");
  const resultsEl = document.getElementById("siteSearchResults");

  if (!form || !input || !resultsEl) return;

  // Prevent page jump on enter
  form.addEventListener("submit", (e) => e.preventDefault());

  let index = [];
  try {
    index = await loadIndex();
  } catch (err) {
    // Fail quietly (keeps navbar clean if index missing)
    console.warn(err);
    return;
  }

  const runSearch = (raw) => {
    const q = normalize(raw);
    if (q.length < MIN_QUERY_LEN) {
      closeResults(input, resultsEl);
      resultsEl.innerHTML = "";
      return;
    }

    const scored = index
      .map((item) => ({ item, score: scoreItem(item, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((x) => x.item);

    renderResults(resultsEl, raw, scored);
    openResults(input, resultsEl);
  };

  // Input typing
  input.addEventListener("input", (e) => runSearch(e.target.value));

  // Click outside closes
  document.addEventListener("click", (e) => {
    if (e.target.closest("#siteSearchForm")) return;
    closeResults(input, resultsEl);
  });

  // Keyboard behavior
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeResults(input, resultsEl);
      input.blur();
      return;
    }

    if (e.key === "ArrowDown") {
      if (resultsEl.hidden) runSearch(input.value);
      e.preventDefault();
      moveFocus(resultsEl, +1);
    }
  });

  resultsEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeResults(input, resultsEl);
      input.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(resultsEl, +1);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(resultsEl, -1);
    }
  });

  // Optional: open results on focus if query already present
  input.addEventListener("focus", () => {
    if (normalize(input.value).length >= MIN_QUERY_LEN) runSearch(input.value);
  });
});