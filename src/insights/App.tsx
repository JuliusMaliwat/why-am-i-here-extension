import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  aggregateDailyCountsByDomain,
  aggregateHourlyCountsByDomain,
  aggregateTopIntentionsByDomain
} from "../shared/analytics";
import { clearEvents, getEvents } from "../shared/storage";
import type { EventRecord } from "../shared/types";

type RangeOption = "24h" | "7d" | "30d" | "3m" | "6m" | "12m" | "all";
type MetricOption = "no_intention_rate";
type ViewMode = "rate" | "breakdown";

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

type RatePoint = {
  x: number;
  y: number;
  value: number;
  label: string;
  overlayShown: number;
  intentionSubmitted: number;
};

type BreakdownPoint = {
  x: number;
  yIntentions: number;
  yTotal: number;
  label: string;
  intentions: number;
  noIntention: number;
  total: number;
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
  const metric: MetricOption = "no_intention_rate";
  const [viewMode, setViewMode] = useState<ViewMode>("breakdown");
  const [domainMenuOpen, setDomainMenuOpen] = useState(false);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const domainMenuRef = useRef<HTMLDivElement | null>(null);
  const rangeMenuRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedDomains = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
  const topIntentionsByDomain = useMemo(
    () => {
      const now = Date.now();
      let fromTimestamp: number | undefined;
      if (range === "24h") {
        fromTimestamp = now - 24 * 60 * 60 * 1000;
      } else if (range === "7d") {
        fromTimestamp = now - 7 * 24 * 60 * 60 * 1000;
      } else if (range === "30d") {
        fromTimestamp = now - 30 * 24 * 60 * 60 * 1000;
      } else if (range === "3m") {
        fromTimestamp = now - 90 * 24 * 60 * 60 * 1000;
      } else if (range === "6m") {
        fromTimestamp = now - 180 * 24 * 60 * 60 * 1000;
      } else if (range === "12m") {
        fromTimestamp = now - 365 * 24 * 60 * 60 * 1000;
      }
      return aggregateTopIntentionsByDomain(events, 5, fromTimestamp);
    },
    [events, range]
  );

  const domains = useMemo(
    () => Object.keys(dailyByDomain).sort(),
    [dailyByDomain]
  );

  useEffect(() => {
    if (domains.length === 0 || hasInitializedDomains.current) return;
    setSelectedDomains(domains);
    hasInitializedDomains.current = true;
  }, [domains]);

  const rangeOptions: { id: RangeOption; label: string }[] = [
    { id: "24h", label: "Last 24 hours" },
    { id: "7d", label: "Last 7 days" },
    { id: "30d", label: "Last 30 days" },
    { id: "3m", label: "Last 3 months" },
    { id: "6m", label: "Last 6 months" },
    { id: "12m", label: "Last 12 months" },
    { id: "all", label: "All time" }
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

  const rateMaxValue = 100;
  const breakdownMaxValue = useMemo(() => {
    const values = series.map((point) => point.overlayShown);
    return Math.max(1, ...values);
  }, [series]);

  const chartLayout = {
    width: 1000,
    height: 220,
    padX: 40,
    padY: 24
  };

  const ratePoints = useMemo<RatePoint[]>(() => {
    if (series.length === 0) {
      return [];
    }
    const usableW = chartLayout.width - chartLayout.padX * 2;
    const usableH = chartLayout.height - chartLayout.padY * 2;
    return series.map((point, index) => {
      const x = chartLayout.padX + (usableW * index) / (series.length - 1);
      const value =
        point.overlayShown > 0
          ? ((point.overlayShown - point.intentionSubmitted) /
              point.overlayShown) *
            100
          : 0;
      const y = chartLayout.padY + usableH * (1 - value / rateMaxValue);
      const label = "hour" in point ? point.hour : point.date;
      return {
        x,
        y,
        value,
        label,
        overlayShown: point.overlayShown,
        intentionSubmitted: point.intentionSubmitted
      };
    });
  }, [series, chartLayout]);

  const breakdownPoints = useMemo<BreakdownPoint[]>(() => {
    if (series.length === 0) {
      return [];
    }
    const usableW = chartLayout.width - chartLayout.padX * 2;
    const usableH = chartLayout.height - chartLayout.padY * 2;
    return series.map((point, index) => {
      const x = chartLayout.padX + (usableW * index) / (series.length - 1);
      const total = point.overlayShown;
      const intentions = point.intentionSubmitted;
      const noIntention = Math.max(0, total - intentions);
      const yTotal =
        chartLayout.padY + usableH * (1 - total / breakdownMaxValue);
      const yIntentions =
        chartLayout.padY + usableH * (1 - intentions / breakdownMaxValue);
      const label = "hour" in point ? point.hour : point.date;
      return {
        x,
        yIntentions,
        yTotal,
        label,
        intentions,
        noIntention,
        total
      };
    });
  }, [series, chartLayout, breakdownMaxValue]);

  const activePoints = viewMode === "breakdown" ? breakdownPoints : ratePoints;
  const axisMax = viewMode === "breakdown" ? breakdownMaxValue : rateMaxValue;

  const formatValue = (value: number): string => `${Math.round(value)}%`;

  const formatAxisValue = (value: number): string => {
    if (viewMode === "rate") {
      return `${Math.round(value)}%`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000)}k`;
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

  const formatNoIntentionDetail = (
    overlayShown: number,
    intentionSubmitted: number
  ): string => {
    if (overlayShown === 0) {
      return "0 opens";
    }
    const noIntentionCount = Math.max(0, overlayShown - intentionSubmitted);
    return `${noIntentionCount} / ${overlayShown} opens`;
  };

  const getXTicks = (
    points: { x: number; label: string }[]
  ): { x: number; label: string }[] => {
    if (points.length === 0) {
      return [];
    }
    const minGap = isHourlyRange ? 70 : 90;
    const ticks: { x: number; label: string }[] = [];
    let lastX = -Infinity;
    points.forEach((point, index) => {
      if (index === 0 || point.x - lastX >= minGap) {
        ticks.push({ x: point.x, label: formatLabel(point.label) });
        lastX = point.x;
      }
    });
    const lastPoint = points[points.length - 1];
    if (ticks.length === 0 || ticks[ticks.length - 1].x !== lastPoint.x) {
      ticks.push({ x: lastPoint.x, label: formatLabel(lastPoint.label) });
    }
    return ticks;
  };

  const getYTicks = (): { y: number; value: number }[] => {
    const ticks = [0, Math.round(axisMax / 2), Math.round(axisMax)];
    return ticks.map((value) => ({
      value,
      y:
        chartLayout.padY +
        (chartLayout.height - chartLayout.padY * 2) * (1 - value / axisMax)
    }));
  };

  const handleChartMove = (
    event: React.MouseEvent<SVGSVGElement>
  ): void => {
    if (activePoints.length === 0) {
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
        Math.max(1, activePoints.length - 1)
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

  const renderRateChart = (): JSX.Element => {
    if (ratePoints.length === 0) {
      return (
        <svg viewBox="0 0 1000 220" role="img">
          <polyline className={`line ${metric}`} points="" />
        </svg>
      );
    }
    const linePath = ratePoints
      .map((point) => `${point.x},${point.y}`)
      .join(" ");
    const areaPath = [
      `M ${ratePoints[0].x} ${ratePoints[0].y}`,
      ...ratePoints.slice(1).map((point) => `L ${point.x} ${point.y}`),
      `L ${ratePoints[ratePoints.length - 1].x} ${
        chartLayout.height - chartLayout.padY
      }`,
      `L ${ratePoints[0].x} ${chartLayout.height - chartLayout.padY}`,
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
        <g className="axis-grid">
          {getYTicks().map((tick) => (
            <line
              key={`y-${tick.value}`}
              x1={chartLayout.padX}
              x2={chartLayout.width - chartLayout.padX}
              y1={tick.y}
              y2={tick.y}
            />
          ))}
        </g>
        <g className="axis-labels">
          {getYTicks().map((tick) => (
            <text
              key={`y-label-${tick.value}`}
              x={chartLayout.padX - 10}
              y={tick.y + 4}
              textAnchor="end"
            >
              {formatAxisValue(tick.value)}
            </text>
          ))}
          {getXTicks(ratePoints).map((tick) => (
            <text
              key={`x-label-${tick.x}`}
              x={tick.x}
              y={chartLayout.height - chartLayout.padY + 18}
              textAnchor="middle"
            >
              {tick.label}
            </text>
          ))}
        </g>
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
        {hoverIndex !== null && ratePoints[hoverIndex] && (
          <g className="chart-focus">
            <line
              x1={ratePoints[hoverIndex].x}
              x2={ratePoints[hoverIndex].x}
              y1={chartLayout.padY}
              y2={chartLayout.height - chartLayout.padY}
            />
            <circle
              cx={ratePoints[hoverIndex].x}
              cy={ratePoints[hoverIndex].y}
              r={5}
            />
            <g
              className="chart-tooltip"
              transform={`translate(${Math.min(
                Math.max(
                  chartLayout.padX,
                  ratePoints[hoverIndex].x - 80
                ),
                chartLayout.width - chartLayout.padX - 160
              )},${Math.max(
                chartLayout.padY,
                ratePoints[hoverIndex].y - 70
              )})`}
            >
              <rect
                width="160"
                height={72}
                rx="14"
              />
              <text x="12" y="20" className="tooltip-label">
                {formatLabel(ratePoints[hoverIndex].label)}
              </text>
              <text x="12" y="42" className="tooltip-value">
                {formatValue(ratePoints[hoverIndex].value)}
              </text>
              <text x="12" y="60" className="tooltip-detail">
                {formatNoIntentionDetail(
                  ratePoints[hoverIndex].overlayShown,
                  ratePoints[hoverIndex].intentionSubmitted
                )}
              </text>
            </g>
          </g>
        )}
      </svg>
    );
  };

  const renderBreakdownChart = (): JSX.Element => {
    if (breakdownPoints.length === 0) {
      return (
        <svg viewBox="0 0 1000 220" role="img">
          <polyline className="line breakdown-total" points="" />
        </svg>
      );
    }
    const totalPath = breakdownPoints
      .map((point) => `${point.x},${point.yTotal}`)
      .join(" ");
    const intentionsPath = breakdownPoints
      .map((point) => `${point.x},${point.yIntentions}`)
      .join(" ");
    const intentionsArea = [
      `M ${breakdownPoints[0].x} ${breakdownPoints[0].yIntentions}`,
      ...breakdownPoints
        .slice(1)
        .map((point) => `L ${point.x} ${point.yIntentions}`),
      `L ${breakdownPoints[breakdownPoints.length - 1].x} ${
        chartLayout.height - chartLayout.padY
      }`,
      `L ${breakdownPoints[0].x} ${chartLayout.height - chartLayout.padY}`,
      "Z"
    ].join(" ");
    const noIntentionArea = [
      `M ${breakdownPoints[0].x} ${breakdownPoints[0].yTotal}`,
      ...breakdownPoints
        .slice(1)
        .map((point) => `L ${point.x} ${point.yTotal}`),
      ...breakdownPoints
        .slice()
        .reverse()
        .map((point) => `L ${point.x} ${point.yIntentions}`),
      "Z"
    ].join(" ");
    return (
      <svg
        viewBox="0 0 1000 220"
        role="img"
        className="chart-svg breakdown"
        onMouseMove={handleChartMove}
        onMouseLeave={handleChartLeave}
      >
        <g className="axis-grid">
          {getYTicks().map((tick) => (
            <line
              key={`y-${tick.value}`}
              x1={chartLayout.padX}
              x2={chartLayout.width - chartLayout.padX}
              y1={tick.y}
              y2={tick.y}
            />
          ))}
        </g>
        <g className="axis-labels">
          {getYTicks().map((tick) => (
            <text
              key={`y-label-${tick.value}`}
              x={chartLayout.padX - 10}
              y={tick.y + 4}
              textAnchor="end"
            >
              {formatAxisValue(tick.value)}
            </text>
          ))}
          {getXTicks(breakdownPoints).map((tick) => (
            <text
              key={`x-label-${tick.x}`}
              x={tick.x}
              y={chartLayout.height - chartLayout.padY + 18}
              textAnchor="middle"
            >
              {tick.label}
            </text>
          ))}
        </g>
        <path className="area breakdown-intentions" d={intentionsArea} />
        <path className="area breakdown-no-intention" d={noIntentionArea} />
        <polyline className="line breakdown-intentions" points={intentionsPath} />
        <polyline className="line breakdown-total" points={totalPath} />
        {hoverIndex !== null && breakdownPoints[hoverIndex] && (
          <g className="chart-focus">
            <line
              x1={breakdownPoints[hoverIndex].x}
              x2={breakdownPoints[hoverIndex].x}
              y1={chartLayout.padY}
              y2={chartLayout.height - chartLayout.padY}
            />
            <circle
              cx={breakdownPoints[hoverIndex].x}
              cy={breakdownPoints[hoverIndex].yTotal}
              r={5}
            />
            <g
              className="chart-tooltip"
              transform={`translate(${Math.min(
                Math.max(
                  chartLayout.padX,
                  breakdownPoints[hoverIndex].x - 80
                ),
                chartLayout.width - chartLayout.padX - 180
              )},${Math.max(
                chartLayout.padY,
                breakdownPoints[hoverIndex].yTotal - 84
              )})`}
            >
              <rect width="180" height="76" rx="14" />
              <text x="12" y="20" className="tooltip-label">
                {formatLabel(breakdownPoints[hoverIndex].label)}
              </text>
              <text x="12" y="44" className="tooltip-detail">
                Intentions: {breakdownPoints[hoverIndex].intentions}
              </text>
              <text x="12" y="62" className="tooltip-detail">
                No-intention: {breakdownPoints[hoverIndex].noIntention}
              </text>
            </g>
          </g>
        )}
      </svg>
    );
  };

  const metricLabel = "No-intention rate";

  const rangeLabel =
    rangeOptions.find((option) => option.id === range)?.label ?? "Time range";

  const domainLabel =
    domains.length > 0 && selectedDomains.length === domains.length
      ? "All domains"
      : "Custom selection";

  const closeMenus = (): void => {
    setDomainMenuOpen(false);
    setRangeMenuOpen(false);
  };

  const handleClearAnalytics = async (): Promise<void> => {
    try {
      await clearEvents();
      setEvents([]);
      setShowClearConfirm(false);
    } catch {
      setError("Could not clear analytics. Try again.");
    }
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      const containers = [domainMenuRef, rangeMenuRef];
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
              <span className="control-label">View</span>
              <div className="view-toggle">
                <button
                  type="button"
                  className={viewMode === "breakdown" ? "active" : ""}
                  onClick={() => setViewMode("breakdown")}
                >
                  Volume
                </button>
                <button
                  type="button"
                  className={viewMode === "rate" ? "active" : ""}
                  onClick={() => setViewMode("rate")}
                >
                  Signal
                </button>
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
                {viewMode === "breakdown" ? renderBreakdownChart() : renderRateChart()}
                <div className="legend">
                  {viewMode === "breakdown" ? (
                    <>
                      <span className="legend-item breakdown-intentions">
                        Intentions
                      </span>
                      <span className="legend-item breakdown-no-intention">
                        No-intention
                      </span>
                    </>
                  ) : (
                    <span
                      className={`legend-item ${metric}`}
                      data-tooltip="Share of opens with no intention submitted."
                    >
                      {metricLabel}
                    </span>
                  )}
                </div>
              </div>
            )}

            {selectedDomains.length > 0 && (
              <div className="intentions-section">
                <div className="intentions-header">
                  <h3>Top intentions</h3>
                  <p className="panel-copy">
                    Most common intentions submitted per domain.
                  </p>
                </div>
                <div className="intentions-grid">
                  {selectedDomains.map((domain) => {
                    const items = topIntentionsByDomain[domain] ?? [];
                    return (
                      <div key={domain} className="intentions-card">
                        <p className="intentions-domain">{domain}</p>
                        {items.length === 0 ? (
                          <p className="intentions-empty">
                            No intentions yet.
                          </p>
                        ) : (
                          <ol className="intentions-list">
                            {items.map((item) => {
                              const variants =
                                item.variants?.filter(
                                  (variant) => variant.text !== item.text
                                ) ?? [];
                              return (
                                <li
                                  key={`${domain}-${item.text}`}
                                  className="intentions-item"
                                >
                                  <div className="intentions-main">
                                    <span className="intentions-text">
                                      {item.text}
                                    </span>
                                    <span className="intentions-count">
                                      {item.count}
                                    </span>
                                  </div>
                                  {variants.length > 0 && (
                                    <details className="intentions-variants">
                                      <summary className="intentions-variants-toggle">
                                        View variants ({variants.length})
                                      </summary>
                                      <div className="intentions-variant-list">
                                        {variants.map((variant) => (
                                          <span
                                            key={`${domain}-${item.text}-${variant.text}`}
                                            className="intentions-variant"
                                          >
                                            {variant.text} · {variant.count}
                                          </span>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="danger-zone">
              <div>
                <h3>Reset analytics</h3>
                <p className="panel-copy">
                  Clears all local analytics data for this browser.
                </p>
              </div>
              {showClearConfirm ? (
                <div className="danger-actions">
                  <div className="danger-confirm">
                    <div className="danger-buttons">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setShowClearConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void handleClearAnalytics()}
                      >
                        Clear now
                      </button>
                    </div>
                    <p className="danger-hint">This can&apos;t be undone.</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="danger"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear analytics
                </button>
              )}
            </div>

          </>
        )}
      </section>
    </main>
  );
}
