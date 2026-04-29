"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { ArrowRight, CheckCircle2, MailOpen } from "lucide-react";
import { Brand } from "@/components/organizer/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useToast } from "@/components/ui/Toast";
import { seedDemoSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

// Three rotating organizer testimonials. The list signals to investors
// that LYFE has more than the Jazzablanca anchor account; quotes rotate
// every 8 seconds with an opacity crossfade. Only renders on desktop —
// mobile gets the static first entry.
const TESTIMONIALS: { quote: string; attribution: string }[] = [
  {
    quote:
      "LYFE nous a permis de gérer la billetterie de notre 19e édition sans friction.",
    attribution: "— Équipe Jazzablanca",
  },
  {
    quote:
      "On a vendu nos vendredis plus vite avec LYFE qu'avec n'importe quelle plateforme avant. Les versements arrivent à J+3, sans relance.",
    attribution: "— Soirée Atlas, Tanger",
  },
  {
    quote:
      "Pour un festival itinérant comme le nôtre, voir tous les chiffres au même endroit a tout changé sur la coordination des éditions.",
    attribution: "— L'Boulevard Festival",
  },
];

const TESTIMONIAL_INTERVAL_MS = 8000;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<"magic" | "password">("magic");
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  const handleDemo = () => {
    seedDemoSession();
    toast({
      tone: "success",
      title: "Session démo Jazzablanca activée",
    });
    router.push("/dashboard");
  };

  // Cycle the testimonial every 8s on desktop. Skip the timer entirely
  // when the user prefers reduced motion — they get the first quote and
  // it stays.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;
    const t = window.setInterval(
      () => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length),
      TESTIMONIAL_INTERVAL_MS,
    );
    return () => window.clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* === Left column — editorial identity === */}
      <section className="relative bg-canvas flex flex-col justify-between p-6 md:p-12 lg:p-16 md:basis-3/5 md:flex-shrink-0 overflow-hidden">
        {/* Ambient drifting gradient — desktop only, ~20s cycle, blurred,
            never opaque enough to fight the headline. CSS-driven keyframes
            in globals.css; respects prefers-reduced-motion. */}
        <div aria-hidden className="login-gradient-bg" />

        <div className="relative z-10">
          <Brand height={52} />

          <div className="mt-10 md:mt-16 text-eyebrow text-ink-mute">
            Espace Organisateur
          </div>
          <h1
            className="text-ink mt-3 max-w-[14ch]"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(36px, 5.4vw, 64px)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            Le système d&apos;exploitation de vos événements.
          </h1>
          <p className="text-body text-ink-soft mt-5 max-w-md leading-relaxed hidden md:block">
            Billetterie, audience, paiements et analyses — sur la même
            plateforme. Pour les festivals, salles, et créateurs
            d&apos;événements au Maroc.
          </p>
        </div>

        {/* Stat tiles + quote — desktop only per spec */}
        <div className="hidden md:block mt-10 relative z-10">
          <div className="grid grid-cols-3 gap-3 max-w-2xl">
            <AnimatedStatTile
              value={45000}
              format={(n) =>
                `+${Math.round(n).toLocaleString("fr-FR").replace(/,/g, " ")}`
              }
              label="personnes touchées"
            />
            <AnimatedStatTile value={12} label="villes au Maroc" />
            <StatTile number="J+3" label="versement garanti" />
          </div>

          <blockquote className="mt-10 max-w-md min-h-[120px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <p
                  className="text-ink-mute leading-relaxed"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: "17px",
                    lineHeight: 1.5,
                  }}
                >
                  &laquo; {TESTIMONIALS[testimonialIdx].quote} &raquo;
                </p>
                <footer className="text-meta text-ink-soft mt-2">
                  {TESTIMONIALS[testimonialIdx].attribution}
                </footer>
              </motion.div>
            </AnimatePresence>
          </blockquote>
        </div>
      </section>

      {/* === Right column — login form === */}
      <section className="bg-surface flex items-center justify-center p-6 md:p-12 md:basis-2/5 md:flex-1 border-t md:border-t-0 md:border-l border-line-soft min-h-[60vh] md:min-h-screen">
        <div className="w-full max-w-[380px]">
          <RadixTabs.Root
            value={tab}
            onValueChange={(v) => setTab(v as "magic" | "password")}
          >
            <RadixTabs.List className="grid grid-cols-2 gap-1 p-1 bg-canvas-2 rounded-[var(--radius-md)] border border-line-soft">
              <TabTrigger value="magic" active={tab === "magic"}>
                Lien magique
              </TabTrigger>
              <TabTrigger value="password" active={tab === "password"}>
                Mot de passe
              </TabTrigger>
            </RadixTabs.List>

            <div className="mt-6">
              <RadixTabs.Content value="magic" className="outline-none">
                <MagicLinkForm />
              </RadixTabs.Content>
              <RadixTabs.Content value="password" className="outline-none">
                <PasswordForm
                  onSuccess={() => {
                    seedDemoSession();
                    router.push("/dashboard");
                  }}
                />
              </RadixTabs.Content>
            </div>
          </RadixTabs.Root>

          <div className="mt-6 pt-5 border-t border-line-soft">
            <button
              type="button"
              onClick={handleDemo}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-12 rounded-[var(--radius-md)]",
                "bg-violet-soft text-violet-deep font-semibold text-[14px]",
                "hover:bg-violet-soft/80 transition-colors",
              )}
            >
              <CheckCircle2 size={16} strokeWidth={1.8} className="text-violet-deep" />
              Connexion démo Jazzablanca
            </button>
            <p className="text-meta text-ink-mute text-center mt-2">
              Pré-rempli pour les démos investisseurs.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-meta text-ink-mute hover:text-ink transition-colors font-medium"
            >
              Pas encore d&apos;accès organisateur ? Demander une démo
              <ArrowRight size={12} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatTile({ number, label }: { number: string; label: string }) {
  return (
    <Card variant="violet-soft" size="sm" className="text-center">
      <div
        className="text-violet-deep num"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(20px, 2vw, 26px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {number}
      </div>
      <div className="text-meta text-ink-soft mt-1.5 leading-tight">
        {label}
      </div>
    </Card>
  );
}

function AnimatedStatTile({
  value,
  label,
  format,
}: {
  value: number;
  label: string;
  format?: (n: number) => string;
}) {
  return (
    <Card variant="violet-soft" size="sm" className="text-center">
      <div
        className="text-violet-deep num"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(20px, 2vw, 26px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        <AnimatedNumber value={value} format={format} duration={1.2} />
      </div>
      <div className="text-meta text-ink-soft mt-1.5 leading-tight">
        {label}
      </div>
    </Card>
  );
}

function TabTrigger({
  value,
  active,
  children,
}: {
  value: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        "relative h-10 text-[13.5px] font-semibold rounded-[var(--radius-sm)] transition-colors",
        active ? "text-ink" : "text-ink-mute hover:text-ink",
      )}
    >
      {active ? (
        <motion.span
          layoutId="login-tab-pill"
          className="absolute inset-0 bg-canvas border border-line rounded-[var(--radius-sm)] shadow-soft"
          transition={{ duration: 0.32, ease: EASE }}
        />
      ) : null}
      <span className="relative">{children}</span>
    </RadixTabs.Trigger>
  );
}

