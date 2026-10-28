// Walks the partial payment, from the tier editor to what the client reads.
//
//   node tools/verify/paiement.mjs
//   W=390 H=844 node tools/verify/paiement.mjs
//   SHOTS=docs/lot2-reference node tools/verify/paiement.mjs
//
// `Détail Sprint ` ligne 45 — « En tant qu'organisateur je dois pouvoir
// paramétrer le montant a payer sur l'appli et le montant à payer sur
// place pour les evenement à paiment partiel » — and ligne 54, which
// says what the first is for: « pour un évènement particulier ou seul
// le tarif partiel est à payer sur l'appli, je dois avoir
// l'information sur le complément à payer au niveau de l'ecran de
// reservation ».
//
// Three amounts, and only two of them are stored. The whole of this
// tool is about the third: « Reste à payer sur place » is the
// subtraction of the other two, computed wherever it is shown, and the
// failure it exists to catch is the three disagreeing — a remainder
// that kept its old value after the total moved, a message promising
// 300 MAD over a tier that now owes 150.
//
// It reads only: the wizard is a draft in the browser, and nothing here
// is submitted.

import { chromiumOrExplain } from "./browser.mjs";
import { mkdirSync } from "node:fs";
import { LOT, LOT_LABEL, clockLine, signIn } from "./lot.mjs";

const chromium = await chromiumOrExplain();

const BASE = process.env.BASE ?? "http://localhost:3210";
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 1000);
const shots = process.env.SHOTS;
const tag = width <= 480 ? "390" : "1440";
if (shots) mkdirSync(shots, { recursive: true });

// Lot 1 does not register the event workspace, so there is no editor to
// walk and no detail to read. Said rather than failed.
if (LOT !== 2) {
  console.log(
    "\nLe paiement partiel est un écran de l'espace organisateur, que le lot 1 n'enregistre pas.",
  );
  console.log("  LYFE_LOT=2 des deux côtés — le serveur et cet outil.\n");
  process.exit(0);
}

const ACCOUNT = process.env.ACCOUNT ?? "mido@jazzablanca.com";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width, height } });

const problems = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  if (/favicon|preload|Download the React|openstreetmap/i.test(text)) return;
  problems.push(`console: ${text.slice(0, 140)}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "✗   "} ${label}${detail ? ` · ${detail}` : ""}`);
  if (!ok) problems.push(label);
};

const shot = async (name) => {
  if (!shots) return;
  await page.screenshot({ path: `${shots}/paiement-${name}@${tag}.png`, fullPage: true });
};

/** « 1 200 MAD » → 1200. The portal groups thousands with a space. */
const amount = (text) => Number(String(text).replace(/[^\d]/g, ""));

console.log(`\nPaiement partiel · ${LOT_LABEL} · ${width}×${height} · ${clockLine()}\n`);

const session = await signIn(page, BASE, { email: ACCOUNT });
check(
  "la session de l'organisateur s'ouvre",
  typeof session === "string" && !session.includes("/login"),
  JSON.stringify(session),
);

