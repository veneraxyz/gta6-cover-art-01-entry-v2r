// Vice Cover Studio — cover layout engine.
// drawCover renders one complete cover (panels, dividers, grade, title) onto
// any 2D context at any size. The editor previews at export size and the
// download path renders the same function to an offscreen canvas, so what you
// see is exactly what the PNG holds.

import { PALETTES, SCENES, SUPPORT_SCENES, mulberry32 } from './scenes.js';

export const FORMATS = {
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  landscape: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

// Panel layouts. Every layout is asymmetric: one dominant hero panel, the
// rest supporting scenes, and a title band across the bottom over a scrim.
// rects are fractions of the canvas [x, y, w, h]; support scenes fill in order.
const LAYOUTS = {
  portrait: {
    hero: [0, 0, 0.6, 0.667],
    support: [
      [0.6, 0, 0.4, 0.333], // car panel, top right
      [0.6, 0.333, 0.4, 0.334], // palm / sun detail, mid right
      [0, 0.667, 0.5, 0.163], // coastal skyline, bottom left
      [0.5, 0.667, 0.5, 0.163], // beach, bottom right
    ],
    titleBand: [0, 0.83, 1, 0.17],
    scrimFrom: 0.74,
    titleMax: 0.145, // headline size as a fraction of canvas width
    titleMin: 0.075,
    titleWidth: 0.68, // headline width cap, leaving room for the VI numeral
    viSize: 0.3, // VI numeral size as a fraction of canvas width
    viX: 0.97, viBase: 1.005,
  },
  square: {
    hero: [0, 0, 0.6, 0.648],
    support: [
      [0.6, 0, 0.4, 0.324],
      [0.6, 0.324, 0.4, 0.324],
      [0, 0.648, 0.5, 0.167],
      [0.5, 0.648, 0.5, 0.167],
    ],
    titleBand: [0, 0.815, 1, 0.185],
    scrimFrom: 0.72,
    titleMax: 0.125,
    titleMin: 0.068,
    titleWidth: 0.66,
    viSize: 0.27,
    viX: 0.97, viBase: 1.005,
  },
  landscape: {
    hero: [0, 0, 0.646, 1],
    support: [
      [0.646, 0, 0.354, 0.5],
      [0.646, 0.5, 0.354, 0.5],
    ],
    titleBand: [0, 0.76, 1, 0.24],
    scrimFrom: 0.62,
    titleMax: 0.078,
    titleMin: 0.042,
    titleWidth: 0.6,
    viSize: 0.17,
    viX: 0.985, viBase: 1.01,
  },
};

function fracRect(f, W, H) {
  return { x: f[0] * W, y: f[1] * H, w: f[2] * W, h: f[3] * H };
}

// Draw the hero content (uploaded photo or procedural scene) into rect with
// cover-fit, zoom and a drag offset. Photo heroes get a grade tint so any
// photo lands in the same sunset / neon world as the drawn panels. Scene
// heroes get a safe zone: in the landscape layout the title scrim covers the
// hero's lower part, so the scene composes its subject above it.
function drawHero(ctx, rect, hero, pal, grade, safe) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (hero.image) {
    const img = hero.image;
    const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * (hero.zoom || 1);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    const dx = rect.x + (rect.w - dw) / 2 + (hero.ox || 0) * rect.w;
    const dy = rect.y + (rect.h - dh) / 2 + (hero.oy || 0) * rect.h;
    ctx.drawImage(img, dx, dy, dw, dh);
    gradeTintPhoto(ctx, rect, pal, grade);
  } else {
    const paint = SCENES[hero.scene || 'portrait'].paint;
    // Render the scene to its own canvas so zoom / reframe apply to it too.
    const off = document.createElement('canvas');
    off.width = Math.max(2, Math.round(rect.w));
    off.height = Math.max(2, Math.round(rect.h));
    paint(off.getContext('2d'), { x: 0, y: 0, w: off.width, h: off.height }, pal, undefined, safe);
    const z = hero.zoom || 1;
    const dw = rect.w * z, dh = rect.h * z;
    ctx.drawImage(off,
      rect.x + (rect.w - dw) / 2 + (hero.ox || 0) * rect.w,
      rect.y + (rect.h - dh) / 2 + (hero.oy || 0) * rect.h, dw, dh);
  }
  ctx.restore();
}

