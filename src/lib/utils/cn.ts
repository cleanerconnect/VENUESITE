import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with conflict resolution, used everywhere a
 * component composes classes from props.
 *
 * The `--text-*` namespace in globals.css generates `text-control-sm`,
 * `-md` and `-lg` as font sizes. tailwind-merge cannot know that: it read
 * them as text *colours*, so every `cn("bg-ink text-canvas", "… h-9
 * text-control-sm")` dropped `text-canvas` as the losing colour and left
 * a navy label on a navy button — Accepter, Check-in and every other
 * primary CTA with its text the same colour as its fill. The three names
 * are declared here so the merge puts them in the font-size group where
 * they belong.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["control-sm", "control-md", "control-lg"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
