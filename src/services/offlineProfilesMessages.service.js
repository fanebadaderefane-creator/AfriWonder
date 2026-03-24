import localforage from 'localforage';

const STORE_NAME = 'afw_offline_profiles_messages';

const store = localforage.createInstance({
  name: 'afriwonder-offline',
  storeName: STORE_NAME,
});

const PROFILE_KEY = (userId) => `profile:${userId}`;
const CONVOS_KEY = (userId) => `conversations:${userId}`;
const MESSAGES_KEY = (convoId) => `messages:${convoId}`;

export async function cacheProfile(userId, profile) {
  if (!userId || !profile) return;
  await store.setItem(PROFILE_KEY(userId), {
    userId,
    profile,
    cachedAt: Date.now(),
  });
}

export async function getCachedProfile(userId) {
  if (!userId) return null;
  return store.getItem(PROFILE_KEY(userId));
}

export async function cacheConversations(userId, conversations) {
  if (!userId || !Array.isArray(conversations)) return;
  await store.setItem(CONVOS_KEY(userId), {
    userId,
    conversations,
    cachedAt: Date.now(),
  });
}

export async function getCachedConversations(userId) {
  if (!userId) return null;
  return store.getItem(CONVOS_KEY(userId));
}

export async function cacheMessages(convoId, messages) {
  if (!convoId || !Array.isArray(messages)) return;
  await store.setItem(MESSAGES_KEY(convoId), {
    convoId,
    messages,
    cachedAt: Date.now(),
  });
}

export async function getCachedMessages(convoId) {
  if (!convoId) return null;
  return store.getItem(MESSAGES_KEY(convoId));
}

