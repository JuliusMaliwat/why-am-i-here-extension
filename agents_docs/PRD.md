# One-Page PRD — why am i here (Turn doom scrolling into intention)

## 1) Product Summary
**why am i here** is a Chrome/Edge extension that interrupts autopilot browsing on user-selected domains by showing an overlay asking **“Why am I here?”**. The user must write an intention to access the page. Afterward, the intention remains visible as a floating pill. A differentiator is **time-boxed intentions**: users can set minutes; when time expires, the overlay returns.

---

## 2) Problem
Users often open distracting sites reflexively and lose time without a goal. Hard blockers are too rigid and don’t build awareness. We need a lightweight mechanism that turns “opening the site” into a conscious decision.

---

## 3) Goals & Non-Goals

### Goals
- Reduce “autopilot” visits by introducing a short pause.
- Increase intentional usage via explicit written intentions.
- Reduce drift by keeping the intention visible while browsing.
- Enable optional time-boxing to support controlled sessions.
- Provide basic self-reflection via simple insights (optional, phased).

### Non-Goals (v1)
- Full parental-control style blocking or complex enforcement.
- Social features, gamification, streaks, leaderboards.
- Deep content moderation or filtering.
- Advanced scheduling (e.g., calendars, allowed hours) in initial release.

---

## 4) Target Users
- Students, knowledge workers, and makers who want a gentle nudge.
- People prone to doom scrolling who prefer mindful tools over strict blockers.
- Users who want to experiment with time-boxing and habit awareness.

---

## 5) Key Use Cases
1. “I opened YouTube automatically. I want to watch one tutorial only.”
2. “I’m checking Reddit for a specific answer and want to avoid scrolling.”
3. “I’m opening Twitter for one message; I want to leave after 5 minutes.”
4. “I want to see which sites I open the most without intention.”

---

## 6) Core User Flows

### Flow A — Intention Gate (MVP)
1. User configures a list of domains (e.g., youtube.com, reddit.com).
2. User navigates to a configured domain.
3. Overlay blocks page and asks: **Why am I here?**
4. User writes an intention and continues.
5. A floating intention pill remains visible on the site.

### Flow B — Time-boxed Intention (Differentiator)
1. On overlay, user optionally sets minutes (e.g., 5/10/20/custom).
2. Timer starts when access is granted.
3. When time expires, overlay returns and requires a new intention.

### Flow C — Insights (Bonus / Later Phase)
1. User opens Insights page from extension.
2. User sees site-level stats: opens, intentions written, “no intention” occurrences, timer expirations, etc.

---

## 7) MVP Scope (v0)

### Must-have
- Domain list management (add/remove domains).
- Overlay prompt on matching domains.
- Required intention input to proceed.
- Floating intention reminder while browsing the domain.
- Minimal event tracking needed for future insights (local-only mindset).

### Nice-to-have (if low effort)
- Quick templates for intentions (e.g., “Check X”, “Post Y”, “Find Z”).
- Dismiss/close behavior that still counts as “no intention”.

### Out of Scope for MVP
- Time-boxing UI and timer enforcement (ship in v1 if needed).
- Full insights dashboard (ship later if needed).

---

## 8) v1 Scope (Differentiator Release)
- Time-boxed intentions:
  - Optional minutes input on overlay.
  - Timer expiry brings back overlay.
  - Basic handling for repeated sessions.
- UX polish:
  - Clear states (“Timer running”, “X minutes left” optionally).
  - Smooth re-prompt experience when time ends.

---

## 9) Bonus Scope (v1.5 / v2)
- Insights page:
  - Per-domain stats:
    - # site opens
    - # overlay shown
    - # intentions submitted
    - # “no intention” events (overlay shown but no submission / user leaves)
    - # timer expirations (if enabled)
  - Trends over time (daily/weekly) if feasible.
  - Most common intentions per site.

---

## 10) Functional Requirements (Acceptance Criteria)

### Domain Gating
- Given a configured domain, when the user lands on it, an overlay appears and blocks interaction until an intention is entered.
- Given a non-configured domain, no overlay appears.

### Intention Input
- The user can enter a text intention and proceed.
- Empty intention is not accepted (must show a gentle prompt to enter something).

### Floating Intention
- After submission, the intention is visible as a floating element on the page.
- It should remain visible as the user navigates within the same domain.

### Time-boxing (v1)
- If the user sets minutes, the timer starts upon proceeding.
- When the timer ends, the overlay returns and requires a new intention.
- If the user does not set minutes, no timer behavior occurs.

### Insights (bonus)
- Insights view can display at least:
  - Per-domain counts for opens and intention submissions.
  - Count of sessions where overlay appeared but intention was not submitted.

See `docs/ANALYTICS_V0.md` and `docs/ANALYTICS_V1.md` for the staged insights plan.

---

## 11) Data & Privacy Principles
- The extension is a self-improvement tool: data exists for the user.
- Prefer local-first tracking and transparent user control (no external selling/ads).
- Track only what’s needed for product value (events, timestamps, domain, intention text optionally).

---

## 12) UX Principles
- Calm, minimal, low-friction UI.
- “Gentle interruption” not shaming.
- The intention pill should be noticeable but not annoying.

---

## 13) Success Metrics (Early)
- % of overlay prompts that result in an intention submission.
- Reduction in repeat opens per day for configured domains (proxy for autopilot).
- Time-boxing adoption rate (for v1).
- Qualitative: users report improved awareness and shorter unintentional sessions.

---

## 14) Risks & Mitigations
- **User annoyance / friction too high** → keep UI fast, allow short intentions, optional templates.
- **Users bypass by removing domains** → this is okay; product is voluntary. Focus on value, not enforcement.
- **Timer feels punitive** → make time-box optional; encourage “renew intention” rather than “blocked”.
- **Insights feel judgmental** → present neutral language, focus on patterns not guilt.

---

## 15) Release Plan (Suggested)
- **v0 (MVP):** domain gating + intention + floating reminder + minimal tracking.
- **v1:** time-boxed intentions (core differentiator).
- **v1.5/v2:** insights dashboard + trend views + refinement.

---
