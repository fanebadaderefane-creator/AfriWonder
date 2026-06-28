import { describe, expect, it } from 'vitest';
import {
  isCallScreenRecovering,
  markCallScreenRecovering,
} from './callErrorRecoveryGate';

describe('callErrorRecoveryGate', () => {
  it('toggle recovering flag', () => {
    markCallScreenRecovering(false);
    expect(isCallScreenRecovering()).toBe(false);
    markCallScreenRecovering(true);
    expect(isCallScreenRecovering()).toBe(true);
    markCallScreenRecovering(false);
    expect(isCallScreenRecovering()).toBe(false);
  });
});
