"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { readSession } from "@/lib/auth/session";

const HOLD_MS = 2000;
const EASE = [0.22, 1, 0.36, 1] as const;

export default function SplashPage() {
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
  const [visible, setVisible] = useState(true);

  // `?demo=1&role=…` used to mint a session here and drop straight into
  // the dashboard, skipping the form entirely. A way in that does not
  // exist in production is a way in nobody should be reviewing against.
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => window.clearTimeout(t);
  }, []);

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
              src="/lyfe-logo.png"
              alt="LYFE"
              width={828}
              height={344}
              priority
              style={{ height: "auto", width: "min(280px, 56vw)" }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
