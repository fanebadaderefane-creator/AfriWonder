import { describe, expect, it } from 'vitest';
import { applyDeletedForAllUi, mapApiMessageToChatUi, type ChatUiMessage } from './dmChatMessageMapper';

describe('applyDeletedForAllUi', () => {
  it('convertit un journal d’appel en bulle texte supprimée', () => {
    const next = applyDeletedForAllUi({
      id: 'm1',
      text: 'Appel vidéo',
      isMine: true,
      time: '17:15',
      status: 'read',
      type: 'call',
      callLog: {
        callId: 'call-1',
        media: 'video',
        outcome: 'completed',
        callerId: 'user-a',
        receiverId: 'user-b',
        durationSec: 12,
        startedAt: '2026-06-05T15:00:00.000Z',
        endedAt: '2026-06-05T15:00:12.000Z',
      },
    } as ChatUiMessage);

    expect(next.deleted).toBe(true);
    expect(next.text).toBe('Ce message a été supprimé');
    expect(next.type).toBe('text');
    expect(next.callLog).toBeUndefined();
  });
});

describe('mapApiMessageToChatUi', () => {
  it('affiche un appel supprimé côté serveur comme message supprimé', () => {
    const ui = mapApiMessageToChatUi(
      {
        id: 'm2',
        type: 'call',
        content: 'Ce message a été supprimé',
        sender_id: 'user-a',
        created_at: '2026-06-05T15:00:00.000Z',
        deleted_for_all_at: '2026-06-05T15:01:00.000Z',
      },
      'user-a',
      'Peer',
    );

    expect(ui.deleted).toBe(true);
    expect(ui.text).toBe('Ce message a été supprimé');
    expect(ui.type).toBe('call');
    expect(ui.callLog).toBeUndefined();
  });
});
