"use client";

import { useEffect, useState } from "react";
import { getProfile } from "@/lib/data/static/profiles";

// Onboarding state lives in localStorage, keyed per profile id, so the
// runtime status can override the static PROFILES default. This lets
// the demo "Reset onboarding" flow re-trigger the wizard for any
// profile without rebuilding mock data — and lets a user close the
// wizard mid-flow and resume on the same step.

export interface OnboardingDraftProfile {
  name: string;
  type: "festival" | "venue" | "promoter";
  city: string;
  bio: string;
}

export interface OnboardingDraftBanking {
  holder: string;
  rib: string;
  bank: string;
  ice: string;
}

export interface OnboardingDraftInvite {
  id: string;
  email: string;
  role: "owner" | "admin" | "scanner";
}

export interface OnboardingDraft {
  /** Last completed step (1-5). 0 = nothing started. */
  lastStep: number;
  profile?: Partial<OnboardingDraftProfile>;
  banking?: Partial<OnboardingDraftBanking>;
  payzoneSkipped?: boolean;
  invites?: OnboardingDraftInvite[];
}

const STATUS_KEY = (profileId: string) =>
  `lyfe-onboarding-status-${profileId}`;
const DRAFT_KEY = (profileId: string) =>
  `lyfe-onboarding-draft-${profileId}`;
const EVENT = "lyfe-onboarding-changed";

function readStatus(profileId: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STATUS_KEY(profileId));
    if (raw === null) return null;
    return raw === "true";
  } catch {
    return null;
  }
}

function writeStatus(profileId: string, completed: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATUS_KEY(profileId), String(completed));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* noop */
  }
}

export function readDraft(profileId: string): OnboardingDraft {
  if (typeof window === "undefined") return { lastStep: 0 };
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY(profileId));
    if (!raw) return { lastStep: 0 };
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return { lastStep: 0 };
  }
}

export function writeDraft(profileId: string, draft: OnboardingDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY(profileId), JSON.stringify(draft));
  } catch {
    /* noop */
  }
}

export function clearDraft(profileId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY(profileId));
  } catch {
    /* noop */
  }
}

export function markOnboardingComplete(profileId: string) {
  writeStatus(profileId, true);
  clearDraft(profileId);
}

// Demo helper — flips the runtime status back to incomplete and wipes
// the draft so the wizard re-opens from step 1. Surfaced via the
// "Reset onboarding" button in /settings.
export function resetOnboarding(profileId: string) {
  writeStatus(profileId, false);
  clearDraft(profileId);
}

// Hook — resolves the effective onboarding status for a profile.
// Returns null until the client has mounted (matches the existing
// useProfile pattern, avoids SSR hydration mismatch).
export function useOnboardingCompleted(profileId: string | null): boolean | null {
  const [status, setStatus] = useState<boolean | null>(null);

  useEffect(() => {
    if (!profileId) {
      setStatus(null);
      return;
    }
    const sync = () => {
      const override = readStatus(profileId);
      if (override !== null) {
        setStatus(override);
        return;
      }
      const seed = getProfile(profileId);
      setStatus(seed?.onboardingCompleted ?? true);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [profileId]);

  return status;
}
