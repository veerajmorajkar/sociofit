# Mumbai Fitness Mafia (SocioFit) — Complete Production Audit Context

> **Purpose:** Authoritative A→Z reference for AI-assisted production readiness review (Perplexity, Claude, Cursor).  
> **Last updated:** June 2026  
> **Repo:** `sociofit` monorepo (`mobile/` + `backend/`)  
> **Product:** Hyperlocal fitness social network + events platform (Mumbai-first, India)

---

## How to Use This Document

Paste this entire file into Perplexity/Claude and ask it to generate a **production go-live audit prompt** covering:

1. End-to-end process verification (auth, feed, posts, events, messaging, notifications, uploads, moderation)
2. Security review (JWT, OTP, OAuth, secrets, rate limits, input validation, media uploads)
3. Infrastructure readiness (Postgres, R2, Redis, schedulers, push, external APIs)
4. Dead code / bloat identification
5. Missing production integrations (SMS, email OTP, Razorpay, Strava, Socket.io, Typesense)
6. Mobile build/release checklist (EAS, env vars, Maps keys, OAuth client IDs)

---

## 1. Executive Summary

**SocioFit** connects athletes and fitness clubs through:


| Domain                                                | Status                       | Core files                                                            |
| ----------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| Auth (email/phone/password + OTP + OAuth)             | Built, OTP delivery dev-only | `backend/src/routes/auth.ts`, `mobile/app/(auth)/`                    |
| Home feed (following + viral + follow suggestions)    | Built                        | `backend/src/services/feed.service.ts`, `mobile/app/(tabs)/index.tsx` |
| Posts (create, like, comment, repost)                 | Built                        | `backend/src/services/post.service.ts`                                |
| Events (discover, RSVP, reminders)                    | Built                        | `backend/src/services/event.service.ts`                               |
| Messaging (DM, group, event chat, club announcements) | Built                        | `backend/src/services/messaging*.ts`                                  |
| Notifications (in-app + Expo push)                    | Built                        | `backend/src/services/notification.service.ts`                        |
| Search (map + people/clubs/events)                    | Built                        | `mobile/app/(tabs)/search.tsx`                                        |
| Moderation (report + hide)                            | Built                        | `backend/src/services/moderation.service.ts`                          |
| Media upload (R2 presigned)                           | Built                        | `backend/src/services/upload.service.ts`                              |
| Payments (Razorpay)                                   | Schema only                  | `backend/src/db/schema.ts` → `payments`                               |
| Strava integration                                    | Schema only                  | `users.strava`* columns                                               |
| Realtime chat (WebSocket)                             | Not built                    | Polling in mobile chat                                                |
| Leaderboard                                           | Stub screen                  | `mobile/app/leaderboard.tsx`                                          |


**Architecture:** Expo SDK 54 mobile app ↔ Fastify 5 REST API ↔ PostgreSQL (Drizzle ORM) ↔ Cloudflare R2 media.

---

## 2. Repository Layout

```
sociofit/
├── mobile/                          # Expo Router React Native app
│   ├── app/                         # File-based routes (screens)
│   ├── components/                  # UI by domain (feed, messages, profile, auth, ui)
│   ├── constants/                   # theme.ts, config.ts, activities, messaging
│   ├── contexts/ThemeContext.tsx    # Dark + light theme toggle
│   ├── hooks/                       # TanStack Query wrappers
│   ├── services/                    # API clients (fetch-based)
│   ├── stores/authStore.ts          # Zustand + SecureStore tokens
│   └── types/                       # TS interfaces mirroring API
├── backend/
│   ├── src/
│   │   ├── app.ts                   # Fastify app + route registration
│   │   ├── index.ts                 # Server start + schedulers
│   │   ├── routes/                  # HTTP handlers (thin)
│   │   ├── services/              # Business logic
│   │   ├── schemas/               # Zod request validation
│   │   ├── middleware/            # JWT auth, error handler
│   │   ├── db/schema.ts           # Drizzle PostgreSQL schema
│   │   ├── config/                # env, database, redis, r2
│   │   └── types/                 # feed.types.ts etc.
│   ├── scripts/                   # seed.ts, seed-club-users.ts
│   └── .env.example
└── docs/
    ├── SPECIFICATION.md             # Original full spec (~2000 lines)
    ├── DEPLOY.md
    ├── PROJECT_SUMMARY.md           # Shorter design + screen reference
    └── PRODUCTION_AUDIT_CONTEXT.md  # This file
```

---

## 3. Technology Stack


