// Vice Cover Studio — procedural scene painters.
// Every panel of every cover is drawn here with plain Canvas 2D: no photos,
// no external images. Each painter draws inside a clipped rectangle and takes
// a palette, so the same scene reads as a warm sunset or a neon night.
// All randomness is seeded, so a cover renders identically every time.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const ca = hexRgb(a), cb = hexRgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(lerp(ca[2], cb[2], t))})`;
}

// Sky is a vertical gradient of stops [offset, color]; skyColorAt lets the
// striped sun cut gaps that match the sky behind it.
function skyGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function skyColorAt(stops, t) {
  for (let i = 0; i < stops.length - 1; i++) {
    const [o0, c0] = stops[i], [o1, c1] = stops[i + 1];
    if (t <= o1) return mixHex(c0, c1, (t - o0) / Math.max(0.0001, o1 - o0));
  }
  return stops[stops.length - 1][1];
}

export const PALETTES = {
  sunset: {
    sky: [[0, '#2b1b4d'], [0.42, '#8e2f63'], [0.68, '#e2607a'], [1, '#ffb36b']],
    sunCore: '#ffe9a8', sunEdge: '#ff7a59',
    far: '#5c2a55', near: '#1d0f26', ground: '#160a1e',
    waterTop: '#3a2a5e', waterBot: '#1c4a5e', waterGlint: '#ffd97a',
    palm: '#14091f', accentPink: '#ff5fa2', accentCyan: '#35e0d4',
    rim: '#ffb36b', rimHot: '#ffd97a', signGlow: '#ff5fa2',
    windowWarm: '#ffd97a', windowCool: '#7ef0e2', sand: '#e8a06a',
    figure: '#1a0c22', figureHi: '#2c1533', titleVi: ['#ffe9a8', '#ff7a59', '#c65cff'],
  },
  neon: {
    sky: [[0, '#040614'], [0.5, '#0a1030'], [0.8, '#14204d'], [1, '#1d2a5e']],
    sunCore: '#ffe9f4', sunEdge: '#ff2e88',
    far: '#101736', near: '#070a1c', ground: '#05070f',
    waterTop: '#0a1230', waterBot: '#06101f', waterGlint: '#22e6ff',
    palm: '#04060f', accentPink: '#ff2e88', accentCyan: '#22e6ff',
    rim: '#ff5fa2', rimHot: '#ff8ac2', signGlow: '#22e6ff',
    windowWarm: '#ffd97a', windowCool: '#22e6ff', sand: '#3a3f66',
    figure: '#05070f', figureHi: '#131a33', titleVi: ['#22e6ff', '#a855f7', '#ff2e88'],
  },
};

// ---- shared pieces -------------------------------------------------------

