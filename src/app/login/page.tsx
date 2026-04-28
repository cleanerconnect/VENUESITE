"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { ArrowRight, CheckCircle2, MailOpen } from "lucide-react";
import { Brand } from "@/components/organizer/Brand";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { seedDemoSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<"magic" | "password">("magic");

  const handleDemo = () => {
    seedDemoSession();
    toast({
      tone: "success",
      title: "Session démo Jazzablanca activée",
    });
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-canvas flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12 md:py-16">
        <div className="w-full max-w-[440px]">
          <div className="flex flex-col items-center">
            <Brand height={56} />
          </div>

          <div className="mt-12 text-center">
            <h1
              className="text-ink"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: "clamp(40px, 6vw, 56px)",
                lineHeight: 1.02,
                letterSpacing: "-0.03em",
              }}
            >
              Bienvenue.
            </h1>
            <p className="text-body text-ink-soft mt-3">
              Espace organisateur LYFE.
            </p>
          </div>

          <RadixTabs.Root
            value={tab}
            onValueChange={(v) => setTab(v as "magic" | "password")}
            className="mt-10"
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

          <div className="mt-8 pt-6 border-t border-line-soft text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-meta text-ink-mute hover:text-ink transition-colors font-medium"
            >
              Pas encore d&apos;accès organisateur ? Demander une démo
              <ArrowRight size={12} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </div>

      {/* Demo entry — fixed to the bottom edge of the viewport with 24px clearance.
          Investors should see the door obviously. */}
      <div className="sticky bottom-0 px-6 pb-6 pt-3 bg-gradient-to-t from-canvas via-canvas to-canvas/0">
        <div className="max-w-[440px] mx-auto">
          <button
            type="button"
            onClick={handleDemo}
            className={cn(
              "w-full flex items-center justify-center gap-2 h-12 rounded-[var(--radius-md)]",
              "bg-violet-soft text-violet-deep font-semibold text-[14px]",
              "hover:bg-violet-soft/80 transition-colors",
            )}
          >
            <Sparkle />
            Connexion démo Jazzablanca
          </button>
          <p className="text-meta text-ink-mute text-center mt-2">
            Pré-rempli pour les démos investisseurs.
          </p>
        </div>
      </div>
    </main>
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

function Sparkle() {
  return (
    <CheckCircle2 size={16} strokeWidth={1.8} className="text-violet-deep" />
  );
}
