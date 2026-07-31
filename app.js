const canvas = document.querySelector("#coverCanvas");
const ctx = canvas.getContext("2d");
const exportCanvas = document.createElement("canvas");
const exportCtx = exportCanvas.getContext("2d");
const layerList = document.querySelector("#layerList");
const inspector = document.querySelector("#inspector");
const measurements = document.querySelector("#measurements");

let project;
let backgroundImage = new Image();
let selectedId = "already";
let dragState = null;
let boundsById = new Map();

const FONT_OPTIONS = [
  { family: "Anton", file: "fonts/Anton-Regular.ttf" },
  { family: "Bebas Neue", file: "fonts/BebasNeue-Regular.ttf" },
  { family: "Archivo Black", file: "fonts/ArchivoBlack-Regular.ttf" },
  { family: "Oswald", file: "fonts/Oswald-Variable.ttf" },
  { family: "League Spartan", file: "fonts/LeagueSpartan-Variable.ttf" },
  { family: "Space Grotesk", file: "fonts/SpaceGrotesk-Variable.ttf" },
  { family: "Montserrat", file: "fonts/Montserrat-Variable.ttf" },
];

const clone = value => JSON.parse(JSON.stringify(value));
const selectedLayer = () => project.layers.find(layer => layer.id === selectedId);

async function loadDefault() {
  const stored = localStorage.getItem("cover-grid-project");
  project = stored ? JSON.parse(stored) : await fetch("presets/already-here-utopia.json").then(r => r.json());
  await loadBackground(project.background);
  await document.fonts.ready;
  renderAll();
}

function loadBackground(src) {
  return new Promise((resolve, reject) => {
    backgroundImage = new Image();
    backgroundImage.onload = resolve;
    backgroundImage.onerror = reject;
    backgroundImage.src = src;
  });
}

function fontString(layer) {
  return `${layer.fontWeight || 400} ${layer.fontSize}px "${layer.fontFamily}"`;
}

function rawTextWidth(drawCtx, layer) {
  drawCtx.font = fontString(layer);
  const widths = [...layer.text].map(char => drawCtx.measureText(char).width);
  return widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * layer.letterSpacing;
}

function drawSpacedText(drawCtx, layer, includeBounds = true) {
  if (!layer.visible) return null;
  drawCtx.save();
  drawCtx.font = fontString(layer);
  drawCtx.fillStyle = layer.color;
  drawCtx.textBaseline = "middle";
  drawCtx.textAlign = "left";
  const rawWidth = rawTextWidth(drawCtx, layer);
  const width = rawWidth * layer.scaleX;
  const centerX = layer.x + layer.opticalX;
  drawCtx.translate(centerX, layer.y);
  drawCtx.scale(layer.scaleX, 1);
  let cursor = -rawWidth / 2;
  for (const char of layer.text) {
    drawCtx.fillText(char, cursor, 0);
    cursor += drawCtx.measureText(char).width + layer.letterSpacing;
  }
  drawCtx.restore();
  const bounds = { left: centerX - width / 2, right: centerX + width / 2, top: layer.y - layer.fontSize * .48, bottom: layer.y + layer.fontSize * .48, width, centerX };
  if (includeBounds) boundsById.set(layer.id, bounds);
  return bounds;
}

function drawGrid(drawCtx) {
  if (!project.grid.visible) return;
  const { width, height } = project.canvas;
  drawCtx.save();
  drawCtx.lineWidth = 3;
  if (document.querySelector("#showColumns").checked) {
    drawCtx.strokeStyle = "rgba(84,210,255,.24)";
    for (let i = 1; i < project.grid.columns; i++) {
      const x = width * i / project.grid.columns;
      drawCtx.beginPath(); drawCtx.moveTo(x, 0); drawCtx.lineTo(x, height); drawCtx.stroke();
    }
  }
  drawCtx.strokeStyle = "rgba(255,200,90,.88)";
  drawCtx.lineWidth = 5;
  drawCtx.beginPath(); drawCtx.moveTo(width / 2, 0); drawCtx.lineTo(width / 2, height); drawCtx.stroke();
  drawCtx.beginPath(); drawCtx.moveTo(0, height / 2); drawCtx.lineTo(width, height / 2); drawCtx.stroke();
  if (document.querySelector("#showSafe").checked) {
    const m = project.grid.safeMargin;
    drawCtx.setLineDash([24, 16]);
    drawCtx.strokeStyle = "rgba(255,255,255,.72)";
    drawCtx.strokeRect(m, m, width - m * 2, height - m * 2);
  }
  drawCtx.restore();
}

