"use client";

// Two fields, and a token nobody on this side reads.
//
// `?jeton=` is what the mail's link carries. The portal never parses
// it, never checks its shape and never says whether it looks valid: a
// token's lifetime and its single use are facts only the service that
// minted it holds, and a screen that guessed would either refuse a good
// link or accept a spent one.
//
// The two password rules are the inscription's, word for word — eight
// characters, typed twice. A product with two password policies has one
// of them written on a sticky note.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Eye, EyeOff, Info, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/auth/Notice";
import { resetPassword } from "@/app/actions/auth";
import { COPY } from "@/lib/copy/fr";

export function ResetPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("jeton") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<"password" | "passwordConfirm" | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setField(null);
      const result = await resetPassword({
        token,
        password,
        passwordConfirm: confirm,
      });
      if (result.ok) {
        setDone(true);
        return;
      }
      setField(result.field ?? null);
      setError(result.message);
    });
  };

  // The password is set; there is nothing left on this screen to do.
  // It does not sign the partner in by itself: the session is the sign-in
  // form's to open, and a reset link that also logged someone in would
  // be a session handed out by whoever reads the mailbox.
  if (done) {
    return (
      <div className="w-full max-w-[400px]" data-reset-done>
        <h2 className="text-h2 text-ink">{COPY.password.resetTitle}</h2>
        <Notice tone="info" icon={<Check size={15} strokeWidth={1.8} />}>
          {COPY.password.resetDone}
        </Notice>
        <Button
          size="lg"
          fullWidth
          className="mt-6"
          iconRight={<ArrowRight size={16} strokeWidth={1.8} />}
          onClick={() => router.push("/login")}
        >
          {COPY.auth.submit}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <h2 className="text-h2 text-ink">{COPY.password.resetTitle}</h2>
      <p data-prose className="text-body text-ink-soft mt-2">
        {COPY.password.resetBody}
      </p>

      {/* A link with no token at all is the one thing the screen can
          judge on its own, and it says so before the two fields are
          filled in rather than after. */}
      {!token ? (
        <Notice tone="info" icon={<Info size={15} strokeWidth={1.8} />}>
          {COPY.password.resetNoToken}
        </Notice>
      ) : null}

      {error ? (
        <Notice tone="danger" icon={<TriangleAlert size={15} strokeWidth={1.8} />}>
          {error}
        </Notice>
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-4 mt-6">
        <Input
          label={COPY.password.next}
          type={revealed ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          invalid={field === "password"}
          hint={COPY.password.tooShort}
          required
          disabled={pending}
          suffix={
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={
                revealed ? COPY.auth.hidePassword : COPY.auth.showPassword
              }
              title={revealed ? COPY.auth.hidePassword : COPY.auth.showPassword}
              aria-pressed={revealed}
              className="h-11 w-11 rounded-[var(--radius-sm)] flex items-center justify-center text-ink-mute hover:text-ink hover:bg-canvas-2 transition-colors"
            >
              {revealed ? (
                <EyeOff size={16} strokeWidth={1.8} />
              ) : (
                <Eye size={16} strokeWidth={1.8} />
              )}
            </button>
          }
        />
        <Input
          label={COPY.password.confirm}
          type={revealed ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          invalid={field === "passwordConfirm"}
          required
          disabled={pending}
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={pending || password.length === 0 || confirm.length === 0}
        >
          {pending ? COPY.password.resetSubmitting : COPY.password.resetSubmit}
        </Button>
      </form>

      <div className="mt-7 pt-6 border-t border-line-soft flex items-center justify-between gap-3">
        <Link
          href="/login"
          className="text-meta text-ink-soft hover:text-ink transition-colors"
        >
          {COPY.password.backToSignIn}
        </Link>
        <Link
          href="/mot-de-passe-oublie"
          className="text-meta text-ink-soft underline underline-offset-2 hover:text-ink transition-colors"
        >
          {COPY.auth.forgot}
        </Link>
      </div>
    </div>
  );
}
