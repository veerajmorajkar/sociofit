# Mumbai Fitness Mafia — Launch Readiness Checklist

> **Purpose:** One ordered path from “confused about what to do” → closed beta → public store launch.  
> **How to use:** Work **top to bottom by phase**. Don’t jump to Phase 5 (payments) before Phase 1–2 are green.  
> **Status legend**
>
> - ✅ **Built** — exists in code; you only need to test / configure
> - 🟡 **Partial** — mostly built; missing config, polish, or edge cases
> - ❌ **Not built** — schema/stub only or never implemented; plan before coding
> - ⏭ **Defer** — skip for first beta unless you explicitly promised it

Mark each line `[x]` when done. Keep a copy of failing notes in a “Bugs” section at the bottom.

---



## How to go about it (simple plan)


| Order | Phase                        | Goal                                         | When you’re done            |
| ----- | ---------------------------- | -------------------------------------------- | --------------------------- |
| 0     | Decide scope                 | What “v1 launch” means                       | Written list of in/out      |
| 1     | Foundations                  | API + DB + media + email OTP work in staging | Can signup on a phone build |
| 2     | Feature QA                   | Every **built** flow works without crash     | Checklist §2 all green      |
| 3     | Crash & device matrix        | iOS + Android, light/dark, bad network       | No P0 crashes               |
| 4     | Closed beta                  | 10–30 Mumbai users                           | Real feedback week          |
| 5     | Build missing money features | Paid events (Razorpay) if in scope           | Paid RSVP works end-to-end  |
| 6     | Ops & store                  | Moderation, privacy, listings, monitoring    | Submit to stores            |


**Rule:** Fix P0 (can’t login / can’t post / money wrong / data loss) before any UI polish.

---



## Phase 0 — Decide what “ready” means

Write these down once (even in Notes):

- [ ] **Audience for first ship:** friends only / Mumbai closed beta / public App Store
- [ ] **Must-have for that ship** (suggested for closed beta):
  - Signup + email verify + login
  - Feed, create post, like, comment
  - Create free event + RSVP
  - DM + group chat
  - Profile + follow
  - Search people / events (map optional if build works)
- [ ] **Explicitly out of v1** (recommended): Strava, leaderboard, realtime WebSocket, Typesense, Stories
- [ ] **Paid events:** in v1 or after beta? (❌ Not built today — see Phase 5)

---



## Phase 1 — Foundations (do this before deep feature testing)

Without these, QA on a real phone is unreliable.

### 1.1 Backend staging

- [ ] Postgres provisioned (Railway / Render / Neon / etc.) ✅ ops
- [ ] Deploy API with `NODE_ENV=production` 🟡
- [ ] Strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` ✅ config
- [ ] Schema applied (`db:push` or migrate) 🟡
- [ ] Categories seeded (`npm run db:seed`) ✅
- [ ] Optional demo users (`npm run db:seed:clubs`) — then **mark seed athletes verified** or you’ll hit OTP with fake emails 🟡
- [ ] Health check: `GET https://<host>/api/v1/health` returns OK ✅
- [ ] HTTPS only (no plain HTTP for phone builds) ✅ ops



### 1.2 Media (R2)

- [ ] Cloudflare R2 bucket + credentials in backend env ✅ config
- [ ] Public/CDN URL works for uploaded images ✅
- [ ] Upload a post image from the app; image loads in feed ✅ test



### 1.3 Email OTP (Resend)

- [ ] Resend account + **verified domain** 🟡
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` set on staging 🟡
- [ ] New signup receives a real email with 6-digit code ✅ flow / 🟡 config
- [ ] Resend code works; wrong code fails; expired code fails ✅ test
- [ ] Login of unverified user routes to verify screen ✅ test  
  *(Local without Resend: code appears in backend logs as* `[email:dev] Signup verification code…`*)*



### 1.4 Mobile build that can hit staging

- [ ] `EXPO_PUBLIC_API_URL=https://<host>/api/v1` for non-dev builds ✅
- [ ] EAS project configured (`eas.json`) 🟡
- [ ] Preview build: iOS (TestFlight / internal) and/or Android APK 🟡
- [ ] Maps: confirm Google Maps works on **dev/prod build** (not Expo Go) 🟡
- [ ] Push: `EXPO_ACCESS_TOKEN` set if you want remote push 🟡



### 1.5 OAuth (only if you offer Apple/Google at launch)

- [ ] Apple Sign-In configured for production bundle ID 🟡
- [ ] Google OAuth client IDs match mobile + backend (`GOOGLE_OAUTH_IOS_CLIENT_ID` etc.) — **missing iOS client ID can crash** 🟡
- [ ] Link-account flow when email already exists ✅ test

