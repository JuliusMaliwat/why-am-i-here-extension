# Repository Guidelines

## Project Structure & Module Organization
- `src/background/` houses the background script entry (`index.ts`).
- `src/content/` contains the content script entry (`index.ts`) and overlay logic (`overlay.ts`).
- `src/options/` and `src/insights/` are React UIs (`App.tsx`, `main.tsx`, `styles.css`).
- `src/shared/` keeps cross-cutting utilities (storage, domains, analytics, messaging).
- `src/types/` stores custom type definitions (e.g., `wink-lemmatizer.d.ts`).
- `public/` contains `manifest.json` and icons under `public/icons/`.
- HTML entry points live at repo root: `options.html` and `insights.html`.
- Build output goes to `dist/`.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts Vite with `vite.config.ts` for the options/insights UI.
- `npm run build` builds options, content, and background bundles via the three Vite configs.
- `npm run build:options` builds the options/insights UI only.
- `npm run build:content` builds the content script bundle.
- `npm run build:background` builds the background bundle.
- `npm run preview` previews the built UI locally.

## Coding Style & Naming Conventions
- TypeScript with `strict` mode; prefer typed helpers over `any`.
- Match existing style: 2-space indentation, double quotes, and semicolons.
- React components use PascalCase (`App.tsx`); helpers use lowerCamelCase.
- Keep shared logic in `src/shared/` rather than duplicating per entry point.
- No lint/format tooling is configured, so keep changes consistent with nearby files.

## Testing Guidelines
- No automated test runner or `test` script is currently configured.
- For changes, do manual checks for the options page, insights page, overlay behavior, and background messaging.
- If you add tests later, document the runner and add a script in `package.json`.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and usually lowercase (examples from history: "add", "fix", "remove"); PR refs like `(#15)` are common.
- PRs should include a clear summary, linked issue when applicable, and manual test notes.
- Include screenshots or short clips for UI/UX changes (options, insights, overlay).

## Permissions & Configuration
- Extension permissions and entry points live in `public/manifest.json`; keep permissions minimal.
- User data is stored in browser storage; avoid adding remote calls without prior discussion.
