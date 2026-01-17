import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  aggregateDailyCountsByDomain,
  aggregateHourlyCountsByDomain
} from "../shared/analytics";
import { getEvents } from "../shared/storage";
import type { EventRecord } from "../shared/types";
import type { DailyDomainCounts } from "../shared/analytics";

type RangeOption = "24h" | "7d" | "30d" | "3m" | "6m" | "12m" | "all";
type MetricOption = "opens" | "intentions" | "no_intention_rate";

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
  const [range, setRange] = useState<RangeOption>("30d");
  const [metric, setMetric] = useState<MetricOption>("opens");
  const [domainMenuOpen, setDomainMenuOpen] = useState(false);
  const [metricMenuOpen, setMetricMenuOpen] = useState(false);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const metricMenuRef = useRef<HTMLDivElement | null>(null);
  const domainMenuRef = useRef<HTMLDivElement | null>(null);
  const rangeMenuRef = useRef<HTMLDivElement | null>(null);
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

  const rangeOptions: { id: RangeOption; label: string }[] = [
    { id: "24h", label: "Last 24 hours" },
    { id: "7d", label: "Last 7 days" },
    { id: "30d", label: "Last 30 days" },
    { id: "3m", label: "Last 3 months" },
    { id: "6m", label: "Last 6 months" },
    { id: "12m", label: "Last 12 months" },
    { id: "all", label: "All time" }
  ];

  const metricOptions: { id: MetricOption; label: string }[] = [
    { id: "opens", label: "Opens (proxy)" },
    { id: "intentions", label: "Intentions submitted" },
    { id: "no_intention_rate", label: "No-intention rate" }
  ];

  const isHourlyRange = range === "24h";

  const rangeDays = useMemo(() => {
    if (range === "7d") return 7;
    if (range === "30d") return 30;
    if (range === "3m") return 90;
    if (range === "6m") return 180;
    if (range === "12m") return 365;
    if (range === "all") {
      if (events.length === 0) return 30;
      const earliest = events.reduce((min, event) => {
        return Math.min(min, event.timestamp);
      }, events[0].timestamp);
      const diffMs = Date.now() - earliest;
      const diffDays = Math.max(1, Math.ceil(diffMs / 86400000));
      return diffDays;
    }
    return 30;
  }, [range, events]);

  const series = useMemo(() => {
    if (isHourlyRange) {
      return buildHourlySeries(hourlyByDomain, selectedDomains, 24);
    }
    return buildSeries(dailyByDomain, selectedDomains, rangeDays);
  }, [dailyByDomain, hourlyByDomain, selectedDomains, rangeDays, isHourlyRange]);

  const noIntentionRates = useMemo(() => {
    return selectedDomains.map((domain) => {
      const days = dailyByDomain[domain] ?? [];
      const rangeDaysList = buildDateKeys(rangeDays).slice(-rangeDays);
      const lookup = new Map<string, DailyDomainCounts>();
      days.forEach((day) => lookup.set(day.date, day));
      let overlayShown = 0;
      let intentionSubmitted = 0;
      rangeDaysList.forEach((date) => {
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
  }, [dailyByDomain, selectedDomains, rangeDays]);

  const maxValue = useMemo(() => {
    if (metric === "no_intention_rate") {
      return 100;
    }
    const values = series.map((point) => {
      if (metric === "opens") return point.overlayShown;
      return point.intentionSubmitted;
    });
    return Math.max(1, ...values);
  }, [series, metric]);

  const chartLayout = {
    width: 1000,
    height: 220,
    padX: 40,
    padY: 24
  };

  const chartPoints = useMemo(() => {
    if (series.length === 0) {
      return [];
    }
    const usableW = chartLayout.width - chartLayout.padX * 2;
    const usableH = chartLayout.height - chartLayout.padY * 2;
    return series.map((point, index) => {
      const x = chartLayout.padX + (usableW * index) / (series.length - 1);
      let value = point.overlayShown;
      if (metric === "intentions") {
        value = point.intentionSubmitted;
      } else if (metric === "no_intention_rate") {
        value =
          point.overlayShown > 0
            ? ((point.overlayShown - point.intentionSubmitted) /
                point.overlayShown) *
              100
            : 0;
      }
      const y = chartLayout.padY + usableH * (1 - value / maxValue);
      const label = "hour" in point ? point.hour : point.date;
      return { x, y, value, label };
    });
  }, [series, metric, maxValue, chartLayout]);

  const formatValue = (value: number): string => {
    if (metric === "no_intention_rate") {
      return `${Math.round(value)}%`;
    }
    return `${Math.round(value)}`;
  };

  const formatLabel = (label: string): string => {
    const includeYear = range === "all" || range === "12m";
    if (isHourlyRange) {
      const [datePart, timePart] = label.split(" ");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour] = timePart.split(":").map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          ...(includeYear ? { year: "numeric" } : {})
        }).format(new Date(year, month - 1, day, hour));
      }
    }
    if (label.includes("-")) {
      const [year, month, day] = label.split("-").map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          ...(includeYear ? { year: "numeric" } : {})
        }).format(new Date(year, month - 1, day));
      }
    }
    return label;
  };

  const handleChartMove = (
    event: React.MouseEvent<SVGSVGElement>
  ): void => {
    if (chartPoints.length === 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const usableW = chartLayout.width - chartLayout.padX * 2;
    const relativeX =
      ((event.clientX - rect.left) / rect.width) * chartLayout.width;
    const clampedX = Math.min(
      chartLayout.width - chartLayout.padX,
      Math.max(chartLayout.padX, relativeX)
    );
    const index = Math.round(
      ((clampedX - chartLayout.padX) / usableW) *
        Math.max(1, chartPoints.length - 1)
    );
    setHoverIndex(index);
  };

  const handleChartLeave = (): void => {
    setHoverIndex(null);
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
    const usableW = chartLayout.width - chartLayout.padX * 2;
    const usableH = chartLayout.height - chartLayout.padY * 2;
    const slot = usableW / series.length;
    const barWidth = Math.min(14, slot * 0.6);
    return (
      <svg
        viewBox="0 0 1000 220"
        role="img"
        className={`chart-svg ${metric}`}
        onMouseMove={handleChartMove}
        onMouseLeave={handleChartLeave}
      >
        {series.map((point, index) => {
          const x =
            chartLayout.padX + index * slot + (slot - barWidth) / 2;
          const value = chartPoints[index]?.value ?? 0;
          const barHeight = usableH * (value / maxValue);
          const barY = chartLayout.padY + (usableH - barHeight);
          return (
            <g key={point.hour}>
              <rect
                x={x}
                y={barY}
                width={barWidth}
                height={barHeight}
                className={`bar ${metric}`}
              />
            </g>
          );
        })}
        {hoverIndex !== null && chartPoints[hoverIndex] && (
          <g className="chart-focus">
            <line
              x1={chartPoints[hoverIndex].x}
              x2={chartPoints[hoverIndex].x}
              y1={chartLayout.padY}
              y2={chartLayout.height - chartLayout.padY}
            />
            <circle
              cx={chartPoints[hoverIndex].x}
              cy={chartPoints[hoverIndex].y}
              r={5}
            />
            <g
              className="chart-tooltip"
              transform={`translate(${Math.min(
                Math.max(
                  chartLayout.padX,
                  chartPoints[hoverIndex].x - 80
                ),
                chartLayout.width - chartLayout.padX - 160
              )},${Math.max(
                chartLayout.padY,
                chartPoints[hoverIndex].y - 70
              )})`}
            >
              <rect width="160" height="56" rx="14" />
              <text x="12" y="20" className="tooltip-label">
                {formatLabel(chartPoints[hoverIndex].label)}
              </text>
              <text x="12" y="42" className="tooltip-value">
                {formatValue(chartPoints[hoverIndex].value)}
              </text>
            </g>
          </g>
        )}
      </svg>
    );
  };

  const renderDailyLines = (): JSX.Element => {
    if (chartPoints.length === 0) {
      return (
        <svg viewBox="0 0 1000 220" role="img">
          <polyline className={`line ${metric}`} points="" />
        </svg>
      );
    }
    const linePath = chartPoints
      .map((point) => `${point.x},${point.y}`)
      .join(" ");
    const areaPath = [
      `M ${chartPoints[0].x} ${chartPoints[0].y}`,
      ...chartPoints.slice(1).map((point) => `L ${point.x} ${point.y}`),
      `L ${chartPoints[chartPoints.length - 1].x} ${
        chartLayout.height - chartLayout.padY
      }`,
      `L ${chartPoints[0].x} ${chartLayout.height - chartLayout.padY}`,
      "Z"
    ].join(" ");
    return (
      <svg
        viewBox="0 0 1000 220"
        role="img"
        className={`chart-svg ${metric}`}
        onMouseMove={handleChartMove}
        onMouseLeave={handleChartLeave}
      >
        <defs>
          <linearGradient
            id="chart-area-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className={`area ${metric}`}
          d={areaPath}
          fill="url(#chart-area-gradient)"
        />
        <polyline className={`line ${metric}`} points={linePath} />
        {hoverIndex !== null && chartPoints[hoverIndex] && (
          <g className="chart-focus">
            <line
              x1={chartPoints[hoverIndex].x}
              x2={chartPoints[hoverIndex].x}
              y1={chartLayout.padY}
              y2={chartLayout.height - chartLayout.padY}
            />
            <circle
              cx={chartPoints[hoverIndex].x}
              cy={chartPoints[hoverIndex].y}
              r={5}
            />
            <g
              className="chart-tooltip"
              transform={`translate(${Math.min(
                Math.max(
                  chartLayout.padX,
                  chartPoints[hoverIndex].x - 80
                ),
                chartLayout.width - chartLayout.padX - 160
              )},${Math.max(
                chartLayout.padY,
                chartPoints[hoverIndex].y - 70
              )})`}
            >
              <rect width="160" height="56" rx="14" />
              <text x="12" y="20" className="tooltip-label">
                {formatLabel(chartPoints[hoverIndex].label)}
              </text>
              <text x="12" y="42" className="tooltip-value">
                {formatValue(chartPoints[hoverIndex].value)}
              </text>
            </g>
          </g>
        )}
      </svg>
    );
  };

  const metricLabel =
    metricOptions.find((option) => option.id === metric)?.label ?? "Metric";

  const rangeLabel =
    rangeOptions.find((option) => option.id === range)?.label ?? "Time range";

  const domainLabel =
    domains.length > 0 && selectedDomains.length === domains.length
      ? "All domains"
      : "Custom selection";

  const closeMenus = (): void => {
    setDomainMenuOpen(false);
    setMetricMenuOpen(false);
    setRangeMenuOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      const containers = [metricMenuRef, domainMenuRef, rangeMenuRef];
      const isInside = containers.some((ref) => ref.current?.contains(target));
      if (!isInside) {
        closeMenus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
          <div className="panel-left">
            <div>
              <h2>Domain trend</h2>
              <p className="panel-copy">A focused view of your activity.</p>
            </div>
          </div>
          <div className="panel-right">
            <div className="control-group">
              <span className="control-label">Metric</span>
              <div className="dropdown" ref={metricMenuRef}>
                <button
                  type="button"
                  className={`dropdown-button ${
                    metricMenuOpen ? "open" : ""
                  }`}
                  onClick={() => {
                    setMetricMenuOpen((open) => {
                      const next = !open;
                        setDomainMenuOpen(false);
                        setRangeMenuOpen(false);
                        return next;
                      });
                    }}
                  >
                    {metricLabel}
                  </button>
                  {metricMenuOpen && (
                  <div className="dropdown-menu">
                    {metricOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={
                          option.id === metric ? "dropdown-item active" : "dropdown-item"
                        }
                        onClick={() => {
                          setMetric(option.id);
                          setMetricMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {!isLoading && domains.length > 0 && (
              <div className="control-group">
                <span className="control-label">Domains</span>
                <div className="dropdown" ref={domainMenuRef}>
                  <button
                    type="button"
                    className={`dropdown-button ${
                      domainMenuOpen ? "open" : ""
                    }`}
                    onClick={() => {
                      setDomainMenuOpen((open) => {
                        const next = !open;
                        setMetricMenuOpen(false);
                        setRangeMenuOpen(false);
                        return next;
                      });
                    }}
                  >
                    {domainLabel}
                  </button>
                  {domainMenuOpen && (
                    <div className="dropdown-menu">
                      {domains.map((domain) => (
                        <label key={domain} className="dropdown-item">
                          <input
                            type="checkbox"
                            checked={selectedDomains.includes(domain)}
                            onChange={() => toggleDomain(domain)}
                          />
                          <span>{domain}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="control-group">
              <span className="control-label">Time range</span>
              <div className="dropdown" ref={rangeMenuRef}>
                <button
                  type="button"
                  className={`dropdown-button ${
                    rangeMenuOpen ? "open" : ""
                  }`}
                  onClick={() => {
                    setRangeMenuOpen((open) => {
                      const next = !open;
                        setMetricMenuOpen(false);
                        setDomainMenuOpen(false);
                        return next;
                      });
                    }}
                  >
                    {rangeLabel}
                  </button>
                  {rangeMenuOpen && (
                  <div className="dropdown-menu">
                    {rangeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={
                          option.id === range ? "dropdown-item active" : "dropdown-item"
                        }
                        onClick={() => {
                          setRange(option.id);
                          setRangeMenuOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && <p className="status">{error}</p>}
        {isLoading && <p className="status">Loading analytics...</p>}

        {!isLoading && domains.length === 0 && (
          <p className="empty">No events yet. Use the extension first.</p>
        )}

        {!isLoading && domains.length > 0 && (
          <>
            {selectedDomains.length === 0 ? (
              <p className="empty">Select at least one domain.</p>
            ) : (
              <div className="chart-wrap">
                {isHourlyRange ? renderHourlyBars() : renderDailyLines()}
                <div className="legend">
                  <span className={`legend-item ${metric}`}>{metricLabel}</span>
                </div>
              </div>
            )}

            {!isHourlyRange &&
              metric === "no_intention_rate" &&
              selectedDomains.length > 0 && (
              <div className="no-intention">
                <h3>No-intention rate</h3>
                <p className="range-note">{rangeLabel}</p>
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
