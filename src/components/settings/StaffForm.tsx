"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import { deleteStaff, saveStaffInvite, saveStaffRole } from "@/app/actions/venue";
import type { PortalRole } from "@/lib/auth/server-session";
import type { StaffMemberRow } from "@/lib/db/venue-write-store";
import { cn } from "@/lib/utils/cn";

const ROLE_LABEL: Record<PortalRole, string> = {
  owner: "Propriétaire",
  manager: "Manager",
  staff: "Équipe",
};

const ROLE_HELP: Record<PortalRole, string> = {
  owner: "Gère l'équipe et la facturation.",
  manager: "Modifie la fiche et les horaires.",
  staff: "Travaille le service du jour et les arrivées.",
};

export function StaffForm({
  initial,
  canManage,
}: {
  initial: StaffMemberRow[];
  canManage: boolean;
}) {
  const { toast } = useToast();
  const [members, setMembers] = useState(initial);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PortalRole>("staff");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const invite = async () => {
    setBusy(true);
    const result = await saveStaffInvite({ fullName, email, role });
    setBusy(false);
    if (!result.ok) {
      setErrors(
        Object.fromEntries(result.errors.map((e) => [e.field, e.message])),
      );
      if (result.message && result.errors.length === 0) {
        toast({ tone: "danger", title: result.message });
      }
      return;
    }
    setErrors({});
    setFullName("");
    setEmail("");
    setMembers(result.data);
    toast({ tone: "success", title: "Invitation envoyée" });
  };

  const changeRole = async (member: StaffMemberRow, next: PortalRole) => {
    const before = members;
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: next } : m)),
    );
    const result = await saveStaffRole(member.id, next);
    if (!result.ok) {
      setMembers(before);
      toast({ tone: "danger", title: result.message ?? "Rôle non modifié" });
      return;
    }
    setMembers(result.data);
  };

  const remove = async (member: StaffMemberRow) => {
    const before = members;
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    const result = await deleteStaff(member.id);
    if (!result.ok) {
      setMembers(before);
      toast({ tone: "danger", title: result.message ?? "Suppression impossible" });
      return;
    }
    setMembers(result.data);
  };

  return (
    <div className="space-y-5">
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">Équipe</h2>
        <p className="text-meta text-ink-mute mb-5">
          Le rôle décide de ce qu&apos;un membre peut faire dans le portail.
        </p>

        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 flex-wrap border border-line rounded-[var(--radius-sm)] p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-ink truncate">
                  {m.fullName}
                  {m.pending ? (
                    <Pill tone="warning" className="ml-2">INVITÉ</Pill>
                  ) : null}
                </div>
                <div className="text-meta text-ink-mute truncate">{m.email}</div>
              </div>

              {canManage ? (
                <div className="flex gap-1.5" role="radiogroup" aria-label={`Rôle de ${m.fullName}`}>
                  {(Object.keys(ROLE_LABEL) as PortalRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={m.role === r}
                      title={ROLE_HELP[r]}
                      onClick={() => changeRole(m, r)}
                      className={cn(
                        "h-8 px-2.5 rounded-[var(--radius-xs)] text-[12px] font-semibold border transition-colors",
                        m.role === r
                          ? "border-ink bg-violet-soft text-ink"
                          : "border-line text-ink-mute hover:border-ink/40",
                      )}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              ) : (
                <Pill tone="neutral">{ROLE_LABEL[m.role]}</Pill>
              )}

              {canManage ? (
                <Button size="sm" variant="ghost" onClick={() => remove(m)}>
                  Retirer
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {canManage ? (
        <Card variant="surface" size="md">
          <h2 className="text-h3 text-ink mb-5">Inviter un membre</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom complet"
              value={fullName}
              error={errors.fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              error={errors.email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-4">
            <div className="flex gap-1.5" role="radiogroup" aria-label="Rôle">
              {(Object.keys(ROLE_LABEL) as PortalRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={role === r}
                  title={ROLE_HELP[r]}
                  onClick={() => setRole(r)}
                  className={cn(
                    "h-9 px-3 rounded-[var(--radius-sm)] text-[13px] font-semibold border transition-colors",
                    role === r
                      ? "border-ink bg-violet-soft text-ink"
                      : "border-line text-ink-mute hover:border-ink/40",
                  )}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
            <Button
              size="md"
              className="ml-auto"
              onClick={invite}
              disabled={busy || !fullName || !email}
            >
              Inviter
            </Button>
          </div>
          <p className="text-meta text-ink-mute mt-3">{ROLE_HELP[role]}</p>
        </Card>
      ) : null}
    </div>
  );
}