| Layer             | Technology                      | Notes                                                                    |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------ |
| Mobile            | React Native 0.81, Expo SDK ~54 | Expo Go for dev; EAS for builds                                          |
| Navigation        | Expo Router                     | Stack + tabs, file-based                                                 |
| Server state      | TanStack React Query v5         | Infinite queries, optimistic updates                                     |
| Client auth state | Zustand                         | `authStore` + `expo-secure-store`                                        |
| Styling           | StyleSheet + `ThemeContext`     | Purple Pulse design system; **dark + light modes**                       |
| Icons             | Lucide React Native             | Only icon set                                                            |
| Images            | expo-image                      | memory-disk cache                                                        |
| Maps              | react-native-maps               | Google Maps; requires dev/production build (not Expo Go maps on SDK 54+) |
| Backend           | Fastify 5, TypeScript ESM       |                                                                          |
| ORM               | Drizzle                         | `drizzle-kit push` for schema sync                                       |
| Validation        | Zod                             | All route inputs                                                         |
| Auth tokens       | JWT (access 15m + refresh 30d)  | bcrypt passwords                                                         |
| Media storage     | Cloudflare R2 (S3-compatible)   | Presigned PUT URLs                                                       |
| Push              | Expo Push API                   | `EXPO_ACCESS_TOKEN` optional                                             |
| Tests             | Vitest                          | Backend only                                                             |


---

## 4. Environment Variables & Secrets Inventory

### 4.1 Backend (`backend/.env` — see `.env.example`)


| Variable                              | Required for prod?              | Purpose                                   | Wired?                      |
| ------------------------------------- | ------------------------------- | ----------------------------------------- | --------------------------- |
| `DATABASE_URL`                        | **Yes**                         | PostgreSQL connection                     | ✅ Used                      |
| `JWT_ACCESS_SECRET`                   | **Yes**                         | Access token signing (min 16 chars)       | ✅                           |
| `JWT_REFRESH_SECRET`                  | **Yes**                         | Refresh token signing                     | ✅                           |
| `JWT_ACCESS_EXPIRY`                   | No                              | Default `15m`                             | ✅                           |
| `JWT_REFRESH_EXPIRY`                  | No                              | Default `30d`                             | ✅                           |
| `CORS_ORIGINS`                        | **Yes**                         | Comma-separated allowed origins           | ✅                           |
| `NODE_ENV`                            | **Yes**                         | `production` enables stricter rate limits | ✅                           |
| `PORT` / `HOST`                       | No                              | Default 3000 / 0.0.0.0                    | ✅                           |
| `R2_ACCOUNT_ID`                       | **Yes** (media)                 | Cloudflare R2                             | ✅ upload.service            |
| `R2_ACCESS_KEY_ID`                    | **Yes**                         | R2 credentials                            | ✅                           |
| `R2_SECRET_ACCESS_KEY`                | **Yes**                         | R2 credentials                            | ✅                           |
| `R2_BUCKET_NAME`                      | No                              | Default `fitsocial-media`                 | ✅                           |
| `R2_PUBLIC_URL`                       | **Yes**                         | Public CDN base for uploaded media        | ✅                           |
| `GOOGLE_PLACES_API_KEY`               | **Yes** (location autocomplete) | Server-side Places proxy                  | ✅ places.service            |
| `GOOGLE_OAUTH_*_CLIENT_ID`            | **Yes** (Google Sign-In)        | Verify Google ID tokens                   | ✅ oauth.service             |
| `APPLE_CLIENT_ID` / `APPLE_BUNDLE_ID` | **Yes** (Apple Sign-In iOS)     | Verify Apple identity tokens              | ✅                           |
| `EXPO_ACCESS_TOKEN`                   | Recommended                     | Expo push API auth                        | ✅ notification.service      |
| `REDIS_URL`                           | No                              | Default `redis://localhost:6379`          | ⚠️ **Connected but UNUSED** |
| `RAZORPAY_`*                          | For paid events                 | Payment gateway                           | ❌ Not implemented           |
| `STRAVA_*`                            | For Strava posts                | OAuth + webhooks                          | ❌ Not implemented           |
| `TYPESENSE_*`                         | For full-text search            | Search index                              | ❌ Postgres ILIKE used       |
| `SENTRY_DSN`                          | Recommended                     | Error tracking                            | ❌ Not wired in code         |
| `POSTHOG_*`                           | Optional                        | Analytics                                 | ❌ Not wired                 |


### 4.2 Mobile (`mobile/.env` + `eas.json` build env)


