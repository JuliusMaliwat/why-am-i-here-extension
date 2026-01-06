import type { ActiveIntentionState } from "../shared/types";
import type { RuntimeMessage, RuntimeResponse } from "../shared/messaging";

export function sendMessage(
  message: RuntimeMessage
): Promise<RuntimeResponse | null> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response as RuntimeResponse);
    });
  });
}

export async function getActiveIntentionFromBackground(
  domain: string
): Promise<ActiveIntentionState | null> {
  const response = await sendMessage({ type: "get_active_intention" });
  const active = response?.activeIntention ?? null;
  if (!active || active.domain !== domain) {
    return null;
  }
  return active;
}
