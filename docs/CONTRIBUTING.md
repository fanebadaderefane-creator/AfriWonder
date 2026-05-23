# Contributing

## Local setup

- Node.js 20+, npm.

```bash
git clone <repo-url>
cd AfriWonder
npm install
cp .env.example .env.local  # then fill variables
npm run dev
```

## Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

Tests next to source: `src/lib/foo.js` → `src/lib/__tests__/foo.test.js`.

## Lint & format

```bash
npm run lint
npm run lint:fix
npm run format:check
npm run format
```

## Conventions

- Descriptive names; comment only non-obvious logic.
- React: hooks rules, functional components.
- Use `src/lib/logger.js` instead of `console.log` in app code.
- Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:` prefix.

## PRs

Branch from `main`, run `npm test` and `npm run lint`, then open PR with description and any issue refs.

