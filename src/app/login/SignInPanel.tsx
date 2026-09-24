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
//
// Two affordances a partner expects of any login and had to be added:
// revealing the password, because a host types it on a stand with one
// hand; and asking for a reset link, which answers the same way whether
// or not the address is known, for the same reason the failure message
// is single.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  Info,
  Mail,
  TriangleAlert,
} from "lucide-react";
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

export function SignInPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [remember, setRemember] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ name: "form" });
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setNotice(null);

    startTransition(async () => {
      const result = await signIn(email, password, remember);

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

  // No mail is sent — there is no backend to send it. What ships is the
  // answer a partner must get either way: the same sentence whether or
  // not the address is on file, so the form cannot be used to find out
  // who has an account.
  const forgot = () => {
    setError(null);
    setNotice(
      email.includes("@") ? COPY.auth.forgotSent : COPY.auth.forgotNeedsEmail,
    );
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

            {notice ? (
              <Notice tone="info" icon={<Mail size={15} strokeWidth={1.8} />}>
                {notice}
              </Notice>
            ) : null}

            {/* The failure is one fact about the pair, so it is stated
                once here; the fields below only show that they are the
                ones being asked about again. */}
            {error ? (
              <Notice
                tone="danger"
                icon={<TriangleAlert size={15} strokeWidth={1.8} />}
              >
                {error}
              </Notice>
            ) : null}

            <form onSubmit={submit} className="flex flex-col gap-4 mt-6">
              <Input
                label={COPY.auth.email}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                invalid={Boolean(error)}
                required
                disabled={pending}
              />
              <Input
                label={COPY.auth.password}
                type={revealed ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                invalid={Boolean(error)}
                required
                disabled={pending}
                suffix={
                  <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    aria-label={
                      revealed ? COPY.auth.hidePassword : COPY.auth.showPassword
                    }
                    title={
                      revealed ? COPY.auth.hidePassword : COPY.auth.showPassword
                    }
                    aria-pressed={revealed}
                    className="h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center text-ink-mute hover:text-ink hover:bg-canvas-2 transition-colors"
                  >
                    {revealed ? (
                      <EyeOff size={16} strokeWidth={1.8} />
                    ) : (
                      <Eye size={16} strokeWidth={1.8} />
                    )}
                  </button>
                }
              />

              <div className="flex items-center justify-between gap-3 -mt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={pending}
                    className="h-4 w-4 rounded-[4px] border-line accent-[var(--color-violet-deep)] cursor-pointer"
                  />
                  <span className="text-meta text-ink-soft">
                    {COPY.auth.remember}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={forgot}
                  disabled={pending}
                  className="text-meta text-ink-soft underline underline-offset-2 hover:text-ink transition-colors disabled:opacity-50"
                >
                  {COPY.auth.forgot}
                </button>
              </div>

              <Button
                type="submit"
                size="lg"
                fullWidth
                disabled={pending || !email.includes("@") || password.length === 0}
              >
                {pending ? COPY.auth.submitting : COPY.auth.submit}
              </Button>
            </form>

            {/* Someone who is not a partner yet has reached a form no
                credentials will open. This is the only thing on the
                screen that is of any use to them. */}
            <p className="text-meta text-ink-mute mt-4">
              {COPY.auth.notPartner}{" "}
              <a
                href={`mailto:${COPY.auth.notPartnerEmail}`}
                className="text-ink underline underline-offset-2 hover:text-violet-deep transition-colors"
              >
                {COPY.auth.notPartnerEmail}
              </a>
            </p>

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
