const root = document.documentElement;
const theme = document.getElementById("theme");
const density = document.getElementById("density");

function applyTheme() {
  root.setAttribute("data-in-theme", theme.value);
  document.body.setAttribute("data-in-theme", theme.value);
}
function applyDensity() {
  root.setAttribute("data-in-density", density.value);
  document.body.setAttribute("data-in-density", density.value);
}
theme.addEventListener("change", applyTheme);
theme.addEventListener("input", applyTheme);
density.addEventListener("change", applyDensity);
density.addEventListener("input", applyDensity);
applyTheme();
applyDensity();

const swatches = [
  ["canvas", "var(--in-color-background-canvas)"],
  ["surface", "var(--in-color-background-surface)"],
  ["primary", "var(--in-color-identity-primary)"],
  ["commit", "var(--in-color-identity-commit)"],
  ["success", "var(--in-color-status-success)"],
  ["warning", "var(--in-color-status-warning)"],
  ["danger", "var(--in-color-status-danger)"],
  ["info", "var(--in-color-status-info)"]
];
const box = document.getElementById("swatches");
for (const [name, color] of swatches) {
  const el = document.createElement("div");
  el.className = "swatch";
  el.style.background = color;
  el.innerHTML = `<span>${name}</span>`;
  box.append(el);
}