| Variable                                  | Required for prod?             | Purpose                     |
| ----------------------------------------- | ------------------------------ | --------------------------- |
| `EXPO_PUBLIC_API_URL`                     | **Yes**                        | API base incl. `/api/v1`    |
| `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`     | **Yes** (Search tab iOS)       | Native Maps SDK             |
| `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` | **Yes** (Search tab Android)   | Native Maps SDK             |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`        | **Yes** (Google OAuth)         | expo-auth-session           |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`        | **Yes** (Google OAuth iOS)     |                             |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`    | **Yes** (Google OAuth Android) |                             |
| `EXPO_PUBLIC_AUTH_VIDEO_URI`              | No                             | Auth welcome video override |


**Production API URL (hardcoded fallback):** `https://api.fitsocial.app/api/v1` in `mobile/constants/config.ts` when `!__DEV__`.

**Security note for audit:** `mobile/eas.json` contains example/dev Google Maps keys — verify these are restricted by bundle ID / SHA-1 in Google Cloud Console before production release.

---

## 5. API Architecture

**Base path:** `/api/v1`  
**Response envelope:** `{ success: boolean, data: T, error?: string, meta?: { cursor, hasMore, activity?, permissions? } }`  
**Auth:** `Authorization: Bearer <accessToken>` on protected routes  
**Pagination:** Cursor-based (`cursor` query param + `meta.hasMore`)

### Route map


| Prefix           | Endpoints                                                                                                                                  | Auth                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `/health`        | GET health                                                                                                                                 | Public                                   |
| `/auth`          | register, login, verify-otp, resend-otp, refresh, logout, forgot-password, verify-reset-otp, reset-password, google, apple, oauth/complete | Mixed (stricter rate limit: 15/min prod) |
| `/posts`         | feed, CRUD, like, repost, comments, user posts                                                                                             | JWT                                      |
| `/events`        | list, detail, create, patch, RSVP, participants, hosted/joined                                                                             | JWT                                      |
| `/users`         | me, patch me, search, profile, follow/unfollow, followers/following, push-token                                                            | JWT                                      |
| `/messages`      | conversations, groups, messages, read, mute, club announcement                                                                             | JWT                                      |
| `/notifications` | list, mark read, mark all read                                                                                                             | JWT                                      |
| `/categories`    | list event categories                                                                                                                      | JWT                                      |
| `/upload`        | presigned-url                                                                                                                              | JWT                                      |
| `/places`        | autocomplete, details, status                                                                                                              | JWT                                      |
| `/moderation`    | reports, hides                                                                                                                             | JWT                                      |


**Middleware stack:** `@fastify/helmet`, `@fastify/cors`, global rate limit (100/min prod), auth sub-rate limit, Zod parse → service → `sendSuccess`/`sendError`.

---

## 6. Database Process

### 6.1 Connection & migrations

- **Driver:** `postgres` via Drizzle (`backend/src/config/database.ts`)
- **Schema source:** `backend/src/db/schema.ts`
- **Apply schema:** `npm run db:push` (Drizzle push, not migration files in repo)
- **Seed:** `npm run db:seed`, `npm run db:seed:clubs`

### 6.2 Core tables


| Table                                                      | Purpose                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `users`                                                    | Accounts (personal/club), profile, activities[], expoPushToken, OAuth IDs |
| `club_profiles`                                            | Extended club metadata                                                    |
| `follows`                                                  | Social graph (follower → following)                                       |
| `otp_verifications`                                        | 6-digit OTP hashes (login, signup, password_reset)                        |
| `password_reset_tokens`                                    | Hashed reset tokens (post-OTP password change)                            |
| `refresh_tokens`                                           | Hashed refresh JWT storage                                                |
| `categories`                                               | Event categories                                                          |
| `posts` / `post_media` / `post_tags`                       | Feed content                                                              |
| `likes` / `comments` / `reposts`                           | Engagement                                                                |
| `events` / `event_participants`                            | Events + RSVP                                                             |
| `conversations` / `conversation_participants` / `messages` | Messaging                                                                 |
| `notifications`                                            | In-app notifications (JSONB `data`)                                       |
| `reports` / `content_hides`                                | Moderation                                                                |
| `payments`                                                 | Razorpay-ready (unused)                                                   |


### 6.3 Key indexes

Posts indexed by `author_id`, `created_at`. Follows unique on `(follower_id, following_id)`. Event participants unique on `(event_id, user_id)`.

### 6.4 Redis

`backend/src/config/redis.ts` creates an ioredis client on startup. **No service imports or uses Redis** — dead infrastructure for caching/queues. Production audit should flag: either implement caching or remove Redis dependency to reduce ops burden.

---

## 7. Authentication Process (End-to-End)

### 7.1 Account types

- `personal` — athlete/user
- `club` — fitness club/organiser (auto-creates club announcement channel on register)

### 7.2 Registration flow

