import * as lemmatizer from "wink-lemmatizer";
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
  variants: { text: string; count: number }[];
};

type DomainDailyMap = Record<string, Record<string, DailyDomainCounts>>;
type DomainHourlyMap = Record<string, Record<string, HourlyDomainCounts>>;
type DomainIntentionMap = Record<string, Map<string, number>>;

type IntentionCluster = {
  representative: string;
  repCount: number;
  repTokens: string[];
  total: number;
  variants: Map<string, number>;
};

const STOPWORDS = new Set([
  "a",
  "about",
  "a",
  "ad",
  "after",
  "again",
  "al",
  "allo",
  "alla",
  "all",
  "ai",
  "agli",
  "alle",
  "am",
  "an",
  "and",
  "another",
  "any",
  "are",
  "as",
  "at",
  "be",
  "been",
  "being",
  "but",
  "da",
  "dal",
  "dallo",
  "dalla",
  "dei",
  "degli",
  "delle",
  "did",
  "di",
  "do",
  "does",
  "doing",
  "done",
  "e",
  "ed",
  "for",
  "from",
  "go",
  "going",
  "gone",
  "got",
  "had",
  "has",
  "have",
  "having",
  "o",
  "of",
  "on",
  "or",
  "our",
  "ours",
  "out",
  "over",
  "per",
  "che",
  "how",
  "i",
  "il",
  "lo",
  "la",
  "i",
  "gli",
  "le",
  "un",
  "una",
  "uno",
  "in",
  "into",
  "is",
  "it",
  "its",
  "su",
  "so",
  "some",
  "still",
  "per",
  "mi",
  "ti",
  "si",
  "ci",
  "vi",
  "non",
  "not",
  "now",
  "no",
  "off",
  "once",
  "only",
  "other",
  "our",
  "ours",
  "out",
  "sto",
  "stai",
  "sta",
  "stiamo",
  "state",
  "stanno",
  "devo",
  "devi",
  "deve",
  "dobbiamo",
  "dovete",
  "devono",
  "ancora",
  "to",
  "the",
  "this",
  "that",
  "these",
  "those",
  "then",
  "than",
  "there",
  "their",
  "theirs",
  "them",
  "they",
  "you",
  "your",
  "yours",
  "we",
  "us",
  "voglio",
  "vorrei",
  "posso",
  "puoi",
  "puo",
  "want",
  "wanted",
  "wants",
  "wanna",
  "need",
  "needs",
  "needed",
  "with",
  "without",
  "while",
  "when",
  "where",
  "why",
  "who",
  "whom",
  "what",
  "which",
  "will",
  "would",
  "should",
  "could"
]);

function normalizeForSimilarity(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && !STOPWORDS.has(token));
  return tokens.map(lemmatizeToken);
}

function lemmatizeToken(token: string): string {
  const base = token.toLowerCase();
  const candidates = [
    lemmatizer.verb(base),
    lemmatizer.noun(base),
    lemmatizer.adjective(base),
    base
  ].filter(Boolean);
  return candidates.reduce((best, current) => {
    if (!best) return current;
    return current.length < best.length ? current : best;
  }, base);
}

function similarityScore(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0;
  }
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) {
      intersection += 1;
    }
  });
  if (intersection === 0) {
    return 0;
  }
  const isSubset =
    (tokensA.length <= tokensB.length &&
      tokensA.every((token) => setB.has(token))) ||
    (tokensB.length <= tokensA.length &&
      tokensB.every((token) => setA.has(token)));
  if (isSubset && intersection >= 1) {
    return 1;
  }
  const union = setA.size + setB.size - intersection;
  const jaccard = intersection / union;
  return jaccard;
}

function isBetterRepresentative(
  candidate: string,
  candidateCount: number,
  current: string,
  currentCount: number
): boolean {
  if (candidate.length !== current.length) {
    return candidate.length > current.length;
  }
  if (candidateCount !== currentCount) {
    return candidateCount > currentCount;
  }
  return candidate.localeCompare(current) < 0;
}

function groupIntentions(
  intentionMap: Map<string, number>,
  limit: number
): TopIntention[] {
  const items = Array.from(intentionMap.entries()).sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0]);
  });

  const clusters: IntentionCluster[] = [];
  items.forEach(([text, count]) => {
    const tokens = normalizeForSimilarity(text);
    let bestIndex = -1;
    let bestScore = 0;
    clusters.forEach((cluster, index) => {
      const score = similarityScore(tokens, cluster.repTokens);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestScore >= 0.4 && bestIndex >= 0) {
      const cluster = clusters[bestIndex];
      cluster.total += count;
      const prevCount = cluster.variants.get(text) ?? 0;
      cluster.variants.set(text, prevCount + count);
      if (
        isBetterRepresentative(
          text,
          count,
          cluster.representative,
          cluster.repCount
        )
      ) {
        cluster.representative = text;
        cluster.repCount = count;
        cluster.repTokens = tokens;
      }
    } else {
      clusters.push({
        representative: text,
        repCount: count,
        repTokens: tokens,
        total: count,
        variants: new Map([[text, count]])
      });
    }
  });

  return clusters
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return a.representative.localeCompare(b.representative);
    })
    .slice(0, limit)
    .map((cluster) => {
      const variants = Array.from(cluster.variants.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.text.localeCompare(b.text);
        });
      return {
        text: cluster.representative,
        count: cluster.total,
        variants
      };
    });
}

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
  limit = 5,
  fromTimestamp?: number
): Record<string, TopIntention[]> {
  const map: DomainIntentionMap = {};

  events.forEach((event) => {
    if (event.type !== "intention_submitted" || !event.intention) {
      return;
    }
    if (fromTimestamp && event.timestamp < fromTimestamp) {
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
    result[domain] = groupIntentions(intentionMap, limit);
  });

  return result;
}
