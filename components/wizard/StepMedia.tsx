"use client";

import { Input } from "@/components/ui/Input";
import { IconClose, IconPlus } from "@/components/layout/icons";

export interface MediaState {
  coverName: string | null;
  galleryNames: string[];
  artists: { id: string; name: string; role: string }[];
  partnerLogos: string[];
}

export function StepMedia({
  state,
  setState,
}: {
  state: MediaState;
  setState: (next: MediaState) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="h-serif text-2xl text-ink">Médias et identité visuelle</h2>
        <p className="text-sm text-muted mt-1">
          Ajoutez la photo de couverture et le contenu visuel qui apparaîtra sur
          la page publique de l'événement.
        </p>
      </div>

      {/* Cover */}
      <div>
        <div className="text-xs uppercase tracking-badge text-muted mb-2">
          Photo de couverture * (1080×1350 recommandé)
        </div>
        <label className="block border border-dashed border-line bg-surface aspect-[4/5] max-w-sm hover:border-ink cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) =>
              setState({
                ...state,
                coverName: e.target.files?.[0]?.name ?? null,
              })
            }
          />
          <div className="h-full flex flex-col items-center justify-center text-muted text-sm p-6 text-center">
            {state.coverName ? (
              <>
                <span className="text-ink font-medium">{state.coverName}</span>
                <span className="mt-2 text-xs">Cliquer pour remplacer</span>
              </>
            ) : (
              <>
                <span className="h-serif text-lg text-ink">Glisser-déposer</span>
                <span className="mt-1">ou cliquer pour choisir un fichier</span>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Gallery */}
      <div>
        <div className="text-xs uppercase tracking-badge text-muted mb-2">
          Galerie (jusqu'à 6 photos additionnelles)
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const name = state.galleryNames[i];
            return (
              <label
                key={i}
                className="aspect-square border border-dashed border-line hover:border-ink cursor-pointer flex items-center justify-center text-muted text-xs text-center px-1"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const next = [...state.galleryNames];
                    next[i] = e.target.files?.[0]?.name ?? "";
                    setState({ ...state, galleryNames: next.filter(Boolean) });
                  }}
                />
                {name ? (
                  <span className="text-ink truncate">{name}</span>
                ) : (
                  "+"
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Artists / lineup */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-badge text-muted">
            Programmation / artistes
          </div>
          <button
            onClick={() =>
              setState({
                ...state,
                artists: [
                  ...state.artists,
                  {
                    id: `a_${Math.random().toString(36).slice(2, 6)}`,
                    name: "",
                    role: "",
                  },
                ],
              })
            }
            className="text-xs uppercase tracking-badge text-muted hover:text-ink flex items-center gap-1"
          >
            <IconPlus />
            Ajouter
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {state.artists.map((a, i) => (
            <div
              key={a.id}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
            >
              <Input
                placeholder="Nom"
                value={a.name}
                onChange={(e) => {
                  const next = [...state.artists];
                  next[i] = { ...a, name: e.target.value };
                  setState({ ...state, artists: next });
                }}
              />
              <Input
                placeholder="Rôle (ex. DJ, Headliner)"
                value={a.role}
                onChange={(e) => {
                  const next = [...state.artists];
                  next[i] = { ...a, role: e.target.value };
                  setState({ ...state, artists: next });
                }}
              />
              <button
                onClick={() =>
                  setState({
                    ...state,
                    artists: state.artists.filter((_, idx) => idx !== i),
                  })
                }
                className="h-11 w-11 flex items-center justify-center text-muted hover:text-error"
                aria-label="Supprimer"
              >
                <IconClose />
              </button>
            </div>
          ))}
          {state.artists.length === 0 ? (
            <p className="text-xs text-muted">
              Aucun artiste pour l'instant.
            </p>
          ) : null}
        </div>
      </div>

      {/* Sponsors */}
      <div>
        <div className="text-xs uppercase tracking-badge text-muted mb-2">
          Partenaires / sponsors (logos)
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const name = state.partnerLogos[i];
            return (
              <label
                key={i}
                className="aspect-square border border-dashed border-line hover:border-ink cursor-pointer flex items-center justify-center text-muted text-xs text-center"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const next = [...state.partnerLogos];
                    next[i] = e.target.files?.[0]?.name ?? "";
                    setState({
                      ...state,
                      partnerLogos: next.filter(Boolean),
                    });
                  }}
                />
                {name ? (
                  <span className="text-ink truncate">{name}</span>
                ) : (
                  "+"
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
