// SVG path data → Figma `vectorPaths` data.
//
// Figma's vector path parser takes M, L, C, Q and Z only: no arcs, no
// shorthands, no implicit relative forms. Lucide draws with `a`, and with
// <circle>, <line>, <polyline> and <rect> elements besides. This converts
// all of it to absolute M/L/C/Z and scales it to the size the tile uses.

const N = (v) => Math.round(v * 1000) / 1000;

// ── a tokenising path parser ────────────────────────────────────────
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

function* commands(d) {
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?)/gi;
  let cmd = null, nums = [], m;
  const flush = () => {
    if (!cmd) return;
    const want = ARGS[cmd.toUpperCase()];
    if (want === 0) return [[cmd, []]];
    const runs = [];
    for (let i = 0; i < nums.length; i += want) runs.push([cmd, nums.slice(i, i + want)]);
    // After a moveto, further coordinate pairs are an implicit lineto —
    // `m12 14 4-4` is a move and a line, not two moves. Reading them as
    // moves drew the gauge needle and the check mark as single points.
    if (cmd === "M") for (let i = 1; i < runs.length; i++) runs[i][0] = "L";
    if (cmd === "m") for (let i = 1; i < runs.length; i++) runs[i][0] = "l";
    return runs;
  };
  const out = [];
  while ((m = re.exec(d))) {
    if (m[1]) {
      const runs = flush();
      if (runs) out.push(...runs);
      cmd = m[1];
      nums = [];
      if (ARGS[cmd.toUpperCase()] === 0) { out.push([cmd, []]); cmd = null; }
    } else nums.push(parseFloat(m[2]));
  }
  const runs = flush();
  if (runs) out.push(...runs);
  yield* out;
}

// ── arc → cubics, the usual endpoint-to-centre parameterisation ─────
function arcToCubics(x1, y1, rx, ry, phi, large, sweep, x2, y2) {
  if (rx === 0 || ry === 0) return [["L", [x2, y2]]];
  const rad = (phi * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
  const x1p = cos * dx2 + sin * dy2;
  const y1p = -sin * dx2 + cos * dy2;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
  const sign = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const d = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    const a = Math.acos(Math.min(1, Math.max(-1, d)));
    return ux * vy - uy * vx < 0 ? -a : a;
  };
  const theta = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(delta / (Math.PI / 2)));
  const step = delta / segs;
  const k = (4 / 3) * Math.tan(step / 4);
  const out = [];
  let th = theta;
  for (let i = 0; i < segs; i++) {
    const c1 = Math.cos(th), s1 = Math.sin(th);
    const th2 = th + step;
    const c2 = Math.cos(th2), s2 = Math.sin(th2);
    const p = (c, s) => [
      cos * rx * c - sin * ry * s + cx,
      sin * rx * c + cos * ry * s + cy,
    ];
    const [sx, sy] = p(c1, s1);
    const [ex, ey] = p(c2, s2);
    const [d1x, d1y] = [-rx * s1, ry * c1];
    const [d2x, d2y] = [-rx * s2, ry * c2];
    const rot = (dx, dy) => [cos * dx - sin * dy, sin * dx + cos * dy];
    const [t1x, t1y] = rot(d1x, d1y);
    const [t2x, t2y] = rot(d2x, d2y);
    out.push(["C", [sx + k * t1x, sy + k * t1y, ex - k * t2x, ey - k * t2y, ex, ey]]);
    th = th2;
  }
  return out;
}

