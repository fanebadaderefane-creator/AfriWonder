import { describe, expect, it } from 'vitest';
import { applyInboxActivity, sortInboxByRecency } from './inboxRealtime';

const formatTimeAgo = () => 'maintenant';

describe('inboxRealtime', () => {
  it('sortInboxByRecency orders by lastMessageAt descending', () => {
    const sorted = sortInboxByRecency([
      { id: 'a', lastMessageAt: '2026-06-10T10:00:00.000Z' },
      { id: 'c', lastMessageAt: '2026-06-16T12:00:00.000Z' },
      { id: 'b', lastMessageAt: '2026-06-12T08:00:00.000Z' },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('applyInboxActivity moves conversation to top when newer activity arrives', () => {
    const list = [
      { id: 'a', lastMessageAt: '2026-06-16T12:00:00.000Z', unread: 0, time: 'x' },
      { id: 'b', lastMessageAt: '2026-06-15T12:00:00.000Z', unread: 1, time: 'y' },
      { id: 'c', lastMessageAt: '2026-06-14T12:00:00.000Z', unread: 0, time: 'z' },
    ];
    const next = applyInboxActivity(
      list,
      {
        conversationId: 'c',
        lastMessage: 'Salut',
        lastMessageAt: '2026-06-16T13:00:00.000Z',
        lastMsgType: 'text',
        senderId: 'peer-1',
        unread: 1,
      },
      'me',
      formatTimeAgo,
    );
    expect(next?.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(next?.[0]).toMatchObject({ lastMessage: 'Salut', unread: 1, isMine: false });
  });

  it('applyInboxActivity marks outgoing messages as mine', () => {
    const list = [
      { id: 'a', lastMessageAt: '2026-06-16T12:00:00.000Z', unread: 0, isMine: false, lastOutgoingRead: true },
    ];
    const next = applyInboxActivity(
      list,
      {
        conversationId: 'a',
        lastMessage: 'OK',
        lastMessageAt: '2026-06-16T13:00:00.000Z',
        senderId: 'me',
      },
      'me',
      formatTimeAgo,
    );
    expect(next?.[0]?.isMine).toBe(true);
    expect(next?.[0]?.lastOutgoingRead).toBe(false);
  });
});
