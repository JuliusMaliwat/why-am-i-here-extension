## Analytics Metric Unification + Dual View

### Goal
Make **No‑intention rate** the single core metric, but allow two complementary visualizations:
- **Rate view**: relative % (line/area)
- **Breakdown view**: absolute stacked area (Intentions vs No‑intention)

This keeps the product focused on the *main behavioral signal* while still giving users the quantitative context that a percentage alone can’t provide.

---

### Why this change
- Users interpret “Opens” and “Intentions submitted” as separate KPIs, but they are really components of **No‑intention rate**.
- A single metric reduces cognitive load and aligns with the product story (“intentional browsing”).
- Two views give **both** insights: relative performance + absolute volume.

---

### Proposed UX
- **Metric dropdown**: only “No‑intention rate”.
- **View toggle** near the chart: `Rate` | `Breakdown` (default: Rate).
- **Rate view**: same line + subtle area fill with % scale.
- **Breakdown view**: stacked area:
  - **Intentions submitted** (blue/green)
  - **No‑intention** = Opens − Intentions (soft red)
- **Legend** updates based on view.
- Tooltip:
  - Rate view: shows % + “x / y opens”.
  - Breakdown view: shows both counts for the selected date.

---

### Copy / labels
- View toggle labels: `Rate` / `Breakdown`
- Legend labels: “No‑intention” and “Intentions”
- Tooltip detail: “no‑intention / opens” in Rate view

---

## Implementation Tasks (for engineers)

### 1) Metric simplification
**Output**: only “No‑intention rate” remains as metric.  
**DoD**: dropdown shows 1 metric; chart uses no‑intention rate as default.

### 2) View toggle (Rate vs Breakdown)
**Output**: toggle near chart controls.  
**DoD**: default Rate; user can switch; state persists during session.

### 3) Breakdown stacked area
**Output**: stacked area chart for Intentions + No‑intention counts.  
**DoD**: stacked total equals opens; colors match design.

### 4) Tooltip + legend update
**Output**: tooltip and legend adapt to view.  
**DoD**:
- Rate view: % + “x / y opens”
- Breakdown view: both counts visible

### 5) Axis scale handling
**Output**: Y‑axis switches between % (Rate) and counts (Breakdown).  
**DoD**: labels are readable and correct for the active view.
