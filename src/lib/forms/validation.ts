// Field validation, shared by client and server.
//
// The same rules run in both places. The client so the user is told
// before they submit; the server because a client check is a courtesy.

export type FieldError = { field: string; message: string };

export type Validator<T> = (value: T) => string | null;

export const required =
  (label: string): Validator<string> =>
  (v) =>
    v.trim().length === 0 ? `${label} est obligatoire.` : null;

export const maxLength =
  (n: number, label: string): Validator<string> =>
  (v) =>
    v.length > n ? `${label} ne peut pas dépasser ${n} caractères.` : null;

export const email: Validator<string> = (v) =>
  v.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    ? null
    : "Adresse e-mail invalide.";

/** Moroccan and international formats, lenient about spacing. */
export const phone: Validator<string> = (v) =>
  v.trim().length === 0 || /^\+?[\d\s().-]{8,20}$/.test(v.trim())
    ? null
    : "Numéro de téléphone invalide.";

export const url: Validator<string> = (v) => {
  if (v.trim().length === 0) return null;
  try {
    const parsed = new URL(v.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? null
      : "L'adresse doit commencer par http:// ou https://.";
  } catch {
    return "Adresse web invalide.";
  }
};

export const timeOfDay: Validator<string> = (v) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : "Heure invalide (format 00:00).";

export const positiveInt =
  (label: string, max = 100_000): Validator<number> =>
  (v) => {
    if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
      return `${label} doit être un nombre entier positif.`;
    }
    return v > max ? `${label} ne peut pas dépasser ${max}.` : null;
  };

export const latitude: Validator<number | null> = (v) =>
  v === null || (v >= -90 && v <= 90) ? null : "Latitude hors bornes.";

export const longitude: Validator<number | null> = (v) =>
  v === null || (v >= -180 && v <= 180) ? null : "Longitude hors bornes.";

/** Runs a rule set over a record, returning every failure, not the first. */
export function validate<T extends object>(
  values: T,
  rules: { [K in keyof T]?: Validator<T[K]>[] },
): FieldError[] {
  const errors: FieldError[] = [];
  for (const key of Object.keys(rules) as (keyof T)[]) {
    for (const rule of rules[key] ?? []) {
      const message = rule(values[key]);
      if (message) {
        errors.push({ field: String(key), message });
        break; // one message per field — a stack of them helps nobody
      }
    }
  }
  return errors;
}

/**
 * A closing time earlier than its opening is legal — a service running
 * past midnight — but an identical pair is not, and neither is a slot
 * with no capacity.
 */
export function validateSlot(input: {
  opensAt: string;
  closesAt: string;
  capacity: number;
}): FieldError[] {
  const errors = validate(input, {
    opensAt: [timeOfDay],
    closesAt: [timeOfDay],
    capacity: [positiveInt("La capacité", 5_000)],
  });
  if (
    errors.length === 0 &&
    input.opensAt === input.closesAt
  ) {
    errors.push({
      field: "closesAt",
      message: "L'ouverture et la fermeture ne peuvent pas être identiques.",
    });
  }
  return errors;
}
