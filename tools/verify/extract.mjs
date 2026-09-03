// Dumps the real rendered content of every route as JSON, so a Figma
// export can carry the portal's French copy and numbers verbatim instead
// of content invented at the keyboard.
//
// Two depths:
//
//   DEPTH=outline  (default)  headings, KPI labels, facets, actions.
//                             Enough to lay out a structural frame.
//                             → docs/phase6-screens.json
//
//   DEPTH=full                every table cell, list row, feed entry,
//                             metric value and delta, chart geometry,
//                             settings field value, calendar cell, empty
//                             state, plus the drawers and dialogs a route
//                             opens. A list row carries its avatar
//                             initials, its status pills *with their
//                             tone*, its trailing metric and its own
//                             actions — everything the row shows, not
//                             just its title.
//                             → docs/phase7-dar-zellij.json
//
//   node tools/verify/extract.mjs
//   DEPTH=full VENUE=res_dar_zellij OUT=docs/phase7-dar-zellij.json node tools/verify/extract.mjs
//   DEPTH=full SHOTS=docs/phase7-reference node tools/verify/extract.mjs
//
// Needs a server on BASE and `npm install --no-save playwright`.

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { ROUTES } from "../../src/lib/nav/routes.ts";

const BASE = process.env.BASE ?? "http://localhost:3210";
const DEPTH = process.env.DEPTH ?? "outline";
const OUT = process.env.OUT ?? (DEPTH === "full" ? "docs/phase7-dar-zellij.json" : "docs/phase6-screens.json");
const VENUE = process.env.VENUE ?? "";
const SHOTS = process.env.SHOTS ?? "";
const ACCOUNT = process.env.ACCOUNT ?? "yassine@darzellij.ma";
const ONLY = process.env.ONLY ?? "";

// ── Page-side extractors ───────────────────────────────────────────────
// Everything below runs inside the browser. Keep it dependency-free.

const OUTLINE = () => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const root = document.querySelector("main") || document.body;
  const seen = new Set();
  const tiles = [...root.querySelectorAll("div,section")]
    .filter((n) => {
      const eb = n.querySelector(":scope > div > .text-eyebrow, :scope > .text-eyebrow");
      const val = n.querySelector('[class*="text-metric"]');
      return eb && val && !seen.has(n);
    })
    .slice(0, 12)
    .map((n) => {
      seen.add(n);
      return {
        label: clean(n.querySelector(".text-eyebrow")?.textContent),
        value: clean(n.querySelector('[class*="text-metric"]')?.textContent),
      };
    })
    .filter((t) => t.label && t.value);
  const uniqueTiles = [];
  for (const t of tiles) if (!uniqueTiles.some((u) => u.label === t.label)) uniqueTiles.push(t);

  const headings = [...root.querySelectorAll("h1,h2,h3")]
    .map((n) => ({ level: n.tagName.toLowerCase(), text: clean(n.textContent) }))
    .filter((h) => h.text)
    .slice(0, 24);
  const subtitle = clean(
    root.querySelector("h1")?.parentElement?.parentElement?.querySelector("p, .text-body")?.textContent,
  );
  const pills = [...new Set([...root.querySelectorAll('span[class*="rounded-full"]')]
    .map((n) => clean(n.textContent)).filter((t) => t && t.length < 28))].slice(0, 16);
  const buttons = [...new Set([...root.querySelectorAll("button, a[role=button]")]
    .map((n) => clean(n.textContent)).filter((t) => t && t.length < 34))].slice(0, 14);
  const tables = [...root.querySelectorAll("table")].slice(0, 2).map((t) => ({
    head: [...t.querySelectorAll("thead th")].map((n) => clean(n.textContent)),
    rows: [...t.querySelectorAll("tbody tr")].slice(0, 6)
      .map((r) => [...r.querySelectorAll("td")].map((n) => clean(n.textContent))),
  }));
  return { headings, subtitle, tiles: uniqueTiles, pills, buttons, tables };
};

