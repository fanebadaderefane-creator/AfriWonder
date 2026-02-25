# Code style

Internal reference. Keeps reviews and onboarding consistent.

## Comments

- Prefer no comment over an obvious one.
- When needed: one line, fact-only. No "pour que", "afin de", "évite que".
- JSDoc for public API surface only; keep `@param`/`@returns` concise.

## Naming

- `camelCase` for variables/functions; `PascalCase` for components/types.
- Files: `PascalCase.jsx` for components, `camelCase.js` for utilities.
- Constants: `UPPER_SNAKE` for true constants; module-level config is fine.

## API client

- `expressClient.js`: timeout constants at top; no long prose in comments.
- User-facing errors via `error.apiMessage`; no raw stack or backend message in UI.

## React

- Functional components + hooks. No class components for new code.
- Colocate state; lift only when needed. Query keys in one place when shared.

## i18n / copy

- User-facing strings in French for the app; no mixed languages in the same screen.
- Placeholders: short, neutral (e.g. "Nom", "Email"). No "Ex: …" unless it helps.
