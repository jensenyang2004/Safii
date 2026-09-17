# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Safii is a personal-safety mobile app: users start check-in / location-tracking sessions (e.g. walking home alone) so trusted contacts can see their real-time location, and if the user misses a check-in, their last known location is automatically shared and contacts are alerted.

## Architecture

- `frontend/` — Expo (React Native + expo-router) app, TypeScript, NativeWind/Tailwind. Path alias `@/* -> ./*` (both `tsconfig.json` and `babel.config.js`). Uses `@react-native-firebase/*` for auth/Firestore and `expo-location` for background location tracking. Key app logic lives in `frontend/context/` (Auth, Friend, Notification, ScheduledTracking, Track providers) and `frontend/services/tracking/` (firestore, notifications, storage, location).
- `functions/` — Firebase Cloud Functions (TypeScript). Real entry point is `functions/src/index.ts`: emergency push notifications via `onDocumentWritten` on `active_tracking`/`manual_tracking`, plus a 15-min `emergencyScanner` re-notify loop. `scheduleActivator.ts` and `scheduleEndChecker.ts` are 1-minute crons that activate scheduled check-ins and check for missed end times.
- `backend/` — Flask (Python) service for Gemini/OpenAI realtime voice sessions. Currently non-functional — see Known issues.
- Firestore rules/indexes live at repo root (`firestore.rules`, `firestore.indexes.json`), deployed via `firebase.json` (functions codebase = `functions/`, predeploy runs `npm run build`).

## Commands

- `frontend/`: `npm start` (expo dev client), `npm run android` / `ios` / `web`, `npm test` (jest, but no test files currently exist), `npm run lint` (expo lint). Building/submitting goes through the `eas` CLI directly using `eas.json`, not an npm script.
- `functions/`: `npm run build` (tsc), `npm run build:watch`, `npm run serve` / `shell` (emulators), `npm run deploy` (`firebase deploy --only functions`), `npm run logs`.

## Env vars

- `frontend/.env`: `GOOGLE_MAPS_API_KEY`, `FIREBASE_API_KEY`
- `backend/.env`: `GEMINI_API_KEY`, `BACKEND_API_KEY` (`OPENAI_API_KEY` is read by `app.py` but not currently set — that code path is unconfigured)

## Known issues / dead code — don't assume these work

- `backend/src/app.py` has unresolved git merge conflict markers (`HEAD` vs `origin/Ikbing`) running through nearly the entire file — it will not run. Leave it alone; only touch it if explicitly asked to help resolve the conflict.
- `functions/src/index_15min.ts` is an unused duplicate of `index.ts`'s `emergencyScanner` logic (zero imports anywhere) — dead file, safe to ignore or remove.
- `backend/` also contains unrelated Node.js scaffolding (`package.json`, `yarn.lock`, `node_modules`, `sendPushNotification.js` with a hardcoded example push token) alongside the actual Python service — dead, safe to ignore or remove.
- `backend/requirements.txt` has its first ~9 lines duplicated from a botched merge — functionally harmless but messy.
- Firestore rules already flag their own known issues via inline comments: `tokens/{userId}` stores raw ID tokens (security risk), `TrackingMode/{docId}` is a legacy duplicate of `scheduled_tracking`, `active_sharing_sessions/{docId}` is unrestricted read/write pending a data-model decision.

## Conventions

- Base branch for work/PRs: `release/v1.0.0` (not `main`).
- No enforced commit message convention (mix of `fix:`/`chore:` prefixes and plain descriptions) — match the style of recent commits.
- No test suite is wired up despite jest/jest-expo being configured in `frontend/package.json` — don't assume tests exist or need to pass.
