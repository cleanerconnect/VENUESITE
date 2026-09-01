import "server-only";

// Advisor selection.
//
// Same shape as the data seam: one env var, one decision, made once. With
// no key configured the workspace runs on the mock advisor — which is why
// a designer can pull the repo and see every AI surface populated without
// an Anthropic account.

import type { AiAdvisor } from "./advisor";
import { MockAdvisor } from "./mock-advisor";
import { ClaudeAdvisor } from "./claude-advisor";

let cached: AiAdvisor | null = null;

export function getAdvisor(): AiAdvisor {
  if (cached) return cached;
  cached = isLiveAi() ? new ClaudeAdvisor() : new MockAdvisor();
  return cached;
}

/**
 * The SDK also resolves ANTHROPIC_AUTH_TOKEN and an `ant auth login`
 * profile, so an unset ANTHROPIC_API_KEY does not prove there are no
 * credentials. LYFE_AI_ENABLED is the explicit switch for those setups —
 * and the kill switch when a provider is degraded.
 */
export function isLiveAi(): boolean {
  if (process.env.LYFE_AI_ENABLED === "false") return false;
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.LYFE_AI_ENABLED === "true");
}

export * from "./advisor";
export * from "./schemas";
