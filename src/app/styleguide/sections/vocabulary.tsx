"use client";

import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/dashboard/primitives";
import {
  ACTIVITY_TYPE,
  MENU_CATEGORY,
  PAYOUT_STATE,
  RESERVATION_CHANNEL,
  RESERVATION_STATE,
  SERVICE_KIND,
  SERVICE_STATE,
} from "@/lib/restaurant/vocabulary";
import { DIETARY_TAG, PRICE_RANGE_LABEL, VENUE_FEATURE } from "@/lib/types/restaurant";
import { ICON_KEYS } from "@/lib/dashboard/icons";
import { CONFIGURATION_LABEL, VENUE_CONFIGS } from "@/lib/venue/config";
import type { VenueConfiguration } from "@/lib/types/venue-operations";
import { hasNightlife } from "@/lib/venue/config";
import { Specimen } from "../Shell";

// The domain vocabulary, rendered from the same maps the app reads.
//
// A term is a label, a tone and an icon in one place, so a reservation
// state can never be styled two ways in two screens. This section is
// generated from those maps: add a state to the union and it appears
// here, with a compile error if you forget its term.

const TERM_MAPS = [
  { label: "État d'une réservation", map: RESERVATION_STATE },
  { label: "Type de service", map: SERVICE_KIND },
  { label: "État du service", map: SERVICE_STATE },
  { label: "Catégorie de la carte", map: MENU_CATEGORY },
  { label: "État d'un versement", map: PAYOUT_STATE },
  { label: "Type d'activité", map: ACTIVITY_TYPE },
];

const PLAIN_MAPS = [
  { label: "Canal de réservation", map: RESERVATION_CHANNEL },
  { label: "Équipements", map: VENUE_FEATURE },
  { label: "Régimes", map: DIETARY_TAG },
  { label: "Gamme de prix", map: PRICE_RANGE_LABEL },
];

export function VocabularySection() {
  return (
    <>
      {TERM_MAPS.map(({ label, map }) => (
        <Specimen key={label} name={label} note="libellé · ton · icône">
          <div className="flex flex-wrap gap-2">
            {Object.entries(map).map(([key, term]) => (
              <span
                key={key}
                className="inline-flex items-center gap-2 border border-line bg-surface rounded-full pl-2 pr-3 h-8"
              >
                <Icon name={term.icon} size={13} className="text-ink-mute" />
                <Pill tone={term.tone === "muted" ? "draft" : term.tone}>
                  {term.label}
                </Pill>
                <code className="text-[11px] text-ink-mute">{key}</code>
              </span>
            ))}
          </div>
        </Specimen>
      ))}

      {PLAIN_MAPS.map(({ label, map }) => (
        <Specimen key={label} name={label} note="clé → libellé français">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {Object.entries(map).map(([key, value]) => (
              <div key={key} className="flex items-baseline gap-2 min-w-0">
                <code className="text-[11px] text-ink-mute shrink-0">{key}</code>
                <span className="text-meta text-ink truncate">{value}</span>
              </div>
            ))}
          </dl>
        </Specimen>
      ))}

      <Specimen
        name="Configuration"
        note="le seul réglage qui ajoute un groupe de navigation — et ce qu'il renomme"
      >
        <p className="text-body text-ink-soft mb-4 max-w-2xl">
          Boissons n&apos;est pas un second produit. La configuration active
          Vie nocturne, renomme les couverts en personnes et les services en
          créneaux, ajoute les types de table comme inventaire, et ajoute le
          dress code et l&apos;âge minimum à Ma fiche. Rien d&apos;autre —
          il n&apos;existe aucune liste d&apos;écrans par configuration dans
          le code.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] min-w-[520px]">
            <thead className="text-eyebrow text-ink-mute">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-semibold">Configuration</th>
                <th className="py-2 pr-4 font-semibold">Une place</th>
                <th className="py-2 pr-4 font-semibold">Un sitting</th>
                <th className="py-2 pr-4 font-semibold">Sans réservation</th>
                <th className="py-2 font-semibold">Vie nocturne</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(["restaurant", "lounge", "both"] as VenueConfiguration[]).map(
                (configuration) => {
                  const config =
                    VENUE_CONFIGS[configuration === "lounge" ? "drinks" : "restaurant"];
                  return (
                    <tr key={configuration}>
                      <td className="py-2.5 pr-4 font-semibold text-ink">
                        {CONFIGURATION_LABEL[configuration]}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-soft">{config.cover.many}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{config.service.many}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{config.walkInLabel}</td>
                      <td className="py-2.5">
                        <Pill tone={hasNightlife(configuration) ? "success" : "draft"}>
                          {hasNightlife(configuration) ? "Visible" : "Absente"}
                        </Pill>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </Specimen>

      <Specimen
        name="IconKey"
        note="le seul jeu d'icônes — un bloc ne peut nommer que celles-ci"
      >
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3">
          {ICON_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5 min-w-0">
              <span className="h-9 w-9 rounded-[12px] bg-surface border border-line flex items-center justify-center">
                <Icon name={key} size={16} className="text-ink-soft" />
              </span>
              <code className="text-[10px] text-ink-mute truncate max-w-full">
                {key}
              </code>
            </div>
          ))}
        </div>
      </Specimen>
    </>
  );
}
