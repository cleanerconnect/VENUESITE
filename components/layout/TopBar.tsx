"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBack, IconBell } from "./icons";

export function TopBar({
  title,
  eyebrow,
  showBack = false,
  action,
  liveDot = false,
}: {
  title?: string;
  eyebrow?: string;
  showBack?: boolean;
  action?: React.ReactNode;
  liveDot?: boolean;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-md border-b border-line/80">
      <div className="h-[58px] px-4 md:px-8 flex items-center justify-between max-w-content mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="md:hidden h-9 w-9 -ml-2 flex items-center justify-center text-ink hover:bg-ink/5 rounded-md transition-colors"
              aria-label="Retour"
            >
              <IconBack />
            </button>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <div className="eyebrow text-muted-2 leading-none mb-1 hidden md:block">
                {eyebrow}
              </div>
            ) : null}
            {title ? (
              <h1 className="h-display text-[15px] md:text-[17px] text-ink truncate flex items-center gap-2">
                {title}
                {liveDot ? <span className="live-dot" aria-label="En direct" /> : null}
              </h1>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Link
            href="/notifications"
            className="hidden md:inline-flex h-9 w-9 items-center justify-center text-muted hover:text-ink hover:bg-ink/5 rounded-md transition-colors"
            aria-label="Notifications"
          >
            <IconBell />
          </Link>
        </div>
      </div>
    </header>
  );
}
