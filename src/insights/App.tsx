import React, { useEffect, useMemo, useState } from "react";
import {
  aggregateDailyCountsByDomain,
  aggregateHourlyCountsByDomain
} from "../shared/analytics";
import { getEvents } from "../shared/storage";
import type { EventRecord } from "../shared/types";
import type { DailyDomainCounts } from "../shared/analytics";

type RangeOption = 7 | 30 | 90;
type ViewMode = "daily" | "hourly";

type SeriesPoint = {
  date: string;
  overlayShown: number;
  intentionSubmitted: number;
};

type HourlyPoint = {
  hour: string;
  overlayShown: number;
  intentionSubmitted: number;
};

function buildHourKeys(hours: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = hours - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(now.getHours() - i, 0, 0, 0);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    keys.push(`${year}-${month}-${day} ${hour}:00`);
  }
  return keys;
}

function buildDateKeys(rangeDays: number): string[] {
  const today = new Date();
  const keys: string[] = [];
  for (let i = rangeDays - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    keys.push(`${year}-${month}-${day}`);
  }
  return keys;
}

function buildSeries(
  dailyByDomain: ReturnType<typeof aggregateDailyCountsByDomain>,
  selectedDomains: string[],
  rangeDays: number
): SeriesPoint[] {
  const dateKeys = buildDateKeys(rangeDays);
  const domainMaps = selectedDomains.map((domain) => {
    const days = dailyByDomain[domain] ?? [];
    const map = new Map<string, SeriesPoint>();
    days.forEach((day) => {
      map.set(day.date, {
        date: day.date,
        overlayShown: day.overlayShown,
        intentionSubmitted: day.intentionSubmitted
      });
    });
    return map;
  });

  return dateKeys.map((date) => {
    let overlayShown = 0;
    let intentionSubmitted = 0;
    domainMaps.forEach((map) => {
      const day = map.get(date);
      if (!day) return;
      overlayShown += day.overlayShown;
      intentionSubmitted += day.intentionSubmitted;
    });
    return { date, overlayShown, intentionSubmitted };
  });
}

function buildHourlySeries(
  hourlyByDomain: ReturnType<typeof aggregateHourlyCountsByDomain>,
  selectedDomains: string[],
  hours: number
): HourlyPoint[] {
  const hourKeys = buildHourKeys(hours);
  const domainMaps = selectedDomains.map((domain) => {
    const hoursList = hourlyByDomain[domain] ?? [];
    const map = new Map<string, HourlyPoint>();
    hoursList.forEach((hour) => {
      map.set(hour.hour, {
        hour: hour.hour,
        overlayShown: hour.overlayShown,
        intentionSubmitted: hour.intentionSubmitted
      });
    });
    return map;
  });

  return hourKeys.map((hourKey) => {
    let overlayShown = 0;
    let intentionSubmitted = 0;
    domainMaps.forEach((map) => {
      const hour = map.get(hourKey);
      if (!hour) return;
      overlayShown += hour.overlayShown;
      intentionSubmitted += hour.intentionSubmitted;
    });
    return { hour: hourKey, overlayShown, intentionSubmitted };
  });
}