```
Mobile: signup-athlete.tsx | signup-club.tsx → SignupFlow
  → POST /auth/register (Zod: email OR phone, username, password, accountType, activities, DOB)
  → Backend: hash password (bcrypt), insert users (+ club_profiles if club)
  → createAndSendOtp(purpose: signup) → returns verificationId + masked destination
  → Dev: OTP logged to console + optionally returned as devCode

Mobile: otp-verify.tsx
  → POST /auth/verify-otp { verificationId, code }
  → Backend: verify hash, max 5 attempts, 10min TTL
  → issueAuthTokens → { user, accessToken, refreshToken }

Mobile: authStore.setAuth → SecureStore (accessToken, refreshToken, user JSON)
  → router.replace('/(tabs)')
```

**Validation:** `backend/src/utils/auth-validation.ts`, `mobile/utils/authValidation.ts` — phone country codes, username sanitization, password rules, confirm password.

### 7.3 Login flow

```
Mobile: login.tsx
  → POST /auth/login { email | phone | username, password }
  → If valid: createAndSendOtp(purpose: login) — 2FA step
  → otp-verify → verify-otp → tokens

Alternative: login-options.tsx → OAuth
```

### 7.4 Password reset flow

```
forgot-password.tsx → POST /auth/forgot-password
  → Creates OTP (purpose: password_reset) for email or phone

otp-verify (reset mode) → POST /auth/verify-reset-otp
  → Returns short-lived resetToken

reset-password.tsx → POST /auth/reset-password { resetToken, newPassword }
  → Updates passwordHash, clears reset tokens
```

### 7.5 OAuth flows

**Google:** `POST /auth/google` with ID token → `oauth.service.verifyGoogleIdToken` (needs `GOOGLE_OAUTH_*_CLIENT_ID` on backend + matching mobile client IDs).

**Apple:** `POST /auth/apple` with identity token → Apple JWT verification.

**Incomplete profile:** Returns `needsProfile: true` → mobile `oauth-complete.tsx` → `POST /auth/oauth/complete`.

**Known production blocker:** If `GOOGLE_OAUTH_IOS_CLIENT_ID` unset on backend, Google Sign-In crashes on iOS (`useSocialAuth.ts` requires `iosClientId`).

### 7.6 Token lifecycle


| Token       | Storage (mobile) | Expiry | Refresh                  |
| ----------- | ---------------- | ------ | ------------------------ |
| Access JWT  | SecureStore      | 15m    | Auto via `api.ts` on 401 |
| Refresh JWT | SecureStore      | 30d    | POST `/auth/refresh`     |


**Refresh flow (`mobile/services/api.ts`):**

1. Any API 401 → attempt `POST /auth/refresh` with stored refresh token
2. Success → update tokens in SecureStore, retry original request
3. Failure → logout + "Session expired"

**Backend refresh:** Validates refresh JWT, checks hash in `refresh_tokens` table, rotates tokens.

**Logout:** POST `/auth/logout` (optional server invalidation) + mobile clears SecureStore.

### 7.7 Route protection

- `AuthGuard` component wraps `(tabs)` — redirects unauthenticated users to auth stack
- `authenticate` middleware extracts `userId` + `accountType` from access JWT

---

## 8. Feed Process (End-to-End)

### 8.1 API

```
GET /posts/feed?cursor=&limit=20
  → post.service.getFeed → feed.service.buildFeed
  → Returns FeedItem[] + meta { cursor, hasMore, activity }
```

### 8.2 Feed item types (discriminated union)


| `kind`               | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `post`               | From followed users + self (`source: following | self`)     |
| `recommended_post`   | High-engagement post app-wide (`label: "Recommended post"`) |
| `follow_suggestions` | Horizontal card row of suggested athletes/clubs             |


### 8.3 Algorithm (`backend/src/services/feed.service.ts`)

**Platform activity metrics** (last 24h / 7d posts, engagements, active users) drive:

- `**computeViralThreshold`** — min engagement score for recommended posts (lower when app is small)
- `**computeRecommendedPostRatio**` — how often viral posts inject (38% early → 12% mature)
- `**computeSuggestionInterval**` — follow card every 4–8 posts

**Engagement score:** `likes×2 + comments×5 + reposts×8`

**Following pool:** Posts from last 45 days from follow graph + self, ranked by recency + light engagement.

**Viral pool:** Posts from last 14 days NOT from follow graph, score ≥ threshold, daily seeded shuffle per user.

**Follow suggestions:** Pool of 18 users scored by activity overlap, recent posts, follower count; daily shuffle; mix athletes + clubs; excludes already-followed.

**Mixing loop:** Interleave following posts, inject viral every N posts, inject suggestion cards every M posts (repeats with rotating slices).

**Moderation filter:** Hidden posts/users excluded via `moderation.service`.

