// ─────────────────────────────────────────────────────────────
// Screen spec — the serializable description of a dashboard screen.
//
// Nothing in `src/components/dashboard` knows what a restaurant, an
// event, a cover or a reservation is. Screens are *data*: an ordered
// list of blocks, each carrying its own copy, tones, icons and values.
// The renderer walks that list and paints it.
//
// Consequences that matter:
//   · every label, tone, span, icon and CTA is a value, never JSX
//   · a spec survives JSON.stringify, so the exact same object can come
//     back from `GET /api/screens/restaurant/dashboard` with no
//     component change
//   · adding a screen = adding a spec, not a page
//   · a screen can be reordered, A/B-ed, role-filtered or feature-flagged
//     server-side because the layout itself is payload
// ─────────────────────────────────────────────────────────────

import type { IconKey } from "./icons";

// ── Primitives ───────────────────────────────────────────────

/** Card surface treatments, mirrors ui/Card's variants. */
export type SurfaceTone =
  | "surface"
  | "ink"
  | "sand"
  | "sky"
  | "sage"
  | "rose"
  | "peach"
  | "violet-soft"
  | "canvas-2";

/** Semantic tones for pills, deltas and feed glyphs. */
export type SemanticTone =
  | "neutral"
  | "info"
  | "violet"
  | "success"
  | "warning"
  | "danger"
  | "live"
  | "muted";

/**
 * How a raw number becomes display text. Kept declarative so the
 * formatting decision travels with the datum instead of being retyped
 * at every call site.
 */
export type ValueFormat =
  | { kind: "text" }
  | { kind: "number"; decimals?: number }
  | { kind: "currency"; currency?: string; decimals?: number }
  | { kind: "percent"; decimals?: number }
  | { kind: "rating"; max?: number }
  | { kind: "duration"; unit: "minutes" | "seconds" }
  | { kind: "datetime"; pattern?: string }
  | { kind: "date"; pattern?: string }
  | { kind: "relative" }
  | { kind: "countdown"; unit: "days" | "hours" };

/** A value plus everything needed to render it without domain knowledge. */
export interface Metric {
  value: number | string;
  format?: ValueFormat;
  prefix?: string;
  suffix?: string;
  /** Count up on first paint. Numbers only. */
  animate?: boolean;
}

/** Signed change against a baseline, e.g. "+12,4 % vs hier". */
export interface Delta {
  value: number;
  /** Baseline caption, e.g. "vs hier". */
  period: string;
  /** Flip when down is good (no-shows, waste, waiting time). */
  invert?: boolean;
}

export interface Badge {
  label: string;
  tone?: SemanticTone;
  icon?: IconKey;
  dot?: boolean;
}

/**
 * Where an affordance goes, or what it runs. Serializable by
 * construction: `command` is a name resolved through the client command
 * registry, never a function.
 */
export type Intent =
  | { kind: "link"; href: string; external?: boolean }
  | {
      kind: "command";
      command: string;
      payload?: Record<string, string | number | boolean>;
    };

/** An intent that also carries its own presentation. */
export type Action = Intent & { label: string; icon?: IconKey };

export type ActionVariant = "primary" | "secondary" | "ghost";

export interface CtaAction {
  action: Action;
  variant?: ActionVariant;
  /** Roles allowed to see it. Omit for "everyone". */
  allow?: string[];
}

/**
 * A detail surface a row or tile can open. Declarative like everything
 * else, so "what the drawer shows" is part of the payload rather than a
 * second component tree kept in sync with the first by hand.
 */
export interface DetailSpec {
  title: string;
  subtitle?: string;
  badges?: Badge[];
  /** Grouped label/value pairs — the body of the sheet. */
  sections?: {
    label: string;
    items: { label: string; metric: Metric }[];
  }[];
  /** Free-text lines: allergies, occasion, seating preference. */
  notes?: { label: string; text: string; icon?: IconKey }[];
  actions?: CtaAction[];
}

export interface Progress {
  value: number;
  max: number;
  tone?: "violet" | "ink" | "success";
}

export interface SeriesPoint {
  label: string;
  value: number;
}

// ── Blocks ───────────────────────────────────────────────────

interface BlockBase {
  id: string;
  /** Which lane paints it. Defaults to "both". */
  surface?: "desktop" | "mobile" | "both";
  /** Roles allowed to see it. Omit for "everyone". */
  allow?: string[];
}

/** Editorial page opener: eyebrow, title with an italic serif clause, CTAs. */
export interface GreetingBlock extends BlockBase {
  type: "greeting";
  eyebrow?: string;
  title: string;
  /** Rendered in Fraunces italic violet, inline after the title. */
  emphasis?: string;
  subline?: string;
  tone?: SurfaceTone;
  actions?: CtaAction[];
}

/** The one dark card per screen: ring, headline stats, footnote strip. */
export interface HeroBlock extends BlockBase {
  type: "hero";
  eyebrow: string;
  /** Pulsing dot next to the eyebrow. */
  live?: boolean;
  title: string;
  subtitle?: string;
  ring?: {
    progress: number;
    topLabel: string;
    centerLabel: string;
    bottomLabel?: string;
  };
  stats?: { label: string; metric: Metric; accent?: boolean }[];
  /** Forecast / advisory strip under the divider. */
  footnote?: { text: string; badge?: Badge };
}

