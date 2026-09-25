import "server-only";

// How the session cookies are written, in one place.
//
// There were four places setting them — the sign-in action, the venue
// chooser, the onboarding submit and the venue route — each with its own
// option literal, and none of them agreed. Two omitted `maxAge`, all
// four omitted `secure`, and all four left the identity cookie readable
// by any script on the page.
//
// ## Why the identity cookie is signed
//
// `lyfe.user` is not a preference. `DemoSessionDriver.currentUserId()`
// reads it and returns it as *the* signed-in user, and the session
// resolves that user's venues from the directory. The id is validated
// against the account list — but validating that a name exists is not
// authenticating the person using it. Editing `document.cookie` to
// another partner's id signed you in as that partner.
//
// So the value carries an HMAC over itself, and a value whose signature
// does not verify is treated as no cookie at all. This is not real
// authentication and does not pretend to be: the Business Service's
// login replaces the whole driver. It is the difference between a
// stand-in that can be walked past and one that cannot.
//
// ## The key
//
// `LYFE_SESSION_SECRET` is it, and on a deployment it is **required**.
// `/api/health` reports whether it is set.
//
// The fallback used to be a per-process random key, on the reasoning
// that an unsigned deployment should be noticed and a fixed default key
// would be no signature at all. Both halves of that are right and the
// implementation was still broken, because *per process* is not one
// process: `next start` renders in worker processes of its own, so the
// server action that signed the cookie and the page render that
// verified it drew different random keys. Signing in therefore worked
// or failed depending on which worker answered — the same run had one
// screen open and the next bounce to /login?expired=1. On Vercel, where
// every request may be a different instance, it would have failed
// essentially always.
//
// So the fallback is now stable across the processes of one machine: a
// key kept in `.data/session-key`, created on first use with 32 random
// bytes and never committed (`.data/` is the SQLite directory, already
// ignored). That is exactly the setup a cold clone has, and it makes
// `next start` and the verify tools work without configuration.
//
// Where nothing can be written — a serverless filesystem — there is no
// stable place to put a key, so the process falls back to a random one
// and says so loudly on stderr. That deployment cannot hold a session,
// which is a configuration error and now reads like one.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

let fallbackKey: string | null = null;
let warned = false;

/** The key file lives beside the SQLite database, which is already ignored. */
function keyPath(): string {
  return process.env.LYFE_SESSION_KEY_PATH ?? resolve(".data/session-key");
}

function machineKey(): string | null {
  const path = keyPath();
  try {
    const held = readFileSync(path, "utf8").trim();
    if (held.length >= 32) return held;
  } catch {
    // Not written yet, which is the normal first run.
  }
  try {
    mkdirSync(dirname(path), { recursive: true });
    const made = randomBytes(32).toString("hex");
    // `wx` so two workers starting at once cannot overwrite each
    // other's key; the loser re-reads what the winner wrote.
    writeFileSync(path, `${made}\n`, { flag: "wx", mode: 0o600 });
    return made;
  } catch {
    try {
      const held = readFileSync(path, "utf8").trim();
      if (held.length >= 32) return held;
    } catch {
      // A read-only filesystem. Nothing stable to use.
    }
  }
  return null;
}

function key(): string {
  const configured = process.env.LYFE_SESSION_SECRET;
  if (configured && configured.length >= 16) return configured;

  if (fallbackKey) return fallbackKey;

  const shared = machineKey();
  if (shared) {
    fallbackKey = shared;
    return fallbackKey;
  }

  if (!warned) {
    warned = true;
    console.error(
      "[lyfe] LYFE_SESSION_SECRET n'est pas défini et aucune clé ne peut " +
        "être écrite : les sessions ne survivront pas à une requête. " +
        "Définissez LYFE_SESSION_SECRET (32 caractères ou plus).",
    );
  }
  fallbackKey = randomBytes(32).toString("hex");
  return fallbackKey;
}

/** Whether `LYFE_SESSION_SECRET` is set. `/api/health` reports this. */
export const sessionSecretConfigured = (): boolean =>
  Boolean(process.env.LYFE_SESSION_SECRET && process.env.LYFE_SESSION_SECRET.length >= 16);

/**
 * Where the signing key comes from, for `/api/health`.
 *
 * `configuré` is the only answer a deployment should give. `fichier
 * local` is the cold clone and is fine there. `éphémère` means sessions
 * last one request.
 */
export function sessionKeySource(): "configuré" | "fichier local" | "éphémère" {
  if (sessionSecretConfigured()) return "configuré";
  // Resolving the key is what creates the file, so ask for it rather
  // than guessing — and a health check is the right place to find out.
  key();
  return fallbackKey && !warned ? "fichier local" : "éphémère";
}

const mac = (value: string): string =>
  createHmac("sha256", key()).update(value).digest("base64url").slice(0, 27);

/** `value.signature`. */
export function sign(value: string): string {
  return `${value}.${mac(value)}`;
}

/**
 * The value back, or null if the signature does not verify.
 *
 * Compared in constant time, because a byte-at-a-time comparison on a
 * value an attacker can resubmit is a signature you can guess.
 */
export function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const cut = signed.lastIndexOf(".");
  if (cut <= 0) return null;
  const value = signed.slice(0, cut);
  const given = Buffer.from(signed.slice(cut + 1));
  const want = Buffer.from(mac(value));
  if (given.length !== want.length) return null;
  return timingSafeEqual(given, want) ? value : null;
}

/**
 * `secure` in production, not in development.
 *
 * A `Secure` cookie is dropped on plain HTTP, and the portal is read on
 * `http://localhost` all day. Keyed off NODE_ENV rather than the request
 * host because a server action has no request in hand.
 */
const secure = (): boolean => process.env.NODE_ENV === "production";

/**
 * Options for the identity cookies — `lyfe.user` and `lyfe.venue`.
 *
 * `httpOnly`, because nothing in the browser reads either of them: the
 * server resolves the session and passes what the chrome needs down as
 * props. Checked rather than assumed — `grep 'lyfe.user'` outside
 * `server-session.ts` returns nothing.
 */
export const identityCookie = (remember = true) => ({
  path: "/",
  httpOnly: true,
  secure: secure(),
  sameSite: "lax" as const,
  ...(remember ? { maxAge: THIRTY_DAYS } : {}),
});

/**
 * Options for `lyfe.session.present`.
 *
 * This one the browser does write — `lib/auth/session.ts` mirrors it —
 * so it cannot be `httpOnly`. It carries no identity and no secret: it
 * is a flag the middleware reads to bounce a request with no session
 * before rendering, and forging it gets you a redirect to /login from
 * the layout, which is where you already were.
 */
export const presenceCookie = (remember = true) => ({
  path: "/",
  httpOnly: false,
  secure: secure(),
  sameSite: "lax" as const,
  ...(remember ? { maxAge: THIRTY_DAYS } : {}),
});

export const clearCookie = () => ({
  path: "/",
  maxAge: 0,
  secure: secure(),
  sameSite: "lax" as const,
});

export { THIRTY_DAYS };
