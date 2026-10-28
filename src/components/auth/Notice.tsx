"use client";

// The one sentence a door screen says back.
//
// Lived inside `SignInPanel` while Connexion was the only screen in
// front of the portal that answered anything. There are three now —
// Connexion, « Mot de passe oublié » and « Nouveau mot de passe » — and
// all three say the same kinds of thing in the same place: a neutral
// confirmation, or a refusal. Copied into each one it would have been
// three chances for the violet-soft notice and the rose one to drift
// apart on screens a partner sees one after the other.
//
// `info` is deliberately not green. « Si un compte existe pour cette
// adresse… » is not a success — nothing was confirmed — and painting it
// as one is how a partner with a typo in their address waits for a mail
// that was never addressed to them.

import { cn } from "@/lib/utils/cn";

export function Notice({
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
