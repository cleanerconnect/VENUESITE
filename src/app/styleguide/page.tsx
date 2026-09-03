import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { StyleguideShell, type SectionDef } from "./Shell";
import { TokensSection } from "./sections/tokens";
import { ControlsSection } from "./sections/controls";
import { SurfacesSection } from "./sections/surfaces";
import { BlocksSection } from "./sections/blocks";
import { VocabularySection } from "./sections/vocabulary";
import { StatesSection } from "./sections/states";
import { RoutesSection } from "./sections/routes";

// The styleguide.
//
// Every component the portal ships, in every state it can be in, on one
// route. It reads no database and no session — everything on this page
// is rendered from literal props — so it works before the backend
// exists, and a component that cannot be rendered here is a component
// that is too entangled with the data layer to hand over.
//
// Treat a broken specimen as a broken component.

export const metadata: Metadata = { title: "Styleguide · LYFE" };

const SECTIONS: SectionDef[] = [
  {
    id: "tokens",
    title: "Tokens",
    blurb:
      "Couleurs, typographie, rayons, ombres et mouvement. Lus depuis les variables CSS — modifier globals.css modifie cette page.",
    content: <TokensSection />,
  },
  {
    id: "controls",
    title: "Contrôles",
    blurb:
      "Ce sur quoi on clique et ce qu'on remplit. Chaque état — vide, rempli, en erreur, désactivé.",
    content: <ControlsSection />,
  },
  {
    id: "surfaces",
    title: "Surfaces",
    blurb:
      "Cartes, pastilles, en-têtes, tuiles, tiroirs, états vides et squelettes de chargement.",
    content: <SurfacesSection />,
  },
  {
    id: "blocks",
    title: "Blocs d'écran",
    blurb:
      "Le vocabulaire du moteur de specs. Chaque bloc est rendu ici depuis une spec écrite à la main, par le même renderer que l'application.",
    content: <BlocksSection />,
  },
  {
    id: "states",
    title: "États",
    blurb:
      "Ce qu'un écran montre quand ses données ne sont pas là : chargement, vide, échec, accès refusé. Chaque route peut être forcée dans l'un d'eux depuis son URL.",
    content: <StatesSection />,
  },
  {
    id: "vocabulary",
    title: "Vocabulaire",
    blurb:
      "Les termes du domaine — libellé, ton et icône — générés depuis les mêmes tables que l'application lit.",
    content: <VocabularySection />,
  },
  {
    id: "routes",
    title: "Écrans",
    blurb:
      "Tous les écrans du portail, avec un lien vers chacun, ce qu'il sert, qui peut l'ouvrir et ce qui lui manque encore.",
    content: <RoutesSection />,
  },
];

export default function StyleguidePage() {
  return (
    <ToastProvider>
      <StyleguideShell sections={SECTIONS} />
    </ToastProvider>
  );
}
