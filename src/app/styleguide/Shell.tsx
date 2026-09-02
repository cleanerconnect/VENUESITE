"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// The styleguide's own chrome — deliberately plain, so nothing here
// competes with the components on display.

export interface SectionDef {
  id: string;
  title: string;
  /** One line on when to reach for this group. */
  blurb?: string;
  content: ReactNode;
}

export function StyleguideShell({ sections }: { sections: SectionDef[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  // Scroll-spy: the nav follows the reader rather than needing a click.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-88px 0px -70% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line-soft bg-surface sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-baseline gap-4 flex-wrap">
          <span className="text-h3 text-ink">Styleguide</span>
          <span className="text-meta text-ink-mute">
            Chaque composant du portail LYFE, dans chacun de ses états.
          </span>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-8 grid lg:grid-cols-[180px_1fr] gap-10 items-start">
        <nav className="hidden lg:block sticky top-[88px]">
          <ul className="flex flex-col gap-0.5">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={cn(
                    "block px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors",
                    active === s.id
                      ? "bg-violet-soft text-ink font-semibold"
                      : "text-ink-mute hover:text-ink hover:bg-ink/[0.03]",
                  )}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 space-y-16">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-[88px]">
              <h2 className="text-h2 text-ink">{s.title}</h2>
              {s.blurb ? (
                <p className="text-body text-ink-soft mt-1.5 max-w-2xl">
                  {s.blurb}
                </p>
              ) : null}
              <div className="mt-6 space-y-8">{s.content}</div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

/** One labelled specimen. The label is the prop combination it shows. */
export function Specimen({
  name,
  note,
  children,
  /** `ink` puts the specimen on a dark ground for on-dark components. */
  ground = "canvas",
}: {
  name: string;
  note?: string;
  children: ReactNode;
  ground?: "canvas" | "ink";
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap mb-2.5">
        <code className="text-[12px] font-semibold text-ink bg-ink/[0.05] px-1.5 py-0.5 rounded">
          {name}
        </code>
        {note ? <span className="text-meta text-ink-mute">{note}</span> : null}
      </div>
      <div
        className={cn(
          "rounded-[var(--radius-lg)] border p-5",
          ground === "ink"
            ? "bg-surface-ink border-transparent"
            : "bg-canvas-2 border-line-soft",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A row of specimens that should be read side by side. */
export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  );
}
