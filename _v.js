const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addCookies([{ name: 'lyfe.session.present', value: '1', url: 'http://localhost:3000' }]);
  await ctx.addInitScript(() => {
    localStorage.setItem('lyfe.session', JSON.stringify({
      userId: 'usr_mido', organizerId: 'org_jazzablanca', role: 'owner',
      email: 'm@x.com', expiresAt: Date.now() + 86400000 * 30 }));
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  const go = async (r, w = 1600) => { await page.goto('http://localhost:3000' + r, { waitUntil: 'networkidle' }); await page.waitForTimeout(w); };

  for (const [r, n] of [['/restaurant/clients','clients'],['/restaurant/analytique','analytique'],['/restaurant/visibilite','visibilite'],['/restaurant/disponibilites','disponibilites']]) {
    await go(r); await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
  }

  // Period selector actually changes the numbers
  const readCovers = async (p) => { await go(`/restaurant/analytique?p=${p}`, 2000);
    const t = await page.locator('text=/COUVERTS SERVIS/i').first().locator('xpath=ancestor::*[3]').innerText().catch(()=> '');
    return t.replace(/\n/g,' ').slice(0,60); };
  console.log('7d  ->', await readCovers('7d'));
  console.log('90d ->', await readCovers('90d'));

  // CRM: segment filter + profile drawer
  await go('/restaurant/clients');
  const all = await page.locator('h4').count();
  await page.getByRole('button', { name: /Fidèles/ }).click(); await page.waitForTimeout(500);
  const loyal = await page.locator('h4').count();
  await page.getByRole('button', { name: /^Tous/ }).click(); await page.waitForTimeout(400);
  await page.locator('h4').first().click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/customer-profile.png` });
  const drawer = await page.locator('text=/Indicateur de risque/').count();
  console.log(`CRM: all=${all} loyal=${loyal} profileHasRisk=${drawer > 0}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  // Reject-with-reason dialog
  await go('/restaurant/reservations');
  await page.getByRole('button', { name: /À confirmer/ }).click(); await page.waitForTimeout(500);
  await page.locator('button[aria-label="Actions"]:visible').first().click(); await page.waitForTimeout(400);
  await page.getByRole('menuitem', { name: /Refuser la demande/ }).click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/reject-dialog.png` });
  const reasons = await page.locator('button[aria-pressed]').count();
  await page.getByRole('button', { name: /Groupe trop nombreux/ }).click(); await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^Refuser la demande$/ }).last().click(); await page.waitForTimeout(1000);
  const toast = await page.locator('text=/Demande refusée/').count();
  console.log(`REJECT: reasonOptions=${reasons} toastShown=${toast > 0}`);
  await page.screenshot({ path: `${OUT}/reject-done.png` });

  console.log('CONSOLE ERRORS:', errs.length ? errs.slice(0,4).join(' | ') : 'none');
  await browser.close();
})();