function drawBounds(drawCtx) {
  if (!document.querySelector("#showBounds").checked) return;
  const layer = selectedLayer();
  const b = boundsById.get(layer?.id);
  if (!b) return;
  drawCtx.save();
  drawCtx.lineWidth = 5;
  drawCtx.strokeStyle = "#54d2ff";
  drawCtx.setLineDash([18, 12]);
  drawCtx.strokeRect(b.left, b.top, b.width, b.bottom - b.top);
  drawCtx.fillStyle = "#54d2ff";
  drawCtx.beginPath(); drawCtx.arc(b.centerX, layer.y, 11, 0, Math.PI * 2); drawCtx.fill();
  drawCtx.restore();
}

function renderCanvas(drawCtx = ctx, guides = true) {
  const { width, height } = project.canvas;
  drawCtx.canvas.width = width;
  drawCtx.canvas.height = height;
  drawCtx.clearRect(0, 0, width, height);
  drawCtx.drawImage(backgroundImage, 0, 0, width, height);
  boundsById.clear();
  project.layers.forEach(layer => drawSpacedText(drawCtx, layer, true));
  if (guides) { drawGrid(drawCtx); drawBounds(drawCtx); }
}

function renderAll() {
  renderCanvas();
  renderLayerList();
  renderInspector();
  renderMeasurements();
  localStorage.setItem("cover-grid-project", JSON.stringify(project));
}

function renderAfterControlInput() {
  renderCanvas();
  renderLayerList();
  renderMeasurements();
  document.querySelector("#inspectorTitle").textContent = selectedLayer().name;
  localStorage.setItem("cover-grid-project", JSON.stringify(project));
}

function renderLayerList() {
  layerList.innerHTML = "";
  [...project.layers].reverse().forEach(layer => {
    const button = document.createElement("button");
    button.className = `layer-item ${layer.id === selectedId ? "selected" : ""}`;
    button.innerHTML = `<span class="layer-type">T</span><span><span class="layer-name">${layer.name}</span><span class="layer-meta">${layer.fontFamily} · ${layer.fontSize}px</span></span><span class="visibility">${layer.visible ? "●" : "○"}</span>`;
    button.onclick = () => { selectedId = layer.id; renderAll(); };
    layerList.append(button);
  });
}

const input = (label, key, type = "number", step = "1") => `<div class="control"><label>${label}</label><input data-key="${key}" type="${type}" step="${step}" value="${selectedLayer()[key]}"></div>`;

function renderInspector() {
  const layer = selectedLayer();
  if (!layer) return;
  document.querySelector("#inspectorTitle").textContent = layer.name;
  inspector.innerHTML = `
    ${input("Layer name / text", "name", "text")}
    <div class="control-row">${input("Font size", "fontSize")}${input("Letter spacing", "letterSpacing")}</div>
    <div class="control-row">${input("Math center X", "x")}${input("Optical offset X", "opticalX")}</div>
    <div class="control-row">${input("Center Y", "y")}${input("Horizontal scale", "scaleX", "number", ".01")}</div>
    <div class="control-row">${input("Weight", "fontWeight", "number", "100")}${input("Color", "color", "color")}</div>
    <div class="control"><label>Font</label><select data-key="fontFamily">${FONT_OPTIONS.map(font => `<option value="${font.family}" ${layer.fontFamily === font.family ? "selected" : ""}>${font.family}</option>`).join("")}</select></div>
    <div class="control"><label>Alignment shortcuts</label><div class="align-buttons"><button data-action="center">Center</button><button data-action="left10">−10</button><button data-action="right10">+10</button></div></div>
    <div class="control-row"><button class="button secondary" data-action="duplicate">Duplicate</button><button class="button secondary danger" data-action="delete">Delete</button></div>`;
  inspector.querySelectorAll("[data-key]").forEach(control => {
    control.addEventListener("input", async () => {
      const key = control.dataset.key;
      layer[key] = control.type === "number" ? Number(control.value) : control.value;
      if (key === "name") layer.text = control.value;
      if (key === "fontFamily") {
        layer.fontFile = FONT_OPTIONS.find(font => font.family === control.value)?.file;
        await document.fonts.load(fontString(layer));
      }
      renderAfterControlInput();
    });
  });
  inspector.querySelectorAll("[data-action]").forEach(button => button.onclick = () => handleAction(button.dataset.action));
}

