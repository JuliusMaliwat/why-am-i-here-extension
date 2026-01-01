# why am i here — Turn doom scrolling into intention

## Overview
**why am i here** is a lightweight browser extension (Chrome + Edge) designed to interrupt autopilot browsing and bring users back to intentional usage.

When a user visits specific distracting domains (configured by the user), the extension places an overlay on the page asking a simple question:

> **“Why am I here?”**

To continue, the user must write an intention. Once submitted, the intention remains visible as a small floating note while the user is on that site, acting as a constant reminder of the goal.

The product is inspired by existing “browse with intention” tools (e.g. Purposely, With Intention), and differentiates itself with a **time-based intention** feature: users can optionally set a number of minutes for the intention; when the time expires, the overlay returns and asks again.

Project name:
**why am i here — Turn doom scrolling into intention**

---

## Problem
Many people open certain websites reflexively (social media, news, entertainment, etc.) and lose time without a clear purpose. Traditional blockers are too rigid; timers and limiters often don’t address the underlying behavior: *starting without an intention*.

---

## Goals
1. Help users **pause** before consuming distracting content.
2. Encourage users to **write an explicit intention** before proceeding.
3. Keep the intention **visible during usage** to reduce drift.
4. Optionally help users **time-box** their browsing.
5. Provide **insights** to reflect on behavior and improve habits.

---

## Target Users
- People who frequently “doom scroll” or open distracting sites on autopilot.
- Knowledge workers and students who want a gentle nudge rather than strict blocking.
- Anyone experimenting with mindful productivity systems.

---

## Core Concepts
- **Domain list**: a user-defined set of domains where the intention prompt should appear.
- **Overlay prompt**: a full-page overlay that blocks access until an intention is entered.
- **Intention note**: a floating, persistent reminder shown while browsing the domain.
- **Time-box (optional)**: an intention can include a duration in minutes. When time runs out, the overlay is shown again.

---

## Primary User Flow
1. User configures a list of distracting domains (e.g. `x.com`, `youtube.com`, `reddit.com`).
2. User navigates to one of those domains.
3. An overlay appears: **“Why am I here?”**
4. User writes an intention (e.g. “Watch a tutorial about React hooks”).
5. The overlay disappears, and a floating intention reminder remains visible.
6. *(Optional)* If the user set a time limit (e.g. 10 minutes), when it expires the overlay returns and asks again.

---

## Features (MVP)

### 1) Domain-based intention gate
- The extension activates only on a user-selected list of domains.
- On matching domains, users must write an intention to access the page.

### 2) Intention input
- A simple text field where the user writes their intention.
- Minimal friction, fast to complete.

### 3) Persistent floating intention
- After submission, the intention remains visible as a small floating UI element on the page.
- The reminder should be unobtrusive but noticeable.
- The intention should persist while the user stays on that domain/site session.

### 4) Basic behavior tracking (for insights)
Track essential events needed to support the insights page:
- Site opened
- Overlay shown
- Intention submitted (yes/no)
- (If present) timer started / timer expired

This is for user self-reflection (not for advertising or external analytics).

---

## Differentiator Feature: Time-boxed intention (v1+)
A key differentiator versus similar tools is the ability to attach a **duration** to an intention.

### Time-box behavior
- User can optionally set “minutes” together with the intention (e.g. 5 / 10 / 20 minutes).
- When the time expires:
  - the overlay should reappear and require a new intention to continue.
- This feature can be shipped as an additional step after MVP, but it should be designed as a first-class product capability.

---

## Bonus Feature: Insights page
An optional “Insights” page helps the user understand their behavior over time.

### Example questions the insights should answer
- For each tracked site:
  - How many times did I open it?
  - How many times did I *not* write an intention and leave / dismiss / fail to proceed?
  - How many times did I write an intention?
  - What are my most common intentions?
  - (If time-boxing is enabled) how often did I exceed my intended time?

### Purpose
The insights page is meant to be reflective, not judgmental:
- show patterns,
- nudge improvements,
- help users tune their domain list and their time-box durations.

---

## Product Principles
- **Gentle, not punitive**: this is not a “hard blocker”, it’s a mindfulness tool.
- **Low friction**: the intention entry should be fast and simple.
- **Always visible reminder**: intention should remain present to reduce drifting.
- **User-owned data mindset**: behavior data is for the user’s benefit.
- **Minimal, calm UI**: reduce cognitive load, avoid gamification.

---

## Non-goals (at least initially)
- No heavy “parental control” style enforcement.
- No complex scheduling systems (later possible, not now).
- No social features.
- No content filtering beyond the overlay/intention mechanism.

---

## Inspirations / References
- Purposely: https://betalist.com/startups/purposely
- With Intention: https://github.com/alexwidua/with-intention

---

## Success Criteria (early)
- Users report fewer “autopilot” visits.
- Users frequently write clear intentions instead of bypassing.
- Time-boxing (when enabled) helps users stop or re-commit intentionally.
- Insights are understandable and lead to small behavior changes (e.g. fewer visits, shorter sessions, clearer intentions).

---
