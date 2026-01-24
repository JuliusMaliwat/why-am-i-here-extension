# Analytics Layout Update
## Goal
Refresh the Insights layout to a chart-led, trust-style analytics view while keeping the current dark aesthetic.

## Scope (v0 layout refresh)
- Replace card grid with a single, primary area chart view.
- Add left-side multi-select domain dropdown.
- Add right-side controls for **Metric** and **Time range**.
- Use hover/point focus to show large numeric value.

## Subtasks

### 1) Layout skeleton + navigation structure
- **Output**: new two-column header layout (left domains, right controls).
- **DoD**: header contains domain selector (left), metric selector + time range selector (right).

### 2) Domain multi-select dropdown
- **Output**: dropdown with multi-select domains, count summary.
- **DoD**: multiple domains selectable; clear visual state; selection reflects in chart.

### 3) Metric selector (dropdown)
- **Output**: dropdown for metric selection.
- **Metrics (v0)**: Opens (proxy), Intentions submitted, No-intention rate.
- **DoD**: only one metric active; chart updates when metric changes.

### 4) Time range selector (dropdown)
- **Output**: time range dropdown (Last 24 hours, 7d, 30d, 3m, 6m, 12m, All time).
- **DoD**: chart range updates; default is 30d.

### 5) Area chart + hover focus
- **Output**: line + subtle area fill (dark UI), hover shows value.
- **DoD**: hover (or click) reveals highlighted point with larger number; readable on dark background.

### 6) Axis labels + tick marks
- **Output**: readable X/Y labels and ticks (trust-style).
- **DoD**: X axis shows time labels for the selected range; Y axis shows metric scale values.

### 7) Remove the old card grid
- **Output**: no-intention cards removed from the layout.
- **DoD**: metric selection drives line chart; no redundant card section.

## Notes / Design direction
- Keep the dark palette; contrast should remain subtle.
- Use a restrained gradient fill under the line (no bright, light UI).
- Hover label should be minimal and high contrast.
- Prefer dropdowns (not toggles) for Metric + Time range.
