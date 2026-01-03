# Contributing

This project is a minimal MV3 extension prototype. Keep contributions small,
focused, and aligned with the product docs in `agents_docs/`.

## Quality Bar (MVP)
- Keep changes scoped to a single task and document updates in `agents_docs/TASKS.md`.
- Follow the requirements in `agents_docs/REQUIREMENTS.md` and decisions in
  `agents_docs/DECISIONS.md`.
- Prefer small, composable functions and explicit naming.
- Avoid introducing new dependencies unless they reduce complexity.
- Preserve backward compatibility with existing stored data.

## Dev Workflow
- Use `npm run dev` for local iteration.
- Use `npm run build` and load `dist/` as an unpacked extension.