**Exit Phase 1 when:** you can create a brand-new account on a physical phone, verify email, and land on the feed against staging.

---



## Phase 2 — Feature QA (every built surface)

Test on a **staging build**, not only Expo Go. For each item: **happy path + one failure path**. Note crashes separately in §3.

### 2.1 Auth & session ✅ Built


| #   | Check                                                                          | Pass? |
| --- | ------------------------------------------------------------------------------ | ----- |
| A1  | Welcome → Create Account → Athlete vs Club selection (only one looks selected) | [ ]   |
| A2  | Signup athlete: details → activities → verify email → tokens → tabs            | [ ]   |
| A3  | Signup club: same, club fields / badge                                         | [ ]   |
| A4  | Login email + password (verified account)                                      | [ ]   |
| A5  | Login unverified → verify screen                                               | [ ]   |
| A6  | Wrong password → friendly error (no API URL leak)                              | [ ]   |
| A7  | Forgot password → email (or dev log) → reset with token                        | [ ]   |
| A8  | Password visibility toggles work                                               | [ ]   |
| A9  | Google login (if enabled)                                                      | [ ]   |
| A10 | Apple login (if enabled)                                                       | [ ]   |
| A11 | OAuth complete profile when needed                                             | [ ]   |
| A12 | Link account when email matches existing                                       | [ ]   |
| A13 | Logout → cannot access tabs without login                                      | [ ]   |
| A14 | Kill app + reopen stays logged in                                              | [ ]   |
| A15 | Light + dark mode on auth screens (video stays dark; forms readable)           | [ ]   |




### 2.2 Home feed & posts ✅ Built


| #   | Check                                                         | Pass? |
| --- | ------------------------------------------------------------- | ----- |
| F1  | Feed loads; pull-to-refresh                                   | [ ]   |
| F2  | Empty feed CTA makes sense (find athletes / suggestions)      | [ ]   |
| F3  | Create text post                                              | [ ]   |
| F4  | Create post with image(s)                                     | [ ]   |
| F5  | Open post detail                                              | [ ]   |
| F6  | Like / unlike (no crash; count correct after refresh)         | [ ]   |
| F7  | Comment; see in list / sheet                                  | [ ]   |
| F8  | Repost / unrepost                                             | [ ]   |
| F9  | Follow suggestions (if shown)                                 | [ ]   |
| F10 | Unverified user blocked from gated actions with clear message | [ ]   |




### 2.3 Profile & social graph ✅ Built


| #   | Check                                               | Pass? |
| --- | --------------------------------------------------- | ----- |
| P1  | Own profile (athlete + club)                        | [ ]   |
| P2  | Edit profile (name, bio, activities, avatar, cover) | [ ]   |
| P3  | View other user’s profile                           | [ ]   |
| P4  | Follow / unfollow                                   | [ ]   |
| P5  | Connections list (followers / following)            | [ ]   |
| P6  | Hosted / joined events tabs on profile              | [ ]   |
| P7  | Theme toggle (light/dark) doesn’t crash; persists   | [ ]   |




### 2.4 Events ✅ Built (free path)


| #   | Check                                                              | Pass?                 |
| --- | ------------------------------------------------------------------ | --------------------- |
| E1  | Events tab list + filters / search                                 | [ ]                   |
| E2  | Empty / error states (teal accents, readable copy)                 | [ ]                   |
| E3  | Create free event (cover, location, capacity, category)            | [ ]                   |
| E4  | Event detail: hero, info, organiser                                | [ ]                   |
| E5  | RSVP join when seats left                                          | [ ]                   |
| E6  | RSVP blocked when full (capacity)                                  | [ ]                   |
| E7  | Cancel RSVP frees a seat                                           | [ ]                   |
| E8  | Concurrent RSVP race doesn’t overbook (backend tested; spot-check) | [ ]                   |
| E9  | Event discussion / announcement chat appears when expected         | [ ]                   |
| E10 | **Paid event with price > 0** — see Phase 5 (❌ payment not wired)  | [ ] N/A until Phase 5 |




### 2.5 Search & map 🟡 Partial (map needs native build)


| #   | Check                                                    | Pass? |
| --- | -------------------------------------------------------- | ----- |
| S1  | Search athletes / clubs / events                         | [ ]   |
| S2  | Recent searches                                          | [ ]   |
| S3  | Map pins + sheet on **dev/prod build**                   | [ ]   |
| S4  | Expo Go: graceful “map needs a full build” UI (no crash) | [ ]   |
| S5  | Location permission denied → app still usable            | [ ]   |




### 2.6 Messaging ✅ Built (polling, not realtime)


