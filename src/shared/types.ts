export type ActiveIntentionState = {
  domain: string;
  intention: string;
  createdAt: number;
  tabId: number;
  timerMinutes?: number;
  timerEndsAt?: number;
};

export type EventType =
  | "overlay_shown"
  | "intention_submitted"
  | "timer_started"
  | "timer_expired";

export type EventRecord = {
  type: EventType;
  domain: string;
  timestamp: number;
  intention?: string;
  tabId?: number;
  minutes?: number;
};
