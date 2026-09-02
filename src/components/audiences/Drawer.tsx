"use client";

import type { ReactNode } from "react";
import { SideSheet } from "@/components/ui/SideSheet";

/**
 * @deprecated Use `SideSheet` from `@/components/ui`. Kept as a thin
 * alias so the /audiences call sites did not all have to move in the
 * same commit; it adds nothing but the editorial title style.
 */
export function Drawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return <SideSheet {...props} titleStyle="editorial" />;
}
