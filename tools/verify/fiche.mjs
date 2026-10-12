// What the fiche and the services let a partner say.
//
//   BASE=http://localhost:3210 node tools/verify/fiche.mjs
//
// Four claims the LYFE review of 12 October turned into rules, and all
// four are about *closing* something that was open:
//
//   1  « Catégorie » is a list of ten and an « Autre », not a sentence.
//      Free text could not be grouped — « Restaurant gastronomique »,
//      « gastro » and « Gastronomique » are three strings and one
//      answer — and « Autre » carries the venue's own line, because a
//      city has places none of the ten describe;
//   2  the photos are one « Photo principale », clearly apart, then a
//      carousel of five at most, and the ceiling is said on the screen
//      as well as enforced on upload;
//   3  the carte is the item list plus one optional PDF. The
//      photographs of pages are gone: an unsearchable second copy of
//      the list above it;
//   4  a service is added by naming which one it is, and its hours come
//      with the name — « Petit-déjeuner » is 7h30 to 11h00.
//
// Needs the portal on BASE with a seeded database. It reads and it
// clicks; it saves nothing.
import { chromiumOrExplain } from "./browser.mjs";
import { LOT, signIn } from "./lot.mjs";

// Lot 1 only, and said the way `handshake.mjs` says it.
//
// Three of the four claims are Lot 1's shape rather than the product's:
// Lot 2's Ma fiche carries two more tabs, and its « Ajouter un service »
// is still the ten-field form with the pacing in it — a preset would be
// a Lot 1 answer to a Lot 2 question. The category's closed list is the
// one claim that holds in both, and it is cheaper to run this whole
// tool in one lot than to split it.
if (LOT !== 1) {
  console.log(
    "La fiche éprouve la surface du lot 1 : la catégorie fermée, le " +
      "plafond des photos, la carte en un PDF, les trois préréglages de service.",
  );
  console.log("Relancer avec LYFE_LOT=1, serveur compris.");
  process.exit(0);
}
const chromium = await chromiumOrExplain();
const BASE = process.env.BASE ?? "http://localhost:3280";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR" });
const page = await ctx.newPage();
const say = (ok, what, detail = "") =>
  console.log(`  ${ok ? "ok  " : "✗   "} ${what}${detail ? ` · ${detail}` : ""}`);
let bad = 0;
const check = (ok, what, detail) => { if (!ok) bad++; say(ok, what, detail); };

await signIn(page, BASE);

// ── Ma fiche · Identité : la catégorie est une liste fermée ──
await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1600);
const cat = await page.evaluate(() => {
  const labels = [...document.querySelectorAll("label")];
  const lab = labels.find((l) => (l.textContent || "").trim().startsWith("Catégorie"));
  const field = lab?.parentElement?.querySelector("select, input");
  return {
    tag: field?.tagName.toLowerCase() ?? "none",
    options: field && field.tagName === "SELECT"
      ? [...field.querySelectorAll("option")].map((o) => o.textContent.trim())
      : [],
    value: field?.value ?? "",
    other: labels.some((l) => (l.textContent || "").trim().startsWith("Précisez")),
  };
});
check(cat.tag === "select", "Catégorie est un select", cat.tag);
check(cat.options.length === 12, "onze catégories et une invite", `${cat.options.length} options`);
check(cat.options.includes("Salon de thé") && cat.options.includes("Autre"),
  "la liste porte les dix plus Autre", cat.options.slice(1, 4).join(" · "));
check(cat.value === "restaurant_gastronomique", "la fiche de Dar Zellij est renseignée", cat.value);
check(!cat.other, "« Précisez » ne s'affiche que sur Autre", "absent");
// Autre fait apparaître la ligne libre.
await page.selectOption("select", { value: "autre" }).catch(() => {});
await page.waitForTimeout(600);
const afterAutre = await page.evaluate(() =>
  [...document.querySelectorAll("label")].some((l) => (l.textContent || "").trim().startsWith("Précisez")),
);
check(afterAutre, "Autre fait apparaître la précision libre");

// ── Ma fiche · Photos ──
await page.goto(`${BASE}/restaurant/ma-fiche`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.locator('button:has-text("Photos")').first().click();
await page.waitForTimeout(1400);
const photos = await page.evaluate(() => {
  const text = (document.querySelector("main")?.textContent || "").replace(/\s+/g, " ");
  return {
    principale: /Photo principale/.test(text),
    carrousel: /Carrousel/.test(text),
    limite: /sur 6|sur 5/.test(text),
    text: text.slice(0, 220),
  };
});
check(photos.principale, "la couverture s'appelle Photo principale");
check(photos.carrousel, "le carrousel a son propre intertitre");
check(photos.limite, "la limite est dite", photos.text.match(/\d+ sur \d+/)?.[0] ?? "absente");

// ── Ma fiche · Menu : un PDF, pas d'images ──
await page.locator('button:has-text("Menu")').first().click();
await page.waitForTimeout(1400);
const menu = await page.evaluate(() => {
  const text = (document.querySelector("main")?.textContent || "").replace(/\s+/g, " ");
  const input = document.querySelector('input[type="file"]');
  return { accept: input?.getAttribute("accept") ?? "", pdfOnly: /PDF · max/.test(text), text };
});
check(menu.accept === "application/pdf", "le sélecteur de fichier n'accepte que le PDF", menu.accept);
check(!/photos de ses pages|jusqu'à 10/.test(menu.text), "plus de promesse d'images de pages");
check(/1 sur 1|0 sur 1/.test(menu.text), "une seule carte", menu.text.match(/\d+ sur \d+/)?.[0] ?? "—");

// ── Disponibilités : le préréglage Petit-déjeuner ──
await page.goto(`${BASE}/restaurant/disponibilites`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1600);
await page.locator('button:has-text("Ajouter un service")').first().click();
await page.waitForTimeout(1200);
const presets = await page.evaluate(() => {
  const select = [...document.querySelectorAll("select")].find((s) =>
    [...s.options].some((o) => /Petit-déjeuner/.test(o.textContent || "")),
  );
  return {
    options: select ? [...select.options].map((o) => o.textContent.trim()) : [],
    fields: [...document.querySelectorAll("form label")].map((l) => l.textContent.trim().replace(/\s*\*$/, "")),
  };
});
check(presets.options.some((o) => /Petit-déjeuner · 7h30 – 11h00/.test(o)),
  "Petit-déjeuner est un préréglage de 7h30 à 11h00", presets.options.join(" | "));
check(presets.options.length === 3, "trois préréglages", `${presets.options.length}`);
check(presets.fields.includes("Jours") && presets.fields.includes("Capacité"),
  "les jours et la capacité restent demandés", presets.fields.join(" · "));

console.log(
  bad === 0
    ? "\nLa fiche et les services tiennent leurs listes."
    : `\n${bad} problème(s)`,
);
await browser.close();
process.exit(bad === 0 ? 0 : 1);
