import "server-only";

// Who works for LYFE.
//
// Separate from `accounts.ts`, which answers « may this person sign in »,
// because this answers « may this person review somebody else's
// listing » — and the two must not be able to drift into one another. It
// goes through the driver seam for the same reason every other read
// does: under `static` there is no database to ask.

import { dataMode } from "@/lib/data/mode";
import { isPlatformAdmin } from "@/lib/db/validation-store";

/**
 * The static driver has no database, and inventing a LYFE administrator
 * for a frozen snapshot would put a review queue in front of somebody
 * looking at a demo. Nobody is an administrator there.
 */
export async function isLyfeAdmin(userId: string): Promise<boolean> {
  if (dataMode() !== "db") return false;
  try {
    return await isPlatformAdmin(userId);
  } catch {
    // An unmigrated database has no `platform_admins`. Not being an
    // administrator is the safe answer to every question here.
    return false;
  }
}
