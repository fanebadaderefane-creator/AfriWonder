# AfriWonder - PRD & Setup Memory

## Original Problem Statement
> "voici mon repot github essayer de te connecté avec mon frontend exact et mon backend exacte mobile dossier frontend mobile expo react native..."
> Repo: https://github.com/fanebadaderefane-creator/AfriWonder

## Goal
Connect Emergent preview environment to the user's real existing AfriWonder project:
- Mobile Frontend (Expo React Native, SDK 54) → runnable in preview (web) + Expo Go tunnel
- Backend → use existing production backend already deployed at https://afriwonder.onrender.com (no local setup needed for now)

## Architecture
- `/app/frontend/` → Expo React Native app (expo-router, SDK 54)
  - Web mode: served on port 3000 via supervisor (`yarn start` → `expo start --web --tunnel --port 3000`)
  - Tunnel mode: ngrok tunnel exposes the dev server publicly for Expo Go on phone
  - Points to production backend: `EXPO_PUBLIC_BACKEND_URL=https://afriwonder.onrender.com`
- `/app/backend/` → FastAPI Python (mobile-specific complementary APIs: messaging, wallet, etc.)
  - Runs on port 8001 via supervisor
  - Uses local MongoDB
- Existing production backend on Render (Node.js Express + Prisma + Supabase) → real API

## What's Been Implemented (May 23, 2026)
- ✅ Cloned full AfriWonder monorepo into `/app`
- ✅ Configured `/app/backend/.env` (local Mongo + JWT secret)
- ✅ Configured `/app/frontend/.env` with `EXPO_PUBLIC_BACKEND_URL=https://afriwonder.onrender.com`
- ✅ Installed Python deps (FastAPI, Motor, python-socketio, ...)
- ✅ Installed Node deps via yarn (Expo SDK 54, React Native, expo-router, ~74 deps)
- ✅ Backend running on :8001 (verified `/api/health` returns 200)
- ✅ Frontend Metro running on :3000 (Web bundle compiled, 2599 modules)
- ✅ Ngrok tunnel active: `qk3mbp0-anonymous-3000.exp.direct` (for Expo Go on phone)
- ✅ Modified `package.json`: `"start": "EXPO_NO_TELEMETRY=1 expo start --web --tunnel --port 3000"`

## Access URLs
- **Web preview**: https://8aa9b04a-6536-44d3-a9f5-f6d8bae82239.preview.emergentagent.com (Expo web)
- **Expo Go on phone**: `exp://qk3mbp0-anonymous-3000.exp.direct` (tunnel URL — peut changer si Metro redémarre)
- **Local backend API**: http://localhost:8001/api/* (mobile-specific endpoints)
- **Production backend** (used by app): https://afriwonder.onrender.com/api/*

## Next Action Items
- Awaiting user's next instructions (the user said "une fois realiser je vais te dire quoi faire par la suite")
- If Expo Go tunnel URL changes after restart, re-extract from `curl http://localhost:3000/ -H "Expo-Platform: ios" | jq .extra.expoClient.hostUri`

## Backlog / Future Improvements (P2)
- Add a small landing page at root that displays the QR code + tunnel URL for easier Expo Go onboarding
- Wire backend Python (port 8001) endpoints into the mobile app (if needed) — currently the app primarily talks to production Render backend

## Notes
- The repo is a large monorepo (web `src/`, mobile `frontend/`, backend `backend/`, flutter `flutter_app/`, etc.). We only run the mobile `frontend/` + Python `backend/`.
- First Web bundle compile takes ~60s due to size (2599 modules).
- Tunnel URL changes on Metro restart (typical for free ngrok via `@expo/ngrok`).
