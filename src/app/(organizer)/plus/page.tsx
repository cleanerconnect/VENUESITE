"use client";

import { MobilePlusMenu } from "@/components/organizer/MobilePlusMenu";

// "Plus" tab — secondary navigation hub on mobile. Renders the
// shared MobilePlusMenu so it stays in lockstep with the hamburger
// drawer (which uses the same component).
export default function PlusPage() {
  return <MobilePlusMenu />;
}
