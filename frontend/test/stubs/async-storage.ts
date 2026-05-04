const mem = new Map<string, string>();

const AsyncStorage = {
  getItem: (k: string) => Promise.resolve(mem.get(k) ?? null),
  setItem: (k: string, v: string) => {
    mem.set(k, v);
    return Promise.resolve();
  },
  removeItem: (k: string) => {
    mem.delete(k);
    return Promise.resolve();
  },
};

export default AsyncStorage;
