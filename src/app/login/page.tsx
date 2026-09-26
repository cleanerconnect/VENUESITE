import { Suspense } from "react";
import type { Metadata } from "next";
import { Brand } from "@/components/organizer/Brand";
import { COPY } from "@/lib/copy/fr";
import { SignInPanel } from "./SignInPanel";
import { activeLot } from "@/lib/lot";

// The entry point.
//
// A partner arrives here from the Org button on lyfemaroc.org. One form,
// one set of credentials; where they land is resolved from the account,
// not from which link they followed.
//
// The left panel used to sell the platform — stat tiles, a festival
// testimonial, "le système d'exploitation de vos soirées". None of that
// is addressed to someone who already signed with LYFE and is opening
// the portal to run tonight's service. It is now the mark, one sentence
// about what is behind the form, and the country.
//
// The form is the whole of it: an address and a password. There is no
// account list to pick from, no guest entry and no demo shortcut — every
// one of those is a way into the portal that does not exist in
// production, and a reviewer who uses one is not reviewing the product.

export const metadata: Metadata = { title: "Connexion · LYFE" };

export default function LoginPage() {
  // The same density as the six screens behind it.
  //
  // Connexion and Inscription are two of the eight screens of Lot 1,
  // and Inscription already declared the host scale while Connexion
  // did not: the door to a 16px product was a 14px screen with 12px
  // secondary text, which is under the floor this density sets. The
  // eight screens now read at one size.
  const host = activeLot() === 1;
  return (
    <main
      data-density={host ? "host" : undefined}
      className="min-h-screen flex flex-col md:flex-row"
    >
      {/* === Left column — the mark, on the dark panel === */}
      <section className="bg-surface-ink text-canvas flex flex-col justify-between p-8 md:p-12 lg:p-16 md:basis-1/2 md:flex-shrink-0">
        {/* `self-start` so the mark keeps its own width: stretched to the
            flex cross-axis, `objectFit: contain` centres the artwork and
            the logo drifts into the middle of the panel. */}
        <div className="self-start">
          <Brand size="lg" variant="white" />
        </div>

        <div className="mt-16 md:mt-0">
          {/* No eyebrow.
              « ESPACE PARTENAIRE » in 11px tracked capitals above the
              headline was two things this audit removes: a label above a
              heading that the heading does not need, and a size under
              the 13px floor. The sentence underneath already says whose
              space this is. */}
          <h1
            className="text-h1 max-w-[19ch]"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
          >
            {COPY.auth.hero}
          </h1>
        </div>

        {/* `/55` measured 5,1:1 at 12px and 4,3:1 once this screen
            joined the host density and the same class became 13px —
            the ratio moves with the size because the threshold does.
            `/70` is 6,6:1, and the line is a signature rather than
            something to read, so there is nothing to lose by making it
            legible. */}
        <p className="text-meta text-canvas/70 mt-16 md:mt-0">LYFE · Maroc</p>
      </section>

      {/* === Right column — the one form === */}
      <section className="bg-surface flex items-center justify-center p-6 md:p-12 md:basis-1/2 md:flex-1 border-t md:border-t-0 md:border-l border-line-soft min-h-[60vh] md:min-h-screen">
        {/* The panel reads `?expired=1`, so it needs a boundary for the
            static shell to render around. */}
        <Suspense fallback={<div className="w-full max-w-[400px] h-[420px]" />}>
          <SignInPanel />
        </Suspense>
      </section>
    </main>
  );
}
