"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Brand } from "@/components/organizer/Brand";
import { readSession, seedDemoSession } from "@/lib/auth/session";

const HOLD_MS = 1200;
const EASE = [0.22, 1, 0.36, 1] as const;

export default function SplashPage() {
  // useSearchParams must live inside a Suspense boundary in Next 14.
  return (
    <Suspense fallback={<SplashShell />}>
      <SplashInner />
    </Suspense>
  );
}

function SplashShell() {
  return (
    <main
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "var(--color-ink)" }}
      aria-hidden
    />
  );
}

function SplashInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (search.get("demo") === "1") {
      seedDemoSession();
      router.replace("/dashboard");
      return;
    }

    const dismiss = () => setVisible(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);

    const t = window.setTimeout(dismiss, HOLD_MS);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [router, search]);

  const handleAnimationComplete = () => {
    if (visible) return;
    const session = readSession();
    router.replace(session ? "/dashboard" : "/login");
  };

  return (
    <main
      onClick={() => setVisible(false)}
      role="button"
      aria-label="Continuer"
      tabIndex={0}
      className="fixed inset-0 flex items-center justify-center cursor-pointer focus:outline-none"
      style={{ background: "var(--color-ink)" }}
    >
      <AnimatePresence onExitComplete={handleAnimationComplete}>
        {visible ? (
          <motion.div
            key="logo"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Brand height={88} variant="white" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <span className="sr-only">
        Appuyez sur la barre d&apos;espace ou cliquez pour continuer.
      </span>
    </main>
  );
}
