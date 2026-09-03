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

export const DEFAULT_USER_ID = "usr_mido";

export function getUser(id: string | undefined): AppUser {
  return (id ? USERS[id] : undefined) ?? USERS[DEFAULT_USER_ID];
}