export function App(): JSX.Element {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [range, setRange] = useState<RangeOption>(30);
  const [view, setView] = useState<ViewMode>("daily");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getEvents()
      .then((data) => {
        if (!mounted) return;
        setEvents(data);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Could not load events. Try again.");
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const dailyByDomain = useMemo(
    () => aggregateDailyCountsByDomain(events),
    [events]
  );
  const hourlyByDomain = useMemo(
    () => aggregateHourlyCountsByDomain(events),
    [events]
  );

  const domains = useMemo(
    () => Object.keys(dailyByDomain).sort(),
    [dailyByDomain]
  );

  useEffect(() => {
    if (domains.length === 0) return;
    if (selectedDomains.length === 0) {
      setSelectedDomains(domains);
    }
  }, [domains, selectedDomains.length]);

  const series = useMemo(() => {
    if (view === "hourly") {
      return buildHourlySeries(hourlyByDomain, selectedDomains, 24);
    }
    return buildSeries(dailyByDomain, selectedDomains, range);
  }, [dailyByDomain, hourlyByDomain, selectedDomains, range, view]);

  const noIntentionRates = useMemo(() => {
    return selectedDomains.map((domain) => {
      const days = dailyByDomain[domain] ?? [];
      const rangeDays = buildDateKeys(range).slice(-range);
      const lookup = new Map<string, DailyDomainCounts>();
      days.forEach((day) => lookup.set(day.date, day));
      let overlayShown = 0;
      let intentionSubmitted = 0;
      rangeDays.forEach((date) => {
        const day = lookup.get(date);
        if (!day) return;
        overlayShown += day.overlayShown;
        intentionSubmitted += day.intentionSubmitted;
      });
      const noIntention = Math.max(0, overlayShown - intentionSubmitted);
      const rate =
        overlayShown > 0 ? Math.round((noIntention / overlayShown) * 100) : 0;
      return { domain, rate, overlayShown, noIntention };
    });
  }, [dailyByDomain, selectedDomains, range]);

  const maxValue = useMemo(() => {
    return Math.max(
      1,
      ...series.map((point) =>
        Math.max(point.overlayShown, point.intentionSubmitted)
      )
    );
  }, [series]);

  const linePoints = (
    key: "overlayShown" | "intentionSubmitted"
  ): string => {
    if (series.length <= 1) {
      return "";
    }
    const width = 1000;
    const height = 220;
    const padX = 40;
    const padY = 24;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;
    return series
      .map((point, index) => {
        const x = padX + (usableW * index) / (series.length - 1);
        const value = point[key];
        const y = padY + usableH * (1 - value / maxValue);
        return `${x},${y}`;
      })
      .join(" ");
  };

  const toggleDomain = (domain: string): void => {
    setSelectedDomains((prev) => {
      if (prev.includes(domain)) {
        return prev.filter((item) => item !== domain);
      }
      return [...prev, domain];
    });
  };

  const renderHourlyBars = (): JSX.Element => {
    const width = 1000;
    const height = 220;
    const padX = 40;
    const padY = 24;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;
    const slot = usableW / series.length;
    const barWidth = Math.min(14, slot * 0.6);
    return (
      <svg viewBox="0 0 1000 220" role="img">
        {series.map((point, index) => {
          const x = padX + index * slot + (slot - barWidth) / 2;
          const overlayHeight = usableH * (point.overlayShown / maxValue);
          const intentionHeight =
            usableH * (point.intentionSubmitted / maxValue);
          const overlayY = padY + (usableH - overlayHeight);
          const intentionY = padY + (usableH - intentionHeight);
          return (
            <g key={point.hour}>
              <rect
                x={x}
                y={overlayY}
                width={barWidth}
                height={overlayHeight}
                className="bar overlay"
              />
              <rect
                x={x}
                y={intentionY}
                width={barWidth}
                height={intentionHeight}
                className="bar intentions"
              />
            </g>
          );
        })}
      </svg>
    );
  };

  const renderDailyLines = (): JSX.Element => {
    return (
      <svg viewBox="0 0 1000 220" role="img">
        <polyline className="line overlay" points={linePoints("overlayShown")} />
        <polyline
          className="line intentions"
          points={linePoints("intentionSubmitted")}
        />
      </svg>
    );
  };

  return (
    <main className="insights-app">
      <header className="insights-hero">
        <div>
          <p className="eyebrow">why am i here</p>
          <h1>Insights</h1>
          <p className="subcopy">
            Track your patterns across the domains you choose.
          </p>
        </div>
        <div className="insights-nav">
          <a className="back-link" href="/options.html">
            Back to Options
          </a>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Domain trend</h2>
            <p className="panel-copy">
              Opens (proxy) vs intentions submitted.
            </p>
          </div>
          <div className="range-toggle">
            <div className="mode-toggle">
              <button
                type="button"
                className={view === "daily" ? "active" : ""}
                onClick={() => setView("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                className={view === "hourly" ? "active" : ""}
                onClick={() => setView("hourly")}
              >
                Hourly
              </button>
            </div>
            {view === "daily" && (
              <div className="range-buttons">
                {[7, 30, 90].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={range === value ? "active" : ""}
                    onClick={() => setRange(value as RangeOption)}
                  >
                    {value}d
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="status">{error}</p>}
        {isLoading && <p className="status">Loading analytics...</p>}

        {!isLoading && domains.length === 0 && (
          <p className="empty">No events yet. Use the extension first.</p>
        )}

        {!isLoading && domains.length > 0 && (
          <>
            <div className="domain-filter">
              {domains.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className={selectedDomains.includes(domain) ? "active" : ""}
                  onClick={() => toggleDomain(domain)}
                >
                  {domain}
                </button>
              ))}
            </div>

            {selectedDomains.length === 0 ? (
              <p className="empty">Select at least one domain.</p>
            ) : (
              <div className="chart-wrap">
                {view === "hourly" ? renderHourlyBars() : renderDailyLines()}
                <div className="legend">
                  <span className="legend-item overlay">Opens (proxy)</span>
                  <span className="legend-item intentions">
                    Intentions submitted
                  </span>
                </div>
              </div>
            )}

            {view === "daily" && selectedDomains.length > 0 && (
              <div className="no-intention">
                <h3>No-intention rate</h3>
                <p className="range-note">Last {range} days</p>
                <div className="rate-grid">
                  {noIntentionRates.map((row) => (
                    <div key={row.domain} className="rate-card">
                      <p className="rate-domain">{row.domain}</p>
                      <p className="rate-value">{row.rate}%</p>
                      <p className="rate-detail">
                        {row.noIntention} / {row.overlayShown} opens
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
