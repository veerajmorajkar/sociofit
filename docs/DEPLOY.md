# FitSocial — staging & beta deploy

## Backend (Railway / Render / Fly)

1. **Postgres + Redis** — provision managed instances (or use Railway plugins).
2. **Environment** — copy `backend/.env.example` and set production values:
   - `NODE_ENV=production`
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — long random strings
   - `DATABASE_URL`, `REDIS_URL`
   - `CORS_ORIGINS` — include your Expo web origin if used; mobile apps typically omit browser CORS but keep `*` off in prod; use explicit origins for any web client
   - **R2** — `R2_*` for media uploads (required for post/event images)
3. **Build & run**
   - Docker: `docker build -f backend/Dockerfile backend`
   - Or platform build: `npm ci && npm run build && npm run start` in `backend/`
4. **Migrations** — once per deploy:
   ```bash
   cd backend && npm run db:migrate
   ```
   Optional seed for categories: `npm run db:seed`
5. **Health** — `GET https://<host>/api/v1/health`

## Mobile (EAS + TestFlight / internal APK)

1. Install EAS CLI: `npm i -g eas-cli` and `eas login`.
2. Set API URL for non-dev builds in `mobile/.env` (see `mobile/.env.example`):
   ```bash
   EXPO_PUBLIC_API_URL=https://<your-api-host>/api/v1
   ```
3. Configure `mobile/eas.json` project ID after `eas init` in `mobile/`.
4. Builds:
   ```bash
   cd mobile
   eas build --profile preview --platform ios    # internal testers
   eas build --profile production --platform all
   ```
5. **Physical device testing** — device must reach the API (public HTTPS URL, not `localhost`).

## Quick checklist (7-day beta)

- [ ] API on HTTPS with strong JWT secrets
- [ ] DB migrated; categories seeded
- [ ] R2 bucket + public URL for media
- [ ] `EXPO_PUBLIC_API_URL` points to staging API
- [ ] Test: signup, feed, create event, RSVP, notifications, DMs
- [ ] Leaderboard — **deferred** (not in beta scope)

## Local dev (reference)

```bash
docker compose up -d          # Postgres + Redis (if compose file present)
cd backend && npm run dev
cd mobile && npm start
```

Use your machine LAN IP in Expo when testing on a physical phone (`EXPO_PUBLIC_API_URL` optional in dev; Expo debugger host is auto-detected).
