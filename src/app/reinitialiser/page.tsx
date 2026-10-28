import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { COPY } from "@/lib/copy/fr";
import { ResetPanel } from "./ResetPanel";

// Where the mail's link lands: the new password, typed twice.
//
// The contract used to say the portal does not serve this screen — « le
// lien lui-même, sa durée de vie, son usage unique, l'écran qui accepte
// le nouveau mot de passe appartiennent au service » — because
// `Planning V3` ligne 39 only bought the *button* for the organiser.
// `Détail Sprint ` ligne 53 buys the rest of the sentence: « récupérer
// mon mot de passe **ou le changer** ». So the screen is here, and the
// token stays the service's: it is read from the query string, handed
// back unexamined, and the service decides whether it is still good.

export const metadata: Metadata = { title: "Nouveau mot de passe · LYFE" };

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      {/* The token arrives as `?jeton=`, so the panel reads the query
          string and needs a boundary for the static shell. */}
      <Suspense
        fallback={
          <div className="w-full max-w-[400px]">
            <h2 className="text-h2 text-ink">{COPY.password.resetTitle}</h2>
          </div>
        }
      >
        <ResetPanel />
      </Suspense>
    </AuthShell>
  );
}
