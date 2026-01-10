import type { ActiveIntentionState } from "./types";

export type RuntimeMessage =
  | {
      type: "overlay_shown";
      payload: { domain: string; timestamp: number };
    }
  | {
      type: "intention_submitted";
      payload: {
        domain: string;
        intention: string;
        timestamp: number;
        timerMinutes?: number;
      };
    }
  | {
      type: "timer_expired";
      payload: { domain: string; timestamp: number; minutes?: number };
    }
  | {
      type: "get_active_intention";
    };

export type RuntimeResponse = {
  activeIntention?: ActiveIntentionState | null;
};