**Cursor:** Composite string IDs (`post:uuid`, `rec:uuid`, `suggest:YYYY-MM-DD:slot`).

### 8.4 Mobile wiring

```
useFeed() → getFeed() → FlatList in index.tsx
  → FeedListItem renders PostCard | FeedFollowSuggestions
  → useLikePost / useRepostPost optimistic patches on nested item.post
  → useTealRefresh + useRefreshOnFocus
```

**Follow suggestion card:** `FeedFollowSuggestions.tsx` — compact horizontal cards with name, followers, events attended/hosted, follow button.

---

## 9. Post Process (End-to-End)

### 9.1 Create post

```
post/create.tsx → pick media (expo-image-picker)
  → POST /upload/presigned-url → PUT to R2
  → POST /posts { postType, caption, mediaUrls, locationName, taggedUsernames, ... }
  → post.service.createPost → inserts posts + post_media + tags
```

### 9.2 Engagement


| Action  | Endpoint                        | Side effects                           |
| ------- | ------------------------------- | -------------------------------------- |
| Like    | POST/DELETE `/posts/:id/like`   | Updates counts; `notifyUser` to author |
| Comment | POST `/posts/:id/comments`      | Updates count; notify author           |
| Repost  | POST/DELETE `/posts/:id/repost` | Updates shareCount; notify author      |
| Delete  | DELETE `/posts/:id`             | Soft delete (`isActive: false`)        |


### 9.3 Post detail & comments

```
post/[id].tsx → usePostDetail + usePostComments
  → CommentsBottomSheet (keyboard-aware, neumorphic bubbles)
  → useAddComment optimistic feed patch
```

### 9.4 Profile posts grid

```
GET /posts/user/:userId → getPostsByAuthor
  → UserPostsGrid.tsx (2-column grid)
```

---

## 10. Event Process (End-to-End)

### 10.1 Discovery

```
events.tsx → useEvents infinite query → GET /events?category=&cursor=
  → Category filter chips, search, RSVP toggle
  → Event cards with cover/gradient, LIVE badge, price/FREE
```

### 10.2 Event detail

```
event/[id].tsx → GET /events/:id
  → Hero cover + coverNavTone adaptive nav (server analyzes banner via sharp)
  → RSVP POST/DELETE /events/:id/rsvp
  → Auto-joins event_chat conversation on RSVP (messaging-event.service)
  → Link to event discussion chat
```

### 10.3 Create event

```
event/create.tsx → banner upload, Google Places location, category, datetime
  → POST /events → event.service.createEvent
  → cover-tone.service computes nav tone from banner
```

### 10.4 Background schedulers (`backend/src/index.ts`)


| Scheduler                    | Interval | Purpose                                            |
| ---------------------------- | -------- | -------------------------------------------------- |
| `event-reminder.service`     | 5 min    | 24h + 1h push/in-app reminders to participants     |
| `discussion-cleanup.service` | 5 min    | Close event discussions after 24h post-event grace |


**Idempotency:** `events.reminder24hSentAt`, `reminder1hSentAt` columns.

### 10.5 Not built

- Razorpay paid checkout
- Event cancellation refunds
- Waitlist

---

## 11. Messaging Process (End-to-End)

### 11.1 Conversation types (`backend/src/constants/messaging.ts`)


| Type                | Created when             | Permissions                            |
| ------------------- | ------------------------ | -------------------------------------- |
| `dm`                | User messages another    | Both can send                          |
| `group`             | User creates group       | Creator admin; member limit            |
| `event_chat`        | User RSVPs event         | Phases: open → organiser_only → closed |
| `club_announcement` | Club registers / ensured | Club posts; followers read-only        |


### 11.2 Key flows

**DM:** `POST /messages/conversations { recipientId }` → findOrCreateDm

**Group:** `POST /messages/conversations/groups { title, memberIds }`

**Club announcement:** Auto on club register (`ensureClubAnnouncementChannel`). Follow club → auto-subscribe. Unfollow → leave. Profile "Announcements" button gated on follow.

**Send message:** `POST /messages/conversations/:id/messages` → `messaging-permissions.assertCanSend`

**List:** `GET /messages/conversations` — sorted by last activity, unread counts

**Read receipts:** `PATCH /messages/conversations/:id/read`

### 11.3 Mobile wiring

```
messages.tsx → useConversations → ConversationRow (neumorphic)
chat/[id].tsx → useMessages polling → ChatMessageRow, ChatComposer
  → ChatReadOnlyBanner for closed/event/club-readonly
  → ChatMembersSheet for groups
messages/create-group.tsx
```

**Realtime:** No WebSocket. Chat polls on interval (`useMessages`). Socket.io listed in spec but not implemented.

