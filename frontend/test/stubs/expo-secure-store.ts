const mem = new Map<string, string>();

export default {
  getItemAsync: (k: string) => Promise.resolve(mem.get(k) ?? null),
  setItemAsync: (k: string, v: string) => {
    mem.set(k, v);
    return Promise.resolve();
  },
  deleteItemAsync: (k: string) => {
    mem.delete(k);
    return Promise.resolve();
  },
};
