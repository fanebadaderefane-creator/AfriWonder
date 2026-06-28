import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '../..');

describe('audit-agora-call-effects gate', () => {
  it('passe — aucun useEffect nu sur le chemin appel Agora', () => {
    expect(() => {
      execSync('node scripts/audit-agora-call-effects.cjs', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('DirectCallAgoraScreen — resync callId si canal actif (recovery ErrorBoundary)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src/call/DirectCallAgoraScreen.native.tsx'),
      'utf8',
    );
    expect(src).toContain('agora_recovery_call_id_resync');
    expect(src).toContain('isCallScreenRecovering()');
  });
});
