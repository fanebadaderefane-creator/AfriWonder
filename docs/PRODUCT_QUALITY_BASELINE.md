# Product Quality Baseline (AfriWonder)

## Goal
Make every screen feel like a production product built by a senior team, not a prototype.

## 1) UX Consistency Rules
- Use SPA navigation only for internal routes (`navigate`, `Link`), never `window.location.href`.
- Use app dialogs/sheets for destructive actions, never browser dialogs.
- Keep one loading pattern per screen (no stacked loader states).
- Every list view must define 3 states: `loading`, `empty`, `error`.
- Avoid hardcoded "marketing perfect" metrics; compute from API data or hide them.

## 2) Copy & Brand Rules
- Brand naming must be consistent: `AfriWonder` only.
- All user-facing text must be clean UTF-8 (no mojibake like `ÃƒÂ©`, `Ã¢â‚¬Â¦`).
- Tone must be direct and local: short, useful, contextual.
- Empty-state text must tell user what to do next.

## 3) Mobile/PWA Rules
- Use dynamic viewport variable `--app-vh` for full-height mobile layouts.
- Respect safe-area insets for top/bottom bars.
- Avoid visual bounce/jump during keyboard open/close.
- Keep touch targets >= 44px.

## 4) Data Realism Rules
- Demo/fictitious data must be clearly scoped and visually plausible.
- Do not show fake global counts unless sourced by backend.
- Fallback images should be deterministic and branded, not random stock artifacts.

## 5) Engineering Rules
- New UI code must pass `eslint` with zero errors.
- No dead UI handlers in critical screens.
- Keep comments and naming clear, minimal, and maintainable.

## Applied On This Pass
- `Home`: removed artificial startup delay, unified loading state, replaced hardcoded `100dvh`.
- `Marketplace`: replaced hardcoded metrics with computed stats from loaded data.
- `Profile`: replaced browser confirm with `AlertDialog`; switched internal navigation to SPA routing.