### 11.4 Event discussion lifecycle

`messaging-event.service.ts`:

- Created on RSVP
- `open` during event + 24h after
- `organiser_only` after grace (only organiser posts)
- `closed` via scheduler

---

## 12. Notification Process (End-to-End)

### 12.1 Triggers


| Event               | Type                        | Source file               |
| ------------------- | --------------------------- | ------------------------- |
| Post liked          | `like`                      | post.service.ts           |
| Post commented      | `comment`                   | post.service.ts           |
| Post reposted       | `repost`                    | post.service.ts           |
| New follower        | `follow`                    | user.service.ts           |
| Event RSVP / update | various                     | event.service.ts          |
| Event reminders     | `event_reminder_24h` / `1h` | event-reminder.service.ts |


### 12.2 Delivery pipeline

```
notifyUser() [fire-and-forget]
  → insert notifications row
  → if users.expoPushToken → POST exp.host/--/api/v2/push/send
```

### 12.3 Mobile

```
push.service.ts → registerForPushNotifications on login
  → PUT /users/me/push-token

notifications.tsx → useNotifications → GET /notifications
  → PATCH read / read-all
  → Foreground handler in push.service
```

### 12.4 Gaps

- No notification preferences / mute by type
- No badge count sync strategy documented
- OTP SMS/email not integrated (see auth)

---

## 13. Search Process

```
search.tsx → MapView (Google Maps dark style) + bottom sheet
  → useUserSearch / useAthletesSearch / useClubSearch / useEventSearch / useMapEvents
  → GET /users/search?q=
  → GET /events?... for map pins
  → useSearchHistory (AsyncStorage)
  → followUser from search results
```

**Requires:** Dev client or EAS build (maps not in Expo Go SDK 54+). Maps keys in `eas.json` / `.env`.

**Search backend:** Postgres ILIKE — not Typesense despite env vars.

---

## 14. Moderation Process

```
ContentActionsMenu.tsx → report or hide
  → POST /moderation/reports
  → POST /moderation/hides

moderation.service.ts:
  → getModerationContext(userId) cached per request
  → Filters hidden posts/users from feed, search, profiles

No admin dashboard for reviewing reports.
```

---

## 15. Upload & Media Process

```
upload.service.ts (backend):
  → Validates MIME (jpeg, png, webp, heic, mp4, mov) + max 50MB
  → Generates R2 presigned PUT URL (1h expiry)
  → Key pattern: {folder}/{userId}/{uuid}.ext

mobile/upload.service.ts:
  → Fetches presigned URL → PUT binary to R2 → uses publicUrl in post/event/avatar

cover-tone.service.ts:
  → sharp analyzes event banner → stores coverNavTone (light/dark) for adaptive nav
```

**Production requirement:** R2 bucket CORS must allow mobile PUT origins.

---

## 16. User & Social Graph Process

```
Profile: GET /users/:id, GET /users/me
Follow: POST/DELETE /users/:id/follow
  → Creates follow row
  → notifyUser (follow notification)
  → Club follow: auto-join announcement channel
  → Club unfollow: leave announcement channel

Connections: profile/connections.tsx → GET /users/:id/followers|following

Profile edit: profile/edit.tsx → PATCH /users/me
```

---

## 17. Mobile App Bootstrap

```
app/_layout.tsx:
  → Load Outfit + Space Grotesk fonts
  → ThemeProvider (dark default, toggle persisted SecureStore)
  → QueryClientProvider
  → authStore.loadStoredAuth()
  → Stack navigator

app/index.tsx:
  → Redirect to (tabs) if authenticated else (auth)

(tabs)/_layout.tsx:
  → AuthGuard
  → FloatingTabBar (5 tabs)
```

### Tab order

Home · Messages · Search · Events · Profile

### Header (Home)

Left: Create post (+) · Center: MFM logo · Right: Notifications bell

---

## 18. Design System (Purple Pulse v3.0)

**Tokens:** `mobile/constants/theme.ts` + `contexts/ThemeContext.tsx`


| Rule             | Detail                                                          |
| ---------------- | --------------------------------------------------------------- |
| Teal `#00E5C3`   | All primary actions                                             |
| Purple `#7B4DFF` | Brand, sent chat bubbles                                        |
| Gold             | Club accents, elite badges only                                 |
| Dark bg          | `#0E0E14` (never pure black)                                    |
| Light mode       | `#F4F2FF` page bg — fully supported                             |
| Typography       | Outfit primary; uppercase screen titles                         |
| Pull refresh     | Custom teal (`useTealRefresh`) — NOT native grey spinner        |
| Account icons    | Athlete (teal), Club (purple + gold outline) — no verified tick |


