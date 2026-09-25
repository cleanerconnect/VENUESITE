// Turns the tape-measure output into the audit's tables.
//
//   node tools/verify/_design-report.mjs            # both widths
//   node tools/verify/_design-report.mjs type       # one section
//
// The scale, the type ceiling and the contrast thresholds are the
// brief's, written once here so a number in the report and a number in
// a judgement cannot drift apart.

import { readFileSync } from "node:fs";

/** The rhythm allowed inside a screen. 0 is flush, which is not a gap. */
const SCALE = new Set([0, 4, 8, 12, 16, 24, 32, 48, 64]);
/** A dashboard needs at most this many sizes and weights. */
const TYPE_CEILING = { sizes: 6, weights: 3 };

const widths = process.argv.includes("--1440")
  ? [1440]
  : process.argv.includes("--390")
    ? [390]
    : [1440, 390];
const only = process.argv.find((a) => !a.startsWith("-") && a.endsWith(".mjs") === false && /^[a-z]+$/.test(a));

// `DIR=after` reads the post-fix measurement, so the same tables can be
// printed for both sides of the audit and compared line for line.
const PREFIX = process.env.DIR ? `${process.env.DIR}-` : "";
const load = (w) => JSON.parse(readFileSync(`scratch/design/${PREFIX}${w}/measures.json`, "utf8"));

const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

