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

* [ ] **Overlay shows on target domains**

  * Output: overlay blocks page until intention submitted
  * DoD: no overlay on non-target domains; no double overlay

* [ ] **Intention validation + submit flow**

  * Output: cannot proceed with empty intention
  * DoD: submit closes overlay and continues browsing

### 3. Floating Intention Note

* [ ] **Floating note appears after submit**

  * Output: small persistent note displays intention
  * DoD: visible, readable, unobtrusive

* [ ] **Persistence across navigation**

  * Output: note remains on same domain navigation (basic SPA support)
  * DoD: refresh rehydrates; typical in-site navigation keeps note

### 4. Storage + Events

* [ ] **Config store**

  * Output: persist `target_domains`
  * DoD: settings survive browser restart

* [ ] **Usage event log**

  * Output: record `overlay_shown`, `intention_submitted`
  * DoD: includes domain + timestamp (+ intention text for submit)

* [ ] **Active intention state (per-tab)**

  * Output: store/retrieve current intention per tab
  * DoD: refresh restores state; new tab triggers new overlay

### 5. MVP QA

* [ ] **Smoke test checklist**

  * Output: minimal manual QA list aligned to `docs/REQUIREMENTS.md`
  * DoD: covers target/non-target, refresh, new tab, multiple tabs

---

## Milestone 2 — v1 Time-box (Differentiator)

(Do not start until MVP is stable.)

* [ ] **Minutes input on overlay (optional)**
* [ ] **Timer manager concept** (scope decision first)
* [ ] **On expiry: overlay returns**
* [ ] **Record timer events**: `timer_started`, `timer_expired`
* [ ] **QA**: expiry in active tab, inactive tab, multiple tabs

---

## Milestone 3 — Bonus Insights

* [ ] **Insights page skeleton**
* [ ] **Aggregate per-domain counts**
* [ ] **Show: opens proxy, submitted intentions, no-intention sessions**

---

## Task Prompt Template (for AI agents)

Copy/paste when assigning a task:

* **Task:** <single, concrete outcome>
* **Scope:** <what files/modules to touch; what not to touch>
* **Definition of Done:** <acceptance criteria bullets>
* **Edge cases:** <1–5 items to explicitly handle>
* **Notes:** Follow `docs/REQUIREMENTS.md`, `docs/DECISIONS.md`, `docs/TECH_SPEC.md`
