import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with conflict resolution, used everywhere a
 * component composes classes from props.
 *
 * Every type utility in globals.css lives in the `text-*` namespace, and
 * so does every text colour. tailwind-merge cannot tell them apart: it
 * read `text-meta` and `text-h3` as *colours*, so in any
 * `cn("… text-meta", "… text-ink-mute")` the size lost the conflict and
 * was dropped. The step was still in globals.css and still in the
 * styleguide; it just never reached the screen. The rail on Inscription
 * was rendering its six step names at the browser's 16px/400 with
 * `text-meta` merged away, three pixels and a weight off the scale that
 * the same file declares — which is the type audit's worst kind of
 * finding, because nothing in the source looks wrong.
 *
 * So the whole namespace is declared here. A new `.text-…` step in
 * globals.css belongs in this list on the same commit; `tools/verify`
 * fails the build when one is missing.
 */
export const TYPE_UTILITIES = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "meta",
  "eyebrow",
  "nav",
  "mono",
  "control-sm",
  "control-md",
  "control-lg",
  "host-lead",
  "host-name",
  "host-detail",
  "host-slot",
  "metric-sm",
  "metric-md",
  "metric-lg",
  "metric-xl",
] as const;

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TYPE_UTILITIES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
