"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { auditLog, team as initialTeam } from "@/lib/mockData";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { TeamMember, TeamRole } from "@/lib/types";

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  scanner: "Scanner",
};

const ROLE_DESCRIPTION: Record<TeamRole, string> = {
  owner: "Accès complet, facturation et équipe",
  admin: "Tout sauf facturation et gestion d'équipe",
  scanner: "Scanner uniquement le jour J",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(initialTeam);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("scanner");

  const active = members.filter((m) => !m.pending);
  const pending = members.filter((m) => m.pending);

  // Optimistic invite — appears in pending instantly, real impl awaits 201.
  const sendInvite = () => {
    if (!email.trim()) return;
    setMembers((prev) => [
      ...prev,
      {
        id: `tm_${Math.random().toString(36).slice(2, 6)}`,
        name: email.split("@")[0],
        email: email.trim(),
        role,
        lastActive: new Date().toISOString(),
        pending: true,
      },
    ]);
    setEmail("");
    setRole("scanner");
    setInviteOpen(false);
  };

  return (
    <>
      <TopBar
        title="Équipe"
        action={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            Inviter
          </Button>
        }
      />
      <div className="px-4 md:px-8 py-6 max-w-content mx-auto flex flex-col gap-6">
        <Card padded={false}>
          <div className="p-6 border-b border-line">
            <CardHeader
              title="Membres actifs"
              subtitle={`${active.length} personne(s) avec accès`}
            />
          </div>
          <ul className="divide-y divide-line">
            {active.map((m) => (
              <li
                key={m.id}
                className="px-6 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-ink/5 text-ink text-sm flex items-center justify-center font-medium">
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-ink truncate">{m.name}</div>
                    <div className="text-xs text-muted truncate">{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-muted hidden sm:block">
                    Vu {formatRelative(m.lastActive)}
                  </div>
                  <Badge tone="neutral">{ROLE_LABEL[m.role]}</Badge>
                  {m.role !== "owner" ? (
                    <button
                      onClick={() =>
                        setMembers((prev) => prev.filter((x) => x.id !== m.id))
                      }
                      className="text-xs uppercase tracking-badge text-muted hover:text-error"
                    >
                      Retirer
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {pending.length > 0 ? (
          <Card padded={false}>
            <div className="p-6 border-b border-line">
              <CardHeader title="Invitations en attente" />
            </div>
            <ul className="divide-y divide-line">
              {pending.map((m) => (
                <li
                  key={m.id}
                  className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <div className="text-ink">{m.email}</div>
                    <div className="text-xs text-muted">
                      Invité comme {ROLE_LABEL[m.role]}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="text-xs uppercase tracking-badge text-muted hover:text-ink">
                      Renvoyer
                    </button>
                    <button
                      onClick={() =>
                        setMembers((prev) => prev.filter((x) => x.id !== m.id))
                      }
                      className="text-xs uppercase tracking-badge text-muted hover:text-error"
                    >
                      Annuler
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card padded={false}>
          <div className="p-6 border-b border-line">
            <CardHeader
              title="Journal d'audit"
              subtitle="Historique des actions sensibles (conformité)"
            />
          </div>
          <ul className="divide-y divide-line">
            {auditLog.map((a) => (
              <li
                key={a.id}
                className="px-6 py-3 flex items-start justify-between gap-3 text-sm"
              >
                <div>
                  <div className="text-ink">{a.action}</div>
                  <div className="text-xs text-muted">par {a.actor}</div>
                </div>
                <div className="text-xs text-muted shrink-0 num">
                  {formatDateTime(a.at)}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Inviter un membre"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Annuler
            </Button>
            <Button onClick={sendInvite} disabled={!email.trim()}>
              Envoyer l'invitation
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="prenom@example.ma"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select
            label="Rôle"
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            options={[
              { value: "scanner", label: "Scanner — accès porte uniquement" },
              { value: "admin", label: "Administrateur — accès complet sauf facturation/équipe" },
            ]}
          />
          <p className="text-xs text-muted">
            {ROLE_DESCRIPTION[role]}. La personne reçoit un email avec un lien
            d'activation valable 7 jours.
          </p>
        </div>
      </Modal>
    </>
  );
}
