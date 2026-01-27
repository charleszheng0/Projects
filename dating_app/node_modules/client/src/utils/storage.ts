type StorageRecord = { value: string };

const localStorageAdapter = {
  async get(key: string): Promise<StorageRecord | null> {
    const value = window.localStorage.getItem(key);
    return value === null ? null : { value };
  },
  async set(key: string, value: string): Promise<void> {
    window.localStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    window.localStorage.removeItem(key);
  },
};

export function ensureStorage() {
  if (typeof window === "undefined") return;
  if (!window.storage) {
    window.storage = localStorageAdapter;
  }
}

export const storage = localStorageAdapter;
