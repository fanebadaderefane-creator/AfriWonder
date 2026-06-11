import { describe, expect, it } from 'vitest';
import {
  injectDateSeparators,
  mapApiMessageToChatUi,
  mergeThreadMessagesById,
  stripThreadDateSeparators,
} from './dmChatMessageMapper';

describe('dmChatMessageMapper merge', () => {
  it('mergeThreadMessagesById trie par createdAt et déduplique', () => {
    const merged = mergeThreadMessagesById(
      [{ id: 'b', createdAt: '2026-06-02T00:00:00.000Z', text: 'b' }],
      [{ id: 'a', createdAt: '2026-06-01T00:00:00.000Z', text: 'a' }],
      [{ id: 'b', createdAt: '2026-06-02T00:00:00.000Z', text: 'b-updated' }],
    );
    expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
    expect(merged.find((m) => m.id === 'b')?.text).toBe('b-updated');
  });

  it('stripThreadDateSeparators retire les pastilles date-*', () => {
    const rows = [
      { id: 'date-x', text: '' },
      { id: 'msg-1', text: 'hello' },
    ];
    expect(stripThreadDateSeparators(rows)).toEqual([{ id: 'msg-1', text: 'hello' }]);
  });

  it('injectDateSeparators insère des séparateurs', () => {
    const rows = injectDateSeparators(
      [
        {
          id: '1',
          text: 'a',
          isMine: false,
          time: '10:00',
          status: 'read',
          type: 'text',
          createdAt: '2026-06-09T10:00:00.000Z',
        },
      ],
      () => "Aujourd'hui",
    );
    expect(rows[0]?.id).toBe('date-1');
    expect(rows[1]?.id).toBe('1');
  });

  it('mapApiMessageToChatUi parse la durée vocale depuis le contenu', () => {
    const ui = mapApiMessageToChatUi(
      {
        id: 'v1',
        type: 'audio',
        content: 'Vocal 0:42',
        media_url: 'https://cdn.example/v.m4a',
        created_at: '2026-06-09T10:00:00.000Z',
        sender_id: 'u2',
      },
      'u1',
      'Ami',
    );
    expect(ui.voiceDuration).toBe('0:42');
    expect(ui.imageUri).toBe('https://cdn.example/v.m4a');
    expect(ui.createdAt).toBe('2026-06-09T10:00:00.000Z');
  });
});
