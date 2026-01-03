export type ActiveIntentionState = {
  domain: string;
  intention: string;
  createdAt: number;
  tabId: number;
};

export type EventType = "overlay_shown" | "intention_submitted";

export type EventRecord = {
  type: EventType;
  domain: string;
  timestamp: number;
  intention?: string;
  tabId?: number;
};
