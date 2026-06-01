import { describe, expect, it } from 'vitest';
import { createDmThreadApi, isGroupSocketEnvelope, parseThreadKind } from './dmThreadApi';

describe('dmThreadApi', () => {
  it('parseThreadKind detects group', () => {
    expect(parseThreadKind({ kind: 'group' })).toBe('group');
    expect(parseThreadKind({ isGroup: '1' })).toBe('group');
    expect(parseThreadKind({})).toBe('dm');
  });

  it('createDmThreadApi uses group endpoints', () => {
    const api = createDmThreadApi('g-1', 'group');
    expect(api.messagesPath).toContain('/messages/group/');
    expect(api.sendPath).toContain('/send');
    expect(api.messageHideForMePath('m1')).toContain('hide-for-me');
  });

  it('isGroupSocketEnvelope', () => {
    expect(isGroupSocketEnvelope({ groupId: 'a', message: { id: '1' } })).toBe(true);
    expect(isGroupSocketEnvelope({ conversation_id: 'x' })).toBe(false);
  });
});
