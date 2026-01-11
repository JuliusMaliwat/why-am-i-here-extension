# Analytics v0 (MVP+)

Purpose: a minimal, reliable insights layer using existing events.

## Goals
- Show domain-level trends with low implementation risk.
- Highlight intentional vs unintentional usage using solid proxies.
- Avoid heavy tracking or NLP.

## Data Sources (Events)
- `overlay_shown` (domain, timestamp)
- `intention_submitted` (domain, timestamp, intention)
- `timer_started` (domain, timestamp, minutes)
- `timer_expired` (domain, timestamp, minutes)

## Core Metrics
Per domain, per day (or week):
- **Opens (proxy)**: `overlay_shown`
- **Intentions submitted**: `intention_submitted`
- **No‑intention count**: `overlay_shown - intention_submitted`
- **No‑intention rate**: `no-intention / overlay_shown`

## UI: Domain Trend Series
- Multi-select domain filter.
- Time range: last 7/30/90 days.
- Lines or stacked bars:
  - `overlay_shown`
  - `intention_submitted`

## UI: Hourly View (v0)
- Toggle to switch to hourly granularity.
- Range: last 24h (optional last 7d).
- Suggested visual: heatmap or hourly bars.

## Intentions List (Top)
- For each domain, show top 5 intentions.
- Normalize only by:
  - lowercase
  - trim
  - collapse spaces
- Do not spell‑correct.

## Unintentional Definition (v0)
- **Primary**: overlay shown with no submission.
- Do not apply NLP heuristics yet.

## Non‑Goals (v0)
- Time spent tracking.
- NLP “nonsense” detection.
- Wordcloud.
