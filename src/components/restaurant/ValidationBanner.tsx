import type { VenueStatus } from "@/lib/types/restaurant";

// « LYFE vérifie votre établissement. »
//
// Shown on every venue screen, in the shell rather than in one screen's
// builder, because it is a fact about the establishment and not about
// the page: a partner who lands on Disponibilités has the same right to
// know their listing is not live yet as one who lands on Accueil.
//
// It says the one thing a partner actually needs — the dashboard works,
// the app does not show them yet — and it does not invent a date. A
// promise about when a human will look is a promise this portal cannot
// keep.
export function ValidationBanner({
  status,
  reason,
}: {
  status: VenueStatus | undefined;
  reason: string;
}) {
  if (status !== "pending_review" && status !== "rejected") return null;

  const pending = status === "pending_review";

  return (
    <div
      role="status"
      data-validation={status}
      className={[
        "mb-6 rounded-2xl border px-4 py-3 md:px-5 md:py-4",
        pending
          ? "border-gold-soft bg-gold-soft/30"
          : "border-danger/40 bg-danger/10",
      ].join(" ")}
    >
      <p className="font-medium text-ink">
        {pending
          ? "LYFE vérifie votre établissement."
          : "LYFE n'a pas validé votre établissement."}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {pending
          ? "Votre tableau de bord fonctionne normalement. L'établissement n'apparaîtra dans l'application LYFE qu'une fois la fiche validée."
          : reason.trim() !== ""
            ? reason
            : "Aucun motif n'a été enregistré. Écrivez-nous et nous vous dirons ce qui manque."}
      </p>
      {pending ? null : (
        <p className="mt-1 text-sm text-ink-soft">
          Corrigez votre fiche puis écrivez à validation@lyfe.ma pour une
          nouvelle vérification.
        </p>
      )}
    </div>
  );
}
