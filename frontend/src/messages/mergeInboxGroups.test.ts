import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/avatarFallback', () => ({
  profileAvatarUri: (url: string | null | undefined, name: string) =>
    url && String(url).trim() ? String(url) : `avatar:${name}`,
}));

import { mapApiGroupToInboxRow, mergeInboxDmAndGroups } from './mergeInboxGroups';

describe('mergeInboxGroups', () => {
  const formatTime = () => '10:00';

  it('mapApiGroupToInboxRow marks group rows', () => {
    const row = mapApiGroupToInboxRow(
      {
        id: 'g1',
        name: 'Équipe',
        last_message_text: 'Salut',
        last_message_at: '2026-05-28T10:00:00.000Z',
        unread_count: 2,
        members_count: 5,
      },
      formatTime,
      'u-me',
    );
    expect(row.isGroup).toBe(true);
    expect(row.id).toBe('g1');
    expect(row.unread).toBe(2);
  });

  it('mergeInboxDmAndGroups does not overwrite DM with same id', () => {
    const dm = [
      {
        id: 'shared',
        name: 'Alice',
        avatar: 'a',
        lastMessage: 'hi',
        time: '',
        unread: 0,
        online: false,
        isTyping: false,
        lastMsgType: 'text',
        lastOutgoingRead: false,
        isMine: false,
        isGroup: false,
      },
    ];
    const groups = [
      {
        id: 'shared',
        name: 'Groupe',
        avatar: 'g',
        lastMessage: 'hey',
        time: '',
        unread: 1,
        online: false,
        isTyping: false,
        lastMsgType: 'text',
        lastOutgoingRead: false,
        isMine: false,
        isGroup: true,
      },
    ];
    const merged = mergeInboxDmAndGroups(dm, groups);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('Alice');
    expect(merged[0].isGroup).toBeFalsy();
  });

  it('mergeInboxDmAndGroups adds standalone groups', () => {
    const merged = mergeInboxDmAndGroups(
      [],
      [
        {
          id: 'g-only',
          name: 'G',
          avatar: 'x',
          lastMessage: 'm',
          time: '',
          unread: 0,
          online: false,
          isTyping: false,
          lastMsgType: 'text',
          lastOutgoingRead: false,
          isMine: false,
          isGroup: true,
        },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].isGroup).toBe(true);
  });
});
