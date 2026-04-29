"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 70; // px pulled before refresh fires
const MAX_PULL = 110;

interface PullState {
  pulling: boolean;
  distance: number;
  refreshing: boolean;
}

// Lightweight pull-to-refresh affordance for the events list. Listens
// on touchstart at scrollTop 0, tracks vertical drag, fires the
// callback when the threshold is crossed. The indicator above the list
// rotates as you pull and spins while refreshing.
//
// Desktop pointer events are intentionally ignored — this is a touch
// gesture only. The hook returns the indicator props plus a wrapper
// ref that should be attached to the scroll container.
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PullState>({
    pulling: false,
    distance: 0,
    refreshing: false,
  });
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      // Only when we're scrolled to the top — otherwise the user is
      // doing a normal scroll and we should stay out of the way.
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) return;
      const distance = Math.min(MAX_PULL, delta * 0.55);
      setState({ pulling: true, distance, refreshing: false });
    };
    const onEnd = async () => {
      if (startY.current === null) return;
      const distance = state.distance;
      startY.current = null;
      if (distance >= PULL_THRESHOLD) {
        setState({ pulling: false, distance: PULL_THRESHOLD, refreshing: true });
        await onRefresh();
        setState({ pulling: false, distance: 0, refreshing: false });
      } else {
        setState({ pulling: false, distance: 0, refreshing: false });
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh, state.distance]);

  return { ref, ...state };
}

export function PullToRefreshIndicator({
  pulling,
  distance,
  refreshing,
}: {
  pulling: boolean;
  distance: number;
  refreshing: boolean;
}) {
  const reached = distance >= PULL_THRESHOLD;
  const opacity = Math.min(1, distance / 50);
  const rotation = (distance / PULL_THRESHOLD) * 360;
  // Slot pinned just above the list; height grows with pull, max 56px.
  const height = refreshing ? 48 : Math.min(48, distance * 0.7);
  return (
    <div
      aria-hidden={!pulling && !refreshing}
      className="md:hidden flex items-center justify-center overflow-hidden text-violet-deep"
      style={{
        height,
        opacity: refreshing ? 1 : opacity,
        transition: pulling ? undefined : "height 0.2s, opacity 0.2s",
      }}
    >
      {refreshing ? (
        <Loader2 size={18} strokeWidth={1.9} className="animate-spin" />
      ) : (
        <RefreshCw
          size={18}
          strokeWidth={1.9}
          style={{
            transform: `rotate(${rotation}deg)`,
            color: reached ? "var(--color-violet)" : "var(--color-violet-deep)",
            transition: pulling ? undefined : "transform 0.2s",
          }}
        />
      )}
    </div>
  );
}
