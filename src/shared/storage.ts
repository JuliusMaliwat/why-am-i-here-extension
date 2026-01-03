import type { ActiveIntentionState, EventRecord } from "./types";

export type Config = {
  targetDomains: string[];
};

const STORAGE_KEY = "config";
const EVENTS_KEY = "events";
const ACTIVE_INTENTIONS_KEY = "activeIntentions";
const DEFAULT_CONFIG: Config = { targetDomains: [] };

type StorageShape = {
  [STORAGE_KEY]?: Config;
  [EVENTS_KEY]?: EventRecord[];
  [ACTIVE_INTENTIONS_KEY]?: Record<string, ActiveIntentionState>;
};

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

export async function getConfig(): Promise<Config> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = (result as StorageShape)[STORAGE_KEY];
    return stored ?? DEFAULT_CONFIG;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_CONFIG;
  }
  try {
    const parsed = JSON.parse(raw) as Config;
    return parsed ?? DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setConfig(config: Config): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: config });
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function getEvents(): Promise<EventRecord[]> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(EVENTS_KEY);
    return ((result as StorageShape)[EVENTS_KEY] ?? []) as EventRecord[];
  }

  const raw = localStorage.getItem(EVENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as EventRecord[];
  } catch {
    return [];
  }
}

export async function appendEvent(event: EventRecord): Promise<void> {
  const events = await getEvents();
  events.push(event);

  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [EVENTS_KEY]: events });
    return;
  }

  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export async function getActiveIntention(
  tabId: number
): Promise<ActiveIntentionState | null> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(ACTIVE_INTENTIONS_KEY);
    const map =
      (result as StorageShape)[ACTIVE_INTENTIONS_KEY] ?? {};
    return map[String(tabId)] ?? null;
  }

  const raw = localStorage.getItem(ACTIVE_INTENTIONS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, ActiveIntentionState>;
    return parsed[String(tabId)] ?? null;
  } catch {
    return null;
  }
}

export async function setActiveIntention(
  tabId: number,
  intention: ActiveIntentionState
): Promise<void> {
  const key = String(tabId);
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(ACTIVE_INTENTIONS_KEY);
    const map =
      (result as StorageShape)[ACTIVE_INTENTIONS_KEY] ?? {};
    map[key] = intention;
    await chrome.storage.local.set({ [ACTIVE_INTENTIONS_KEY]: map });
    return;
  }

  const raw = localStorage.getItem(ACTIVE_INTENTIONS_KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, ActiveIntentionState>) : {};
  map[key] = intention;
  localStorage.setItem(ACTIVE_INTENTIONS_KEY, JSON.stringify(map));
}

export async function clearActiveIntention(tabId: number): Promise<void> {
  const key = String(tabId);
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(ACTIVE_INTENTIONS_KEY);
    const map =
      (result as StorageShape)[ACTIVE_INTENTIONS_KEY] ?? {};
    if (map[key]) {
      delete map[key];
      await chrome.storage.local.set({ [ACTIVE_INTENTIONS_KEY]: map });
    }
    return;
  }

  const raw = localStorage.getItem(ACTIVE_INTENTIONS_KEY);
  if (!raw) return;
  try {
    const map = JSON.parse(raw) as Record<string, ActiveIntentionState>;
    if (map[key]) {
      delete map[key];
      localStorage.setItem(ACTIVE_INTENTIONS_KEY, JSON.stringify(map));
    }
  } catch {
    localStorage.removeItem(ACTIVE_INTENTIONS_KEY);
  }
}