function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSent(true);
  };

  return (
    <AnimatePresence mode="wait">
      {!sent ? (
        <motion.form
          key="form"
          onSubmit={submit}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="flex flex-col gap-4"
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Button type="submit" size="lg" fullWidth disabled={!email.includes("@")}>
            Recevoir le lien.
          </Button>
        </motion.form>
      ) : (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="bg-canvas-2 border border-line-soft rounded-[var(--radius-md)] p-6 text-center"
        >
          <span
            aria-hidden
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-soft mb-4"
          >
            <MailOpen size={20} strokeWidth={1.7} className="text-violet-deep" />
          </span>
          <h3 className="text-h3 text-ink">Vérifiez vos emails.</h3>
          <p className="text-body text-ink-soft mt-2">
            Nous avons envoyé un lien à <strong className="text-ink">{email}</strong>.
            Le lien expire dans 15 minutes.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-meta font-semibold text-violet-deep hover:text-ink mt-4 transition-colors"
          >
            Renvoyer
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || password.length < 1) return;
    onSuccess();
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="flex flex-col gap-4"
    >
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <Input
        label="Mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      <Button type="submit" size="lg" fullWidth>
        Se connecter
      </Button>
      <Link
        href="/login/forgot"
        className="text-meta text-ink-soft hover:text-ink text-center font-medium transition-colors"
      >
        Mot de passe oublié ?
      </Link>
    </motion.form>
  );
}