/** Violet-soft advisory card. Never decoration — assistant output only. */
export interface NudgeBlock extends BlockBase {
  type: "nudge";
  eyebrow: string;
  icon?: IconKey;
  /** Leading bold clause. */
  headline?: string;
  body: string;
  actions?: CtaAction[];
}

export interface KpiTile {
  id: string;
  /** Which lane paints it. Defaults to "both". */
  surface?: "desktop" | "mobile" | "both";
  label: string;
  metric: Metric;
  tone?: SurfaceTone;
  span?: 1 | 2;
  icon?: IconKey;
  delta?: Delta;
  hint?: string;
  /** Inline sparkline drawn inside the tile. */
  sparkline?: number[];
  /** Chips rendered under the value, e.g. "dans 3 jours". */
  chips?: Badge[];
  action?: Action;
}

export interface KpiGridBlock extends BlockBase {
  type: "kpi-grid";
  /** Widest column count. Narrower viewports step down from there. */
  columns?: 1 | 2 | 3 | 4;
  tiles: KpiTile[];
}

/** Generic entity row — the shape behind "upcoming events", "next covers". */
export interface EntityRow {
  id: string;
  title: string;
  /** Secondary line, e.g. "20h30 · Terrasse · 4 couverts". */
  meta?: string;
  badges?: Badge[];
  /** Left-hand glyph. Falls back to the gradient placeholder tile. */
  icon?: IconKey;
  /** 1-2 letters when there is no icon, e.g. guest initials. */
  initials?: string;
  progress?: Progress;
  /** Caption under the progress bar, e.g. "18 / 24 · 75 %". */
  progressCaption?: string;
  /** Right-aligned figure, e.g. revenue. */
  trailing?: { label: string; metric: Metric };
  /** Violet-soft insight strip under the row. */
  signal?: { text: string; icon?: IconKey };
  href?: string;
  /** Kebab entries. They label themselves, so they carry a bare Intent. */
  menu?: { id: string; label: string; action: Intent; destructive?: boolean }[];
  /**
   * Values the block's filter tabs match against, e.g.
   * `{ state: "confirmed", channel: "lyfe" }`. Filtering stays data:
   * a tab names a facet and the values it accepts.
   */
  facets?: Record<string, string>;
  /** Values the block's sort options order by. */
  sortKeys?: Record<string, number | string>;
  /** Extra text the search box matches, beyond title and meta. */
  keywords?: string;
  /** Opens in the detail drawer instead of navigating. */
  detail?: DetailSpec;
  /**
   * Buttons on the row itself, not behind the kebab.
   *
   * Door work is the reason this exists: Prévenir and Installer have to
   * be reachable one-handed on a phone, and a menu that has to be opened
   * first is one tap too many when there is a queue at the stand.
   */
  actions?: CtaAction[];
}

/** A filter tab. Counts are derived from the rows, never passed in. */
export interface FilterTab {
  id: string;
  label: string;
  /** Omit to match every row — the "Tous" tab. */
  match?: { facet: string; values: string[] };
}

export interface SortOption {
  id: string;
  label: string;
  /** Key into a row's `sortKeys`. */
  key: string;
  direction: "asc" | "desc";
}

export interface EntityListBlock extends BlockBase {
  type: "entity-list";
  heading?: string;
  headingAction?: Action;
  rows: EntityRow[];
  /** Sliding-underline filter tabs. Omit for a plain list. */
  tabs?: FilterTab[];
  /** Enables the search field. */
  search?: { placeholder: string };
  /** Enables the sort select. First option is the default. */
  sorts?: SortOption[];
  empty?: { title: string; body?: string; icon?: IconKey; action?: Action };
  /** Shown when filters exclude everything, as opposed to an empty list. */
  noMatches?: { title: string; body?: string };
}

// ── Slot grid ────────────────────────────────────────────────

/**
 * Load per time slot against a capacity line — the shape a service
 * manager actually reads a booking book in.
 */
export interface SlotGridBlock extends BlockBase {
  type: "slot-grid";
  heading: string;
  subheading?: string;
  capacity: number;
  capacityLabel?: string;
  unitLabel: string;
  slots: {
    label: string;
    value: number;
    /** Marks the slot the service is currently in. */
    current?: boolean;
    /** Overrides the derived tone, e.g. an over-booked slot. */
    tone?: SemanticTone;
  }[];
}

export interface FeedEntry {
  id: string;
  /** Bold lead, e.g. the guest or staff member who acted. */
  actor: string;
  message: string;
  at: string;
  icon: IconKey;
  tone?: SemanticTone;
  /** Tinted, left-bordered treatment for entries worth investigating. */
  highlight?: boolean;
  href?: string;
}

export interface FeedBlock extends BlockBase {
  type: "feed";
  heading: string;
  subheading?: string;
  live?: boolean;
  entries: FeedEntry[];
  empty?: { title: string; body?: string; icon?: IconKey };
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** Applied to every cell in the column unless the cell overrides it. */
  format?: ValueFormat;
  /** Hide below md. */
  hideOnMobile?: boolean;
}

