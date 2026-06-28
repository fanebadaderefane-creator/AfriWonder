import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

describe('agoraDmLifecycle audit invariants', () => {
  const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

  it('stale channel cleanup mount-only (pas sur invite:ack callId)', () => {
    const src = read('src/call/DirectCallAgoraScreen.native.tsx');
    const block = src.slice(src.indexOf('agora_stale_channel_on_mount'), src.indexOf('agora_screen_call_id'));
    expect(block).toContain('callIdRef.current');
    expect(block).toMatch(/\[\s*\]/);
    expect(block).not.toMatch(/\[\s*callId\s*,\s*role\s*\]/);
  });

  it('handleMissedNoAnswer aborte le join Agora', () => {
    const src = read('src/call/DirectCallAgoraScreen.native.tsx');
    const block = src.slice(src.indexOf('handleMissedNoAnswer'), src.indexOf('dismissMissedPanel'));
    expect(block).toContain('callAbortedRef.current = true');
    expect(block).toContain("finishCallRef.current('missed'");
  });

  it('finishCall bootstrap failed supporte force', () => {
    const src = read('src/call/DirectCallAgoraScreen.native.tsx');
    expect(src).toContain('force?: boolean');
    expect(src).toContain("finishCallRef.current('failed', { force: true })");
  });

  it('invite:ack migre le canal actif sans forceLeave', () => {
    const src = read('src/call/DirectCallAgoraScreen.native.tsx');
    expect(src).toContain('migrateAgoraDmActiveChannelCallId');
  });
});