export function flatten(d) {
  let x = 0, y = 0, sx = 0, sy = 0;
  let px = null, py = null; // last cubic control, for S
  let qx = null, qy = null; // last quad control, for T
  const out = [];
  for (const [raw, a] of commands(d)) {
    const rel = raw === raw.toLowerCase() && raw !== "Z" && raw !== "z";
    const C = raw.toUpperCase();
    const ax = (i) => (rel ? x + a[i] : a[i]);
    const ay = (i) => (rel ? y + a[i] : a[i]);
    if (C === "M") { x = ax(0); y = ay(1); sx = x; sy = y; out.push(["M", [x, y]]); px = py = qx = qy = null; }
    else if (C === "L") { x = ax(0); y = ay(1); out.push(["L", [x, y]]); px = py = qx = qy = null; }
    else if (C === "H") { x = rel ? x + a[0] : a[0]; out.push(["L", [x, y]]); px = py = qx = qy = null; }
    else if (C === "V") { y = rel ? y + a[0] : a[0]; out.push(["L", [x, y]]); px = py = qx = qy = null; }
    else if (C === "C") {
      const c = [ax(0), ay(1), ax(2), ay(3), ax(4), ay(5)];
      out.push(["C", c]); px = c[2]; py = c[3]; x = c[4]; y = c[5]; qx = qy = null;
    } else if (C === "S") {
      const r1x = px === null ? x : 2 * x - px, r1y = py === null ? y : 2 * y - py;
      const c = [r1x, r1y, ax(0), ay(1), ax(2), ay(3)];
      out.push(["C", c]); px = c[2]; py = c[3]; x = c[4]; y = c[5]; qx = qy = null;
    } else if (C === "Q") {
      const c = [ax(0), ay(1), ax(2), ay(3)];
      out.push(["Q", c]); qx = c[0]; qy = c[1]; x = c[2]; y = c[3]; px = py = null;
    } else if (C === "T") {
      const r1x = qx === null ? x : 2 * x - qx, r1y = qy === null ? y : 2 * y - qy;
      const c = [r1x, r1y, ax(0), ay(1)];
      out.push(["Q", c]); qx = c[0]; qy = c[1]; x = c[2]; y = c[3]; px = py = null;
    } else if (C === "A") {
      const ex = rel ? x + a[5] : a[5], ey = rel ? y + a[6] : a[6];
      out.push(...arcToCubics(x, y, a[0], a[1], a[2], !!a[3], !!a[4], ex, ey));
      x = ex; y = ey; px = py = qx = qy = null;
    } else if (C === "Z") { out.push(["Z", []]); x = sx; y = sy; px = py = qx = qy = null; }
  }
  return out;
}

// ── the non-path elements lucide also uses ──────────────────────────
const K = 0.5522847498307936;
export function shapeToPath(s) {
  if (s.tag === "path") return flatten(s.d);
  if (s.tag === "line") return [["M", [+s.x1, +s.y1]], ["L", [+s.x2, +s.y2]]];
  if (s.tag === "polyline" || s.tag === "polygon") {
    const nums = s.points.trim().split(/[\s,]+/).map(Number);
    const seq = [];
    for (let i = 0; i < nums.length; i += 2) seq.push([i === 0 ? "M" : "L", [nums[i], nums[i + 1]]]);
    if (s.tag === "polygon") seq.push(["Z", []]);
    return seq;
  }
  if (s.tag === "circle" || s.tag === "ellipse") {
    const cx = +s.cx, cy = +s.cy;
    const rx = s.r != null ? +s.r : +s.rx, ry = s.r != null ? +s.r : +s.ry;
    const ox = rx * K, oy = ry * K;
    return [
      ["M", [cx + rx, cy]],
      ["C", [cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry]],
      ["C", [cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy]],
      ["C", [cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry]],
      ["C", [cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy]],
      ["Z", []],
    ];
  }
  if (s.tag === "rect") {
    const x = +s.x, y = +s.y, w = +s.width, h = +s.height, r = s.rx ? +s.rx : 0;
    if (!r) return [["M", [x, y]], ["L", [x + w, y]], ["L", [x + w, y + h]], ["L", [x, y + h]], ["Z", []]];
    const o = r * K;
    return [
      ["M", [x + r, y]], ["L", [x + w - r, y]],
      ["C", [x + w - r + o, y, x + w, y + r - o, x + w, y + r]],
      ["L", [x + w, y + h - r]],
      ["C", [x + w, y + h - r + o, x + w - r + o, y + h, x + w - r, y + h]],
      ["L", [x + r, y + h]],
      ["C", [x + r - o, y + h, x, y + h - r + o, x, y + h - r]],
      ["L", [x, y + r]],
      ["C", [x, y + r - o, x + r - o, y, x + r, y]],
      ["Z", []],
    ];
  }
  throw new Error(`shape ${s.tag}`);
}

export function render(seq, scale) {
  return seq
    .map(([c, a]) => (c === "Z" ? "Z" : `${c} ${a.map((v) => N(v * scale)).join(" ")}`))
    .join(" ");
}