| #   | Check                                                           | Pass? |
| --- | --------------------------------------------------------------- | ----- |
| M1  | Inbox list; unread hierarchy                                    | [ ]   |
| M2  | Inbox search / filter                                           | [ ]   |
| M3  | Empty state CTAs                                                | [ ]   |
| M4  | Start / open DM                                                 | [ ]   |
| M5  | Create group                                                    | [ ]   |
| M6  | Send / receive messages (may need pull/poll — no WebSocket yet) | [ ]   |
| M7  | Day separators, bubbles, composer                               | [ ]   |
| M8  | Read-only / announcement channels show banner if applicable     | [ ]   |
| M9  | Members sheet (roles)                                           | [ ]   |
| M10 | Unverified cannot send (clear error)                            | [ ]   |




### 2.7 Notifications ✅ Built


| #   | Check                                                                        | Pass? |
| --- | ---------------------------------------------------------------------------- | ----- |
| N1  | In-app notifications list                                                    | [ ]   |
| N2  | Tap notification → correct screen                                            | [ ]   |
| N3  | Push on physical device (like, comment, RSVP, message) — if token configured | [ ]   |
| N4  | Permission denied → app still works                                          | [ ]   |




### 2.8 Moderation ✅ Built (user side only)


| #   | Check                                       | Pass?   |
| --- | ------------------------------------------- | ------- |
| R1  | Report post / comment / user / message      | [ ]     |
| R2  | Hide content from own feed where supported  | [ ]     |
| R3  | Report stored in DB (spot-check backend)    | [ ]     |
| R4  | **Admin review UI** — ❌ Not built (Phase 6) | [ ] N/A |




### 2.9 Uploads & media ✅ Built


| #   | Check                                    | Pass? |
| --- | ---------------------------------------- | ----- |
| U1  | Avatar upload                            | [ ]   |
| U2  | Post media upload + confirm              | [ ]   |
| U3  | Event cover upload                       | [ ]   |
| U4  | Reject oversized / wrong type gracefully | [ ]   |
| U5  | Broken image URL doesn’t crash the card  | [ ]   |




### 2.10 Navigation chrome ✅ Built


| #   | Check                                                                   | Pass? |
| --- | ----------------------------------------------------------------------- | ----- |
| T1  | FloatingTabBar: Home, Messages, Search, Events, Profile — all 5 work    | [ ]   |
| T2  | Deep links / back stack don’t trap user                                 | [ ]   |
| T3  | Hidden/legacy Post tab / onboarding / leaderboard don’t crash if opened | [ ]   |


---



## Phase 3 — Crash & stability matrix

Do this **after** Phase 2 happy paths. Goal: no P0 crashes.

### 3.1 Devices / modes

- [ ] iPhone (recent iOS)
- [ ] One older/slower Android if you ship Android
- [ ] Light mode full pass
- [ ] Dark mode full pass
- [ ] Airplane mode → open app → friendly errors, no crash
- [ ] Slow network (Network Link Conditioner / throttle) → loaders, no hang forever
- [ ] Background 5 min → return → session still valid or clean re-login
- [ ] Rotate / keyboard open on auth + chat + create post/event



### 3.2 Crash hunting (manual)

For each critical screen, force these:

- [ ] Rapid double-tap CTAs (login, RSVP, send, like)
- [ ] Navigate away mid-upload / mid-send
- [ ] Empty fields submit
- [ ] Very long text in post / bio / chat
- [ ] Log out on one device while using another (if multi-session)



### 3.3 Automated / CI (minimum)

- [ ] Backend tests green (`cd backend && npm test`) ✅
- [ ] Mobile typecheck (`cd mobile && npx tsc --noEmit`) ✅
- [ ] CI workflow passes on main 🟡
- [ ] *(Later)* Sentry or similar — ❌ env unused today; add before public launch



### 3.4 Severity triage


| Severity | Meaning                                      | Action                 |
| -------- | -------------------------------------------- | ---------------------- |
| **P0**   | Crash, can’t auth, data loss, money wrong    | Stop shipping; fix now |
| **P1**   | Core flow broken (can’t RSVP, can’t send DM) | Fix before beta        |
| **P2**   | Ugly / confusing / rare edge                 | Fix in beta week       |
| **P3**   | Nice-to-have polish                          | Backlog                |


---



## Phase 4 — Closed beta (10–30 people)

- [ ] Staging → stable; optional second “prod” env
- [ ] Invite list + TestFlight / Play internal track
- [ ] Privacy Policy + Terms URLs live and linked in app ✅ config
- [ ] Feedback channel (WhatsApp / Notion / Form)
- [ ] Daily: check server logs + Resend delivery + R2 errors
- [ ] End of week: decide go / no-go for public or for paid events work

**Beta success bar:** new users verify email, post once, RSVP once, send one DM, without you babysitting OTP logs.

