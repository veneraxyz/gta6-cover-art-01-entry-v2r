// Vice Cover Studio — editor.
// Wires the dark studio UI to the cover engine: format + grade controls,
// sample photos, your-own-photo upload, drag-to-reframe, zoom, caption
// editing, supporting-scene swap and PNG export at the exact post sizes.
// Fully offline: the only files it loads are the ones beside it.

import { drawCover, FORMATS, supportScenesFor } from './cover.js';
import { PALETTES, SCENES, HERO_SCENES } from './scenes.js';

const state = {
  format: 'portrait',
  grade: 'sunset',
  sample: 0,          // index into HERO_SCENES, or null when a photo is loaded
  photo: null,        // HTMLImageElement once the user uploads a photo
  photoName: '',
  zoom: 1,            // 1.0 fits a scene exactly; photos start at 1.15 on upload
  ox: 0, oy: 0,       // hero reframe offset, fractions of the hero rect
  support: 0,         // supporting-scene rotation
  headline: 'BOULEVARD QUEEN',
  subtitle: 'VICE CITY',
};

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
let heroRect = null;
let renderQueued = false;

function heroOpts() {
  if (state.photo) return { image: state.photo, zoom: state.zoom, ox: state.ox, oy: state.oy };
  return { scene: HERO_SCENES[state.sample], zoom: state.zoom, ox: state.ox, oy: state.oy };
}

