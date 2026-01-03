export type Config = {
  targetDomains: string[];
};

const STORAGE_KEY = "config";
const DEFAULT_CONFIG: Config = { targetDomains: [] };

type StorageShape = { [STORAGE_KEY]?: Config };

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
