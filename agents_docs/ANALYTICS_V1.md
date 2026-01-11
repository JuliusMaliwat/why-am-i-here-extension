# Analytics v1 (Post‑MVP)

Purpose: richer insights with time‑spent and light intention quality checks.

## Additional Data
- **Session duration** (per tab, per domain):
  - track active time between `intention_submitted` and session end
  - pause when tab is inactive
- Optional events:
  - `tab_focus`, `tab_blur`
  - `session_end`

## Metrics
Per domain, per day:
- **Time spent** (active seconds)
- **Intentional opens**: `intention_submitted`
- **Unintentional opens**:
  - no‑submission (primary)
  - **suspect intentions** (heuristic)

## Heuristic “Suspect Intention”
Flag as “suspect” if any:
- length < 8 chars
- low letter ratio (e.g., < 70% letters)
- excessive repeats (e.g., “aaaaa”, “12345”)

These are *secondary* signals, not a hard label.

## UI Additions
- Time‑spent series per domain.
- Toggle to show/hide “suspect intentions.”
- Top intentions list with simple normalization (same as v0).

## NLP / GPT (Optional, Later)
- Only if users opt‑in.
- Goal: classify intention quality or detect “nonsense.”
- Risks: privacy + cost + latency.

## Optional Wordcloud
- Low‑ROI; use only if users ask for it.

