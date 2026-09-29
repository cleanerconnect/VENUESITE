// The signed-in person.
//
// Previously the chrome simply wrote "Mido Reffas · Propriétaire ·
// Jazzablanca" into the markup, which was fine while there was one
// product and one demo account — and started lying the moment the
// restaurant workspace existed, where it claimed a festival as the
// user's organisation.
//
// In production this comes from the session payload. The lookup exists so
// the components ask a question instead of asserting an answer.

export interface AppUser {
  id: string;
  name: string;
  /** Sidebar avatar, max 2 chars. */
  initials: string;
  email: string;
}

export const USERS: Record<string, AppUser> = {
  usr_mido: {
    id: "usr_mido",
    name: "Mido Reffas",
    initials: "MR",
    email: "mido@jazzablanca.com",
  },
  usr_yassine: {
    id: "usr_yassine",
    name: "Yassine Alami",
    initials: "YA",
    email: "yassine@darzellij.ma",
  },
};

/**
 * The fixture person with this id, or null — never somebody else.
 *
 * There used to be a `getUser` beside this one that fell back to the
 * first row, which is fine where a name is decoration and wrong where
 * it is identity: this table holds two of the seven demo accounts, so
 * the chrome greeted rachid, imane, sofia and LYFE's own reviewer as
 * « Mido Reffas ». The session's own name is read first; this is the
 * fallback behind it.
 */
export function knownUser(id: string | undefined): AppUser | null {
  return (id ? USERS[id] : undefined) ?? null;
}

/** « Yassine Alami » → « YA ». Two letters, the way the avatar wants. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
  return letters.toUpperCase();
}
