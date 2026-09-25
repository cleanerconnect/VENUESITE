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
  /**
   * Where the action lives on a phone.
   *
   * `"sheet"` keeps it off the row below `md`, and says the row's detail
   * sheet carries it instead. At 390 the row is 358px wide and the touch
   * minimum is 44, so four decisions wrap into two rows of two and the
   * line grows from 44px to 200 — a third of the book for the two
   * decisions a host reaches for least. Two stay on the line; the rest
   * are one tap away, in the sheet the line already opens.
   *
   * Only meaningful on a row's `actions`. The sheet has to be given the
   * action too: this field hides, it does not move.
   */
  onPhone?: "sheet";
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
  /**
   * Host density: the two figures that lead the row.
   *
   * A host reads a booking in one order — when, how many, who — because
   * the first two decide what happens in the next ten minutes and the
   * third is what they say out loud. Supplied separately from `meta` so
   * they can be set in the largest type on the row instead of being
   * buried in a dot-joined secondary line.
   */
  lead?: { time: string; party: string };
  /**
   * Host density: the state, as a band down the row's left edge and a
   * word beside it.
   *
   * Replaces the status pill for Lot 1. A pill is a small target in a
   * line of small targets; a full-height band is readable from across
   * the room and survives a printed frame in greyscale because the word
   * is there too.
   */
  status?: { label: string; tone: "success" | "warning" | "neutral" | "danger" };
  /**
   * Host density: the time-slot header this row files under.
   *
   * Rows carrying one are grouped beneath it, the way a paper book is
   * ruled off by sitting.
   */
  slot?: string;
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
  /** One line under the heading saying what the group is for. */
  subheading?: string;
  headingAction?: Action;
  /**
   * Collapses the list behind its own summary line.
   *
   * For a group whose work is finished — the parties already seated —
   * where the count is the only thing worth the space mid-service, and
   * the rows are one tap away when someone asks who is in.
   */
  collapsible?: { summary: string };
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
  /**
   * Several independent on/off choices under one label — the channels an
   * alert goes out on, for instance.
   *
   * A `select` would have made them exclusive, which is wrong: an alert
   * that matters goes out by push *and* e-mail. The value is the enabled
   * options joined by commas, so the control stays a string like every
   * other one and a spec remains JSON.
   */
  | {
      kind: "switches";
      value: string;
      options: { value: string; label: string }[];
    }
  | { kind: "time"; value: string }
  /**
   * `min`/`max` bound the picker to the days the dataset can answer for.
   *
   * `compact` hides the input's own text, leaving the calendar button.
   * A native date input renders its value from the browser's locale, not
   * the page's — so on a French portal it can read `09/25/2026` beside a
   * row that spells the same day "vendredi 25 septembre". Where the row
   * already states the date, the input is a picker and nothing else.
   */
  | {
      kind: "date";
      value: string;
      min?: string;
      max?: string;
      compact?: boolean;
      /** Names the control when its text is hidden. */
      label?: string;
    }
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
  /**
   * The row that decides what the screen above it is even for — the
   * master switch on Disponibilités. Drawn at twice the weight, because
   * the largest control on a screen should be its primary one.
   */
  emphasis?: "lead";
}

export interface SettingsBlock extends BlockBase {
  type: "settings";
  heading?: string;
  subheading?: string;
  /**
   * Whether the subheading is a sentence somebody wrote, or the block's
   * own data spelled out.
   *
   * The service cards on Disponibilités put « tous les jours · 12h00 –
   * 15h00 · créneaux de 30 minutes » here: that is the seven fields
   * below, read back as one line, and it changes when they change. It
   * looks like copy and it is not, and the forty-word rule of the
   * design audit counted it as twenty-four words the screen could cut —
   * which it cannot, because nobody wrote them. Default is `prose`.
   */
  subheadingKind?: "prose" | "data";
  rows: SettingRow[];
  /** Shown above the rows when something is off, e.g. a paused list. */
  banner?: { tone: SemanticTone; title: string; body?: string; action?: Action };
  footerActions?: CtaAction[];
  /**
   * Folded shut until asked for.
   *
   * The rules a venue sets once and forgets are not the rules it changes
   * in a season. Keeping both in the same open list means the host scrolls
   * past eight fields to reach the two that matter, so the rest sits
   * behind one summary line.
   */
  collapsed?: boolean;
}