function gradeTintPhoto(ctx, rect, pal, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (grade === 'sunset') {
    const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    g.addColorStop(0, 'rgba(255,170,110,0.34)');
    g.addColorStop(0.55, 'rgba(255,110,130,0.16)');
    g.addColorStop(1, 'rgba(90,40,120,0.34)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(20,30,80,0.45)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, 'rgba(34,230,255,0.16)');
    g.addColorStop(1, 'rgba(255,46,136,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

// Split a headline into at most two balanced lines.
function wrapTwoLines(ctx, text, maxWidth) {
  const words = text.trim().split(/\s+/);
  if (words.length === 1) return [text.trim()];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
    const over = Math.max(wa, wb) - maxWidth;
    const imbalance = Math.abs(wa - wb);
    const score = over * 10 + imbalance;
    if (!best || score < best.score) best = { lines: [a, b], score };
  }
  return best.lines;
}

// Fit the headline: one line at the largest size that fits, else two lines.
function fitHeadline(ctx, text, maxWidth, maxSize, minSize) {
  let size = maxSize;
  ctx.font = `${size}px Anton, Impact, sans-serif`;
  if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size };
  while (size > minSize) {
    size = Math.round(size * 0.94);
    ctx.font = `${size}px Anton, Impact, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size };
  }
  // Two lines, sized to the wider line.
  let two = maxSize * 0.72;
  ctx.font = `${two}px Anton, Impact, sans-serif`;
  let lines = wrapTwoLines(ctx, text, maxWidth);
  while (two > minSize * 0.8) {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxWidth) break;
    two = Math.round(two * 0.94);
    ctx.font = `${two}px Anton, Impact, sans-serif`;
    lines = wrapTwoLines(ctx, text, maxWidth);
  }
  return { lines, size: two };
}

function drawTitleBlock(ctx, W, H, layout, pal, headline, subtitle) {
  const band = fracRect(layout.titleBand, W, H);
  const scrimTop = layout.scrimFrom * H;
  // Dark scrim gradient so the lettering sits over a quiet area.
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, H);
  scrim.addColorStop(0, 'rgba(6,3,10,0)');
  scrim.addColorStop(0.35, 'rgba(6,3,10,0.55)');
  scrim.addColorStop(1, 'rgba(6,3,10,0.93)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, W, H - scrimTop);

  // The giant gradient VI numeral behind the title, right side.
  const viSize = layout.viSize * W;
  ctx.save();
  ctx.font = `${viSize}px Anton, Impact, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const vg = ctx.createLinearGradient(0, H - viSize, 0, H);
  vg.addColorStop(0, pal.titleVi[0]);
  vg.addColorStop(0.5, pal.titleVi[1]);
  vg.addColorStop(1, pal.titleVi[2]);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = vg;
  ctx.fillText('VI', layout.viX * W, layout.viBase * H);
  ctx.restore();

  // Headline: warm-white fill, near-black outline, hard offset shadow.
  const padX = W * 0.045;
  const maxWidth = (layout.titleWidth || 0.68) * W;
  const maxSize = layout.titleMax * W;
  const minSize = layout.titleMin * W;
  const { lines, size } = fitHeadline(ctx, headline.toUpperCase(), maxWidth, maxSize, minSize);
  const lineH = size * 1.02;
  const baseY = H - H * 0.028 - (lines.length - 1) * lineH * 0;
  ctx.save();
  ctx.font = `${size}px Anton, Impact, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const shadowOff = Math.max(3, size * 0.045);
  lines.forEach((line, i) => {
    const y = baseY - (lines.length - 1 - i) * lineH;
    ctx.fillStyle = '#14070c';
    ctx.fillText(line, padX + shadowOff, y + shadowOff);
    ctx.lineWidth = Math.max(3, size / 11);
    ctx.strokeStyle = '#12060d';
    ctx.strokeText(line, padX, y);
    ctx.fillStyle = '#fff3dc';
    ctx.fillText(line, padX, y);
  });
  ctx.restore();

  // Subtitle above the headline, letterspaced, in the grade's accent.
  if (subtitle && subtitle.trim()) {
    const subSize = Math.max(18, size * 0.24);
    ctx.save();
    ctx.font = `${subSize}px Anton, Impact, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(3, subSize * 0.22)}px`; } catch (e) { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = pal.accentCyan;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    // Subtitle sits above the first headline line, clear of the lettering.
    const subY = baseY - (lines.length - 1) * lineH - size * 0.86;
    ctx.fillText(subtitle.trim().toUpperCase(), padX, subY);
    ctx.restore();
  }
  return { band, headlineSize: size, lines: lines.length };
}

// Film grain + vignette over the whole cover (after panels, before title
// would dull the lettering, so this runs before drawTitleBlock).
function finishGrade(ctx, W, H, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  const dots = Math.round((W * H) / 260);
  for (let i = 0; i < dots; i++) {
    const x = rnd() * W, y = rnd() * H;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(5,2,8,0.22)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function supportScenesFor(rotation, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(SUPPORT_SCENES[(rotation + i) % SUPPORT_SCENES.length]);
  return out;
}

// opts: { format, grade, hero: {image?, scene, zoom, ox, oy}, support (rotation),
//         headline, subtitle }
// Returns { heroRect, headlineSize, lines } for the editor (drag hit test).
export function drawCover(ctx, W, H, opts) {
  const layout = LAYOUTS[opts.format] || LAYOUTS.portrait;
  const pal = PALETTES[opts.grade] || PALETTES.sunset;
  ctx.save();
  ctx.fillStyle = '#0a050d';
  ctx.fillRect(0, 0, W, H);

  // Hero panel. In the landscape layout the title scrim covers the hero's
  // lower part, so the scene keeps its subject in the top 74%.
  const heroRect = fracRect(layout.hero, W, H);
  const safe = opts.format === 'landscape' ? 0.74 : 1;
  drawHero(ctx, heroRect, opts.hero || {}, pal, opts.grade, safe);

  // Supporting panels.
  const scenes = supportScenesFor(opts.support || 0, layout.support.length);
  layout.support.forEach((f, i) => {
    const rect = fracRect(f, W, H);
    SCENES[scenes[i]].paint(ctx, rect, pal, 40 + i * 17);
  });

  // Thick black dividers between panels.
  const D = Math.max(7, Math.round(W * 0.009));
  ctx.fillStyle = '#050308';
  const divs = [];
  if (opts.format === 'landscape') {
    divs.push([layout.hero[2] * W - D / 2, 0, D, H]);
    divs.push([layout.hero[2] * W, 0.5 * H - D / 2, W - layout.hero[2] * W, D]);
  } else {
    divs.push([layout.hero[2] * W - D / 2, 0, D, layout.hero[3] * H]);
    divs.push([layout.hero[2] * W, layout.support[0][3] * H - D / 2, W - layout.hero[2] * W, D]);
    divs.push([0, layout.hero[3] * H - D / 2, W, D]);
    divs.push([0.5 * W - D / 2, layout.hero[3] * H, D, layout.support[2][3] * H]);
  }
  for (const [x, y, w, h] of divs) ctx.fillRect(x, y, w, h);

  finishGrade(ctx, W, H, 1234);
  const title = drawTitleBlock(ctx, W, H, layout, pal, opts.headline || 'VICE CITY', opts.subtitle || '');
  ctx.restore();
  return { heroRect, headlineSize: title.headlineSize, lines: title.lines };
}