// Full capture. A "block" is one child of the renderer's stagger
// container — DashboardRenderer wraps each spec block in its own div —
// so the block list here is the spec's block list, in order.
const FULL = () => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const root = document.querySelector("main") || document.body;

  // A pill's tone is not decoration: `bg-danger/10` and `bg-success/10`
  // are the difference between a refusal and a confirmation. The class
  // names it exactly, so carry it rather than guessing from the label.
  const toneOf = (cls) => {
    const m = /bg-(violet|info|ink-mute|danger|success|warning|ink)\/(\d+)/.exec(cls || "");
    return m ? `${m[1]}-${m[2]}` : "ink-6";
  };
  const pillsIn = (n) =>
    [...n.querySelectorAll('span[class*="rounded-full"]')]
      .map((p) => ({ label: clean(p.textContent), tone: toneOf(String(p.className)) }))
      .filter((p) => p.label && p.label.length < 30);

  // PageHeader renders <header><h1/><p/></header> inside main, and the
  // page action, when there is one, lives inside a block rather than here.
  const header = () => {
    const hdr = root.querySelector("header") ?? root;
    const h1 = hdr.querySelector("h1");
    if (!h1) return {};
    return {
      title: clean(h1.textContent),
      eyebrow: clean(hdr.querySelector(".text-eyebrow")?.textContent) || null,
      subtitle: clean(hdr.querySelector("p")?.textContent) || null,
    };
  };

  const tileOf = (n) => {
    const label = clean(n.querySelector(".text-eyebrow")?.textContent);
    const value = clean(n.querySelector('[class*="text-metric"]')?.textContent);
    if (!label || !value) return null;
    const metaNodes = [...n.querySelectorAll(".text-meta")]
      .map((m) => clean(m.textContent)).filter(Boolean);
    const meta = [];
    for (const m of metaNodes) if (m !== label && m !== value && !meta.includes(m)) meta.push(m);
    return { label, value, meta: meta.slice(0, 2), pills: pillsIn(n) };
  };

  const classify = (b) => {
    const heading = clean(b.querySelector("h2, h3")?.textContent) || null;
    const subheading = clean(b.querySelector("h2 + p, h3 + p, .text-meta")?.textContent) || null;
    const buttons = [...b.querySelectorAll("button, a[role=button]")]
      .map((n) => clean(n.textContent)).filter((t) => t && t.length < 40);
    // A facet reads "Confirmées4": a name with its derived count glued on.
    const facets = buttons
      .map((t) => t.match(/^(.+?)(\d+)$/))
      .filter(Boolean)
      .map((m) => ({ label: m[1].trim(), count: m[2] }));
    const actions = buttons.filter((t) => !/\d$/.test(t));
    // Every block also carries its leaf text in document order. The typed
    // branches below cover the blocks worth structuring; this guarantees
    // nothing on screen is lost for the ones they do not — the bespoke bar
    // strips, the calendar cells, the legends under a chart.
    const texts = [];
    for (const n of b.querySelectorAll("*")) {
      if (n.children.length) continue;
      const t = clean(n.textContent);
      if (t && t.length < 160) texts.push(t);
    }
    const common = { heading, subheading, actions, facets, texts: texts.slice(0, 120) };

    const table = b.querySelector("table");
    if (table) {
      return { kind: "table", ...common,
        head: [...table.querySelectorAll("thead th")].map((n) => clean(n.textContent)),
        rows: [...table.querySelectorAll("tbody tr")].map((r) =>
          [...r.querySelectorAll("td")].map((c) => ({ text: clean(c.textContent), pills: pillsIn(c) }))) };
    }

    // MetricTile: an eyebrow label above a .text-metric value.
    // A tile matched on an ancestor repeats its descendant's value, so
    // keep the innermost match per value — the last one in document order —
    // before deduping by label. Without this a greeting wrapping a hero
    // reads as three tiles that all show the same number.
    const tiles = [];
    for (const d of b.querySelectorAll("div")) {
      const t = tileOf(d);
      if (t) tiles.push({ ...t, node: d });
    }
    // Collapse only a genuine ancestor/descendant pair showing the same
    // number. Keying on the value alone also threw away a second real tile
    // that happened to read 1 — which is how Réservations lost
    // "À confirmer" to "Risque d'absence".
    const innermost = tiles.filter((t) =>
      !tiles.some((o) => o !== t && o.value === t.value && t.node.contains(o.node)));
    const uniqueTiles = [];
    for (const t of innermost) {
      if (t.label.length > 44) continue;
      if (!uniqueTiles.some((u) => u.label === t.label)) uniqueTiles.push(t);
      delete t.node;
    }
    if (uniqueTiles.length >= 2) return { kind: "kpi-grid", ...common, tiles: uniqueTiles };

    // A bar chart is hand-rolled here, not recharts: a fixed-height well
    // holding bars whose inline height is a percentage.
    // A bar is a <span>, not a <div> — selecting divs alone found nothing
    // and every service-load strip in the portal read as prose.
    const bars = [...b.querySelectorAll('[style*="height"]')].filter(
      (d) => /height:\s*[\d.]+%/.test(d.getAttribute("style") || ""));
    // Recharts draws to SVG. Carrying the path geometry verbatim is what
    // lets a line chart be redrawn rather than described.
    const svgs = [...b.querySelectorAll("svg.recharts-surface")].map((svg) => ({
      width: svg.getAttribute("width"),
      height: svg.getAttribute("height"),
      paths: [...svg.querySelectorAll("path.recharts-curve, path.recharts-area-area, path.recharts-area-curve")]
        .map((p) => ({ d: p.getAttribute("d"), stroke: p.getAttribute("stroke"), fill: p.getAttribute("fill") }))
        .filter((p) => p.d && p.d.length < 4000),
      ticks: [...svg.querySelectorAll(".recharts-cartesian-axis-tick-value")]
        .map((t) => clean(t.textContent)).filter(Boolean),
    })).filter((s) => s.paths.length);
    if (bars.length >= 4 || svgs.length) {
      const nums = [...b.querySelectorAll(".num, [class*=num]")]
        .map((n) => clean(n.textContent)).filter((t) => t && t.length < 24);
      const axis = [...b.querySelectorAll("div")]
        .filter((d) => d.children.length >= 4 && [...d.children].every((c) => c.tagName === "SPAN"))
        .map((d) => [...d.children].map((c) => clean(c.textContent)))
        .filter((row) => row.filter(Boolean).length >= 4)
        .pop() || [];
      return { kind: "chart", ...common,
        bars: bars.map((d) => {
          const style = d.getAttribute("style") || "";
          const wrap = d.closest("[title]");
          return {
            height: (style.match(/height:\s*([\d.]+)%/) || [])[1],
            // violet or the warning gold an over-capacity slot switches to.
            color: (style.match(/background-color:\s*([^;]+)/) || [])[1] || null,
            label: clean(wrap?.getAttribute("title") || d.getAttribute("aria-label") || ""),
          };
        }),
        axis,
        svgs,
        values: nums.slice(0, 40) };
    }

    // EntityListBlock: each row is an h4 title with badges, meta and actions.
    // The row card is the highest ancestor still holding exactly one h4 —
    // climb one further and the list swallows every sibling row with it.
    const rowOf = (h4) => {
      let n = h4;
      let best = h4;
      for (let i = 0; i < 7 && n.parentElement; i++) {
        n = n.parentElement;
        if (n.querySelectorAll("h4").length > 1) break;
        best = n;
      }
      return best;
    };
    const rowTitles = [...b.querySelectorAll("h4")];
    if (rowTitles.length) {
      return { kind: "list", ...common,
        items: rowTitles.map((h4) => {
          const row = rowOf(h4);
          const title = clean(h4.textContent);
          const metas = [...row.querySelectorAll(".text-meta")]
            .map((m) => clean(m.textContent)).filter(Boolean);
          // The avatar is the square initials chip. Matching `.rounded-full`
          // instead finds the status pill, which is why this used to report
          // "À C" where the screen says "NC".
          const avatar = row.querySelector('[class*="bg-violet-soft"]');
          const trailingLabel = clean(row.querySelector(".text-eyebrow")?.textContent) || null;
          const trailingValue = [...row.querySelectorAll('.num, [class*="text-metric"]')]
            .map((x) => clean(x.textContent))
            .filter((t) => t && !metas.includes(t))[0] || null;
          // Where the whole card is one button it repeats the row's own text;
          // the real per-row actions are the short labelled ones beside it.
          const actions = [...row.querySelectorAll("button")]
            .map((x) => clean(x.textContent))
            .filter((t) => t && t.length < 34 && t !== title)
            .slice(0, 4);
          return {
            title,
            meta: metas[0] || null,
            initials: clean(avatar?.textContent).slice(0, 3) || null,
            trailing: trailingLabel && trailingValue ? [trailingLabel, trailingValue] : null,
            pills: pillsIn(row),
            actions,
          };
        }) };
    }

    // Labelled controls carrying values.
    // A control's label is rarely its sibling: the portal puts the field
    // name on the row and the control on the right. Climb until the
    // ancestor would start covering a second control, then take the first
    // piece of text in it.
    const fieldLabel = (input) => {
      let n = input;
      for (let i = 0; i < 4 && n.parentElement; i++) {
        n = n.parentElement;
        if (n.querySelectorAll("input, textarea, select").length > 1) break;
        const cand = [...n.querySelectorAll("label, h4, .text-body, .text-meta, p")]
          .map((x) => clean(x.textContent))
          .filter((t) => t && t.length < 70);
        if (cand.length) return cand[0];
      }
      return clean(input.getAttribute("aria-label") || input.getAttribute("placeholder") || "");
    };
    const fields = [...b.querySelectorAll("input, textarea, select")].map((input) => {
      const label = fieldLabel(input);
      const value = input.tagName === "SELECT"
        ? clean(input.selectedOptions?.[0]?.textContent) : clean(input.value ?? "");
      if (!label && !value) return null;
      return { label, value, type: input.type ?? input.tagName.toLowerCase() };
    }).filter(Boolean);
    const toggles = [...b.querySelectorAll('button[role="switch"], input[type="checkbox"]')].map((t) => ({
      label: clean(t.closest("div")?.textContent).slice(0, 70),
      on: t.getAttribute("aria-checked") === "true" || t.checked === true,
    }));
    if (fields.length || toggles.length) {
      return { kind: "settings", ...common, fields, toggles };
    }

    // Everything else — slot grids, calendars, feeds, prose — as ordered
    // rows of visible text. Faithful without pretending to know the type.
    const container = [...b.querySelectorAll("div, ul")].find((d) => {
      const kids = [...d.children].filter((k) => clean(k.textContent));
      return kids.length >= 2 && /divide-y|grid|flex-col|space-y/.test(d.className || "");
    });
    if (container) {
      const rows = [...container.children].map((r) => {
        const lines = [...r.querySelectorAll("*")]
          .filter((n) => n.children.length === 0)
          .map((n) => clean(n.textContent)).filter(Boolean);
        const uniq = [];
        for (const t of lines) if (t.length < 160 && !uniq.includes(t)) uniq.push(t);
        return { lines: uniq.slice(0, 5), pills: pillsIn(r),
                 actions: [...r.querySelectorAll("button")].map((x) => clean(x.textContent)).filter(Boolean).slice(0, 3) };
      }).filter((r) => r.lines.length);
      if (rows.length) return { kind: "rows", ...common, rows };
    }

    const text = clean(b.textContent);
    if (!heading && !text) return null;
    const looksEmpty = /aucun|aucune|rien |pas encore|vide/i.test(text.slice(0, 160));
    return { kind: looksEmpty ? "empty" : "prose", ...common,
             body: text.slice(0, 400), pills: pillsIn(b) };
  };

  // The desktop lane. DashboardRenderer emits two mutually exclusive
  // lanes — `md:hidden` for phones and `hidden md:block` for everything
  // else — and wraps each spec block in its own div inside them. So the
  // lane's children are the spec's blocks, in order. Taking the widest
  // descendant instead picks up a row container and yields nothing.
  const lane =
    [...root.children].find((c) => /hidden md:block/.test(c.className || "")) ??
    [...root.children].filter((c) => c.tagName === "DIV" && c.getBoundingClientRect().width > 600).pop();

  const splitOf = (b) => {
    const g = [...b.children][0];
    if (!g || g.children.length !== 2) return null;
    const [l, r] = [...g.children];
    const wide = (n) => n.getBoundingClientRect().width;
    if (wide(l) < 200 || wide(r) < 200) return null;
    if (clean(l.textContent).length < 30 || clean(r.textContent).length < 30) return null;
    const left = classify(l), right = classify(r);
    if (!left || !right) return null;
    return { kind: "split", left, right };
  };

  const blocks = lane
    ? [...lane.children].map((b) => splitOf(b) ?? classify(b)).filter(Boolean)
    : [classify(root)].filter(Boolean);

  return {
    ...header(),
    venue: clean(document.querySelector("aside")?.querySelector("a[href^='/restaurant']")
      ?.closest("aside")?.querySelector("div > div > div")?.textContent)?.slice(0, 40) || null,
    blocks,
  };
};

