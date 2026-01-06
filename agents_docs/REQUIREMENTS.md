# Requirements — why am i here (Turn doom scrolling into intention)

**Document purpose:** Translate the PRD into unambiguous, testable requirements for implementation by AI agents.  
**Source of truth:** If something conflicts with this file, this file wins (unless later updated).

---

## 0) Glossary
- **Target domain**: A user-configured domain where the intention gate should trigger.
- **Overlay (Gate)**: Full-page UI that blocks access until an intention is entered.
- **Intention**: Short text written by the user describing why they’re on the site.
- **Floating pill**: Small persistent UI element that displays the current intention while browsing the target domain.
- **Time-box**: Optional minutes attached to an intention; when it ends, the overlay returns (v1).

---

## 1) MVP Scope (Must Have)
### R1 — Domain-based gating
- The extension MUST allow the user to define a list of target domains.
- When the user navigates to any target domain, the overlay MUST appear and block page interaction until an intention is submitted.
- On non-target domains, the overlay MUST NOT appear.

### R2 — Intention is required to proceed
- The overlay MUST include a text input for the intention.
- The user MUST NOT be able to proceed with an empty intention.
- After a valid intention is submitted, the overlay MUST disappear immediately.

### R3 — Floating intention pill
- After submitting an intention on a target domain, a floating pill MUST appear displaying the intention text.
- The floating pill MUST remain visible while the user browses within the same target domain.
- The floating pill MUST be unobtrusive (small) but readable.

### R4 — Minimal behavior tracking (for future insights)
The extension MUST record these events at minimum:
- **overlay_shown** (domain, timestamp)
- **intention_submitted** (domain, timestamp, intention text)
Additionally, it SHOULD record:
- **site_opened** (domain, timestamp)  
(If “site_opened” is not feasible/reliable, “overlay_shown” can be used as the main proxy for opens in MVP.)

---

## 2) MVP Scope (Nice to Have, only if low effort)
### R5 — Quick intention templates
- The overlay MAY offer 2–4 quick template buttons (e.g., “Check something specific”, “Post something”, “Find an answer”) that prefill the input.
- Templates MUST be optional and not block manual typing.

### R6 — Edit intention
- The user MAY be able to update the intention during the session (e.g., via the floating pill).
- If edited, it SHOULD create a new **intention_submitted** event.

---

## 3) Out of Scope (MVP)
- Time-box / timer behavior.
- Insights dashboard UI.
- Scheduling rules (hours, days, limits per day).
- Cloud sync / accounts.
- Strict enforcement mechanisms beyond the overlay prompt.

---

## 4) User Stories (MVP)
### US1 — Define target domains
As a user, I want to add/remove domains so the intention prompt appears only on sites I choose.

### US2 — Prompted intention before browsing
As a user, when I open a chosen site, I want to be asked “Why am I here?” so I can stop autopilot browsing.

### US3 — Stay oriented during browsing
As a user, after I write my intention, I want it to remain visible so I don’t drift into doom scrolling.

### US4 — Minimal reflection later
As a user, I want my intention prompts and submissions recorded so I can later review patterns.

---

## 5) Acceptance Criteria (MVP, testable)

### AC1 — Overlay triggers only on target domains
**Given** a domain is in the target list  
**When** I navigate to that domain  
**Then** the overlay appears and blocks interaction.

**Given** a domain is not in the target list  
**When** I navigate to that domain  
**Then** I can browse normally and no overlay appears.

### AC2 — Intention is required and validated
**Given** the overlay is visible  
**When** I try to proceed with an empty intention  
**Then** I cannot proceed and I see a gentle validation message.

**Given** the overlay is visible  
**When** I submit a non-empty intention  
**Then** the overlay disappears and I can use the site.

### AC3 — Floating pill appears after submission
**Given** I submitted an intention on a target domain  
**When** the overlay closes  
**Then** a floating pill is visible showing my intention.

### AC4 — Floating pill persists across navigation on the same domain
**Given** the floating pill is visible on a target domain  
**When** I navigate to another page within the same domain (including typical in-site navigation)  
**Then** the floating pill remains visible and still shows the current intention.

### AC5 — Tracking events are recorded
**Given** the overlay appears  
**When** it becomes visible  
**Then** an **overlay_shown** event is recorded with domain + timestamp.

**Given** I submit an intention  
**When** the overlay closes  
**Then** an **intention_submitted** event is recorded with domain + timestamp + intention text.

---

## 6) Edge Cases to Handle (MVP)
(Each item should be addressed explicitly in implementation and/or tests.)

1. **Page refresh** on a target domain:
   - The overlay should appear again unless there is an already active intention for the current browsing session on that domain.
2. **New tab** opened to a target domain:
   - Overlay should appear in the new tab until an intention is submitted.
3. **Multiple tabs on same domain**:
   - Intention is per-tab session (default assumption for MVP) unless changed in DECISIONS.
4. **Subdomains** (e.g., `m.youtube.com`, `news.ycombinator.com`):
   - Matching behavior must be defined (default: treat exact domain + subdomains as match) unless changed in DECISIONS.
5. **Redirects**:
   - If navigating to a target domain via redirects, overlay should still appear once landing on the target domain.
6. **Single Page Apps (SPA)**:
   - In-site navigation should not “lose” the floating pill.
7. **Overlay duplication**:
   - Overlay should not stack multiple times due to repeated triggers.
8. **Intention visibility**:
   - The floating pill should stay on top and not be hidden behind page content.
9. **Performance**:
   - Overlay/pill should not noticeably slow page load on target domains.
10. **User leaves without submitting intention**:
   - Still counts as **overlay_shown**; no **intention_submitted** event.

---

## 7) Assumptions (MVP Defaults)
If you change these later, update this file + log it in `docs/DECISIONS.md`.

- A1: The intention is required (non-empty) to proceed.
- A2: The floating pill persists within the same tab while browsing the same target domain.
- A3: Domain matching includes subdomains by default (e.g., `youtube.com` matches `www.youtube.com`).
- A4: Tracking is local-first (data for the user), and stores only what is needed for product value.

---

## 8) v1 Requirements Preview (Not to implement in MVP)
(For alignment only; actual requirements live later.)

- Time-box input (minutes) optional on overlay.
- Timer expiry returns overlay and requires a new intention.
- Track **timer_started** and **timer_expired** events.

---