function render() {
  const { w, h } = FORMATS[state.format];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  heroRect = drawCover(ctx, w, h, {
    format: state.format,
    grade: state.grade,
    hero: heroOpts(),
    support: state.support,
    headline: state.headline,
    subtitle: state.subtitle,
  }).heroRect;
  updateSupportList();
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

function updateSupportList() {
  const scenes = supportScenesFor(state.support, state.format === 'landscape' ? 2 : 4);
  $('support-list').textContent = scenes.map((s) => SCENES[s].name).join('  ·  ');
  $('zoom-val').textContent = `${state.zoom.toFixed(2)}x`;
}

// ---- sample photo thumbnails (rendered live from the scene painters) ----
function buildThumbs() {
  const wrap = $('samples');
  HERO_SCENES.forEach((id, i) => {
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Sample photo: ${SCENES[id].name}`);
    const t = document.createElement('canvas');
    t.width = 132; t.height = 176;
    btn.appendChild(t);
    const label = document.createElement('span');
    label.textContent = SCENES[id].name;
    btn.appendChild(label);
    btn.addEventListener('click', () => selectSample(i));
    wrap.appendChild(btn);
    const tctx = t.getContext('2d');
    SCENES[id].paint(tctx, { x: 0, y: 0, w: 132, h: 176 }, PALETTES[state.grade]);
  });
  markSelectedThumb();
}

function repaintThumbs() {
  document.querySelectorAll('#samples .thumb canvas').forEach((t, i) => {
    SCENES[HERO_SCENES[i]].paint(t.getContext('2d'), { x: 0, y: 0, w: 132, h: 176 }, PALETTES[state.grade]);
  });
}

function markSelectedThumb() {
  document.querySelectorAll('#samples .thumb').forEach((b, i) => {
    b.classList.toggle('selected', state.photo === null && state.sample === i);
  });
  $('photo-chip').hidden = state.photo === null;
  if (state.photo) $('photo-chip').textContent = `Your photo: ${state.photoName}`;
}

function selectSample(i) {
  state.sample = i;
  state.photo = null;
  state.photoName = '';
  state.ox = 0; state.oy = 0;
  markSelectedThumb();
  queueRender();
}

// ---- upload -------------------------------------------------------------
$('upload').addEventListener('change', (ev) => {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.photo = img;
    state.photoName = file.name;
    state.sample = null;
    state.ox = 0; state.oy = 0;
    state.zoom = 1.15;
    $('zoom').value = '1.15';
    URL.revokeObjectURL(url);
    markSelectedThumb();
    queueRender();
  };
  img.src = url;
});

// ---- drag to reframe the hero panel -------------------------------------
let dragging = false, lastX = 0, lastY = 0;
function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
}
function inHero(p) {
  if (!heroRect) return false;
  const fx = heroRect.x / canvas.width, fy = heroRect.y / canvas.height;
  const fw = heroRect.w / canvas.width, fh = heroRect.h / canvas.height;
  return p.x >= fx && p.x <= fx + fw && p.y >= fy && p.y <= fy + fh;
}
canvas.addEventListener('pointerdown', (ev) => {
  const p = canvasPoint(ev);
  if (!inHero(p)) return;
  dragging = true;
  lastX = ev.clientX; lastY = ev.clientY;
  canvas.setPointerCapture(ev.pointerId);
  canvas.classList.add('grabbing');
});
canvas.addEventListener('pointermove', (ev) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  state.ox += (ev.clientX - lastX) / r.width / (heroRect.w / canvas.width);
  state.oy += (ev.clientY - lastY) / r.height / (heroRect.h / canvas.height);
  state.ox = Math.max(-0.6, Math.min(0.6, state.ox));
  state.oy = Math.max(-0.6, Math.min(0.6, state.oy));
  lastX = ev.clientX; lastY = ev.clientY;
  queueRender();
});
for (const ev of ['pointerup', 'pointercancel']) {
  canvas.addEventListener(ev, () => { dragging = false; canvas.classList.remove('grabbing'); });
}
canvas.addEventListener('pointermove', (ev) => {
  if (dragging) return;
  canvas.classList.toggle('grab', inHero(canvasPoint(ev)));
});

// ---- controls -----------------------------------------------------------
document.querySelectorAll('[data-format]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.format = btn.dataset.format;
    document.querySelectorAll('[data-format]').forEach((b) => b.classList.toggle('active', b === btn));
    state.ox = 0; state.oy = 0;
    queueRender();
  });
});
document.querySelectorAll('[data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
    repaintThumbs();
    queueRender();
  });
});
$('headline').addEventListener('input', (ev) => { state.headline = ev.target.value; queueRender(); });
$('subtitle').addEventListener('input', (ev) => { state.subtitle = ev.target.value; queueRender(); });
$('zoom').addEventListener('input', (ev) => { state.zoom = parseFloat(ev.target.value); queueRender(); });
$('swap').addEventListener('click', () => { state.support = (state.support + 1) % 5; queueRender(); });
$('reset-frame').addEventListener('click', () => {
  state.ox = 0; state.oy = 0;
  state.zoom = state.photo ? 1.15 : 1;
  $('zoom').value = String(state.zoom);
  queueRender();
});

// ---- export -------------------------------------------------------------
function slug(s) {
  return (s || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}
$('download').addEventListener('click', () => {
  const { w, h } = FORMATS[state.format];
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  drawCover(off.getContext('2d'), w, h, {
    format: state.format,
    grade: state.grade,
    hero: heroOpts(),
    support: state.support,
    headline: state.headline,
    subtitle: state.subtitle,
  });
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.format}-${slug(state.headline)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});

// ---- deep links: ?format=&grade=&sample=&headline=&subtitle=&support= ----
function applyParams() {
  const q = new URLSearchParams(location.search);
  if (FORMATS[q.get('format')]) state.format = q.get('format');
  if (PALETTES[q.get('grade')]) state.grade = q.get('grade');
  const s = parseInt(q.get('sample') || '', 10);
  if (!Number.isNaN(s) && HERO_SCENES[s]) state.sample = s;
  const sup = parseInt(q.get('support') || '', 10);
  if (!Number.isNaN(sup)) state.support = ((sup % 5) + 5) % 5;
  if (q.get('headline')) state.headline = q.get('headline');
  if (q.get('subtitle') !== null) state.subtitle = q.get('subtitle') || '';
  $('headline').value = state.headline;
  $('subtitle').value = state.subtitle;
  document.querySelectorAll('[data-format]').forEach((b) => b.classList.toggle('active', b.dataset.format === state.format));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
}

// ---- boot ---------------------------------------------------------------
applyParams();
buildThumbs();
if (document.fonts && document.fonts.load) {
  Promise.race([
    Promise.all([document.fonts.load('120px Anton'), document.fonts.load('32px Anton')]),
    new Promise((res) => setTimeout(res, 2500)),
  ]).then(() => render());
}
render();