// ── 1. The editor: the switch, and the three amounts it reveals ──
await page.goto(`${BASE}/events/new`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
// Step 2 of five. Reached by the wizard's own control, so a step that
// stopped being reachable is a failure here rather than a surprise.
const next = page.locator('button:visible', { hasText: /^Continuer/ }).first();
await next.click();
await page.waitForTimeout(1500);
check("l'étape des tarifs est ouverte", /Définissez vos tarifs/.test(await page.innerText("body")));

const block = page.locator("[data-partial-payment]");
check("le bloc est caché tant que l'interrupteur est fermé", (await block.count()) === 0);
await shot("1-ferme");

// The price first, so the proposed split has something to halve.
const total = page.getByLabel("Prix (vous recevez)").first();
await total.fill("1000");
await page.waitForTimeout(400);

// The switch is reached by its label, which is the stable handle:
// « Transfert autorisé » is the other one on this step.
const partial = page.getByText("Paiement partiel", { exact: true }).first();
check("l'interrupteur « Paiement partiel » est sur l'étape", (await partial.count()) > 0);
await partial.click();
await page.waitForTimeout(800);
check("l'interrupteur révèle le bloc", (await block.count()) === 1);
await shot("2-ouvert");

const labelled = (name) =>
  page.locator("[data-partial-payment]").getByLabel(name).first();

check(
  "les trois montants sont nommés",
  (await page.innerText("[data-partial-payment]")).includes("Montant payé sur l'application") &&
    (await page.innerText("[data-partial-payment]")).includes("Reste à payer sur place"),
);
check(
  "le total prend le nom de la ligne 45",
  (await page.innerText("body")).includes("Montant total du billet"),
);

// ── 2. The third amount is computed, and read-only ──
const rest = labelled("Reste à payer sur place");
check("« Reste à payer sur place » ne se saisit pas", await rest.getAttribute("readonly") !== null);
const app = labelled("Montant payé sur l'application");
check(
  "le bloc s'ouvre sur une proposition plutôt que sur zéro",
  amount(await app.inputValue()) > 0,
  await app.inputValue(),
);

const expectRest = async (totalMad, appMad) => {
  await page.getByLabel("Montant total du billet").first().fill(String(totalMad));
  await page.waitForTimeout(300);
  await app.fill(String(appMad));
  await page.waitForTimeout(500);
  return amount(await rest.inputValue());
};

check("1 000 − 300 = 700", (await expectRest(1000, 300)) === 700, String(await rest.inputValue()));
// The one that catches a stored remainder: move the total alone.
check("le total bouge, le reste suit", (await expectRest(1200, 300)) === 900, String(await rest.inputValue()));
check(
  "un montant supérieur au total ne rend pas un reste négatif",
  (await expectRest(500, 900)) === 0,
  String(await rest.inputValue()),
);
check(
  "et il est signalé",
  /dépasse le total du billet/.test(await page.innerText("[data-partial-payment]")),
);

// ── 3. The sentence the client reads — ligne 54 ──
await expectRest(1200, 400);
const message = labelled("Message affiché au client");
const generated = await message.inputValue();
check(
  "le message est prérempli à partir des montants",
  generated.includes("800"),
  generated,
);
check(
  "il est plafonné à 120 caractères",
  (await message.getAttribute("maxlength")) === "120",
  (await message.getAttribute("maxlength")) ?? "aucun",
);
// It follows the amounts while it is the generated one…
await expectRest(1200, 500);
check(
  "il suit les montants tant qu'il n'a pas été écrit",
  (await message.inputValue()).includes("700"),
  await message.inputValue(),
);
// …and stops the moment the organiser writes their own.
const own = "Le solde se règle en espèces au vestiaire.";
await message.fill(own);
await page.waitForTimeout(300);
await expectRest(1200, 200);
check(
  "une fois écrit, les montants n'y touchent plus",
  (await message.inputValue()) === own,
  await message.inputValue(),
);
await shot("3-message");

// ── 3 bis. The recap, and the picture of the booking screen ──
//
// The phone preview lives on step 5 — it is the recap's right-hand
// column — and it is a picture of the application's booking screen,
// which is exactly where ligne 54 asks for the sentence. So the walk
// goes there rather than asserting it on the step that writes it.
for (let i = 0; i < 3; i++) {
  await page.locator("button:visible", { hasText: /^Continuer/ }).first().click();
  await page.waitForTimeout(900);
}
check("le récapitulatif est ouvert", /Vérification finale/.test(await page.innerText("body")));
check(
  "l'aperçu téléphone montre la phrase au client",
  (await page.innerText("body")).includes(own),
);
check(
  "le récapitulatif porte les deux montants",
  /sur l'appli/.test(await page.innerText("body")) && /sur place/.test(await page.innerText("body")),
);
await shot("4-recapitulatif");

// ── 4. The two amounts on the tier row and on the event ──
//
// Seeded on Carré Or of the opening concert: the editor writes them,
// these two read them back.
await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const opening = page.locator('a[href^="/events/evt_jzb_robbie"]').first();
check("l'événement semé est dans la liste", (await opening.count()) > 0);
await page.goto(`${BASE}/events/evt_jzb_robbie`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const pill = page.locator("[data-partial-pill]");
check("le détail de l'événement porte les deux montants", (await pill.count()) > 0);
if (await pill.count()) {
  const text = await pill.first().innerText();
  check(
    "la pastille dit l'appli et la salle",
    /sur l'appli/.test(text) && /sur place/.test(text),
    text.replace(/\s+/g, " "),
  );
}
await shot("5-detail");

const row = page.locator("[data-tier-split]");
check("la ligne du tarif les porte aussi", (await row.count()) > 0);
if (await row.count()) {
  const text = (await row.first().innerText()).replace(/\s+/g, " ");
  // 400 on the application, 800 at the door, on a 1 200 MAD ticket.
  check("les deux montants sont ceux du tarif", /400/.test(text) && /800/.test(text), text);
}
await shot("6-tarifs");

await browser.close();

console.log(
  `\n${problems.length === 0 ? "Le paiement partiel tient." : `${problems.length} problème(s) :`}`,
);
for (const p of problems) console.log(`  · ${p}`);
console.log("");
process.exit(problems.length === 0 ? 0 : 1);