function fillSky(ctx, r, pal) {
  ctx.fillStyle = skyGradient(ctx, r.x, r.y, r.w, r.h, pal.sky);
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

// Retro striped sun: gradient disc, lower half cut by sky-coloured bars.
export function drawStripedSun(ctx, cx, cy, rad, pal, stops, topY, height) {
  const g = ctx.createLinearGradient(0, cy - rad, 0, cy + rad);
  g.addColorStop(0, pal.sunCore);
  g.addColorStop(1, pal.sunEdge);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  let y = cy + rad * 0.08, gap = rad * 0.05, bar = rad * 0.055;
  while (y < cy + rad) {
    const t = (y - topY) / height;
    ctx.fillStyle = skyColorAt(stops, Math.min(1, Math.max(0, t)));
    ctx.fillRect(cx - rad, y, rad * 2, bar);
    y += bar + gap;
    gap *= 1.35; bar *= 1.25;
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, lean, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a leaning curve, thicker at the base.
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.4, y - s * 0.55, x + lean * s, y - s);
  ctx.lineWidth = s * 0.055;
  ctx.stroke();
  const cx = x + lean * s, cy = y - s;
  // Fronds: tapered curved blades fanning from the crown.
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (-168 + i * 21) * Math.PI / 180;
    const len = s * (0.52 + 0.16 * Math.sin(i * 2.3));
    const tipX = cx + Math.cos(a) * len;
    const tipY = cy + Math.sin(a) * len * 0.62 + len * 0.28;
    const midX = cx + Math.cos(a) * len * 0.55;
    const midY = cy + Math.sin(a) * len * 0.55 * 0.62 - len * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + len * 0.06, midY + len * 0.16, cx, cy);
    ctx.fill();
  }
  // A couple of drooping dead fronds under the crown.
  for (const d of [-0.5, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + d * s * 0.3, cy + s * 0.22, cx + d * s * 0.42, cy + s * 0.4);
    ctx.quadraticCurveTo(cx + d * s * 0.2, cy + s * 0.28, cx, cy);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx - s * 0.03, cy + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.04, cy + s * 0.05, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSkyline(ctx, r, baseY, color, seed, minH, maxH, windows, pal) {
  const rnd = mulberry32(seed);
  let x = r.x;
  const lit = [];
  while (x < r.x + r.w) {
    const bw = r.w * (0.05 + rnd() * 0.07);
    const bh = minH + rnd() * (maxH - minH);
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (rnd() < 0.3) { // rooftop antenna / water tower nub
      ctx.fillRect(x + bw * 0.45, baseY - bh - r.h * 0.03, r.w * 0.006, r.h * 0.03);
    }
    if (windows) {
      const cols = Math.max(1, Math.floor(bw / (r.w * 0.018)));
      const rows = Math.max(1, Math.floor(bh / (r.h * 0.035)));
      for (let c = 0; c < cols; c++) {
        for (let rw = 0; rw < rows; rw++) {
          if (rnd() < 0.22) {
            lit.push([x + bw * 0.15 + c * bw * 0.8 / cols, baseY - bh + r.h * 0.03 + rw * bh * 0.85 / rows]);
          }
        }
      }
    }
    x += bw + r.w * 0.008;
  }
  for (const [wx, wy] of lit) {
    ctx.fillStyle = rnd() < 0.6 ? pal.windowWarm : pal.windowCool;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(wx, wy, r.w * 0.011, r.h * 0.014);
  }
  ctx.globalAlpha = 1;
}

function drawWater(ctx, r, y0, sunX, pal) {
  const g = ctx.createLinearGradient(0, y0, 0, r.y + r.h);
  g.addColorStop(0, pal.waterTop);
  g.addColorStop(1, pal.waterBot);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, y0, r.w, r.y + r.h - y0);
  // Sun glint column: short horizontal dashes, fading with depth.
  const rnd = mulberry32(99);
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const yy = y0 + t * (r.y + r.h - y0);
    const spread = r.w * 0.02 + t * r.w * 0.075;
    const ww = r.w * (0.012 + rnd() * 0.03 + t * 0.02);
    ctx.fillStyle = pal.waterGlint;
    ctx.globalAlpha = 0.55 * (1 - t * 0.7);
    ctx.fillRect(sunX + (rnd() - 0.5) * spread * 2 - ww / 2, yy, ww, Math.max(1.5, r.h * 0.004));
  }
  ctx.globalAlpha = 1;
}

function drawBirds(ctx, r, seed, color) {
  const rnd = mulberry32(seed);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, r.w * 0.004);
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const bx = r.x + r.w * (0.15 + rnd() * 0.7);
    const by = r.y + r.h * (0.12 + rnd() * 0.25);
    const s = r.w * (0.015 + rnd() * 0.012);
    ctx.beginPath();
    ctx.moveTo(bx - s, by);
    ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.7, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.7, bx + s, by);
    ctx.stroke();
  }
}

function drawNeonSign(ctx, x, y, w, h, color, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = w * 0.12;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, w * 0.03);
  ctx.globalAlpha = 0.95;
  ctx.strokeRect(x, y, w, h);
  ctx.globalAlpha = 0.85;
  // Abstract glowing glyph bars — signage, not words.
  const bars = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < bars; i++) {
    const bw = w * (0.35 + rnd() * 0.4);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * (0.28 + i * 0.24));
    ctx.lineTo(x + w * 0.14 + bw, y + h * (0.28 + i * 0.24));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x + w * 0.78, y + h * 0.5, w * 0.09, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// A standing figure silhouette, feet at baseY, head at baseY - h.
