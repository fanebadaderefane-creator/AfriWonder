import { openDB } from 'idb';
import { toast } from 'sonner';

const DB_NAME = 'afriwonder-profiles-messages-kv';
const STORE = 'kv';

let dbPromise;

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

async function kvGet(key) {
  const db = await getDb();
  return db.get(STORE, key);
}

async function kvSet(key, value) {
  const db = await getDb();
  await db.put(STORE, value, key);
}

const PROFILE_KEY = (userId) => `profile:${userId}`;
const CONVOS_KEY = (userId) => `conversations:${userId}`;
const MESSAGES_KEY = (convoId) => `messages:${convoId}`;
const STORIES_KEY = (userId) => `stories:${userId}`;
const OUTBOX_KEY = (userId) => `outbox:${userId}`;
const SYNC_STATE_KEY = (scope, id) => `sync:${scope}:${id}`;

function dedupeById(items = []) {
  const map = new Map();
  for (const item of items) {
    const key = item?.id || item?.tempId;
    if (!key) continue;
    map.set(key, item);
  }
  return [...map.values()];
}

export async function cacheProfile(userId, profile) {
  if (!userId || !profile) return;
  await kvSet(PROFILE_KEY(userId), {
    userId,
    profile,
    cachedAt: Date.now(),
  });
}

export async function getCachedProfile(userId) {
  if (!userId) return null;
  return kvGet(PROFILE_KEY(userId));
}

export async function cacheConversations(userId, conversations) {
  if (!userId || !Array.isArray(conversations)) return;
  await kvSet(CONVOS_KEY(userId), {
    userId,
    conversations,
    cachedAt: Date.now(),
  });
}

export async function getCachedConversations(userId) {
  if (!userId) return null;
  return kvGet(CONVOS_KEY(userId));
}

export async function cacheMessages(convoId, messages) {
  if (!convoId || !Array.isArray(messages)) return;
  await kvSet(MESSAGES_KEY(convoId), {
    convoId,
    messages,
    cachedAt: Date.now(),
  });
}

export async function getCachedMessages(convoId) {
  if (!convoId) return null;
  return kvGet(MESSAGES_KEY(convoId));
}

export async function upsertCachedMessages(convoId, nextMessages) {
  if (!convoId || !Array.isArray(nextMessages)) return;
  const current = await getCachedMessages(convoId);
  const merged = dedupeById([...(current?.messages || []), ...nextMessages]).sort(
    (a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime()
  );
  await cacheMessages(convoId, merged);
}

export async function findCachedConversation(userId, conversationId) {
  const cached = await getCachedConversations(userId);
  const conversations = cached?.conversations || [];
  return conversations.find((conv) => String(conv?.id) === String(conversationId)) || null;
}

export async function findCachedConversationByPeer(userId, peerUserId) {
  const cached = await getCachedConversations(userId);
  const conversations = cached?.conversations || [];
  return (
    conversations.find(
      (conv) =>
        String(conv?.other?.id || '') === String(peerUserId) ||
        String(conv?.user1?.id || '') === String(peerUserId) ||
        String(conv?.user2?.id || '') === String(peerUserId)
    ) || null
  );
}

export async function upsertCachedConversation(userId, conversation) {
  if (!userId || !conversation?.id) return;
  const cached = await getCachedConversations(userId);
  const conversations = cached?.conversations || [];
  const next = dedupeById([
    conversation,
    ...conversations.filter((item) => String(item?.id) !== String(conversation.id)),
  ]);
  await cacheConversations(userId, next);
}

export async function cacheStories(userId, stories) {
  if (!userId || !Array.isArray(stories)) return;
  await kvSet(STORIES_KEY(userId), {
    userId,
    stories,
    cachedAt: Date.now(),
  });
}

export async function getCachedStories(userId) {
  if (!userId) return null;
  return kvGet(STORIES_KEY(userId));
}

export async function getOutbox(userId) {
  if (!userId) return { userId, items: [], cachedAt: Date.now() };
  return (await kvGet(OUTBOX_KEY(userId))) || { userId, items: [], cachedAt: Date.now() };
}

export async function setOutbox(userId, items) {
  if (!userId || !Array.isArray(items)) return;
  await kvSet(OUTBOX_KEY(userId), {
    userId,
    items,
    cachedAt: Date.now(),
  });
}

export async function queueOutboxItem(userId, item) {
  if (!userId || !item) return;
  const current = await getOutbox(userId);
  const nextItems = dedupeById([...(current?.items || []), item]).sort(
    (a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime()
  );
  await setOutbox(userId, nextItems);
}

export async function removeOutboxItem(userId, itemId) {
  if (!userId || !itemId) return;
  const current = await getOutbox(userId);
  const nextItems = (current?.items || []).filter(
    (item) => String(item?.id || item?.tempId) !== String(itemId)
  );
  await setOutbox(userId, nextItems);
}

export async function updateOutboxItem(userId, itemId, patch = {}) {
  if (!userId || !itemId || !patch || typeof patch !== 'object') return;
  const current = await getOutbox(userId);
  const nextItems = (current?.items || []).map((item) =>
    String(item?.id || item?.tempId || item?._outboxId) === String(itemId)
      ? { ...item, ...patch }
      : item
  );
  await setOutbox(userId, nextItems);
}

export async function processOutbox(userId, sendFn) {
  if (!userId || typeof sendFn !== 'function') return;
  const outbox = await getOutbox(userId);
  const items = outbox?.items || [];
  if (!items.length) return;

  for (const item of items) {
    const itemId = item?.id || item?.tempId || item?._outboxId;
    if (!itemId) continue;

    const retries = item?.retries ?? 0;
    const nextRetryAt = item?.lastAttempt
      ? item.lastAttempt + Math.min(30000 * Math.pow(2, retries), 300000)
      : 0;

    if (Date.now() < nextRetryAt) continue;

    try {
      await sendFn(item);
      await removeOutboxItem(userId, itemId);
    } catch {
      if (retries >= 5) {
        await removeOutboxItem(userId, itemId);
        toast.error('Message non livré après plusieurs tentatives');
      } else {
        await updateOutboxItem(userId, itemId, {
          retries: retries + 1,
          lastAttempt: Date.now(),
        });
      }
    }
  }
}

export async function setSyncState(scope, id, value) {
  if (!scope || !id) return;
  await kvSet(SYNC_STATE_KEY(scope, id), {
    scope,
    id,
    value,
    cachedAt: Date.now(),
  });
}

export async function getSyncState(scope, id) {
  if (!scope || !id) return null;
  return kvGet(SYNC_STATE_KEY(scope, id));
}
