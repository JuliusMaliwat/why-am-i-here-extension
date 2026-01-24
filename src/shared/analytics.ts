import type { EventRecord } from "./types";

export type DailyDomainCounts = {
  date: string;
  overlayShown: number;
  intentionSubmitted: number;
  noIntention: number;
};

export type HourlyDomainCounts = {
  hour: string;
  overlayShown: number;
  intentionSubmitted: number;
  noIntention: number;
};

export type TopIntention = {
  text: string;
  count: number;
};

type DomainDailyMap = Record<string, Record<string, DailyDomainCounts>>;
type DomainHourlyMap = Record<string, Record<string, HourlyDomainCounts>>;
type DomainIntentionMap = Record<string, Map<string, number>>;

function toLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ensureDay(
  map: DomainDailyMap,
  domain: string,
  dateKey: string
): DailyDomainCounts {
  if (!map[domain]) {
    map[domain] = {};
  }
  if (!map[domain][dateKey]) {
    map[domain][dateKey] = {
      date: dateKey,
      overlayShown: 0,
      intentionSubmitted: 0,
      noIntention: 0
    };
  }
  return map[domain][dateKey];
}

function toLocalHourKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:00`;
}

function ensureHour(
  map: DomainHourlyMap,
  domain: string,
  hourKey: string
): HourlyDomainCounts {
  if (!map[domain]) {
    map[domain] = {};
  }
  if (!map[domain][hourKey]) {
    map[domain][hourKey] = {
      hour: hourKey,
      overlayShown: 0,
      intentionSubmitted: 0,
      noIntention: 0
    };
  }
  return map[domain][hourKey];
}

export function aggregateDailyCountsByDomain(
  events: EventRecord[]
): Record<string, DailyDomainCounts[]> {
  const map: DomainDailyMap = {};

  events.forEach((event) => {
    if (event.type !== "overlay_shown" && event.type !== "intention_submitted") {
      return;
    }
    const dateKey = toLocalDateKey(event.timestamp);
    const day = ensureDay(map, event.domain, dateKey);

    if (event.type === "overlay_shown") {
      day.overlayShown += 1;
      day.noIntention += 1;
    } else if (event.type === "intention_submitted") {
      day.intentionSubmitted += 1;
      if (day.noIntention > 0) {
        day.noIntention -= 1;
      }
    }
  });

  const result: Record<string, DailyDomainCounts[]> = {};
  Object.keys(map).forEach((domain) => {
    const days = Object.values(map[domain]);
    days.sort((a, b) => a.date.localeCompare(b.date));
    result[domain] = days;
  });

  return result;
}

export function aggregateHourlyCountsByDomain(
  events: EventRecord[]
): Record<string, HourlyDomainCounts[]> {
  const map: DomainHourlyMap = {};

  events.forEach((event) => {
    if (event.type !== "overlay_shown" && event.type !== "intention_submitted") {
      return;
    }
    const hourKey = toLocalHourKey(event.timestamp);
    const hour = ensureHour(map, event.domain, hourKey);

    if (event.type === "overlay_shown") {
      hour.overlayShown += 1;
      hour.noIntention += 1;
    } else if (event.type === "intention_submitted") {
      hour.intentionSubmitted += 1;
      if (hour.noIntention > 0) {
        hour.noIntention -= 1;
      }
    }
  });

  const result: Record<string, HourlyDomainCounts[]> = {};
  Object.keys(map).forEach((domain) => {
    const hours = Object.values(map[domain]);
    hours.sort((a, b) => a.hour.localeCompare(b.hour));
    result[domain] = hours;
  });

  return result;
}

export function aggregateTopIntentionsByDomain(
  events: EventRecord[],
  limit = 5
): Record<string, TopIntention[]> {
  const map: DomainIntentionMap = {};

  events.forEach((event) => {
    if (event.type !== "intention_submitted" || !event.intention) {
      return;
    }
    const normalized = event.intention
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) {
      return;
    }
    if (!map[event.domain]) {
      map[event.domain] = new Map();
    }
    const count = map[event.domain].get(normalized) ?? 0;
    map[event.domain].set(normalized, count + 1);
  });

  const result: Record<string, TopIntention[]> = {};
  Object.entries(map).forEach(([domain, intentionMap]) => {
    const items = Array.from(intentionMap.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.text.localeCompare(b.text);
      })
      .slice(0, limit);
    result[domain] = items;
  });

  return result;
}
