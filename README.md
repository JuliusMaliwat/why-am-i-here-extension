# why am i here

A browser extension that interrupts autopilot browsing with a short intention prompt and a timer.

## What it does
When you open a domain in your target list, the page pauses and asks one question:
**"Why am I here?"**

You write an intention, start a timer, and continue with a floating pill that keeps your session visible.
If you submit without a timer, a quick math check appears and then starts a default 1-minute timer.

![Intention flow without timer](docs/media/intention-without-timer.gif)

## How it works
1. Add the domains you want to guard.
2. On those domains, the overlay blocks background interaction.
3. Write an intention and submit.
4. Select a timebox (`5m`, `10m`, `20m`, or custom minutes).
5. If no timer is selected, complete a short math check to continue with a 1-minute default timer.
6. Browse with a visible intention pill and countdown.
7. At expiry, the overlay returns so you can recommit.
8. Review Insights for trend, no-intention rate, and top intentions.

## Privacy
Everything stays local in your browser.
No cloud sync, no tracking, no ads.
