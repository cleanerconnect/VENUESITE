import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Brand } from "@/components/organizer/Brand";

// Placeholder contact / demo request page. Real product will route this
// through a Calendly embed or HubSpot form. For now it's a polite stub
// so the "Demander une démo" link from /login resolves cleanly.
export default function ContactPage() {
  return (
    <main className="min-h-screen bg-canvas flex flex-col">
      <header className="px-6 md:px-10 py-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-meta text-ink-soft hover:text-ink transition-colors font-semibold"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Retour
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[540px] text-center">
          <div className="flex justify-center">
            <Brand height={56} />
          </div>

          <h1
            className="text-ink mt-10"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(36px, 5vw, 52px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Parlons de votre événement.
          </h1>
          <p className="text-body text-ink-soft mt-4 leading-relaxed">
            LYFE est en accès anticipé pour les organisateurs marocains.
            Écrivez-nous, un membre de l&apos;équipe vous répondra sous 24
            heures avec une démo personnalisée.
          </p>

          <a
            href="mailto:hello@lyfe.ma?subject=Demande%20d%27acc%C3%A8s%20organisateur"
            className="mt-10 inline-flex items-center gap-2.5 h-14 px-7 rounded-[var(--radius-md)] bg-ink text-canvas hover:bg-ink-soft font-semibold text-[15px] transition-colors"
          >
            <Mail size={16} strokeWidth={1.8} />
            hello@lyfe.ma
          </a>

          <p className="text-meta text-ink-mute mt-6">
            Casablanca · Rabat · Marrakech
          </p>
        </div>
      </div>
    </main>
  );
}
