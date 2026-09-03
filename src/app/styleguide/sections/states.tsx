"use client";

import Link from "next/link";
import { QueryError, QueryState, PermissionDenied } from "@/components/data/QueryState";
import { EntityListSkeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { DEMO_STATES, DEMO_STATE_LABEL, DEMO_STATE_PARAM } from "@/lib/data/demo-state";
import { Specimen } from "../Shell";

// The four things a screen shows when the happy path is not happening.
//
// These are the states nobody sees during a demo and everybody sees in
// production. Rendering them side by side here — from literal props, no
// data layer — is the only way they stay maintained.

const FORCED_ROUTES = ["/events", "/team", "/settlements", "/visibilite"];

export function StatesSection() {
  const base = {
    status: "loading" as const,
    error: null,
    isEmpty: false,
    retry: () => {},
  };

  return (
    <>
      <Specimen
        name="?etat="
        note="forcer un état sur n'importe quelle route, pour l'inspecter"
      >
        <p className="text-body text-ink-soft mb-4 max-w-2xl">
          Chaque écran accepte un paramètre d&apos;URL qui force son état.
          Sans lui, un état d&apos;erreur ne se voit qu&apos;en cassant
          quelque chose — donc il ne se voit jamais, et il pourrit.
        </p>
        <div className="flex flex-col gap-2">
          {DEMO_STATES.map((state) => (
            <div key={state} className="flex items-center gap-3 flex-wrap">
              <code className="text-[12px] font-semibold text-ink bg-ink/[0.05] px-1.5 py-0.5 rounded shrink-0 w-40">
                ?{DEMO_STATE_PARAM}={state}
              </code>
              <span className="text-meta text-ink-mute w-24 shrink-0">
                {DEMO_STATE_LABEL[state]}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {FORCED_ROUTES.map((route) => (
                  <Link
                    key={route}
                    href={`${route}?${DEMO_STATE_PARAM}=${state}`}
                    className="text-[12px] font-medium text-violet-deep hover:text-ink underline underline-offset-2"
                  >
                    {route}
                  </Link>
                ))}
              </span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="QueryState · chargement"
        note="squelette calqué sur ce qui suit, annoncé aux lecteurs d'écran"
      >
        <QueryState
          query={base}
          label="Chargement des réservations"
          skeleton={<EntityListSkeleton rows={3} />}
        />
      </Specimen>

      <Specimen name="QueryState · vide" note="dit ce qui manque, pas « 0 résultat »">
        <QueryState
          query={{ ...base, status: "ready", isEmpty: true }}
          skeleton={null}
          empty={{
            title: "Aucune réservation pour ce service",
            body: "Les demandes arrivent en général deux heures avant l'ouverture.",
          }}
        />
      </Specimen>

      <Specimen
        name="QueryState · erreur"
        note="ce qui s'est passé, puis quoi faire — et un vrai bouton"
      >
        <QueryState
          query={{
            ...base,
            status: "error",
            error: new Error("Le service est momentanément indisponible."),
          }}
          skeleton={null}
        />
      </Specimen>

      <Specimen
        name="QueryError · compact"
        note="pour un panneau ou un onglet, sans la marge d'une page"
      >
        <QueryError
          error={new Error("La connexion a expiré.")}
          onRetry={() => {}}
          compact
        />
      </Specimen>

      <Specimen
        name="PermissionDenied"
        note="ni vide ni cassé — nomme le rôle qui ouvrirait la porte"
      >
        <PermissionDenied
          what="les réglages de ce lieu"
          requiredRole="un propriétaire ou un gérant"
        />
      </Specimen>

      <Specimen
        name="Erreurs non rattrapées"
        note="la frontière d'erreur de l'espace de travail"
      >
        <Card variant="surface" size="md">
          <p className="text-body text-ink-soft">
            <code className="text-[12px]">(organizer)/error.tsx</code> attrape
            ce qu&apos;une requête ne rattrape pas — une lecture serveur qui
            échoue, par exemple. Elle affiche une phrase, la référence de
            l&apos;incident et un bouton « Réessayer », plutôt qu&apos;un
            tableau de bord vide qu&apos;un partenaire lirait comme «&nbsp;aucune
            réservation aujourd&apos;hui&nbsp;».
          </p>
        </Card>
      </Specimen>
    </>
  );
}