for (const w of widths) {
  const data = load(w);
  console.log(`\n${"═".repeat(78)}\n  ${w} px\n${"═".repeat(78)}`);

  // ── type ──────────────────────────────────────────────────
  if (!only || only === "type") {
    const sizes = new Set();
    const weights = new Set();
    const lineHeights = new Map();
    const tracking = new Set();
    const caps = [];
    for (const [slug, s] of Object.entries(data)) {
      for (const t of s.type) {
        sizes.add(t.size);
        weights.add(t.weight);
        const key = `${t.size}/${t.lineHeight}`;
        lineHeights.set(key, (lineHeights.get(key) ?? 0) + t.count);
        if (t.letterSpacing !== "normal" && t.letterSpacing !== "0px") tracking.add(`${t.size}px ${t.letterSpacing}`);
        if (t.transform === "uppercase") caps.push(`${slug}: ${t.size}px/${t.letterSpacing} “${t.samples[0] ?? ""}”`);
      }
    }
    console.log(`\n── Type ──`);
    console.log(`  tailles   ${[...sizes].sort((a, b) => b - a).join(", ")}  → ${sizes.size} (plafond ${TYPE_CEILING.sizes})`);
    console.log(`  graisses  ${[...weights].sort((a, b) => a - b).join(", ")}  → ${weights.size} (plafond ${TYPE_CEILING.weights})`);
    console.log(`  interlettrage non nul : ${[...tracking].sort().join(" · ") || "aucun"}`);
    console.log(`  capitales : ${caps.length ? caps.join("\n              ") : "aucune"}`);
    // Line-height bands
    const bad = [];
    for (const [key, count] of lineHeights) {
      const [size, lh] = key.split("/");
      if (lh === "normal") { bad.push(`${key} (×${count}) — pas de valeur`); continue; }
      const n = Number(lh);
      const s = Number(size);
      const heading = s >= 18;
      const numeral = s >= 22;
      const ok = numeral ? n <= 1.2 : heading ? n >= 1.2 && n <= 1.3 : n >= 1.45 && n <= 1.55;
      if (!ok) bad.push(`${size}px → ${lh} (×${count})`);
    }
    console.log(`  interlignes hors bande : ${bad.length ? "\n    " + bad.join("\n    ") : "aucun"}`);
    console.log(`\n  par écran :`);
    for (const [slug, s] of Object.entries(data)) {
      const ss = new Set(s.type.map((t) => t.size));
      const ws = new Set(s.type.map((t) => t.weight));
      console.log(`    ${pad(s.name, 15)} ${rpad(ss.size, 2)} tailles ${rpad(ws.size, 2)} graisses  ${[...ss].sort((a, b) => b - a).join(" ")}`);
    }
    // Line length
    console.log(`\n  plus longue ligne par écran (caractères, seuil 75) :`);
    for (const [slug, s] of Object.entries(data)) {
      const worst = s.paragraphs[0];
      if (!worst) { console.log(`    ${pad(s.name, 15)} —`); continue; }
      const flag = worst.perLine > 75 ? " ✗" : "";
      console.log(`    ${pad(s.name, 15)} ${rpad(worst.perLine, 3)} car/ligne  ${rpad(worst.width, 4)}px  ${worst.size}px${flag}  “${worst.sample.slice(0, 44)}”`);
    }
  }

  // ── rhythm ────────────────────────────────────────────────
  if (!only || only === "rhythm") {
    console.log(`\n── Rythme ──`);
    let total = 0;
    let off = 0;
    for (const [slug, s] of Object.entries(data)) {
      const offs = s.gaps.filter((g) => !SCALE.has(Math.abs(g.gap)));
      total += s.gaps.length;
      off += offs.length;
      const grouped = new Map();
      for (const g of offs) grouped.set(g.gap, (grouped.get(g.gap) ?? 0) + 1);
      const summary = [...grouped.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}px×${n}`).join(" ");
      console.log(`    ${pad(s.name, 15)} ${rpad(offs.length, 3)}/${rpad(s.gaps.length, 3)} hors gamme  ${summary}`);
    }
    console.log(`    ${pad("TOTAL", 15)} ${rpad(off, 3)}/${rpad(total, 3)}`);
    console.log(`\n  le détail des écarts hors gamme :`);
    for (const [slug, s] of Object.entries(data)) {
      const offs = s.gaps.filter((g) => !SCALE.has(Math.abs(g.gap)));
      if (!offs.length) continue;
      console.log(`\n    ${s.name}`);
      const seen = new Set();
      for (const g of offs) {
        const key = `${g.gap}|${g.from.slice(0, 30)}|${g.to.slice(0, 30)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        console.log(`      ${rpad(g.gap, 4)}px  ${g.from.slice(0, 46)}  →  ${g.to.slice(0, 46)}`);
      }
    }
  }

  // ── layout ────────────────────────────────────────────────
  if (!only || only === "layout") {
    console.log(`\n── Mise en page ──`);
    for (const [slug, s] of Object.entries(data)) {
      const sideways = s.scroll.width - s.scroll.client;
      console.log(
        `    ${pad(s.name, 15)} main ${rpad(s.main.width, 4)}px (max ${pad(s.main.maxWidth, 8)}) ` +
          `marge g. ${rpad(s.main.left, 4)} pad ${pad(s.main.padding, 16)} ` +
          `${rpad(s.cards.length, 2)} cartes  ${rpad(s.words, 4)} mots` +
          (sideways > 2 ? `  ✗ déborde de ${sideways}px` : ""),
      );
    }
    console.log(`\n  lignes verticales (bords gauches les plus peuplés) :`);
    for (const [slug, s] of Object.entries(data)) {
      console.log(`    ${pad(s.name, 15)} ${s.edges.map(([x, n]) => `${x}px×${n}`).join("  ")}`);
    }
    console.log(`\n  mots de prose par écran (seuil 40, données exclues) :`);
    for (const [, s] of Object.entries(data)) {
      const n = s.prose?.words ?? 0;
      console.log(`    ${pad(s.name, 15)} ${rpad(n, 4)} mots${n > 40 ? " ✗" : ""}  ${rpad(s.prose?.strings.length ?? 0, 3)} chaînes`);
    }
    console.log(`\n  cartes dont le contenu est une seule liste ou un seul formulaire :`);
    for (const [slug, s] of Object.entries(data)) {
      for (const c of s.cards) {
        if ((c.lists === 1 && c.fields === 0) || (c.fields > 0 && c.lists === 0 && c.children <= 2)) {
          console.log(`    ${pad(s.name, 15)} ${rpad(c.w, 4)}×${rpad(c.h, 4)} pad ${pad(c.padding, 14)} ${c.lists} liste ${c.fields} champs  ${c.el.slice(0, 50)}`);
        }
      }
    }
  }

  // ── controls ──────────────────────────────────────────────
  if (!only || only === "controls") {
    console.log(`\n── Commandes ──`);
    const floor = w <= 480 ? 44 : 36;
    for (const [slug, s] of Object.entries(data)) {
      const small = s.controls.filter((c) => Math.min(c.w, c.h) < floor);
      const heights = new Map();
      for (const c of s.controls) heights.set(c.h, (heights.get(c.h) ?? 0) + 1);
      console.log(
        `    ${pad(s.name, 15)} ${rpad(s.controls.length, 3)} commandes · ` +
          `${rpad(small.length, 2)} sous ${floor}px · hauteurs ${[...heights.keys()].sort((a, b) => a - b).join(",")}`,
      );
      for (const c of small.slice(0, 6)) {
        console.log(`        ${rpad(c.w, 3)}×${rpad(c.h, 3)}  ${c.el.slice(0, 58)}`);
      }
    }
  }

  // ── contrast ──────────────────────────────────────────────
  if (!only || only === "contrast") {
    console.log(`\n── Contraste ──`);
    for (const [slug, s] of Object.entries(data)) {
      if (!s.contrast.length) { console.log(`    ${pad(s.name, 15)} conforme`); continue; }
      for (const c of s.contrast) {
        console.log(`    ${pad(s.name, 15)} ${c.got}:1 (exigé ${c.need}) ${c.size}px/${c.weight}  ${c.color} sur ${c.background}  ${c.el.slice(0, 44)}`);
      }
    }
  }
}
