import {
  appendEvent,
  clearActiveIntention,
  getActiveIntention,
  setActiveIntention
} from "../shared/storage";
import type { RuntimeMessage, RuntimeResponse } from "../shared/messaging";

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    const handle = async (): Promise<void> => {
      switch (message.type) {
        case "overlay_shown": {
          if (tabId == null) return;
          await appendEvent({
            type: "overlay_shown",
            domain: message.payload.domain,
            timestamp: message.payload.timestamp,
            tabId
          });
          return;
        }
        case "intention_submitted": {
          if (tabId == null) return;
          const minutes = message.payload.timerMinutes ?? 0;
          const endsAt =
            minutes > 0 ? message.payload.timestamp + minutes * 60 * 1000 : null;
          await appendEvent({
            type: "intention_submitted",
            domain: message.payload.domain,
            timestamp: message.payload.timestamp,
            intention: message.payload.intention,
            tabId
          });
          if (minutes > 0) {
            await appendEvent({
              type: "timer_started",
              domain: message.payload.domain,
              timestamp: message.payload.timestamp,
              intention: message.payload.intention,
              tabId,
              minutes
            });
          }
          await setActiveIntention(tabId, {
            domain: message.payload.domain,
            intention: message.payload.intention,
            createdAt: message.payload.timestamp,
            tabId,
            timerMinutes: minutes > 0 ? minutes : undefined,
            timerEndsAt: endsAt ?? undefined
          });
          return;
        }
        case "get_active_intention": {
          if (tabId == null) {
            sendResponse({ activeIntention: null } as RuntimeResponse);
            return;
          }
          const activeIntention = await getActiveIntention(tabId);
          sendResponse({ activeIntention } as RuntimeResponse);
          return;
        }
        case "timer_expired": {
          if (tabId == null) return;
          const minutes = message.payload.minutes ?? 0;
          await appendEvent({
            type: "timer_expired",
            domain: message.payload.domain,
            timestamp: message.payload.timestamp,
            tabId,
            minutes: minutes > 0 ? minutes : undefined
          });
          return;
        }
        default:
          return;
      }
    };

    handle().catch((error) => {
      console.error("[waih] background error", error);
      if (message.type === "get_active_intention") {
        sendResponse({ activeIntention: null } as RuntimeResponse);
      }
    });

    return message.type === "get_active_intention";
  }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  clearActiveIntention(tabId).catch((error) => {
    console.error("[waih] failed to clear tab state", error);
  });
});