function handleAction(action) {
  const layer = selectedLayer();
  if (action === "center") { layer.x = project.canvas.width / 2; layer.opticalX = 0; }
  if (action === "left10") layer.opticalX -= 10;
  if (action === "right10") layer.opticalX += 10;
  if (action === "duplicate") { const copy = clone(layer); copy.id = `${layer.id}-${Date.now()}`; copy.name += " COPY"; copy.y += 80; project.layers.push(copy); selectedId = copy.id; }
  if (action === "delete" && project.layers.length > 1) { project.layers = project.layers.filter(item => item.id !== layer.id); selectedId = project.layers[0].id; }
  renderAll();
}

function renderMeasurements() {
  const layer = selectedLayer();
  const b = boundsById.get(layer.id);
  if (!b) return;
  const leftMargin = b.left;
  const rightMargin = project.canvas.width - b.right;
  measurements.innerHTML = `
    <dt>Rendered left</dt><dd>${b.left.toFixed(1)} px</dd>
    <dt>Rendered center</dt><dd>${b.centerX.toFixed(1)} px</dd>
    <dt>Rendered right</dt><dd>${b.right.toFixed(1)} px</dd>
    <dt>Text width</dt><dd>${b.width.toFixed(1)} px</dd>
    <dt>Left margin</dt><dd>${leftMargin.toFixed(1)} px</dd>
    <dt>Right margin</dt><dd>${rightMargin.toFixed(1)} px</dd>
    <dt>Margin delta</dt><dd>${(rightMargin - leftMargin).toFixed(1)} px</dd>`;
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportImage(type) {
  renderCanvas(exportCtx, false);
  exportCanvas.toBlob(blob => downloadBlob(blob, `already-here-cover-grid-3000.${type === "image/png" ? "png" : "jpg"}`), type, .94);
}

document.querySelector("#exportPng").onclick = () => exportImage("image/png");
document.querySelector("#exportJpg").onclick = () => exportImage("image/jpeg");
document.querySelector("#downloadProject").onclick = () => downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), "already-here-cover-layout.json");
document.querySelector("#projectFile").onchange = async event => { project = JSON.parse(await event.target.files[0].text()); selectedId = project.layers[0].id; await loadBackground(project.background); renderAll(); };
document.querySelector("#backgroundFile").onchange = async event => { project.background = URL.createObjectURL(event.target.files[0]); await loadBackground(project.background); renderAll(); };
document.querySelector("#addLayer").onclick = () => { const layer = { id: `text-${Date.now()}`, name: "NEW TEXT", text: "NEW TEXT", fontFamily: "Anton", fontFile: "fonts/Anton-Regular.ttf", fontSize: 300, fontWeight: 400, letterSpacing: 0, scaleX: 1, x: 1500, opticalX: 0, y: 1500, color: "#123958", visible: true }; project.layers.push(layer); selectedId = layer.id; renderAll(); };
["showGrid", "showColumns", "showSafe", "showBounds"].forEach(id => document.querySelector(`#${id}`).onchange = event => { if (id === "showGrid") project.grid.visible = event.target.checked; renderAll(); });

canvas.addEventListener("pointerdown", event => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * project.canvas.width / rect.width;
  const y = (event.clientY - rect.top) * project.canvas.height / rect.height;
  const hit = [...project.layers].reverse().find(layer => { const b = boundsById.get(layer.id); return b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom; });
  if (!hit) return;
  selectedId = hit.id;
  dragState = { x, y, layerX: hit.x, layerY: hit.y };
  canvas.setPointerCapture(event.pointerId); canvas.classList.add("dragging"); renderAll();
});
canvas.addEventListener("pointermove", event => {
  if (!dragState) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * project.canvas.width / rect.width;
  const y = (event.clientY - rect.top) * project.canvas.height / rect.height;
  const layer = selectedLayer(); layer.x = Math.round(dragState.layerX + x - dragState.x); layer.y = Math.round(dragState.layerY + y - dragState.y); renderAll();
});
canvas.addEventListener("pointerup", () => { dragState = null; canvas.classList.remove("dragging"); });
window.addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || ["INPUT", "SELECT"].includes(document.activeElement.tagName)) return;
  event.preventDefault(); const amount = event.shiftKey ? 10 : 1; const layer = selectedLayer();
  if (event.key === "ArrowLeft") layer.opticalX -= amount;
  if (event.key === "ArrowRight") layer.opticalX += amount;
  if (event.key === "ArrowUp") layer.y -= amount;
  if (event.key === "ArrowDown") layer.y += amount;
  renderAll();
});

loadDefault();
