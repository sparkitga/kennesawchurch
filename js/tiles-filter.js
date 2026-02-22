document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("tileFilter");
  const grid = document.getElementById("tileGrid");
  if (!select || !grid) return;

  const tiles = Array.from(grid.querySelectorAll(".brand-tile"));

  select.addEventListener("change", () => {
    const val = select.value;
    tiles.forEach((tile) => {
      const cat = tile.getAttribute("data-cat") || "all";
      const show = val === "all" || cat === val;
      tile.style.display = show ? "" : "none";
    });
  });
});