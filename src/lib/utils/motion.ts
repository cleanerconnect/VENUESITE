// Motion timing primitives. Default ease is decisive, no bounce.
import type { Transition, Variants } from "motion/react";

export const ease = [0.22, 1, 0.36, 1] as const;
export const fast: Transition = { duration: 0.18, ease };
export const med: Transition = { duration: 0.32, ease };
export const slow: Transition = { duration: 0.48, ease };

// Page-mount stagger, used by the Overview cinematic first paint.
// Children fade up 8px with 40ms stagger.
export const pageStagger: Variants = {
  hidden: {},
  shown: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

export const childFade: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.32, ease } },
};
