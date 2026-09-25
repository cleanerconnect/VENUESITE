"use server";

// Valider, refuser. LYFE's two decisions on a listing.
//
// The gate is `requireLyfeAdmin`, and it is asserted here rather than
// only in the page: a server action is an endpoint, and a page that
// hides a button does not stop anybody from calling the action behind
// it. This is the same rule every venue-scoped write follows with
// `requireVenueAccess` — the check belongs next to the write.
//
// Neither decision is venue-scoped, which is the whole point: a LYFE
// reviewer acts on establishments nobody has given them membership of.

import { revalidatePath } from "next/cache";
import { requireLyfeAdmin } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { RepositoryError } from "@/lib/data/repository";

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

async function decide(
  venueId: string,
  status: "validated" | "rejected",
  reason: string,
): Promise<ValidationResult> {
  try {
    await requireLyfeAdmin();
  } catch {
    return {
      ok: false,
      message: "Cette page est réservée à l'équipe LYFE.",
    };
  }

  try {
    await getRestaurantRepository().decideVenueValidation({
      venueId,
      status,
      reason,
    });
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: error.message };
    return { ok: false, message: "La décision n'a pas pu être enregistrée." };
  }

  revalidatePath("/admin/validations");
  return { ok: true };
}

export async function validateVenue(venueId: string): Promise<ValidationResult> {
  return decide(venueId, "validated", "");
}

export async function rejectVenue(
  venueId: string,
  reason: string,
): Promise<ValidationResult> {
  return decide(venueId, "rejected", reason);
}
