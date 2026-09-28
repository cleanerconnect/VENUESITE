// The fixture accounts, in one place.
//
// Seven addresses and one password. They exist so that a clone, a local
// database and the demo deployment are all walkable without anybody
// being handed a credential out of band — and audit item E-01 is why
// they are a table and not a constant in the bundle: the portal used to
// compare against literals in `src/lib/auth/accounts.ts`, and the
// database directory fell through to them whenever `partner_accounts`
// had no matching row. On a deployment with Neon attached — which is
// production — that made `yassine@darzellij.ma` / `demo` a working
// password, and `validation@lyfe.ma` / `demo` the account that
// validates listings.
//
// So the credentials are rows now, salted and hashed, checked by the
// same `verifyPartnerPassword()` a partner created by `/inscription`
// goes through. This file is the single list, imported by the two
// scripts that write it:
//
//   · `db/seed.mjs`       — a first deploy, or any local database
//   · `db/bootstrap.mjs`  — a database that has venues and no accounts,
//                           which is what a deployment seeded before
//                           E-01 was fixed looks like, and which nobody
//                           can sign in to
//
// `LYFE_SEED_PASSWORD` sets the password for all of them. It defaults to
// `demo` so the documented walkthrough works; a deployment that outlives
// the demo sets it, or deletes these rows.

import { randomBytes, scryptSync } from "node:crypto";

/** The password the fixture accounts are written with. */
export const seedPassword = () => process.env.LYFE_SEED_PASSWORD ?? "demo";

/**
 * `salt:hash`, both hex — the shape `partner_accounts.password_hash`
 * holds and `verifyPartnerPassword()` reads. Never the password.
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

/**
 * Every fixture account, with the venues and organisations it holds
 * described in `src/lib/auth/accounts.ts` rather than here — this list
 * is the credential, not the membership.
 */
export const DEMO_ACCOUNTS = [
  { userId: "usr_mido", fullName: "Mido Reffas", email: "mido@jazzablanca.com", phone: "+212 661 00 10 01" },
  { userId: "usr_yassine", fullName: "Yassine Alami", email: "yassine@darzellij.ma", phone: "+212 661 00 26 00" },
  { userId: "usr_sofia", fullName: "Sofia Bennis", email: "sofia@nomadrooftop.ma", phone: "+212 661 00 26 01" },
  { userId: "usr_rachid", fullName: "Rachid Amrani", email: "rachid@darzellij.ma", phone: "+212 661 00 26 02" },
  { userId: "usr_imane", fullName: "Imane Ouali", email: "imane@darzellij.ma", phone: "+212 661 00 26 03" },
  { userId: "usr_lyfe_admin", fullName: "Nawal Cherkaoui", email: "validation@lyfe.ma", phone: "+212 661 00 00 01" },
  { userId: "usr_nouveau", fullName: "Nouveau partenaire", email: "nouveau@lyfe.ma", phone: "+212 661 00 00 02" },
];

/**
 * LYFE's own reviewer. Not a partner and not scoped to a venue: the one
 * account that can open `/admin/validations`, and what opens it is this
 * row rather than the `partner_accounts` one.
 */
export const PLATFORM_ADMIN = {
  userId: "usr_lyfe_admin",
  fullName: "Nawal Cherkaoui",
  email: "validation@lyfe.ma",
};