// An open drawer, sheet or dialog — captured after a click.
const SURFACE = () => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  // The detail drawer and the form dialog are plain fixed panels, not
  // Radix role=dialog nodes. Take the largest fixed overlay that is not
  // the sidebar or the phone tab bar.
  const candidates = [...document.querySelectorAll('[role="dialog"], .fixed, aside')]
    .filter((n) => {
      const r = n.getBoundingClientRect();
      const t = (n.textContent || "").trim();
      return r.width > 260 && r.height > 200 && t.length > 40 &&
        !/w-\[260px\]/.test(n.className || "") && n.tagName !== "NAV";
    })
    .sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height)
                  - (a.getBoundingClientRect().width * a.getBoundingClientRect().height));
  const el = candidates.find((n) => n.getBoundingClientRect().width < 900) ?? candidates[0] ?? null;
  if (!el) return null;
  const texts = [];
  for (const n of el.querySelectorAll("*")) {
    if (n.children.length) continue;
    const t = clean(n.textContent);
    if (t && t.length < 160) texts.push(t);
  }
  const uniq = texts;
  return {
    title: clean(el.querySelector("h1,h2,h3")?.textContent),
    lines: uniq.slice(0, 30),
    pills: [...el.querySelectorAll('span[class*="rounded-full"]')].map((p) => clean(p.textContent)).filter(Boolean),
    buttons: [...el.querySelectorAll("button")].map((b) => clean(b.textContent)).filter(Boolean).slice(0, 8),
    width: Math.round(el.getBoundingClientRect().width),
  };
};

