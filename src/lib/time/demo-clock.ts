// The demo clock, as the portal sees it.
//
// The rule itself is in `demo-clock-shared.mjs`, which is plain
// JavaScript so that `db/seed.mjs` and `tools/verify/*` can import the
// same file. This is the typed door onto it, plus the two lines of
// plumbing only a Next.js app needs: install it on the server at boot,
// and hand the browser the same offset before React hydrates.
//
// The `-shared` in the filename is load-bearing: Next resolves `.mjs`
// before `.ts`, so a `demo-clock.mjs` beside a `demo-clock.ts` is the
// file `@/lib/time/demo-clock` silently resolves to, and half of this
// module's exports vanish at build time.
//
// Without the second half the two runtimes disagree about the hour and
// every time-derived string hydrates differently — the same class of
// fault `zone.ts` exists to prevent, one field over.

import {
  DEMO_CLOCK_ENV,
  demoClockOffset,
  installDemoClock,
  resolveDemoClock,
} from "./demo-clock-shared.mjs";

export { DEMO_CLOCK_ENV, demoClockOffset };

/**
 * Installs the clock this process was started with, if any.
 *
 * Unset means the real clock: a deployment is not a demo, and a portal
 * that quietly ran an hour off would be a far worse bug than an
 * unrepeatable screenshot.
 */
export function installPortalDemoClock(): number {
  const at = resolveDemoClock(process.env[DEMO_CLOCK_ENV] as string | undefined);
  return at ? (installDemoClock(at) ?? 0) : 0;
}

/**
 * The one line of script the browser needs, or nothing at all.
 *
 * It applies the offset the server is already running on, so the two
 * agree to the millisecond rather than each resolving « jeudi » against
 * its own week.
 *
 * Only a dynamically rendered page carries it: a page prerendered at
 * build time carries whatever this returned during the build, which is
 * nothing, because the build is run without the variable. That is the
 * right answer — the prerendered pages are the ones that do not read
 * the clock — but it does mean the variable belongs on `next start`,
 * never on `next build`.
 */
export function demoClockScript(): string | null {
  const offset = demoClockOffset();
  if (!offset) return null;
  return `(function(){var o=${offset},R=Date;function D(){if(arguments.length===0)return new R(R.now()+o);return new R(...arguments)}D.prototype=R.prototype;D.now=function(){return R.now()+o};D.parse=R.parse;D.UTC=R.UTC;window.Date=D})()`;
}
