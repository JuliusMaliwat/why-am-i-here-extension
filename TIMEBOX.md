# Timebox UX Proposal (MVP+1)

Purpose: define a low‑friction timer experience that strengthens intention
without forcing it. This is written for agents to implement consistently.

## Principles
- **Optional, not mandatory:** users can proceed without a timer.
- **Low friction:** presets beat manual inputs.
- **Intentionality:** visible countdown keeps focus without being punitive.
- **Gentle re‑prompt:** when time ends, ask for a renewed intention.

## User Flow
1) User lands on a target domain and sees the pill gate (input).
2) User types an intention.
3) A lightweight **timebox row** appears next to or below the input:
   - Presets: **5 / 10 / 20 min**
   - **Custom** button reveals a small numeric input (1–60).
   - **No timer** is always available (implicit if user skips).
4) User presses **Enter**:
   - If a duration is selected, timer starts.
   - If no duration is selected, session proceeds without timer.
5) Pill stays visible with the intention text plus a **small countdown**
   (e.g., “7m left”).
6) On expiry:
   - Overlay returns with the input prefilled.
   - Copy: “Time’s up. Renew your intention?”

## UI Placement
- Keep the primary input unchanged.
- Timebox controls should appear only **after typing starts** to avoid visual noise.
- Countdown is secondary text in the pill, not a separate component.

## Micro‑copy
- Placeholder: “Why am I here?”
- Preset label: “Timebox”
- Expiry prompt: “Time’s up. Renew your intention?”

## Behavior Rules
- Timer is per‑tab (aligned with current MVP decision).
- If the user reloads, the pill rehydrates and the timer continues.
- If the user navigates within the same domain (SPA), the pill and countdown remain.
- If the user leaves the domain, timer state can pause or persist (implementation choice).

## Events to Log
- `timer_started` (domain, timestamp, minutes)
- `timer_expired` (domain, timestamp, minutes)

## MVP Scope (Implementation)
- Preset buttons + optional custom input.
- Countdown display in the pill.
- Expiry re‑prompts with prefilled intention.
- Storage in background (per‑tab) and events recorded.

