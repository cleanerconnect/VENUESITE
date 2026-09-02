"use client";

import { useDetailStore } from "@/lib/stores/detail";
import { SideSheet } from "@/components/ui/SideSheet";
import { DetailBody } from "./DetailBody";
import { ActionControl, SpecBadge } from "./primitives";

// The spec-driven detail panel.
//
// Owns nothing visual: `SideSheet` is the surface, `DetailBody` renders
// the spec. This file is only the wiring between the detail store and
// those two — which is why the styleguide can render `DetailBody` with a
// literal spec and get exactly what the app shows.
//
// Mounted once by the renderer; any row in the current spec can raise it.
export function DetailDrawer() {
  const spec = useDetailStore((s) => s.spec);
  const close = useDetailStore((s) => s.close);

  if (!spec) return <SideSheet open={false} onOpenChange={() => {}} title="">{null}</SideSheet>;

  return (
    <SideSheet
      open
      onOpenChange={(next) => (next ? undefined : close())}
      title={spec.title}
      description={spec.subtitle}
      headerExtra={
        spec.badges?.length ? (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            {spec.badges.map((badge, i) => (
              <SpecBadge key={`${badge.label}-${i}`} badge={badge} />
            ))}
          </div>
        ) : null
      }
      footer={
        spec.actions?.length ? (
          <div className="flex items-center gap-3 flex-wrap">
            {spec.actions.map((cta, i) => (
              <ActionControl key={`${cta.action.label}-${i}`} cta={cta} size="md" />
            ))}
          </div>
        ) : null
      }
    >
      <DetailBody spec={spec} />
    </SideSheet>
  );
}
