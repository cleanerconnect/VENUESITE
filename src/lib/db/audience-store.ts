import "server-only";

// Audience, assembled from SQL.
//
// Everything here is a read over rows the portal already owns —
// customers, their preferences, their completed reservations, the daily
// source rollup and the anonymised benchmark cohorts. Nothing is stored
// pre-aggregated: a saved breakdown is a number that goes stale the
// moment a guest books, and this screen's whole claim is that it
// describes the base as it is now.
//
// The minimum group size is applied here rather than in the screen
// builder, so a caller cannot render a group of four by reaching past
// the spec. What crosses the seam is already safe to draw.

import type {
  AudienceBenchmark,
  AudienceBenchmarkMetric,
  AudienceBreakdown,
  AudienceCohort,
  AudienceInsights,
  AudienceSourceKey,
  AudienceSourceRow,
} from "@/lib/types/venue-operations";
import { AUDIENCE_MIN_GROUP } from "@/lib/types/venue-operations";
import { all, one } from "./store";

const PERIOD_DAYS = 90;

const SOURCE_LABELS: Record<AudienceSourceKey, string> = {
  feed: "Feed",
  recherche: "Recherche",
  listes: "Listes",
  boost: "Boost",
  offre: "Offre",
  lien_externe: "Lien externe",
};

const BENCHMARK_LABELS: Record<AudienceBenchmarkMetric, string> = {
  occupancy: "Taux d'occupation",
  no_show_rate: "Taux d'absence",
  review_score: "Note moyenne",
  return_rate: "Taux de retour",
};

const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Turn counted groups into a breakdown, withholding anything below the
 * minimum. `unknown` is carried separately from `withheld`: a guest who
 * never gave a city is not a guest hidden for privacy, and conflating
 * them would overstate how much the minimum is removing.
 */
function breakdown(
  groups: { label: string | null; count: number }[],
  minimum = AUDIENCE_MIN_GROUP,
): AudienceBreakdown {
  let unknown = 0;
  const named: { label: string; count: number }[] = [];
  for (const g of groups) {
    const label = (g.label ?? "").trim();
    if (label === "") unknown += g.count;
    else named.push({ label, count: g.count });
  }

  const shown = named.filter((g) => g.count >= minimum);
  const small = named.filter((g) => g.count < minimum);
  const covered = shown.reduce((a, g) => a + g.count, 0);

  return {
    rows: shown
      .sort((a, b) => b.count - a.count)
      .map((g) => ({
        label: g.label,
        count: g.count,
        sharePct: covered === 0 ? 0 : Number(((g.count / covered) * 100).toFixed(1)),
      })),
    covered,
    withheld: small.reduce((a, g) => a + g.count, 0),
    withheldGroups: small.length,
    unknown,
  };
}

const counted = (rows: Record<string, unknown>[]): { label: string | null; count: number }[] =>
  rows.map((r) => ({
    label: r.label === null || r.label === undefined ? null : String(r.label),
    count: Number(r.count ?? 0),
  }));

const AGE_BAND_SQL = `CASE
  WHEN birth_year IS NULL THEN NULL
  WHEN (CAST(strftime('%Y','now') AS INTEGER) - birth_year) < 25 THEN '18-24'
  WHEN (CAST(strftime('%Y','now') AS INTEGER) - birth_year) < 35 THEN '25-34'
  WHEN (CAST(strftime('%Y','now') AS INTEGER) - birth_year) < 45 THEN '35-44'
  WHEN (CAST(strftime('%Y','now') AS INTEGER) - birth_year) < 55 THEN '45-54'
  ELSE '55+' END`;