---

## 19. Security Surface (Audit Checklist)

### 19.1 Authentication & sessions

- [ ] JWT secrets rotated for production (not dev defaults)
- [ ] Refresh token rotation + revocation on logout
- [ ] OTP: **production SMS/email provider not integrated** — codes only console-logged in dev
- [ ] OTP brute force: max 5 attempts per verification
- [ ] Password hashing: bcrypt (verify cost factor)
- [ ] OAuth token verification against Google/Apple JWKS
- [ ] Rate limits: auth 15/min, global 100/min in production

### 19.2 Authorization

- [ ] All mutating routes check `request.user.userId`
- [ ] Post delete: author only
- [ ] Event edit: organiser only
- [ ] Messaging: participant checks via messaging-permissions
- [ ] Club announcement send: club owner only

### 19.3 Input validation

- [ ] Zod schemas on all route bodies/queries
- [ ] Phone normalization (`utils/phone.ts`)
- [ ] Username/email sanitization on auth

### 19.4 Media & uploads

- [ ] Presigned URLs scoped to user folder
- [ ] MIME whitelist enforced
- [ ] R2 credentials not exposed to client (only presigned URLs)

### 19.5 Data exposure

- [ ] Pino redacts `authorization` header and `password` in logs
- [ ] Error handler doesn't leak stack traces in production
- [ ] User search doesn't expose private fields

### 19.6 Mobile secrets

- [ ] API keys in `EXPO_PUBLIC_`* are client-visible by design — restrict in Google Cloud Console
- [ ] No backend secrets in mobile bundle
- [ ] SecureStore for tokens (not AsyncStorage)

### 19.7 CORS

- [ ] `CORS_ORIGINS` must list exact production web origins (if any web client)

---

## 20. Known Gaps & Non-Production Items


| Item                        | Severity                          | Notes                                                          |
| --------------------------- | --------------------------------- | -------------------------------------------------------------- |
| OTP delivery (SMS/email)    | **Blocker**                       | `otp.service.deliverOtp` logs only; needs Twilio/SendGrid/etc. |
| Google OAuth env on backend | **Blocker** if using Google login | Missing `GOOGLE_OAUTH_IOS_CLIENT_ID` crashes app               |
| Redis configured but unused | Low                               | Remove or implement caching                                    |
| Razorpay payments           | Feature gap                       | Schema exists, no routes                                       |
| Strava                      | Feature gap                       | Schema exists, no routes                                       |
| Typesense search            | Feature gap                       | Env vars unused                                                |
| Socket.io realtime          | UX gap                            | Chat polls instead                                             |
| Sentry/Posthog              | Ops gap                           | Env vars unused                                                |
| Leaderboard                 | Feature gap                       | Stub screen                                                    |
| Admin moderation panel      | Ops gap                           | Reports stored, no review UI                                   |
| BullMQ job queue            | Ops gap                           | Schedulers use setInterval in API process                      |
| Horizontal scaling          | Ops gap                           | In-process schedulers won't dedupe across instances            |
| Drizzle migrations          | Ops gap                           | Uses `db:push` not versioned migrations                        |
| Video posts / HLS           | Feature gap                       | MP4 upload allowed, no transcoding                             |
| Stories / active events bar | Feature gap                       | Not built                                                      |
| Email uniqueness edge cases | Review                            | Phone OR email registration                                    |


---

## 21. Dead Code & Bloat Candidates (Audit Targets)


| File/Module                                                        | Issue                                    |
| ------------------------------------------------------------------ | ---------------------------------------- |
| `backend/src/config/redis.ts`                                      | Instantiated, never imported by services |
| Typesense env vars                                                 | Defined, unused                          |
| Strava/Razorpay env + schema                                       | Scaffold only                            |
| `mobile/tailwind.config.js` + NativeWind                           | Most screens use StyleSheet directly     |
| `leaderboard.tsx`                                                  | Placeholder                              |
| Old feed ranker in post.service                                    | Removed — now delegates to feed.service  |
| Duplicate route `mobile/app/messages.tsx` vs `(tabs)/messages.tsx` | Verify both needed                       |
| `colors` static export in theme.ts                                 | Legacy dark-only; prefer `useTheme()`    |


---

## 22. Local Development Setup

```bash
# Backend
cd backend
docker compose up -d          # PostgreSQL
cp .env.example .env          # Fill secrets
npm install
npm run db:push
npm run db:seed
npm run db:seed:clubs         # Optional demo clubs
npm run dev                   # http://localhost:3000/api/v1/health

# Mobile
cd mobile
cp .env.example .env          # EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000/api/v1
npm install
npx expo start                # or npx expo run:ios for maps
```