function drawFigure(ctx, cx, baseY, h, color, opts = {}) {
  const lean = opts.lean || 0;
  const s = h / 100; // scale unit
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(cx, baseY);
  ctx.rotate(lean);
  // Legs.
  ctx.beginPath();
  ctx.moveTo(-4.5 * s, -42 * s);
  ctx.lineTo(-6.5 * s, 0);
  ctx.lineTo(-1.5 * s, 0);
  ctx.lineTo(-1 * s, -40 * s);
  ctx.closePath();
  ctx.moveTo(4.5 * s, -42 * s);
  ctx.lineTo(6.5 * s, 0);
  ctx.lineTo(1.5 * s, 0);
  ctx.lineTo(1 * s, -40 * s);
  ctx.closePath();
  ctx.fill();
  // Torso: shoulders wide, hips narrow.
  ctx.beginPath();
  ctx.moveTo(-13 * s, -78 * s);
  ctx.quadraticCurveTo(-14 * s, -62 * s, -8 * s, -42 * s);
  ctx.lineTo(8 * s, -42 * s);
  ctx.quadraticCurveTo(14 * s, -62 * s, 13 * s, -78 * s);
  ctx.quadraticCurveTo(0, -84 * s, -13 * s, -78 * s);
  ctx.fill();
  // Arms at the sides, slightly out.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 12 * s, -76 * s);
    ctx.quadraticCurveTo(side * 17 * s, -60 * s, side * 15 * s, -44 * s);
    ctx.lineTo(side * 11 * s, -44 * s);
    ctx.quadraticCurveTo(side * 12 * s, -60 * s, side * 9 * s, -74 * s);
    ctx.closePath();
    ctx.fill();
  }
  // Head.
  ctx.beginPath();
  ctx.ellipse(0, -90 * s, 7.5 * s, 8.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair cap.
  ctx.beginPath();
  ctx.ellipse(0, -93 * s, 8 * s, 6 * s, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Side-profile car silhouette, body sitting on baseY. With rim, a warm
// highlight traces the roofline so the car lifts off a dark ground.
function drawCar(ctx, x, baseY, w, h, color, glass, rim) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w * 0.02, baseY - h * 0.42);
  ctx.quadraticCurveTo(x + w * 0.06, baseY - h * 0.52, x + w * 0.16, baseY - h * 0.55);
  ctx.lineTo(x + w * 0.30, baseY - h * 0.86); // windshield
  ctx.lineTo(x + w * 0.52, baseY - h * 0.92); // roof
  ctx.lineTo(x + w * 0.68, baseY - h * 0.86); // rear window
  ctx.lineTo(x + w * 0.86, baseY - h * 0.58);
  ctx.quadraticCurveTo(x + w * 0.97, baseY - h * 0.55, x + w * 0.99, baseY - h * 0.42);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  ctx.fill();
  // Cabin glass.
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.33, baseY - h * 0.82);
  ctx.lineTo(x + w * 0.51, baseY - h * 0.86);
  ctx.lineTo(x + w * 0.65, baseY - h * 0.80);
  ctx.lineTo(x + w * 0.60, baseY - h * 0.58);
  ctx.lineTo(x + w * 0.38, baseY - h * 0.58);
  ctx.closePath();
  ctx.fill();
  // Wheels.
  for (const wx of [0.24, 0.76]) {
    ctx.fillStyle = '#05050a';
    ctx.beginPath();
    ctx.arc(x + w * wx, baseY - h * 0.02, h * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8ccd4';
    ctx.beginPath();
    ctx.arc(x + w * wx, baseY - h * 0.02, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Body highlight line.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(1.5, h * 0.02);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.06, baseY - h * 0.38);
  ctx.lineTo(x + w * 0.94, baseY - h * 0.38);
  ctx.stroke();
  if (rim) {
    ctx.save();
    ctx.strokeStyle = rim;
    ctx.shadowColor = rim;
    ctx.shadowBlur = w * 0.02;
    ctx.lineWidth = Math.max(2, h * 0.035);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.16, baseY - h * 0.55);
    ctx.lineTo(x + w * 0.30, baseY - h * 0.86);
    ctx.lineTo(x + w * 0.52, baseY - h * 0.92);
    ctx.lineTo(x + w * 0.68, baseY - h * 0.86);
    ctx.lineTo(x + w * 0.86, baseY - h * 0.58);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ---- backdrop scenes -----------------------------------------------------

function clipRect(ctx, r) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
}

export function paintSkylineCoast(ctx, r, pal, seed = 7) {
  clipRect(ctx, r);
  fillSky(ctx, r, pal);
  const sunX = r.x + r.w * 0.68, sunY = r.y + r.h * 0.42, sunR = r.w * 0.17;
  drawStripedSun(ctx, sunX, sunY, sunR, pal, pal.sky, r.y, r.h);
  drawBirds(ctx, r, seed + 3, pal.near);
  const horizon = r.y + r.h * 0.62;
  drawSkyline(ctx, r, horizon, pal.far, seed + 11, r.h * 0.08, r.h * 0.24, false, pal);
  drawSkyline(ctx, r, horizon, pal.near, seed + 23, r.h * 0.05, r.h * 0.16, true, pal);
  drawWater(ctx, r, horizon, sunX, pal);
  drawPalm(ctx, r.x + r.w * 0.06, r.y + r.h * 0.99, r.h * 0.5, 0.25, pal.palm);
  ctx.restore();
}

export function paintPalmSun(ctx, r, pal, seed = 21) {
  clipRect(ctx, r);
  fillSky(ctx, r, pal);
  const sunX = r.x + r.w * 0.5, sunY = r.y + r.h * 0.46, sunR = Math.min(r.w, r.h) * 0.36;
  drawStripedSun(ctx, sunX, sunY, sunR, pal, pal.sky, r.y, r.h);
  drawBirds(ctx, r, seed + 5, pal.near);
  // Foreground fronds from both bottom corners, framing the sun.
  drawPalm(ctx, r.x + r.w * 0.02, r.y + r.h * 1.02, r.h * 0.62, 0.45, pal.palm);
  drawPalm(ctx, r.x + r.w * 0.98, r.y + r.h * 1.02, r.h * 0.55, -0.4, pal.palm);
  ctx.fillStyle = pal.ground;
  ctx.fillRect(r.x, r.y + r.h * 0.94, r.w, r.h * 0.06);
  ctx.restore();
}

export function paintBoulevard(ctx, r, pal, seed = 33) {
  clipRect(ctx, r);
  fillSky(ctx, r, pal);
  const sunX = r.x + r.w * 0.5, sunY = r.y + r.h * 0.3, sunR = r.w * 0.13;
  drawStripedSun(ctx, sunX, sunY, sunR, pal, pal.sky, r.y, r.h);
  const horizon = r.y + r.h * 0.52;
  drawSkyline(ctx, r, horizon, pal.far, seed + 2, r.h * 0.06, r.h * 0.18, false, pal);
  // Ground + perspective road.
  ctx.fillStyle = pal.ground;
  ctx.fillRect(r.x, horizon, r.w, r.y + r.h - horizon);
  ctx.fillStyle = mixHex(pal.ground, '#000000', 0.25);
  ctx.beginPath();
  ctx.moveTo(r.x + r.w * 0.42, horizon);
  ctx.lineTo(r.x + r.w * 0.58, horizon);
  ctx.lineTo(r.x + r.w * 0.86, r.y + r.h);
  ctx.lineTo(r.x + r.w * 0.14, r.y + r.h);
  ctx.closePath();
  ctx.fill();
  // Centre dashes receding.
  ctx.fillStyle = pal.sunCore;
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const yy = horizon + t * t * (r.y + r.h - horizon) * 0.9;
    const ww = r.w * (0.006 + t * 0.012);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(r.x + r.w * 0.5 - ww / 2, yy, ww, r.h * (0.008 + t * 0.03));
  }
  ctx.globalAlpha = 1;
  // Palms receding on both verges.
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const s = r.h * (0.5 - t * 0.28);
    drawPalm(ctx, r.x + r.w * (0.10 + t * 0.26), horizon + (r.y + r.h - horizon) * (0.15 + t * 0.3), s, 0.2, pal.palm);
    drawPalm(ctx, r.x + r.w * (0.90 - t * 0.26), horizon + (r.y + r.h - horizon) * (0.15 + t * 0.3), s, -0.2, pal.palm);
  }
  drawCar(ctx, r.x + r.w * 0.31, r.y + r.h * 0.92, r.w * 0.38, r.h * 0.16, pal.near, pal.accentCyan);
  ctx.restore();
}

