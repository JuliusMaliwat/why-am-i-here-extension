# Tasks — why am i here

**Purpose:** A lean task map to help AI agents work in parallel with clear outputs.

**Rule:** Prefer tasks that are small, testable, and touch a limited surface area.

---

## Milestone 0 — Repo Baseline

* [x] Add docs to repo: `README.md`, `agents_docs/PRD.md`, `agents_docs/REQUIREMENTS.md`, `agents_docs/TECH_SPEC.md`, `agents_docs/DECISIONS.md`, `agents_docs/TASKS.md`
* [x] Define minimal quality bar in `CONTRIBUTING.md`

---

## Milestone 1 — MVP (Intention Gate + Floating Note)

### 1. Settings: Target Domains

* [x] **Target domain list UI**

  * Output: user can add/remove/edit domains
  * DoD: domains persist; invalid entries handled gently

* [x] **Domain normalization + matching rules**

  * Output: consistent matching for exact + subdomains
  * DoD: matches `youtube.com` → `www.youtube.com`, doesn’t match unrelated domains

### 2. Gating Overlay

* [x] **Overlay shows on target domains**

  * Output: overlay blocks page until intention submitted
  * DoD: no overlay on non-target domains; no double overlay

* [x] **Intention validation + submit flow**

  * Output: cannot proceed with empty intention
  * DoD: submit closes overlay and continues browsing

### 3. Floating Intention Note

* [x] **Floating pill remains after submit**

  * Output: floating pill displays the submitted intention
  * DoD: visible, readable, unobtrusive, draggable

* [x] **Persistence across navigation**

  * Output: pill remains on same domain navigation (basic SPA support)
  * DoD: refresh rehydrates; typical in-site navigation keeps pill

### 4. Storage + Events

* [x] **Config store**

  * Output: persist `target_domains`
  * DoD: settings survive browser restart

* [x] **Usage event log**

  * Output: record `overlay_shown`, `intention_submitted`
  * DoD: includes domain + timestamp (+ intention text for submit)

* [x] **Active intention state (per-tab)**

  * Output: store/retrieve current intention per tab
  * DoD: refresh restores state; new tab triggers new overlay

### 5. MVP QA

* [ ] **Smoke test checklist**

  * Output: minimal manual QA list aligned to `docs/REQUIREMENTS.md`
  * DoD: covers target/non-target, refresh, new tab, multiple tabs

---

## Milestone 2 — v1 Time-box (Differentiator)

(Do not start until MVP is stable.)

* [x] **Timebox UI (presets + optional custom)**

  * Output: timebox row appears after typing starts
  * DoD: presets 5/10/20 + custom 1–60 + 

* [x] **Timer start + countdown in pill**

  * Output: countdown shown as secondary text in the pill
  * DoD: starts on submit; hides when no timer selected

* [x] **Expiry re-prompt flow**

  * Output: overlay returns on expiry with intention prefilled
  * DoD: user must submit new intention to continue

* [x] **Timer state storage (per-tab)**

  * Output: persist running timer and intention state
  * DoD: refresh rehydrates countdown; per-tab isolation

* [x] **Record timer events**

  * Output: log `timer_started`, `timer_expired`
  * DoD: includes domain + timestamp + minutes

* [ ] **Timebox QA checklist**

  * Output: minimal manual QA list for timer flows
  * DoD: expiry in active tab, inactive tab, multiple tabs

---

## Milestone 3 — Bonus Insights

* [x] **Insights v0: data aggregation helpers**

  * Output: helpers to aggregate per-domain daily counts
  * DoD: uses `overlay_shown` + `intention_submitted` events only

* [x] **Insights v0: domain trend chart UI**

  * Output: multi-select domain trend chart (7/30/90 days)
  * DoD: shows opens proxy + intentions submitted

* [x] **Insights page entry (Options link)**

  * Output: visible entry point from Options UI
  * DoD: links to separate Insights page

* [x] **Insights back link (return to Options)**

  * Output: visible navigation back to Options
  * DoD: link in Insights header returns to Options

* [x] **Insights v0: hourly trend toggle**

  * Output: optional hourly view for last 24h (and/or last 7d)
  * DoD: hourly chart (bar or heatmap) per selected domains

* [x] **Insights v0: no-intention rate**

  * Output: percentage of opens without submission per domain
  * DoD: formula = (overlay_shown - intention_submitted) / overlay_shown

* [x] **Insights v0: top intentions list**

  * Output: top 5 intentions per domain
  * DoD: normalized by lowercase + trim + collapsed spaces

* [ ] **Insights v0: clear analytics (full reset)**

  * Output: user can clear all analytics data from Insights page
  * DoD: confirmation step; clears events; UI reflects empty state

* [x] **Insights v0: intention quality gate (min length)**

  * Output: block submit when intention is too short (default 6 chars)
  * DoD: inline hint explains requirement; applies to initial + re-prompt submit

* [x] **Insights v0: low-signal intention heuristic (simple)**

  * Output: reject obvious gibberish (e.g. low letter ratio, excessive repeats)
  * DoD: gentle message; still allows valid short phrases like “ok” only if >= min length

* [x] **Insights v0: no-timer reinforcement (lightweight)**

  * Output: extra confirmation when no timer is selected
  * DoD: minimal friction (one-step), only on no-timer path, easy to dismiss

* [ ] **Insights v1: active time tracking**

  * Output: active seconds per domain/session
  * DoD: pause on tab inactive; resume on focus

* [ ] **Insights v1: time spent chart**

  * Output: per-domain time spent series
  * DoD: uses active seconds aggregation

* [ ] **Insights v1: suspect intention heuristic**

  * Output: flag low-quality intentions (secondary signal)
  * DoD: length < 8, low letter ratio, excessive repeats


---

## Task Prompt Template (for AI agents)

Copy/paste when assigning a task:

* **Task:** <single, concrete outcome>
* **Scope:** <what files/modules to touch; what not to touch>
* **Definition of Done:** <acceptance criteria bullets>
* **Edge cases:** <1–5 items to explicitly handle>
* **Notes:** Follow `docs/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/TECH_SPEC.md`
