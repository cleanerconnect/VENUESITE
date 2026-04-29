import Link from "next/link";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { Brand } from "@/components/organizer/Brand";

// Placeholder page so the "Mot de passe oublié ?" link in /login resolves
// instead of 404'ing. Real password reset (token email + form) lands with
// the Auth.js or Clerk swap — see docs/POST_BETA_HANDOFF.md.
export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-canvas flex flex-col">
      <header className="px-6 md:px-10 py-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-meta text-ink-soft hover:text-ink transition-colors font-semibold"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Retour à la connexion
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[480px] text-center">
          <div className="flex justify-center">
            <Brand height={48} />
          </div>

          <span
            aria-hidden
            className="mt-10 inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-soft"
          >
            <KeyRound size={22} strokeWidth={1.7} className="text-violet-deep" />
          </span>

          <h1
            className="text-ink mt-6"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(28px, 4vw, 40px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Réinitialisation de mot de passe.
          </h1>
          <p className="text-body text-ink-soft mt-4 leading-relaxed">
            Pendant le BETA, la réinitialisation passe par l&apos;équipe
            LYFE. Écrivez-nous depuis l&apos;adresse email associée à votre
            compte organisateur — un membre de l&apos;équipe vous répond
            sous 24 heures.
          </p>

          <a
            href="mailto:hello@lyfe.ma?subject=R%C3%A9initialisation%20mot%20de%20passe"
            className="mt-8 inline-flex items-center gap-2.5 h-12 px-6 rounded-[var(--radius-md)] bg-ink text-canvas hover:bg-ink-soft font-semibold text-[14px] transition-colors"
          >
            <Mail size={16} strokeWidth={1.8} />
            hello@lyfe.ma
          </a>
        </div>
      </div>
    </main>
  );
}
