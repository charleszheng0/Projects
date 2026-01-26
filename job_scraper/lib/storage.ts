export function storageAvailable() {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function setJson<T>(key: string, value: T) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getJson<T>(key: string, fallback: T): T {
  if (!storageAvailable()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setString(key: string, value: string) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(key, value);
}

export function getString(key: string, fallback = "") {
  if (!storageAvailable()) return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}
