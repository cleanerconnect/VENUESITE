"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { readSession, seedDemoSession, type Role } from "@/lib/auth/session";

const HOLD_MS = 2000;
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
      className="fixed inset-0 flex items-center justify-center bg-canvas"
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
      const roleParam = search.get("role");
      const role: Role =
        roleParam === "scanner" || roleParam === "admin" ? roleParam : "owner";
      seedDemoSession(role);
      router.replace("/dashboard");
      return;
    }

    const t = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [router, search]);

  const handleAnimationComplete = () => {
    if (visible) return;
    const session = readSession();
    router.replace(session ? "/dashboard" : "/login");
  };

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-canvas">
      <AnimatePresence onExitComplete={handleAnimationComplete}>
        {visible ? (
          <motion.div
            key="logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Image
              src="/lyfe-logo.jpg"
              alt="LYFE"
              width={320}
              height={120}
              priority
              style={{
                height: "auto",
                width: "min(280px, 56vw)",
                mixBlendMode: "multiply",
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
