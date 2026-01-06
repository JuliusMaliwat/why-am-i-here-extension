# Decisions Log — why am i here

**Purpose:** Keep a lightweight, versioned record of key product/architecture decisions so AI agents don’t diverge.

**Format:** `YYYY-MM-DD — Decision — Why — Implication`

---

## 2026-01-01

* 2026-01-01 — **MVP: Intention is required (non-empty) to proceed** — core behavior change vs passive reminders — overlay blocks until valid text.
* 2026-01-01 — **MVP: Active intention is per-tab (session within a tab)** — simplest mental model, avoids cross-tab surprises — opening same domain in a new tab triggers overlay again.
* 2026-01-01 — **Domain matching includes subdomains** — user expects `youtube.com` to cover `www.` and other subdomains — gating may apply to more pages than exact-only.
* 2026-01-01 — **Local-first data storage** — aligns with mindfulness tool ethos, reduces complexity — no accounts/sync in MVP.
* 2026-01-01 — **Event model is append-only (minimal)** — supports future insights without overengineering — record `overlay_shown` and `intention_submitted` (timer events later).
* 2026-01-01 — **Use floating pill (same overlay component) instead of separate note** — closer to reference UX, simpler visual language — pill remains after submit, draggable.

---

## Open Questions (resolve before implementing v1 Timer)

* Timer scope: per-tab vs per-domain vs global.
* What counts as “time starts”: on intention submit vs first interaction.
* Behavior on tab inactive / browser sleep.

## How to Update

* Add new decisions at the top (newest first) under the current date.
* If a decision changes behavior, update `docs/REQUIREMENTS.md` accordingly.