export function paintBeachPier(ctx, r, pal, seed = 47) {
  clipRect(ctx, r);
  fillSky(ctx, r, pal);
  const sunX = r.x + r.w * 0.3, sunY = r.y + r.h * 0.38, sunR = r.w * 0.15;
  drawStripedSun(ctx, sunX, sunY, sunR, pal, pal.sky, r.y, r.h);
  drawBirds(ctx, r, seed + 1, pal.near);
  const horizon = r.y + r.h * 0.55;
  drawWater(ctx, r, horizon, sunX, pal);
  // Pier: deck + posts, receding to the right.
  ctx.fillStyle = pal.near;
  ctx.fillRect(r.x, r.y + r.h * 0.66, r.w * 0.78, r.h * 0.035);
  const rnd = mulberry32(seed);
  for (let i = 0; i < 7; i++) {
    const px = r.x + r.w * (0.04 + i * 0.105);
    ctx.fillRect(px, r.y + r.h * 0.66, r.w * 0.014, r.h * (0.12 + rnd() * 0.06));
  }
  // Sand strip + palm at the left.
  ctx.fillStyle = pal.sand;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h);
  ctx.lineTo(r.x, r.y + r.h * 0.82);
  ctx.quadraticCurveTo(r.x + r.w * 0.3, r.y + r.h * 0.86, r.x + r.w * 0.42, r.y + r.h);
  ctx.closePath();
  ctx.fill();
  drawPalm(ctx, r.x + r.w * 0.08, r.y + r.h * 0.98, r.h * 0.55, 0.35, pal.palm);
  ctx.restore();
}

