import { describe, it, expect } from 'vitest';
import { buildPolicyLabel, computeDepositAmount, isDepositRequired } from './depositPolicy';

const basePolicy = {
  enabled: true,
  defaultAmount: 25,
  largePartyThreshold: 6,
  largePartyAmount: 50,
  showPolicyLabel: true,
};

describe('depositPolicy', () => {
  it('computes requirement correctly by threshold', () => {
    expect(isDepositRequired({ policy: basePolicy, partySize: 2 })).toBe(false);
    expect(isDepositRequired({ policy: basePolicy, partySize: 6 })).toBe(true);
    expect(isDepositRequired({ policy: basePolicy, partySize: 10 })).toBe(true);
  });

  it('computes amount for small vs large parties', () => {
    expect(computeDepositAmount({ policy: basePolicy, partySize: 2 })).toBe(0);
    expect(computeDepositAmount({ policy: basePolicy, partySize: 6 })).toBe(50);
    expect(computeDepositAmount({ policy: basePolicy, partySize: 4 })).toBe(0);
    expect(computeDepositAmount({ policy: { ...basePolicy, largePartyAmount: 0 }, partySize: 8 })).toBe(0);
  });

  it('builds label when enabled', () => {
    expect(buildPolicyLabel(basePolicy)).toBe('Required for parties ≥ 6');
    expect(buildPolicyLabel({ ...basePolicy, showPolicyLabel: false })).toBeUndefined();
  });
});