export interface TableCell {
  value: number | string;
  format?: ValueFormat;
  badge?: Badge;
  tone?: SemanticTone;
  progress?: Progress;
}

export interface TableBlock extends BlockBase {
  type: "table";
  heading?: string;
  headingAction?: Action;
  columns: TableColumn[];
  rows: { id: string; href?: string; cells: Record<string, TableCell> }[];
  empty?: { title: string; body?: string; icon?: IconKey };
}

export interface ChartBlock extends BlockBase {
  type: "chart";
  heading: string;
  subheading?: string;
  variant?: "area" | "bar";
  series: SeriesPoint[];
  valueFormat?: ValueFormat;
  tone?: SurfaceTone;
  /** Reference line, e.g. capacity or break-even. */
  target?: { value: number; label: string };
}

/** Horizontal composition: a main column plus a narrower rail. */
export interface SplitBlock extends BlockBase {
  type: "split";
  /** Rail width, px. */
  railWidth?: number;
  main: Block[];
  rail: Block[];
}

/** Vertical composition with an optional heading. */
export interface GroupBlock extends BlockBase {
  type: "group";
  heading?: string;
  headingAction?: Action;
  gap?: "sm" | "md" | "lg";
  children: Block[];
}

// ── Calendar ─────────────────────────────────────────────────

/** One day cell. Everything it renders is a value, as everywhere else. */
export interface CalendarCell {
  date: string;
  /** Booked load and what the day can take, for the fill bar. */
  value: number;
  capacity: number;
  /** Short chips under the bar: a closure, an offer, an experience. */
  markers?: Badge[];
  /** Greys the cell and crosses the bar. */
  closed?: boolean;
  /** Rings the cell — today, or the day being edited. */
  highlight?: boolean;
  href?: string;
  menu?: { id: string; label: string; action: Intent; destructive?: boolean }[];
}

/**
 * Load across days, as a week strip or a month grid.
 *
 * Not a chart: the point is to click a day and act on it, which a series
 * of bars cannot offer. Both views come from one cell list so the two
 * cannot disagree about what a Tuesday holds.
 */
export interface CalendarBlock extends BlockBase {
  type: "calendar";
  heading: string;
  subheading?: string;
  /** Which view opens first. Both are always reachable. */
  view?: "week" | "month";
  unitLabel: string;
  cells: CalendarCell[];
  headingAction?: Action;
  empty?: { title: string; body?: string; icon?: IconKey };
}

// ── Settings ─────────────────────────────────────────────────

/**
 * One editable setting. The control is named, never a component: a spec
 * is JSON, so "this is a toggle" has to be a value like everything else.
 *
 * Every control dispatches one command with its new value in the
 * payload, which keeps the surface of what a settings screen can do
 * inside the same closed registry as every other action.
 */
export type SettingControl =
  | { kind: "toggle"; value: boolean }
  | { kind: "number"; value: number; min?: number; max?: number; step?: number; suffix?: string }
  | { kind: "text"; value: string; placeholder?: string; multiline?: boolean }
  | { kind: "select"; value: string; options: { value: string; label: string }[] }
  | { kind: "time"; value: string }
  | { kind: "date"; value: string }
  /** Read-only, for a value another screen owns. */
  | { kind: "readonly"; value: string; href?: string };

export interface SettingRow {
  id: string;
  label: string;
  /** One line under the label. Say what changes, not what the control is. */
  hint?: string;
  control: SettingControl;
  /** Fired on change, with `{ value }` merged into the payload. */
  command: string;
  payload?: Record<string, string | number | boolean>;
  badge?: Badge;
  /** Roles allowed to change it. Others see the value, disabled. */
  allow?: string[];
}

export interface SettingsBlock extends BlockBase {
  type: "settings";
  heading?: string;
  subheading?: string;
  rows: SettingRow[];
  /** Shown above the rows when something is off, e.g. a paused list. */
  banner?: { tone: SemanticTone; title: string; body?: string; action?: Action };
  footerActions?: CtaAction[];
}

export type Block =
  | GreetingBlock
  | HeroBlock
  | NudgeBlock
  | KpiGridBlock
  | EntityListBlock
  | SlotGridBlock
  | FeedBlock
  | TableBlock
  | ChartBlock
  | CalendarBlock
  | SettingsBlock
  | SplitBlock
  | GroupBlock;

export type BlockType = Block["type"];

// ── Screen ───────────────────────────────────────────────────

export interface ScreenSpec {
  /** URL segment inside the workspace, "" for the workspace index. */
  slug: string;
  /** Document + heading title. */
  title: string;
  subtitle?: string;
  /**
   * Blocks for wide viewports. `surface` on each block still applies, so
   * one list can serve both lanes when the screen doesn't need a
   * bespoke phone layout.
   */
  blocks: Block[];
  /**
   * Optional phone-first rewrite. When present it fully replaces
   * `blocks` below md — that is how the event dashboard ships a
   * different information order on a phone without a media-query fork
   * inside a component.
   */
  mobileBlocks?: Block[];
}