export function paintNeonStreet(ctx, r, pal, seed = 59) {
  clipRect(ctx, r);
  fillSky(ctx, r, pal);
  const horizon = r.y + r.h * 0.66;
  drawSkyline(ctx, r, horizon, pal.far, seed + 4, r.h * 0.1, r.h * 0.3, true, pal);
  drawSkyline(ctx, r, horizon, pal.near, seed + 9, r.h * 0.06, r.h * 0.2, true, pal);
  // Neon signs on the near facades.
  drawNeonSign(ctx, r.x + r.w * 0.08, r.y + r.h * 0.22, r.w * 0.2, r.h * 0.2, pal.accentPink, seed);
  drawNeonSign(ctx, r.x + r.w * 0.62, r.y + r.h * 0.14, r.w * 0.24, r.h * 0.16, pal.accentCyan, seed + 1);
  drawNeonSign(ctx, r.x + r.w * 0.38, r.y + r.h * 0.34, r.w * 0.14, r.h * 0.14, '#a855f7', seed + 2);
  // Wet street with vertical neon reflections.
  ctx.fillStyle = pal.ground;
  ctx.fillRect(r.x, horizon, r.w, r.y + r.h - horizon);
  const rnd = mulberry32(seed + 8);
  const cols = [pal.accentPink, pal.accentCyan, '#a855f7', pal.windowWarm];
  for (let i = 0; i < 34; i++) {
    const sx = r.x + rnd() * r.w;
    const sh = r.h * (0.04 + rnd() * 0.22);
    ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
    ctx.globalAlpha = 0.16 + rnd() * 0.3;
    ctx.fillRect(sx, horizon + r.h * 0.02, r.w * 0.008, sh);
  }
  ctx.globalAlpha = 1;
  // A lone figure crossing the street.
  drawFigure(ctx, r.x + r.w * 0.5, r.y + r.h * 0.97, r.h * 0.3, pal.figure, { lean: 0.04 });
  ctx.restore();
}

// ---- hero scenes --------------------------------------------------------

