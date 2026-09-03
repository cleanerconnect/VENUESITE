"use client";

// The front door.
//
// One form for every partner. What happens after it depends on what the
// account holds, not on which door was used — there is no separate event
// entrance and venue entrance, because a partner who runs both should
// not have to remember which URL is which.
//
// Five outcomes, all reachable from this component:
//
//   submitting     the button reports it, the form locks
//   invalid        one message for wrong email and wrong password alike
//   redirect       one workspace, or an account holding both
//   choose_venue   more than one venue and no organisation
//   no_workspace   credentials fine, nothing attached yet
//
// The sixth state, an expired session, arrives as `?expired=1` from the
// middleware and renders as a notice above the form.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clock, Info, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { chooseVenue, signIn, type VenueChoice } from "@/app/actions/auth";
import { COPY } from "@/lib/copy/fr";
import { cn } from "@/lib/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

type Stage =
  | { name: "form" }
  | { name: "choose_venue"; venues: VenueChoice[] }
  | { name: "no_workspace"; fullName: string };

export function SignInPanel({
  demoAccounts,
}: {
  demoAccounts: { email: string; password: string; label: string; description: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ name: "form" });
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);

    startTransition(async () => {
      const result = await signIn(email, password);

      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.kind === "redirect") {
        // `refresh()` first so the shell re-renders against the new
        // session cookie rather than the one it was built with.
        router.replace(result.href);
        router.refresh();
        return;
      }
      if (result.kind === "choose_venue") {
        setStage({ name: "choose_venue", venues: result.venues });
        return;
      }
      setStage({ name: "no_workspace", fullName: result.fullName });
    });
  };

  const pick = (venueId: string) =>
    startTransition(async () => {
      const result = await chooseVenue(venueId);
      if (!result.ok) {
        setError(result.message ?? COPY.error.body);
        setStage({ name: "form" });
        return;
      }
      router.replace(result.href!);
      router.refresh();
    });

  return (
    <div className="w-full max-w-[400px]">
      <AnimatePresence mode="wait">
        {stage.name === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <h2 className="text-h2 text-ink">{COPY.auth.title}</h2>
            <p className="text-body text-ink-soft mt-1.5">
              {COPY.auth.subtitle}
            </p>

            {expired ? (
              <Notice tone="info" icon={<Clock size={15} strokeWidth={1.8} />}>
                {COPY.auth.expired}
              </Notice>
            ) : null}

            <form onSubmit={submit} className="flex flex-col gap-4 mt-6">
              <Input
                label={COPY.auth.email}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                error={error ?? undefined}
                required
                disabled={pending}
              />
              <Input
                label={COPY.auth.password}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={pending}
              />
              <Button
                type="submit"
                size="lg"
                fullWidth
                disabled={pending || !email.includes("@") || password.length === 0}
              >
                {pending ? COPY.auth.submitting : COPY.auth.submit}
              </Button>
            </form>

            <div className="mt-7 pt-6 border-t border-line-soft">
              <div className="text-eyebrow text-ink-soft">
                {COPY.auth.demoAccounts}
              </div>
              <p className="text-meta text-ink-mute mt-1.5">
                {COPY.auth.demoAccountsHint}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {demoAccounts.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    disabled={pending}
                    // Fills the form rather than signing in, so the
                    // credentials are visible and the form is still the
                    // thing being demonstrated.
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(a.password);
                      setError(null);
                    }}
                    className={cn(
                      "group text-left rounded-[var(--radius-sm)] border border-line",
                      "bg-surface hover:border-ink/40 transition-colors px-3.5 py-2.5",
                      "disabled:opacity-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13.5px] font-semibold text-ink">
                        {a.label}
                      </span>
                      <ArrowRight
                        size={14}
                        strokeWidth={2}
                        className="text-ink-mute shrink-0 group-hover:text-ink transition-colors"
                      />
                    </div>
                    <div className="text-meta text-ink-mute mt-0.5">
                      {a.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : stage.name === "choose_venue" ? (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <h2 className="text-h2 text-ink">{COPY.auth.chooseVenue}</h2>
            <p className="text-body text-ink-soft mt-1.5">
              {COPY.auth.chooseVenueBody}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {stage.venues.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={pending}
                  onClick={() => pick(v.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-md)] border border-line",
                    "bg-surface hover:border-ink/40 transition-colors p-3.5 text-left",
                    "disabled:opacity-50",
                  )}
                >
                  <span
                    aria-hidden
                    className="h-10 w-10 rounded-chip bg-violet-soft text-violet-deep flex items-center justify-center text-[13px] font-bold shrink-0"
                  >
                    {v.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink truncate">
                      {v.name}
                    </span>
                    <span className="block text-meta text-ink-mute">
                      {v.kind === "drinks" ? "Bar" : "Restaurant"} · {v.city}
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    strokeWidth={2}
                    className="text-ink-mute shrink-0"
                  />
                </button>
              ))}
            </div>
            {error ? (
              <Notice tone="danger" icon={<TriangleAlert size={15} strokeWidth={1.8} />}>
                {error}
              </Notice>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <Card variant="canvas-2" size="lg">
              <span
                aria-hidden
                className="h-10 w-10 rounded-chip bg-surface flex items-center justify-center"
              >
                <Info size={18} strokeWidth={1.8} className="text-ink-mute" />
              </span>
              <h2 className="text-h3 text-ink mt-4">
                {COPY.auth.noWorkspaceTitle}
              </h2>
              <p className="text-body text-ink-soft mt-2">
                Bonjour {stage.fullName}. {COPY.auth.noWorkspaceBody}
              </p>
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => setStage({ name: "form" })}
              >
                {COPY.action.back}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: "info" | "danger";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "mt-5 flex items-start gap-2.5 rounded-[var(--radius-sm)] px-3.5 py-3 text-[13px]",
        tone === "info"
          ? "bg-violet-soft text-violet-deep"
          : "bg-tint-rose text-danger",
      )}
    >
      <span aria-hidden className="mt-[1px] shrink-0">
        {icon}
      </span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