// Surfaces to open, per route. Each entry names what to click and what to
// call the result. Selectors are text-based so they survive class churn.
// A row in an EntityListBlock is an h4 title inside a clickable card, not
// a table row — clicking the h4 opens the detail drawer.
const SURFACES = {
  "/restaurant/reservations": [
    { name: "Détail réservation", click: "button.block.w-full:visible" },
    // Refuser only exists on a reservation still awaiting a decision, so
    // filter to "À confirmer" first, then open that row.
    { name: "Refuser", steps: [
      'button:has-text("À confirmer"):visible',
      "button.block.w-full:visible",
      'button:has-text("Refuser"):visible',
    ] },
  ],
  "/restaurant/clients": [{ name: "Fiche client", click: "button.block.w-full:visible" }],
  // Three surfaces the brief asks for do not exist in the portal for Dar
  // Zellij, so they are not chased here — see docs/PHASE7.md:
  //   Check-in "résultat de scan" needs a real code the seed does not expose
  //     through the UI, and an unknown code renders the not-found branch.
  //   Avis has no action buttons at all: replying is the part that waits on
  //     the review platforms, which is why its route status is "service".
  //   Disponibilités edits a service in place; there is no "Modifier" row
  //     action and so no edit surface to open.
};

// ── Driver ─────────────────────────────────────────────────────────────

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);
await page.fill('input[type="email"]', ACCOUNT);
await page.fill('input[type="password"]', "demo");
await page.click('button[type="submit"]');
await page.waitForTimeout(3800);

