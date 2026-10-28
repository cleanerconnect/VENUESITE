import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { COPY } from "@/lib/copy/fr";
import { ForgotPanel } from "./ForgotPanel";

// « Mot de passe oublié ? », as a screen.
//
// `Détail Sprint ` ligne 53 — « En tant qu'organisateur, je dois
// pouvoir récupérer mon mot de passe ou le changer en cas d'oubli ».
// The link under Connexion used to do this in place: the address was
// read from the sign-in form, the seam was called, and the answer
// appeared as a notice over a form nobody was filling any more. That
// is one address field and one sentence pretending to be part of
// another screen.
//
// Here it is the whole screen, on the same panel as Connexion, with
// one field and the way back.

export const metadata: Metadata = { title: "Mot de passe oublié · LYFE" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      {/* `?email=` is filled in by the link on Connexion when the
          partner had already typed their address, so it needs a
          boundary for the static shell to render around. */}
      <Suspense
        fallback={
          <div className="w-full max-w-[400px]">
            <h2 className="text-h2 text-ink">{COPY.password.forgotTitle}</h2>
          </div>
        }
      >
        <ForgotPanel />
      </Suspense>
    </AuthShell>
  );
}
