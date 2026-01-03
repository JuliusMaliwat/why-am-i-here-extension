# Technical Spec (High-Level) — why am i here

**Purpose:** Align implementation on a shared architecture and boundaries. This is intentionally high-level.

## 1) System Overview

A browser extension (Chrome + Edge) that:

* On **target domains**, shows a **blocking overlay** requiring an **intention**.
* After submission, renders a **floating intention note** on the page.
* Records minimal **events** for future insights.

## 2) Main Components

### A) Options / Settings UI

**Responsibilities**

* Manage the **target domain list** (add/remove/edit).
* (Future) time-box defaults, templates.

**Owns**

* Reading/writing user configuration in storage.

---

### B) Content Layer (runs in web pages)

Split conceptually into two parts:

1. **Gate Overlay**

* Renders a full-page overlay on target domains.
* Blocks interaction until a valid intention is submitted.

2. **Floating Note**

* Displays the active intention while browsing the target domain.
* Should persist across in-site navigation (incl. SPA where feasible).

**Owns**

* Page UI rendering, UX interactions, and local per-tab session state.

---

### C) Background / Service Worker (Coordinator)

**Responsibilities**

* Orchestrates state across tabs when needed.
* Centralizes access to persistent storage.
* Provides a stable interface for content scripts:

  * read config (domains)
  * persist / fetch “active intention state”
  * append event logs

**Note:** Keep business rules here when they must be consistent across tabs; keep per-tab UI logic in the content layer.

---

### D) Storage Layer

Two conceptual stores:

1. **Config Store**

* Target domains
* (Future) templates, default timer minutes

2. **Usage Store**

* Event log for: `overlay_shown`, `intention_submitted` (plus future timer events)
* Lightweight “active intention” state (per tab and/or per domain — see decisions)

**Principles**

* Local-first, minimal data.
* Prefer append-only events for insights.

---

### E) Insights UI (Future)

A separate extension page that reads the Usage Store and aggregates:

* opens/proxy (`overlay_shown`)
* intentions submitted
* (future) timer expirations

## 3) Data Model (Conceptual)

### Config

* `target_domains: string[]` (normalized)
* Optional: `templates: string[]`, `default_minutes: number`

### Active Intention State

Minimal fields:

* `domain: string`
* `tab_id: number`
* `intention_text: string`
* `created_at: timestamp`
* (future) `minutes: number`, `expires_at: timestamp`

**Default for MVP:** active intention is **per tab** (matches Requirements A2/A3 unless changed in `docs/DECISIONS.md`).

### Events

Each event record:

* `type: overlay_shown | intention_submitted | (future timer_started/timer_expired)`
* `domain`
* `timestamp`
* Optional fields:

  * `intention_text` for `intention_submitted`
  * `minutes/expires_at` for timer events

## 4) Domain Matching Rules

* Normalize domains (strip protocol/path, lower-case).
* Default: **match exact domain + subdomains** (e.g., `youtube.com` matches `www.youtube.com`).
* Any change must be recorded in `docs/DECISIONS.md` and mirrored in `docs/REQUIREMENTS.md`.

## 5) Key Runtime Flows

### Flow 1 — Page Load on Target Domain (MVP)

1. Content script detects current domain.
2. If domain matches target list:

   * Check if tab has an active intention state.
   * If none: show overlay + record `overlay_shown`.
3. User submits intention:

   * Persist active intention state.
   * Record `intention_submitted`.
   * Hide overlay, show floating note.

### Flow 2 — Navigation Within Same Domain

* Content layer ensures floating note remains present.
* If page reload resets UI, content script rehydrates from active intention state.

### Flow 3 — User Leaves Without Submitting

* `overlay_shown` exists, no `intention_submitted`.

## 6) Timer (v1) — Architectural Placeholder

Introduce a **Timer Manager** concept (likely coordinated in Background):

* Starts when intention submitted with minutes.
* On expiry:

  * Signals the content layer to re-show overlay.
  * Records `timer_expired`.

Keep MVP design compatible by structuring active intention state to allow `expires_at` later.

## 7) Guardrails / Non-Goals

* No strict enforcement beyond overlay gate.
* No cloud sync/accounts.
* No heavy analytics; only minimal local event logging.

## 8) Source of Truth

* Product intent: `README.md`, `docs/PRD.md`
* Testable behavior: `docs/REQUIREMENTS.md`
* Architectural decisions: `docs/DECISIONS.md` (if conflict, update requirements + decisions)

## 9) Repo Structure (Minimal)

Keep the repo minimal and MV3-friendly. Create folders only as needed.

* `src/` - source code root
* `src/background/` - MV3 service worker
* `src/content/` - overlay + floating note UI
* `src/options/` - options UI (domains, settings)
* `src/shared/` - types, storage, messaging, utils
* `public/` - `manifest.json`, icons, static assets
* `agents_docs/` - product + engineering docs
* `tests/` - optional, add when needed

## 10) Tech Stack (Planned)

Keep this short and stable to guide agents and avoid inconsistencies.

* Target: Chrome + Edge extension (Manifest V3)
* Language: TypeScript (all layers)
* Content UI: DOM + isolated CSS (Shadow DOM or BEM)
* Options/Insights UI: React + Vite (Svelte + Vite is acceptable if decided)
* Storage: `chrome.storage.local` (IndexedDB only if event volume grows)
* Tooling: ESLint, Prettier, Vitest