if (VENUE) {
  await page.request.post(`${BASE}/api/session/venue`, { data: { venueId: VENUE } });
  await page.goto(`${BASE}/restaurant`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
}
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const result = { base: BASE, venue: VENUE, account: ACCOUNT, depth: DEPTH, capturedAt: new Date().toISOString(), screens: {}, nav: null };

const NAV = () => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const aside = document.querySelector("aside");
  if (!aside) return null;
  return {
    groups: [...aside.querySelectorAll("nav > div")].map((d) => ({
      label: clean(d.querySelector(":scope > p")?.textContent),
      items: [...d.querySelectorAll("a")].map((a) => ({
        label: clean(a.textContent), href: a.getAttribute("href"),
      })),
    })).filter((g) => g.label && g.items.length),
  };
};

const slug = (p) => p.replace(/^\//, "").replace(/\//g, "_") || "root";

async function capture(list, tag) {
  for (const r of list) {
    if (ONLY && !r.path.includes(ONLY)) continue;
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}${r.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(DEPTH === "full" ? 2600 : 1500);

      const base = {
        label: r.label, purpose: r.purpose, status: r.status,
        gap: r.gap ?? null, dependsOn: r.dependsOn ?? null,
        roles: r.roles ?? null, workspace: r.workspace,
      };
      const body = DEPTH === "full" ? await page.evaluate(FULL) : await page.evaluate(OUTLINE);
      result.screens[r.path] = { ...base, ...body };
      if (!result.nav) result.nav = await page.evaluate(NAV);

      if (SHOTS) {
        await page.screenshot({ path: `${SHOTS}/${slug(r.path)}@1440.png`, fullPage: true });
      }

      // Open surfaces, one at a time, reloading between them.
      if (DEPTH === "full" && SURFACES[r.path]) {
        result.screens[r.path].surfaces = [];
        for (const s of SURFACES[r.path]) {
          try {
            await page.goto(`${BASE}${r.path}`, { waitUntil: "domcontentloaded" });
            await page.waitForTimeout(2200);
            if (s.type) {
              await page.locator(s.type.selector + ":visible").first().fill(s.type.value, { timeout: 4000 });
              await page.waitForTimeout(400);
            }
            for (const sel of s.steps ?? [s.click]) {
              await page.locator(sel).first().click({ timeout: 5000 });
              await page.waitForTimeout(1200);
            }
            await page.waitForTimeout(600);
            const captured = await page.evaluate(SURFACE);
            if (captured) {
              result.screens[r.path].surfaces.push({ name: s.name, ...captured });
              if (SHOTS) {
                await page.screenshot({ path: `${SHOTS}/${slug(r.path)}--${slug(s.name)}@1440.png` });
              }
              console.log(`       surface ${s.name}`);
            } else {
              console.log(`       surface ${s.name} — nothing opened`);
            }
          } catch (e) {
            console.log(`       surface ${s.name} — ${e.message.slice(0, 50)}`);
          }
        }
      }

      if (SHOTS && r.workspace === "venue") {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${BASE}${r.path}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1800);
        await page.screenshot({ path: `${SHOTS}/${slug(r.path)}@390.png`, fullPage: true });
      }

      const n = (result.screens[r.path].blocks ?? []).length;
      console.log(`  ok   ${tag} ${r.path}${DEPTH === "full" ? ` · ${n} blocs` : ""}`);
    } catch (e) {
      console.log(`  FAIL ${tag} ${r.path} — ${e.message.slice(0, 70)}`);
      result.screens[r.path] = { label: r.label, error: e.message.slice(0, 200) };
    }
  }
}

const VENUE_ROUTES = ROUTES.filter((r) => r.workspace === "venue");
const EVENT_ROUTES = ROUTES.filter((r) => r.workspace === "event" || r.workspace === "shared");
const ENTRY_ROUTES = ROUTES.filter((r) => r.workspace === "entry");

await capture(VENUE_ROUTES, "venue");
if (DEPTH !== "full") await capture(EVENT_ROUTES, "event");
await context.clearCookies();
await capture(ENTRY_ROUTES, "entry");

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\nwrote ${OUT} — ${Object.keys(result.screens).length} screens`);
await browser.close();