// ── Day bar ──────────────────────────────────────────────────

/**
 * The day a screen is scoped to, as one row of controls.
 *
 * Réservations used to state the day in a settings card: a heading, a
 * hint, a labelled row for the date, another for the service, and four
 * buttons in the footer — a form, for something that is not a form. A
 * host changing to tomorrow is not editing a setting, they are turning a
 * page. This is the page-turn: back, the day, forward, a picker, and the
 * day's services as tabs.
 */
export interface DayBarBlock extends BlockBase {
  type: "day-bar";
  /** French long form — "vendredi 25 septembre". */
  label: string;
  /** "Aujourd'hui." / "Demain." — omitted for any other day. */
  hint?: string;
  /** `yyyy-MM-dd`, for the picker. */
  value: string;
  min?: string;
  max?: string;
  /** Fires with `{ value: "yyyy-MM-dd" }`. */
  command: string;
  /** The services that day runs. One is shown, not offered. */
  services: { id: string; label: string }[];
  activeServiceId: string;
  serviceCommand: string;
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
  | DayBarBlock
  | SplitBlock
  | GroupBlock;

export type BlockType = Block["type"];

// ── Forms ────────────────────────────────────────────────────
//
// A spec is JSON, so "Ajouter" cannot carry a dialog any more than it
// can carry an onClick. It carries a command name, and the screen
// declares the form that command opens.
//
// That keeps the whole write surface inside the same closed registry as
// everything else: a screen can only ask for a form it declared, the
// fields are values the backend could just as well have sent, and a
// button whose command has no form and no handler still says so rather
// than doing nothing.

export type FormField =
  | { kind: "text"; name: string; label: string; hint?: string; placeholder?: string; required?: boolean; value?: string }
  | { kind: "textarea"; name: string; label: string; hint?: string; placeholder?: string; required?: boolean; value?: string; rows?: number }
  | { kind: "number"; name: string; label: string; hint?: string; required?: boolean; value?: number; min?: number; max?: number; step?: number; suffix?: string }
  | { kind: "select"; name: string; label: string; hint?: string; required?: boolean; value?: string; options: { value: string; label: string }[] }
  | { kind: "toggle"; name: string; label: string; hint?: string; value?: boolean }
  | { kind: "date"; name: string; label: string; hint?: string; required?: boolean; value?: string }
  | { kind: "time"; name: string; label: string; hint?: string; required?: boolean; value?: string }
  | { kind: "tel"; name: string; label: string; hint?: string; placeholder?: string; required?: boolean; value?: string }
  /** Static explanation between fields. Not an input. */
  | { kind: "note"; name: string; label: string; hint?: string };

export interface FormSpec {
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel: string;
  /** What the submitted values are sent to. Resolved server-side. */
  command: string;
  /** Red submit button and a confirmation line, for destructive verbs. */
  destructive?: boolean;
}

// ── Screen ───────────────────────────────────────────────────

export interface ScreenSpec {
  /** URL segment inside the workspace, "" for the workspace index. */
  slug: string;
  /** Document + heading title. */
  title: string;
  subtitle?: string;
  /**
   * Actions on the page header, right-aligned.
   *
   * For the verbs that act on the whole screen rather than on anything
   * inside it — exporting the day, printing it. They used to sit in a
   * card's footer among the controls that change what the screen shows,
   * where a host had to read four buttons to find the two that only
   * take a copy away.
   */
  headerActions?: CtaAction[];
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
  /**
   * Forms this screen's commands open, keyed by command name.
   *
   * A command with an entry here opens the form; the values are merged
   * over the button's own payload and submitted together. A command
   * without one falls through to the client registry as before.
   */
  forms?: Record<string, FormSpec>;
}
