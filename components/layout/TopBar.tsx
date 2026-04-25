"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBack, IconBell } from "./icons";

export function TopBar({
  title,
  showBack = false,
  action,
}: {
  title?: string;
  showBack?: boolean;
  action?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-line">
      <div className="h-14 px-4 md:px-8 flex items-center justify-between max-w-content mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="md:hidden text-ink"
              aria-label="Retour"
            >
              <IconBack />
            </button>
          ) : null}
          {title ? (
            <h1 className="h-serif text-base md:text-lg text-ink truncate">
              {title}
            </h1>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Link
            href="/notifications"
            className="hidden md:inline-flex h-9 w-9 items-center justify-center text-ink hover:bg-ink/5"
            aria-label="Notifications"
          >
            <IconBell />
          </Link>
        </div>
      </div>
    </header>
  );
}
