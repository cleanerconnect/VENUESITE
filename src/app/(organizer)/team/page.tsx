"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Shield, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  formatDateTimeFR,
  formatRelativeFR,
} from "@/lib/utils/format";
import { getAuditLog, getTeam } from "@/lib/mock/team";
import type { TeamMember, TeamRole } from "@/lib/types/domain";

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  scanner: "Scanner",
};

const ROLE_DESCRIPTION: Record<TeamRole, string> = {
  owner: "Accès complet, facturation et équipe",
  admin: "Tout sauf facturation et gestion d'équipe",
  scanner: "Scanner uniquement le jour J — pas d'accès aux revenus",
};

const ROLE_TONE: Record<TeamRole, "info" | "success" | "neutral"> = {
  owner: "info",
  admin: "success",
  scanner: "neutral",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(getTeam());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("scanner");
  const { toast } = useToast();

  const active = members.filter((m) => !m.pending);
  const pending = members.filter((m) => m.pending);

  const remove = (id: string) => {
    const before = members;
    const m = members.find((x) => x.id === id);
    if (!m) return;
    setMembers((prev) => prev.filter((x) => x.id !== id));
    toast({
      tone: "success",
      title: m.pending ? "Invitation annulée" : "Membre retiré",
      description: m.email,
      undo: () => setMembers(before),
    });
  };

  const sendInvite = () => {
    if (!inviteEmail.trim()) return;
    const newMember: TeamMember = {
      id: `tm_${Math.random().toString(36).slice(2, 6)}`,
      name: inviteEmail.split("@")[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      lastActive: new Date().toISOString(),
      pending: true,
    };
    setMembers((prev) => [...prev, newMember]);
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("scanner");
    toast({
      tone: "success",
      title: "Invitation envoyée",
      description: `${newMember.email} · ${ROLE_LABEL[inviteRole]}`,
    });
  };

  return (
    <div className="space-y-5 md:space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Équipe</h1>
          <p className="text-body text-ink-soft mt-1.5">
            Qui peut accéder à votre espace organisateur.
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          iconLeft={<Plus size={16} strokeWidth={2} />}
        >
          Inviter un membre
        </Button>
      </div>

      {/* === Active members === */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-h3 text-ink">Membres actifs</h2>
          <p className="text-meta text-ink-soft mt-1">
            {active.length} personnes avec accès
          </p>
        </div>
        <ul className="divide-y divide-line-soft">
          <AnimatePresence initial={false}>
            {active.map((m) => (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.22 } }}
                className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-canvas/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-[12px] font-bold text-ink shrink-0"
                    style={{ background: "var(--color-tint-peach)" }}
                  >
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-ink truncate">
                      {m.name}
                    </div>
                    <div className="text-meta text-ink-mute truncate">
                      {m.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-meta text-ink-mute hidden sm:block num">
                    Vu {formatRelativeFR(m.lastActive)}
                  </div>
                  <Pill tone={ROLE_TONE[m.role]} dot>
                    {ROLE_LABEL[m.role].toUpperCase()}
                  </Pill>
                  {m.role !== "owner" ? (
                    <button
                      onClick={() => remove(m.id)}
                      className="h-9 w-9 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute hover:text-danger transition-colors"
                      aria-label="Retirer"
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  ) : null}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Card>

      {/* === Pending invites === */}
      {pending.length > 0 ? (
        <Card variant="canvas-2" size="md" className="!p-0">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-h3 text-ink">Invitations en attente</h2>
            <p className="text-meta text-ink-soft mt-1">
              {pending.length} en attente d'acceptation
            </p>
          </div>
          <ul className="divide-y divide-line-soft">
            {pending.map((m) => (
              <li
                key={m.id}
                className="px-6 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink truncate">
                    {m.email}
                  </div>
                  <div className="text-meta text-ink-mute mt-0.5">
                    Invité comme {ROLE_LABEL[m.role]}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-ink transition-colors">
                    Renvoyer
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="text-meta font-bold uppercase tracking-[0.08em] text-ink-soft hover:text-danger transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* === Audit log === */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-h3 text-ink">Journal d'audit</h2>
          <p className="text-meta text-ink-soft mt-1">
            Historique des actions sensibles · conservé 24 mois
          </p>
        </div>
        <ul className="divide-y divide-line-soft">
          {getAuditLog().map((a) => (
            <li
              key={a.id}
              className="px-6 py-3.5 flex items-start justify-between gap-3 text-[13px]"
            >
              <div>
                <div className="text-ink">{a.action}</div>
                <div className="text-meta text-ink-mute mt-0.5">
                  par {a.actor}
                </div>
              </div>
              <div className="text-mono text-ink-mute shrink-0">
                {formatDateTimeFR(a.at)}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* === Invite dialog === */}
      <Dialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Inviter un membre"
        description="La personne reçoit un email avec un lien d'activation valable 7 jours."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Annuler
            </Button>
            <Button onClick={sendInvite} disabled={!inviteEmail.trim()}>
              Envoyer l'invitation
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div>
            <div className="text-eyebrow text-ink-soft mb-2">Rôle</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <RoleCard
                role="admin"
                active={inviteRole === "admin"}
                onSelect={() => setInviteRole("admin")}
                icon={<Shield size={14} strokeWidth={1.8} />}
              />
              <RoleCard
                role="scanner"
                active={inviteRole === "scanner"}
                onSelect={() => setInviteRole("scanner")}
                icon={<Users size={14} strokeWidth={1.8} />}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function RoleCard({
  role,
  active,
  onSelect,
  icon,
}: {
  role: TeamRole;
  active: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 rounded-[var(--radius-sm)] border transition-all ${
        active
          ? "border-gold bg-gold-soft"
          : "border-line hover:border-ink"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-ink-soft">{icon}</span>
        <div className="text-[14px] font-bold text-ink">
          {ROLE_LABEL[role]}
        </div>
      </div>
      <div className="text-meta text-ink-soft mt-1.5 leading-relaxed">
        {ROLE_DESCRIPTION[role]}
      </div>
    </button>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
