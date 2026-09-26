// The type scale cannot drift from the merge that lets it through.
//
//   node tools/verify/scale.mjs
//
// Two lists have to agree: the `.text-…` steps declared in globals.css,
// and `TYPE_UTILITIES` in `src/lib/utils/cn.ts`, which is what puts
// them in tailwind-merge's font-size group. A step missing from the
// second list still exists, still shows in the styleguide, and is still
// silently dropped from every `cn()` that also sets a text colour — so
// the screen renders at the browser's default and the source looks
// right. That is a bug no screenshot review catches, so it is a build
// failure instead.
//
// It also counts the steps. The audit's ceiling is six sizes and three
// weights on one screen; the declaration can carry more, because the
// two densities and the metric tiles use different subsets, but a
// growing list is the thing to look at first when a screen goes over.

import { readFileSync } from "node:fs";

const css = readFileSync("src/app/globals.css", "utf8");
const ts = readFileSync("src/lib/utils/cn.ts", "utf8");

// Two ways a step is declared: a `.text-…` rule, and a `--text-…`
// token inside `@theme`, which Tailwind turns into a utility for free.
const declared = [
  ...new Set([
    ...[...css.matchAll(/^\.text-([a-z0-9-]+)\s*\{/gm)].map((m) => m[1]),
    ...[...css.matchAll(/^\s*--text-([a-z0-9-]+):/gm)].map((m) => m[1]),
  ]),
].sort();

const listed = [
  ...new Set(
    [...ts.matchAll(/^\s*"([a-z0-9-]+)",$/gm)].map((m) => m[1]),
  ),
].sort();

const missing = declared.filter((n) => !listed.includes(n));
const extra = listed.filter((n) => !declared.includes(n));

// The sizes and weights each step sets, for the count.
const steps = [...css.matchAll(/^\.text-([a-z0-9-]+)\s*\{([^}]*)\}/gm)].map(
  ([, name, body]) => ({
    name,
    size: /font-size:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? "—",
    weight: /font-weight:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? "hérité",
  }),
);

console.log(`  ${declared.length} pas déclarés dans globals.css`);
for (const s of steps) {
  console.log(`    .text-${s.name.padEnd(12)} ${s.size.padStart(6)}  ${s.weight}`);
}
const sizes = new Set(steps.map((s) => s.size).filter((s) => s !== "—"));
const weights = new Set(steps.map((s) => s.weight).filter((w) => w !== "hérité"));
console.log(`  ${sizes.size} tailles · ${weights.size} graisses déclarées`);

let bad = 0;
if (missing.length) {
  bad += missing.length;
  console.log(
    `\n  ✗ absents de TYPE_UTILITIES dans src/lib/utils/cn.ts — tailwind-merge\n` +
      `    les lit comme des couleurs et les supprime de tout cn() qui pose\n` +
      `    aussi une couleur de texte :\n` +
      missing.map((n) => `      .text-${n}`).join("\n"),
  );
}
if (extra.length) {
  bad += extra.length;
  console.log(
    `\n  ✗ listés dans cn.ts mais absents de globals.css : ${extra.join(", ")}`,
  );
}
if (!bad) console.log(`\n  ✓ les deux listes s'accordent`);
process.exit(bad ? 1 : 0);
