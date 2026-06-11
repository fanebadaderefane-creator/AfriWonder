import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  },
}));

import {
  clearInboxConversationsCache,
  clearLegacyInboxConversationsCache,
  loadInboxConversationsCache,
  saveInboxConversationsCache,
} from './inboxConversationsCache';

const userA = 'user-a-1111';
const userB = 'user-b-2222';

const sample = [
  {
    id: 'conv-1',
    name: 'Alice',
    avatar: 'https://example.com/a.jpg',
    lastMessage: 'Salut',
    time: '1h',
    unread: 0,
    online: false,
    isTyping: false,
    lastMsgType: 'text',
    lastOutgoingRead: false,
    isMine: false,
    otherUserId: 'peer-1',
  },
];

describe('inboxConversationsCache', () => {
  beforeEach(() => {
    store.clear();
  });

  it('isole le cache par userId', async () => {
    await saveInboxConversationsCache(sample, userA);
    await saveInboxConversationsCache(
      [{ ...sample[0], id: 'conv-2', name: 'Bob' }],
      userB,
    );

    const listA = await loadInboxConversationsCache(userA);
    const listB = await loadInboxConversationsCache(userB);

    expect(listA).toHaveLength(1);
    expect(listA[0]?.name).toBe('Alice');
    expect(listB).toHaveLength(1);
    expect(listB[0]?.name).toBe('Bob');
  });

  it('ne charge rien sans userId', async () => {
    await saveInboxConversationsCache(sample, userA);
    const empty = await loadInboxConversationsCache(null);
    expect(empty).toEqual([]);
  });

  it('purge le cache legacy global au chargement', async () => {
    store.set('afw_dm_inbox_conversations', JSON.stringify(sample));
    await loadInboxConversationsCache(userA);
    expect(store.has('afw_dm_inbox_conversations')).toBe(false);
  });

  it('clearInboxConversationsCache supprime la clé du compte', async () => {
    await saveInboxConversationsCache(sample, userA);
    await clearInboxConversationsCache(userA);
    expect(await loadInboxConversationsCache(userA)).toEqual([]);
  });

  it('clearLegacyInboxConversationsCache supprime uniquement la clé legacy', async () => {
    store.set('afw_dm_inbox_conversations', JSON.stringify(sample));
    await saveInboxConversationsCache(sample, userA);
    await clearLegacyInboxConversationsCache();
    expect(store.has('afw_dm_inbox_conversations')).toBe(false);
    expect((await loadInboxConversationsCache(userA)).length).toBe(1);
  });
});
