# Overlay + Note UX Updates (MVP)

Goal: align the gate UI and floating intention note with the provided references,
while keeping scope small and testable.

## Scope
Only the content-layer UI and behavior are affected:
- `src/content/overlay.ts`
- `src/content/note.ts`
- `src/content/index.ts` (if needed)

## Subtasks

1) **Move the overlay form to the top**
   - Place the input UI near the top center, not in the middle of the page.
   - Keep the blurred background and high z-index.

2) **Simplify the form to a single input**
   - Replace title/subtitle with a single rounded input.
   - Placeholder text: “Why am I here?” (or “What’s your intention?” if preferred).

3) **Show “Enter” affordance when typing**
   - When the user types, show a subtle “↵ Enter” hint to the right of the input.
   - Hide it when the input is empty.

4) **Disable scrolling while overlay is visible**
   - Prevent page scroll on `body`/`html` while the overlay is active.
   - Restore scrolling immediately after submit.

5) **Floating pill remains after submit + draggable**
   - On submit, keep the pill near the overlay’s last position (top center).
   - Allow drag-and-drop to reposition (mouse + touch).
   - Persist position in `sessionStorage` (optional in MVP, if low effort).

## Acceptance
- Overlay is top-aligned and blocks scroll.
- Input is the only visible UI and shows “↵ Enter” on typing.
- Note appears after submit at top, then draggable by the user.