function sources(venueId: string): AudienceSourceRow[] {
  const rows = all(
    `SELECT source,
            SUM(impressions) AS impressions,
            SUM(opens)       AS opens,
            SUM(requests)    AS requests
       FROM audience_sources
      WHERE venue_id = ? AND date >= date('now', ?)
      GROUP BY source`,
    venueId,
    `-${PERIOD_DAYS} days`,
  );
  const totalRequests = rows.reduce((a, r) => a + Number(r.requests ?? 0), 0);
  return rows
    .map((r) => {
      const source = String(r.source) as AudienceSourceKey;
      const requests = Number(r.requests ?? 0);
      return {
        source,
        label: SOURCE_LABELS[source] ?? source,
        impressions: Number(r.impressions ?? 0),
        opens: Number(r.opens ?? 0),
        requests,
        sharePct: totalRequests === 0 ? 0 : Number(((requests / totalRequests) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.requests - a.requests);
}

/**
 * Retention by month of first visit.
 *
 * A cohort smaller than the minimum is dropped rather than drawn: a
 * curve over six people is both noise and, with a city beside it, a way
 * to re-identify them.
 */
function cohorts(venueId: string): AudienceCohort[] {
  const rows = all(
    `SELECT substr(c.first_seen_at, 1, 7) AS month,
            COUNT(*)                      AS size,
            SUM(CASE WHEN c.last_visit_at IS NOT NULL
                  AND julianday(c.last_visit_at) - julianday(c.first_seen_at) >= 30
                THEN 1 ELSE 0 END)        AS d30,
            SUM(CASE WHEN c.last_visit_at IS NOT NULL
                  AND julianday(c.last_visit_at) - julianday(c.first_seen_at) >= 60
                THEN 1 ELSE 0 END)        AS d60,
            SUM(CASE WHEN c.last_visit_at IS NOT NULL
                  AND julianday(c.last_visit_at) - julianday(c.first_seen_at) >= 90
                THEN 1 ELSE 0 END)        AS d90
       FROM customers c
      WHERE c.venue_id = ?
      GROUP BY month
      ORDER BY month`,
    venueId,
  );

  const pct = (n: number, size: number) =>
    size === 0 ? 0 : Number(((n / size) * 100).toFixed(1));

  return rows
    .filter((r) => Number(r.size ?? 0) >= AUDIENCE_MIN_GROUP)
    .map((r) => {
      const size = Number(r.size ?? 0);
      const month = String(r.month ?? "");
      return {
        month,
        label: month,
        size,
        retentionPct: [
          pct(Number(r.d30 ?? 0), size),
          pct(Number(r.d60 ?? 0), size),
          pct(Number(r.d90 ?? 0), size),
        ] as [number, number, number],
      };
    });
}

function benchmarks(venueId: string, cohort: string, city: string): AudienceBenchmark[] {
  const rows = all(
    `SELECT metric, median, top_decile, sample_size
       FROM platform_benchmarks
      WHERE cohort = ? AND city = ?`,
    cohort,
    city,
  );

  const agg = one(
    `SELECT
       SUM(covers_served) AS covers,
       SUM(capacity)      AS capacity,
       SUM(no_shows)      AS no_shows,
       SUM(bookings_made) AS bookings
     FROM analytics_daily
     WHERE venue_id = ? AND date >= date('now', ?)`,
    venueId,
    `-${PERIOD_DAYS} days`,
  );
  const rating = one(
    "SELECT AVG(rating) AS avg FROM reviews WHERE venue_id = ?",
    venueId,
  );
  const base = one(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN visit_count > 1 THEN 1 ELSE 0 END) AS returning_count
       FROM customers WHERE venue_id = ?`,
    venueId,
  );

  const capacity = Number(agg?.capacity ?? 0);
  const bookings = Number(agg?.bookings ?? 0);
  const total = Number(base?.total ?? 0);
  const ownValue: Record<AudienceBenchmarkMetric, number> = {
    occupancy: capacity === 0 ? 0 : Number(agg?.covers ?? 0) / capacity,
    no_show_rate: bookings === 0 ? 0 : Number(agg?.no_shows ?? 0) / bookings,
    review_score: Number(Number(rating?.avg ?? 0).toFixed(1)),
    return_rate: total === 0 ? 0 : Number(base?.returning_count ?? 0) / total,
  };

  return rows.map((r) => {
    const metric = String(r.metric) as AudienceBenchmarkMetric;
    return {
      metric,
      label: BENCHMARK_LABELS[metric] ?? metric,
      venueValue: Number(ownValue[metric].toFixed(metric === "review_score" ? 1 : 3)),
      median: Number(r.median ?? 0),
      topDecile: Number(r.top_decile ?? 0),
      sampleSize: Number(r.sample_size ?? 0),
      format: metric === "review_score" ? "percent" : "percent",
      lowerIsBetter: metric === "no_show_rate",
    };
  }).map((b) => ({ ...b, format: b.metric === "review_score" ? ("score" as const) : ("percent" as const) }));
}

/** Which anonymised cohort this venue is compared against. */
function cohortFor(venueId: string): { cohort: string; city: string } {
  const v = one("SELECT kind, city FROM venues WHERE id = ?", venueId);
  const city = String(v?.city ?? "Casablanca");
  return {
    cohort: String(v?.kind ?? "restaurant") === "drinks" ? "bar_cocktails" : "restaurant_haut_de_gamme",
    city,
  };
}

export function audienceInsights(venueId: string): AudienceInsights | null {
  const venue = one("SELECT id FROM venues WHERE id = ?", venueId);
  if (!venue) return null;

  const base = one(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN first_seen_at >= date('now', ?) THEN 1 ELSE 0 END) AS fresh,
            SUM(CASE WHEN visit_count > 1
                  AND last_visit_at IS NOT NULL
                  AND julianday(last_visit_at) - julianday(first_seen_at) <= 90
                THEN 1 ELSE 0 END) AS returned90
       FROM customers WHERE venue_id = ?`,
    `-${PERIOD_DAYS} days`,
    venueId,
  );
  const baseTotal = Number(base?.total ?? 0);
  const share = (n: number) =>
    baseTotal === 0 ? 0 : Number(((n / baseTotal) * 100).toFixed(1));

  const { cohort, city } = cohortFor(venueId);

  return {
    venueId,
    baseTotal,
    newSharePct: share(Number(base?.fresh ?? 0)),
    returnRate90Pct: share(Number(base?.returned90 ?? 0)),
    periodDays: PERIOD_DAYS,
    byCity: breakdown(
      counted(all("SELECT city AS label, COUNT(*) AS count FROM customers WHERE venue_id = ? GROUP BY city", venueId)),
    ),
    byQuartier: breakdown(
      counted(all("SELECT quartier AS label, COUNT(*) AS count FROM customers WHERE venue_id = ? GROUP BY quartier", venueId)),
    ),
    byAge: breakdown(
      counted(all(`SELECT ${AGE_BAND_SQL} AS label, COUNT(*) AS count FROM customers WHERE venue_id = ? GROUP BY label`, venueId)),
    ),
    byInterest: breakdown(
      counted(
        all(
          `SELECT p.label AS label, COUNT(*) AS count
             FROM customer_preferences p
             JOIN customers c ON c.id = p.customer_id
            WHERE c.venue_id = ?
            GROUP BY p.label`,
          venueId,
        ),
      ),
    ),
    sources: sources(venueId),
    byWeekday: breakdown(
      counted(
        all(
          `SELECT CAST(strftime('%w', at) AS INTEGER) AS label, COUNT(*) AS count
             FROM reservations
            WHERE venue_id = ? AND state = 'completed'
            GROUP BY label`,
          venueId,
        ),
      ).map((g) => ({
        ...g,
        label: g.label === null ? null : (WEEKDAYS[Number(g.label)] ?? null),
      })),
    ),
    byService: breakdown(
      counted(
        all(
          `SELECT COALESCE(
                    s.label,
                    CASE
                      WHEN CAST(strftime('%H', r.at) AS INTEGER) < 11 THEN 'Petit-déjeuner'
                      WHEN CAST(strftime('%H', r.at) AS INTEGER) < 16 THEN 'Déjeuner'
                      WHEN CAST(strftime('%H', r.at) AS INTEGER) < 23 THEN 'Dîner'
                      ELSE 'Service tardif'
                    END
                  ) AS label,
                  COUNT(*) AS count
             FROM reservations r
             LEFT JOIN services s ON s.id = r.service_id
            WHERE r.venue_id = ? AND r.state = 'completed'
            -- Grouped on the expression, not on the alias: \`services\`
            -- has its own \`label\` column, and \`GROUP BY label\` binds to
            -- that one — NULL for every historical booking, which
            -- collapsed all of them into a single band.
            GROUP BY COALESCE(
                       s.label,
                       CASE
                         WHEN CAST(strftime('%H', r.at) AS INTEGER) < 11 THEN 'Petit-déjeuner'
                         WHEN CAST(strftime('%H', r.at) AS INTEGER) < 16 THEN 'Déjeuner'
                         WHEN CAST(strftime('%H', r.at) AS INTEGER) < 23 THEN 'Dîner'
                         ELSE 'Service tardif'
                       END
                     )`,
          venueId,
        ),
      ),
    ),
    byBookingHour: breakdown(
      counted(
        all(
          `SELECT strftime('%H', at) || 'h' AS label, COUNT(*) AS count
             FROM reservations
            WHERE venue_id = ? AND state = 'completed'
            GROUP BY label`,
          venueId,
        ),
      ),
    ),
    cohorts: cohorts(venueId),
    benchmarks: benchmarks(venueId, cohort, city),
    minGroupSize: AUDIENCE_MIN_GROUP,
    benchmarkCohort: cohort,
  };
}