---

## 23. Production Deployment Checklist

### Backend

- [ ] PostgreSQL managed instance + backups
- [ ] `NODE_ENV=production`
- [ ] Strong JWT secrets
- [ ] R2 bucket + CDN + CORS
- [ ] `GOOGLE_PLACES_API_KEY` with API restrictions
- [ ] OAuth client IDs on backend match mobile bundle IDs
- [ ] OTP provider integrated
- [ ] `EXPO_ACCESS_TOKEN` for push
- [ ] CORS origins set
- [ ] Health check monitoring on `/api/v1/health`
- [ ] Consider moving schedulers to separate worker OR use leader election
- [ ] Versioned DB migrations (replace push-only workflow)

### Mobile

- [ ] EAS production build with correct `EXPO_PUBLIC_API_URL`
- [ ] Google Maps keys restricted per platform
- [ ] Google OAuth clients for iOS/Android/Web
- [ ] Apple Sign-In capability enabled
- [ ] Push notification credentials (APNs via EAS)
- [ ] App Store / Play Store privacy policy links (`TERMS_URL`, `PRIVACY_URL`)
- [ ] Remove dev OTP codes from API responses
- [ ] Test on physical devices (not just Expo Go)

---

## 24. Key File Index


| Concern               | Path                                                     |
| --------------------- | -------------------------------------------------------- |
| API entry             | `backend/src/app.ts`, `index.ts`                         |
| Env validation        | `backend/src/config/env.ts`                              |
| DB schema             | `backend/src/db/schema.ts`                               |
| Auth routes           | `backend/src/routes/auth.ts`                             |
| OTP                   | `backend/src/services/otp.service.ts`                    |
| OAuth                 | `backend/src/services/oauth.service.ts`                  |
| Feed algorithm        | `backend/src/services/feed.service.ts`                   |
| Posts                 | `backend/src/services/post.service.ts`                   |
| Events                | `backend/src/services/event.service.ts`                  |
| Messaging             | `backend/src/services/messaging.service.ts`              |
| Messaging permissions | `backend/src/services/messaging-permissions.ts`          |
| Club announcements    | `backend/src/services/messaging-club.service.ts`         |
| Event chats           | `backend/src/services/messaging-event.service.ts`        |
| Notifications         | `backend/src/services/notification.service.ts`           |
| Moderation            | `backend/src/services/moderation.service.ts`             |
| Upload/R2             | `backend/src/services/upload.service.ts`                 |
| Mobile API client     | `mobile/services/api.ts`                                 |
| Auth store            | `mobile/stores/authStore.ts`                             |
| Theme                 | `mobile/constants/theme.ts`, `contexts/ThemeContext.tsx` |
| Home feed UI          | `mobile/app/(tabs)/index.tsx`                            |
| Feed hook             | `mobile/hooks/useFeed.ts`                                |
| Follow suggestions UI | `mobile/components/feed/FeedFollowSuggestions.tsx`       |
| Push                  | `mobile/services/push.service.ts`                        |
| EAS config            | `mobile/eas.json`, `mobile/app.json`                     |


---

## 25. Suggested Production Audit Prompt (Copy to Claude/Perplexity)

```
You are a senior staff engineer conducting a production readiness review for Mumbai Fitness Mafia (SocioFit), a React Native + Fastify + PostgreSQL fitness social app.

Using the attached PRODUCTION_AUDIT_CONTEXT.md as ground truth:

1. PROCESS AUDIT — For each process (auth, feed, posts, events, messaging, notifications, search, moderation, uploads, social graph), list:
   - End-to-end flow steps (mobile → API → DB → external services)
   - What is complete vs stub vs missing
   - Single points of failure

2. SECURITY AUDIT — Review JWT/OTP/OAuth, rate limits, input validation, media uploads, secret management, CORS, and mobile EXPO_PUBLIC_* exposure. Flag blockers for public launch.

3. INFRASTRUCTURE — Evaluate Postgres, R2, Redis (unused), in-process schedulers, Expo push, Google APIs. Recommend production architecture changes.

4. CODE HEALTH — Identify dead code, unused env vars, duplicate routes, legacy patterns, and bloat.

5. GO-LIVE BLOCKERS — Prioritized P0/P1/P2 list with estimated effort.

6. TEST PLAN — Manual + automated test matrix covering every user journey.

7. PROMPT FOR CURSOR — Generate a sequenced implementation plan I can paste back into Cursor to fix all P0 items.

Be exhaustive. Reference specific files from the context doc. Do not assume features exist if marked as not built.
```

---

*Mumbai Fitness Mafia · SocioFit · Purple Pulse · June 2026*