"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readSession } from "@/lib/auth/session";

// Mounts on every protected page, checks localStorage for a valid session,
// and bounces to /login if absent or expired. Renders nothing until the
// check resolves to avoid a flash of authenticated UI on logged-out users.
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) return null;
  return <>{children}</>;
}
