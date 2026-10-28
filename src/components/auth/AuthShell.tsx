import { Brand } from "@/components/organizer/Brand";
import { COPY } from "@/lib/copy/fr";
import { activeLot } from "@/lib/lot";

// The door, and the three screens behind it.
//
// Connexion was the only one of these for a long time, so the dark
// panel and the 400px column lived in `/login/page.tsx`. `Détail
// Sprint ` ligne 53 added two — « Mot de passe oublié » and « Nouveau
// mot de passe » — and a partner walks from the first to the second
// with a mail in between: a panel that moved by four pixels on the way
// would be the one thing they noticed.
//
// So the layout is here, once, and the three pages differ only by what
// they put in the right column. Everything below is the markup Connexion
// already rendered, comments included, because the capture on Figma
// page 09 is of that markup and a redraw has to be the same screen.

export function AuthShell({ children }: { children: React.ReactNode }) {
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
      {/* === Left column — the mark, on the dark panel ===
          On a phone it is a strip, not a column.
          Drawn as a column it was 340px of dark panel above the form:
          the mark at its large cut, 64px of air, two lines of serif
          headline, 64px more air and a signature — and the page then
          ran 995px against an 844px screen, so « Se connecter » was
          under the fold on the one screen whose whole job is that
          button. The review's own words: a small logo and the form
          immediately, the headline reduced to a one-line strip.
          So below 768 the same three pieces lie on one 56px line — the
          small cut of the mark, the headline on a single truncated
          line, and the signature dropped, since « LYFE · Maroc » under
          the LYFE mark is the mark again. */}
      <section className="bg-surface-ink text-canvas flex items-center gap-3 px-5 py-3 md:flex-col md:justify-between md:items-stretch md:gap-0 md:p-12 lg:p-16 md:basis-1/2 md:flex-shrink-0">
        {/* `self-start` so the mark keeps its own width: stretched to the
            flex cross-axis, `objectFit: contain` centres the artwork and
            the logo drifts into the middle of the panel. */}
        <div className="shrink-0 md:self-start">
          <span className="md:hidden">
            <Brand size="sm" variant="white" />
          </span>
          <span className="hidden md:block">
            <Brand size="lg" variant="white" />
          </span>
        </div>

        <div className="min-w-0 md:mt-0">
          {/* No eyebrow.
              « ESPACE PARTENAIRE » in 11px tracked capitals above the
              headline was two things this audit removes: a label above a
              heading that the heading does not need, and a size under
              the 13px floor. The sentence underneath already says whose
              space this is. */}
          <h1
            className="text-meta text-canvas/70 truncate md:text-h1 md:text-canvas md:whitespace-normal md:max-w-[19ch]"
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
        <p className="hidden md:block text-meta text-canvas/70 md:mt-0">
          LYFE · Maroc
        </p>
      </section>

      {/* === Right column — the one form === */}
      {/* `min-h-[60vh]` is gone from the phone: 60% of the viewport
          under a 340px panel is how the page came to be taller than the
          screen. The column is its content's height now, and the form
          is the tallest thing in it. */}
      <section className="bg-surface flex flex-1 items-center justify-center p-6 md:p-12 md:basis-1/2 md:flex-1 border-t md:border-t-0 md:border-l border-line-soft md:min-h-screen">
        {children}
      </section>
    </main>
  );
}
