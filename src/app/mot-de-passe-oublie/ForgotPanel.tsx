"use client";

// One field, and an answer that says nothing about the account.
//
// The confirmation is neutral on purpose and it is the same sentence
// whether or not the address is on file — « Si un compte existe pour
// cette adresse… ». A screen that answered « adresse inconnue » would
// be an annuaire of LYFE's partners, openable by anyone, and the rule
// is already in the contract (§ 5.1 bis).
//
// What does change is whether anything was asked to send a mail. An
// instance with no service behind it says so and points at « Nous
// contacter », rather than leaving someone locked out of tonight's
// service refreshing an inbox.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Info, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/auth/Notice";
import { requestPasswordReset } from "@/app/actions/auth";
import { COPY } from "@/lib/copy/fr";

export function ForgotPanel() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      setNotice(result.message);
    });
  };

  return (
    <div className="w-full max-w-[400px]">
      <h2 className="text-h2 text-ink">{COPY.password.forgotTitle}</h2>
      <p data-prose className="text-body text-ink-soft mt-2">
        {COPY.password.forgotBody}
      </p>

      {/* One notice, both answers. The tone is `info` in both cases:
          nothing here is a success — the whole point is that the screen
          does not know whether the address exists. */}
      {notice ? (
        <Notice
          tone="info"
          icon={
            notice === COPY.auth.forgotSent ? (
              <Mail size={15} strokeWidth={1.8} />
            ) : (
              <Info size={15} strokeWidth={1.8} />
            )
          }
        >
          {notice}
        </Notice>
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-4 mt-6">
        <Input
          label={COPY.auth.email}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={pending}
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={pending || !email.includes("@")}
        >
          {pending ? COPY.password.forgotSubmitting : COPY.password.forgotSubmit}
        </Button>
      </form>

      {/* The way back, and the way round. « Nous contacter » is not
          decoration: it is what a partner does when the answer above
          says no mail service is connected. */}
      <div className="mt-7 pt-6 border-t border-line-soft flex items-center justify-between gap-3">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-meta text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.8} aria-hidden />
          {COPY.password.backToSignIn}
        </Link>
        <Link
          href="/contact"
          className="text-meta text-ink-soft underline underline-offset-2 hover:text-ink transition-colors"
        >
          Nous contacter
        </Link>
      </div>
    </div>
  );
}
