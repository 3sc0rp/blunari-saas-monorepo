import { OperationalSettings } from "@/types/settings";

export interface DepositDecisionInput {
  policy: OperationalSettings["depositPolicy"]; 
  partySize: number;
  serviceDate?: Date;
}

export function isDepositRequired({ policy, partySize }: DepositDecisionInput): boolean {
  if (!policy?.enabled) return false;
  const threshold = Math.max(1, policy.largePartyThreshold || 6);
  return partySize >= threshold;
}

export function computeDepositAmount({ policy, partySize }: DepositDecisionInput): number {
  if (!isDepositRequired({ policy, partySize })) return 0;
  const threshold = Math.max(1, policy.largePartyThreshold || 6);
  if (partySize >= threshold) {
    const large = Number(policy.largePartyAmount || 0);
    return Math.max(0, Math.round(large));
  }
  return Math.max(0, Math.round(Number(policy.defaultAmount || 0)));
}

export function buildPolicyLabel(policy: OperationalSettings["depositPolicy"]): string | undefined {
  if (!policy?.enabled || !policy?.showPolicyLabel) return undefined;
  const threshold = Math.max(1, policy.largePartyThreshold || 6);
  return `Required for parties ≥ ${threshold}`;
}