export function paintHeroPortrait(ctx, r, pal, seed = 101, safe = 1) {
  clipRect(ctx, r);
  fillSky(ctx, r, pal);
  const sh = r.h * safe; // stage height: the subject stays above the title scrim
  const sunX = r.x + r.w * 0.74, sunY = r.y + sh * 0.3, sunR = r.w * 0.2;
  drawStripedSun(ctx, sunX, sunY, sunR, pal, pal.sky, r.y, r.h);
  drawBirds(ctx, r, seed, pal.near);
  const horizon = r.y + sh * 0.66;
  drawSkyline(ctx, r, horizon, pal.far, seed + 6, sh * 0.06, sh * 0.18, false, pal);
  drawSkyline(ctx, r, horizon, pal.near, seed + 12, sh * 0.04, sh * 0.12, true, pal);
  ctx.fillStyle = pal.ground;
  ctx.fillRect(r.x, horizon, r.w, r.y + r.h - horizon);
  drawPalm(ctx, r.x + r.w * 0.03, r.y + sh * 0.72, sh * 0.34, 0.3, pal.palm);

  // The figure: bust portrait, head + shoulders, centred slightly left.
  const cx = r.x + r.w * 0.46, headY = r.y + sh * 0.36;
  const hrx = r.w * 0.155, hry = sh * 0.115;
  const fig = ctx.createLinearGradient(0, headY - hry, 0, r.y + sh);
  fig.addColorStop(0, pal.figureHi);
  fig.addColorStop(1, pal.figure);
  ctx.fillStyle = fig;
  // Shoulders / torso.
  ctx.beginPath();
  ctx.moveTo(cx - r.w * 0.34, r.y + sh);
  ctx.quadraticCurveTo(cx - r.w * 0.36, r.y + sh * 0.66, cx - r.w * 0.2, r.y + sh * 0.6);
  ctx.quadraticCurveTo(cx - r.w * 0.09, r.y + sh * 0.56, cx - r.w * 0.055, r.y + sh * 0.5);
  ctx.lineTo(cx + r.w * 0.055, r.y + sh * 0.5);
  ctx.quadraticCurveTo(cx + r.w * 0.09, r.y + sh * 0.56, cx + r.w * 0.2, r.y + sh * 0.6);
  ctx.quadraticCurveTo(cx + r.w * 0.36, r.y + sh * 0.66, cx + r.w * 0.34, r.y + sh);
  ctx.closePath();
  ctx.fill();
  // Neck + head.
  ctx.fillRect(cx - r.w * 0.05, headY + hry * 0.55, r.w * 0.1, sh * 0.09);
  ctx.beginPath();
  ctx.ellipse(cx, headY, hrx, hry, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair: volume over the top, sweeping down a little on the left side.
  ctx.beginPath();
  ctx.ellipse(cx - hrx * 0.08, headY - hry * 0.42, hrx * 1.1, hry * 0.76, -0.08, Math.PI * 0.98, Math.PI * 2.02);
  ctx.quadraticCurveTo(cx - hrx * 1.25, headY + hry * 0.25, cx - hrx * 1.05, headY + hry * 0.55);
  ctx.quadraticCurveTo(cx - hrx * 0.85, headY + hry * 0.3, cx - hrx * 0.7, headY - hry * 0.15);
  ctx.closePath();
  ctx.fill();
  // Warm rim light on the sun side (right edge of head + shoulder),
  // fading out as it runs down the shoulder.
  ctx.save();
  ctx.strokeStyle = pal.rimHot;
  ctx.shadowColor = pal.rim;
  ctx.shadowBlur = r.w * 0.03;
  ctx.lineWidth = Math.max(3, r.w * 0.011);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(cx, headY, hrx, hry, 0, -0.9, 1.15);
  ctx.stroke();
  const fade = ctx.createLinearGradient(0, r.y + sh * 0.52, 0, r.y + sh * 0.66);
  fade.addColorStop(0, pal.rimHot);
  fade.addColorStop(1, 'rgba(255,180,100,0)');
  ctx.strokeStyle = fade;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(cx + r.w * 0.055, r.y + sh * 0.52);
  ctx.quadraticCurveTo(cx + r.w * 0.16, r.y + sh * 0.585, cx + r.w * 0.235, r.y + sh * 0.645);
  ctx.stroke();
  ctx.restore();
  // Sunglasses with a cyan glint.
  ctx.fillStyle = '#05050a';
  const gy = headY - hry * 0.08, gw = hrx * 0.72, gh = hry * 0.42;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(cx + side * hrx * 0.52 - gw / 2, gy - gh / 2, gw, gh, gh * 0.35);
    ctx.fill();
  }
  ctx.fillRect(cx - hrx * 0.12, gy - gh * 0.18, hrx * 0.24, gh * 0.14);
  ctx.strokeStyle = 'rgba(140,240,235,0.9)';
  ctx.lineWidth = Math.max(2, r.w * 0.006);
  ctx.beginPath();
  ctx.moveTo(cx - hrx * 0.62, gy + gh * 0.18);
  ctx.lineTo(cx - hrx * 0.28, gy - gh * 0.22);
  ctx.stroke();
  // Gold hoop earring.
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = Math.max(2.5, r.w * 0.008);
  ctx.beginPath();
  ctx.arc(cx + hrx * 0.98, headY + hry * 0.42, r.w * 0.028, 0, Math.PI * 2);
  ctx.stroke();
  // Open shirt collar: a small pale V at the chest, plus a thin gold chain.
  ctx.fillStyle = 'rgba(255,244,220,0.55)';
  ctx.beginPath();
  ctx.moveTo(cx - r.w * 0.045, r.y + sh * 0.585);
  ctx.lineTo(cx, r.y + sh * 0.67);
  ctx.lineTo(cx + r.w * 0.045, r.y + sh * 0.585);
  ctx.lineTo(cx + r.w * 0.022, r.y + sh * 0.575);
  ctx.lineTo(cx, r.y + sh * 0.63);
  ctx.lineTo(cx - r.w * 0.022, r.y + sh * 0.575);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = Math.max(2, r.w * 0.006);
  ctx.beginPath();
  ctx.arc(cx, r.y + sh * 0.56, r.w * 0.075, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.restore();
}

export function paintHeroRider(ctx, r, pal, seed = 113, safe = 1) {
  clipRect(ctx, r);
  fillSky(ctx, r, pal);
  const sh = r.h * safe; // stage height: the rider stays above the title scrim
  const horizon = r.y + sh * 0.68;
  drawSkyline(ctx, r, horizon, pal.far, seed + 3, sh * 0.08, sh * 0.26, true, pal);
  drawSkyline(ctx, r, horizon, pal.near, seed + 7, sh * 0.05, sh * 0.16, true, pal);
  drawNeonSign(ctx, r.x + r.w * 0.1, r.y + sh * 0.14, r.w * 0.2, sh * 0.15, pal.accentPink, seed);
  drawNeonSign(ctx, r.x + r.w * 0.66, r.y + sh * 0.09, r.w * 0.22, sh * 0.13, pal.accentCyan, seed + 1);
  // Wet street (fills to the panel bottom; reflections run full height).
  ctx.fillStyle = pal.ground;
  ctx.fillRect(r.x, horizon, r.w, r.y + r.h - horizon);
  const rnd = mulberry32(seed + 5);
  const cols = [pal.accentPink, pal.accentCyan, '#a855f7'];
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
    ctx.globalAlpha = 0.14 + rnd() * 0.3;
    ctx.fillRect(r.x + rnd() * r.w, horizon + sh * 0.02, r.w * 0.008, sh * (0.05 + rnd() * 0.2) + (r.h - sh));
  }
  ctx.globalAlpha = 1;

  // Motorcycle + rider, side profile facing right.
  const wy = r.y + sh * 0.86, wr = sh * 0.085;
  const rearX = r.x + r.w * 0.26, frontX = r.x + r.w * 0.72;
  // Neon ground glow under the bike so it lifts off the dark street.
  const glow = ctx.createRadialGradient((rearX + frontX) / 2, wy, wr * 0.2, (rearX + frontX) / 2, wy, wr * 3.4);
  glow.addColorStop(0, 'rgba(255,46,136,0.20)');
  glow.addColorStop(0.5, 'rgba(34,230,255,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(r.x, wy - wr * 1.6, r.w, wr * 3.2);
  // Headlight beam cutting right.
  const beam = ctx.createLinearGradient(frontX, wy - wr * 0.6, r.x + r.w, wy - wr * 0.2);
  beam.addColorStop(0, 'rgba(255,240,200,0.28)');
  beam.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(frontX, wy - wr * 0.75);
  ctx.lineTo(r.x + r.w, wy - wr * 1.7);
  ctx.lineTo(r.x + r.w, wy + wr * 0.4);
  ctx.lineTo(frontX, wy - wr * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.figure;
  // Wheels, rim-lit so they read against the night street.
  for (const wx of [rearX, frontX]) {
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.ground;
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.figure;
    ctx.save();
    ctx.strokeStyle = pal.accentCyan;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(2, wr * 0.07);
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.98, -0.6, 1.2);
    ctx.stroke();
    ctx.strokeStyle = pal.accentPink;
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.98, Math.PI - 1.1, Math.PI + 0.7);
    ctx.stroke();
    ctx.restore();
  }
  // Frame + tank + seat.
  ctx.strokeStyle = pal.figure;
  ctx.lineCap = 'round';
  ctx.lineWidth = wr * 0.28;
  ctx.beginPath();
  ctx.moveTo(rearX, wy);
  ctx.lineTo(r.x + r.w * 0.44, r.y + sh * 0.72);
  ctx.lineTo(frontX, wy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r.x + r.w * 0.44, r.y + sh * 0.72);
  ctx.lineTo(r.x + r.w * 0.6, r.y + sh * 0.66);
  ctx.stroke();
  ctx.fillStyle = pal.figure;
  ctx.beginPath();
  ctx.ellipse(r.x + r.w * 0.56, r.y + sh * 0.665, r.w * 0.09, sh * 0.028, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Tank highlight + headlamp dot.
  ctx.strokeStyle = pal.accentPink;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = Math.max(2, wr * 0.08);
  ctx.beginPath();
  ctx.ellipse(r.x + r.w * 0.56, r.y + sh * 0.665, r.w * 0.09, sh * 0.028, -0.15, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(frontX + wr * 0.28, wy - wr * 0.62, wr * 0.14, 0, Math.PI * 2);
  ctx.fill();
  // Handlebar + front fork.
  ctx.strokeStyle = pal.figure;
  ctx.lineWidth = wr * 0.16;
  ctx.beginPath();
  ctx.moveTo(frontX, wy);
  ctx.lineTo(r.x + r.w * 0.68, r.y + sh * 0.62);
  ctx.stroke();
  // Rider: leaning torso, helmet with cyan visor.
  const hipX = r.x + r.w * 0.42, hipY = r.y + sh * 0.68;
  const shX = r.x + r.w * 0.6, shY = r.y + sh * 0.42;
  ctx.lineWidth = sh * 0.075;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.quadraticCurveTo(r.x + r.w * 0.48, r.y + sh * 0.55, shX, shY);
  ctx.stroke();
  // Arms reaching to the bars.
  ctx.lineWidth = sh * 0.045;
  ctx.beginPath();
  ctx.moveTo(shX, shY + sh * 0.02);
  ctx.lineTo(r.x + r.w * 0.68, r.y + sh * 0.62);
  ctx.stroke();
  // Legs: thigh to peg, shin down.
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(r.x + r.w * 0.55, r.y + sh * 0.74);
  ctx.lineTo(r.x + r.w * 0.5, r.y + sh * 0.84);
  ctx.stroke();
  // Helmet.
  const hx = r.x + r.w * 0.63, hy = r.y + sh * 0.33, hr = sh * 0.062;
  ctx.fillStyle = pal.figure;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  // Cyan visor.
  ctx.strokeStyle = pal.accentCyan;
  ctx.shadowColor = pal.accentCyan;
  ctx.shadowBlur = r.w * 0.02;
  ctx.lineWidth = Math.max(3, r.w * 0.008);
  ctx.beginPath();
  ctx.arc(hx, hy, hr * 0.72, -0.7, 0.75);
  ctx.stroke();
  // Pink rim light along the rider's back + helmet.
  ctx.strokeStyle = pal.rimHot;
  ctx.shadowColor = pal.rim;
  ctx.shadowBlur = r.w * 0.025;
  ctx.lineWidth = Math.max(3, r.w * 0.009);
  ctx.beginPath();
  ctx.arc(hx, hy, hr, Math.PI * 0.7, Math.PI * 1.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hipX - r.h * 0.03, hipY);
  ctx.quadraticCurveTo(r.x + r.w * 0.44, r.y + r.h * 0.55, shX - r.h * 0.035, shY);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function paintHeroHeist(ctx, r, pal, seed = 127, safe = 1) {
  clipRect(ctx, r);
  fillSky(ctx, r, pal);
  const sh = r.h * safe; // stage height: the crew stays above the title scrim
  const sunX = r.x + r.w * 0.5, sunY = r.y + sh * 0.34, sunR = r.w * 0.19;
  drawStripedSun(ctx, sunX, sunY, sunR, pal, pal.sky, r.y, r.h);
  drawBirds(ctx, r, seed + 2, pal.near);
  const horizon = r.y + sh * 0.62;
  drawSkyline(ctx, r, horizon, pal.far, seed + 4, sh * 0.05, sh * 0.16, false, pal);
  ctx.fillStyle = pal.ground;
  ctx.fillRect(r.x, horizon, r.w, r.y + r.h - horizon);
  // Sunset haze hugging the ground so the crew reads against it.
  const haze = ctx.createLinearGradient(0, horizon - sh * 0.1, 0, horizon + sh * 0.22);
  haze.addColorStop(0, 'rgba(255,150,90,0)');
  haze.addColorStop(0.45, 'rgba(255,150,90,0.20)');
  haze.addColorStop(1, 'rgba(255,150,90,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(r.x, horizon - sh * 0.1, r.w, sh * 0.32);
  drawPalm(ctx, r.x + r.w * 0.04, r.y + sh * 0.7, sh * 0.4, 0.3, pal.palm);
  drawPalm(ctx, r.x + r.w * 0.96, r.y + sh * 0.7, sh * 0.36, -0.3, pal.palm);
  // Long sunset shadows.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(r.x + r.w * 0.2, r.y + sh * 0.9);
  ctx.lineTo(r.x + r.w * 0.85, r.y + sh * 0.9);
  ctx.lineTo(r.x + r.w * 0.95, r.y + sh);
  ctx.lineTo(r.x + r.w * 0.1, r.y + sh);
  ctx.closePath();
  ctx.fill();
  // Getaway car + two figures, drawn a tone lighter than the ground so the
  // silhouettes separate from it, with a warm roofline rim on the car.
  drawCar(ctx, r.x + r.w * 0.1, r.y + sh * 0.9, r.w * 0.8, sh * 0.14, pal.near, pal.accentCyan, pal.rimHot);
  drawFigure(ctx, r.x + r.w * 0.22, r.y + sh * 0.92, sh * 0.34, pal.figureHi, { lean: -0.06 });
  drawFigure(ctx, r.x + r.w * 0.82, r.y + sh * 0.92, sh * 0.36, pal.figureHi, { lean: 0.05 });
  // Warm rim on the figures' sun side.
  ctx.strokeStyle = pal.rimHot;
  ctx.shadowColor = pal.rim;
  ctx.shadowBlur = r.w * 0.02;
  ctx.lineWidth = Math.max(2.5, r.w * 0.008);
  for (const [fx, fy, fh] of [[0.22, 0.92, 0.34], [0.82, 0.92, 0.36]]) {
    ctx.beginPath();
    ctx.arc(r.x + r.w * fx, r.y + sh * fy - fh * sh * 0.9, sh * fh * 0.075, -0.8, 0.9);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Scene registry: id -> { name, paint, hero }.
export const SCENES = {
  portrait: { name: 'Boulevard Queen', paint: paintHeroPortrait, hero: true },
  rider: { name: 'Midnight Run', paint: paintHeroRider, hero: true },
  heist: { name: 'Sunset Heist', paint: paintHeroHeist, hero: true },
  skyline: { name: 'Coastal Skyline', paint: paintSkylineCoast, hero: false },
  palmsun: { name: 'Palm Sun', paint: paintPalmSun, hero: false },
  boulevard: { name: 'Palm Boulevard', paint: paintBoulevard, hero: false },
  beach: { name: 'Beach Pier', paint: paintBeachPier, hero: false },
  neonstreet: { name: 'Neon Street', paint: paintNeonStreet, hero: false },
};
export const HERO_SCENES = ['portrait', 'rider', 'heist'];
export const SUPPORT_SCENES = ['boulevard', 'palmsun', 'skyline', 'beach', 'neonstreet'];
