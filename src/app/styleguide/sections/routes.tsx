"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { ROUTES, WORKSPACE_LABEL, type RouteEntry } from "@/lib/nav/routes";
import { Specimen } from "../Shell";

// Every screen, with a link to it.
//
// Generated from `lib/nav/routes.ts`, which is the same list the README
// quotes — so there is one answer to "what screens exist?" rather than
// three that drift.

const ORDER: RouteEntry["workspace"][] = ["entry", "event", "venue", "shared"];

export function RoutesSection() {
  return (
    <>
      {ORDER.map((workspace) => {
        const rows = ROUTES.filter((r) => r.workspace === workspace);
        if (rows.length === 0) return null;
        return (
          <Specimen
            key={workspace}
            name={WORKSPACE_LABEL[workspace]}
            note={`${rows.length} écran${rows.length > 1 ? "s" : ""}`}
          >
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-[13px] min-w-[720px]">
                <thead>
                  <tr className="text-left text-eyebrow text-ink-mute border-b border-line">
                    <th className="py-2 pr-4 font-bold">Route</th>
                    <th className="py-2 pr-4 font-bold">À quoi ça sert</th>
                    <th className="py-2 pr-4 font-bold">Rôle</th>
                    <th className="py-2 font-bold">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {rows.map((r) => (
                    <tr key={r.path} className="align-top">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <Link
                          href={r.path}
                          className="font-semibold text-violet-deep hover:text-ink underline underline-offset-2"
                        >
                          {r.path}
                        </Link>
                        <div className="text-meta text-ink-mute mt-0.5">
                          {r.label}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-ink-soft max-w-[380px]">
                        {r.purpose}
                        {r.gap ? (
                          <div className="text-meta text-warning mt-1">
                            Manque : {r.gap}
                          </div>
                        ) : null}
                        {r.dependsOn ? (
                          <div className="text-meta text-ink-mute mt-1">
                            Service à brancher : {r.dependsOn}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-ink-mute text-meta">
                        {r.roles ?? "Tous"}
                      </td>
                      <td className="py-3">
                        <Pill
                          tone={
                            r.status === "built"
                              ? "success"
                              : r.status === "service"
                                ? "info"
                                : "warning"
                          }
                        >
                          {r.status === "built"
                            ? "Complet"
                            : r.status === "service"
                              ? "Service à brancher"
                              : "Partiel"}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Specimen>
        );
      })}
    </>
  );
}