---



## Phase 5 — Features not installed yet (build when in scope)

These are **real product work**, not just checkboxes. Do one vertical slice at a time.

### 5.1 Paid events + Razorpay ❌ Not built (schema only)

Today: events have `priceInr`; `payments` table exists; **no payment routes / mobile checkout**.

**Build checklist (when you choose to do payments):**

- [ ] Product rules: who gets paid (organiser vs platform fee)? refunds? capacity hold until paid?
- [ ] Razorpay account (test mode) + keys in backend env
- [ ] Backend: create order on “Join paid event”
- [ ] Backend: webhook verify signature → mark payment paid → confirm RSVP
- [ ] Mobile: checkout UI (Razorpay RN / web checkout)
- [ ] Handle failure / cancel / double-tap pay
- [ ] Free events still RSVP without payment
- [ ] Receipt / payment status on event detail
- [ ] Test with Razorpay test cards
- [ ] Switch to live keys only after beta

**Do not** show a fake “Pay” button that doesn’t charge.

### 5.2 SMS OTP (MSG91 / Twilio) ❌ Not built

- [ ] Needed only if phone-first signup is required for India launch
- [ ] Until then: email OTP is enough for beta ⏭ Defer SMS



### 5.3 Admin moderation panel ❌ Not built

- [ ] Simple internal web page or Retool: list reports, hide content, ban user
- [ ] Required before **public** scale; optional for tiny closed beta (you can query DB)



### 5.4 Realtime chat (WebSocket / Socket.io) ❌ Not built

- [ ] Polling works for beta ⏭ Defer unless chat feels unusable



### 5.5 Strava ❌ Schema only — ⏭ Defer



### 5.6 Leaderboard ❌ Stub screen — ⏭ Defer or hide route



### 5.7 Typesense / fancy search ❌ Env unused — ⏭ Defer (Postgres search OK for v1)



### 5.8 Change verified email/phone UI 🟡 Backend OTP exists; mobile UI incomplete

- [ ] Screens to request + confirm contact change
- [ ] Needed when real users mistype email; not day-1 blocker if support can help



### 5.9 Seed / test account hygiene 🟡

- [ ] Seed athletes `isVerified: true` (Anya etc.) so demo logins skip OTP
- [ ] Document demo passwords in a private place (not in the public repo if real)

---



## Phase 6 — Public store readiness

- [ ] App Store / Play listing copy + screenshots
- [ ] Age rating / content declarations
- [ ] Privacy nutrition labels / data safety form
- [ ] Production OAuth + Maps keys restricted by bundle ID
- [ ] Crash reporting (Sentry) live
- [ ] Basic analytics (optional)
- [ ] Support email + delete-account path (App Store often requires account deletion)
- [ ] Versioned DB migrations story (beyond `db:push`) for safer deploys
- [ ] Backup / restore plan for Postgres
- [ ] Rate limits + abuse review under real traffic
- [ ] Final security pass (JWT, uploads, object-level auth)

---



## Suggested weekly order (if overwhelmed)

**Week 1 — Foundations**  
Phase 1 only: staging API, R2, Resend, one EAS preview build, verify signup on phone.

**Week 2 — Core QA**  
Phase 2 sections 2.1–2.6 + Phase 3 crash matrix. Fix all P0/P1.

**Week 3 — Closed beta**  
Phase 4. Watch OTP, uploads, RSVP, DMs.

**Week 4+ — Either**  

- Ship public free-only launch (Phase 6), **or**  
- Build Razorpay paid events (Phase 5.1), then Phase 6.

---



## Bugs log (copy rows as you find them)


| Date | Area | Severity | Steps | Expected | Actual | Fixed? |
| ---- | ---- | -------- | ----- | -------- | ------ | ------ |
|      |      | P0/P1/P2 |       |          |        | [ ]    |


---



## Quick status snapshot (as of this doc)


| Area                            | Status                          |
| ------------------------------- | ------------------------------- |
| Auth + email OTP code           | ✅ / needs Resend prod config 🟡 |
| Feed, posts, profiles           | ✅                               |
| Free events + RSVP              | ✅                               |
| Messaging                       | ✅ (polling)                     |
| Search / map                    | 🟡                              |
| Moderation (user report)        | ✅ / admin ❌                     |
| Push                            | 🟡 config                       |
| Paid events / Razorpay          | ❌                               |
| Strava / leaderboard / realtime | ❌ / ⏭                           |
| Store listing + crash analytics | ❌ ops                           |


**Honest target:** finish Phase 1–3 → closed beta (~65–70% ready). Public store after Phase 4 feedback + Phase 6. Add Phase 5.1 only if paid events are part of your launch promise.