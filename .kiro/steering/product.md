# Product Steering: FitSocial — Hyperlocal Fitness Social Platform

## Product Vision
FitSocial is a hyperlocal fitness social media and events platform that connects fitness enthusiasts through real-world activities. It is a production-grade, monetisable mobile application targeting India (Mumbai-first). The app must be secure, optimised, scalable, and future-proof. No shortcuts, no makeshift code — every feature must be built to production quality.

## Account Types
Two distinct account types with differentiated UI and permissions:

**Personal Account**
- Normal fitness enthusiast user
- Can post: photos, videos, text, links, event invitations, Strava activity routes
- Can create and RSVP to events
- Has personal profile: name, bio, avatar, steps (Strava-linked), events attended, events organised, posts
- Participates in DMs and club group chats

**Club Account**
- Used by run clubs, cycling clubs, gyms, yoga studios, sports communities, brands
- All personal account features PLUS:
  - Organised event hosting with RSVP management
  - Community group chat with discussions + announcements channels
  - Club profile: name, description, admin details, events organised, average footfall, feedback/reviews, upcoming events, photo gallery (past events), supporting other clubs
  - Verification badge (admin-granted)

## Core Screens & Navigation

### Bottom Navigation Bar (5 tabs)
1. **Home** — Social feed
2. **Events** — Event discovery
3. **Search** — Universal search with map
4. **Messages** — DMs + group chats
5. **Profile** — User/club profile

### Screen: Onboarding & Auth
- Splash screen with logo and tagline
- Value proposition carousel (3 screens)
- Account type selection (Personal / Club)
- Sign up: email or phone OTP + Google OAuth + Apple Sign-In
- Profile setup wizard: display name, bio, profile photo, fitness categories of interest, city/neighbourhood
- Login screen with forgot password flow

### Screen: Home Feed
- Infinite scroll feed of posts from followed accounts + recommended posts
- Post types rendered: photo cards, video posts, text posts, link previews, event invitation cards
- Stories-style active events bar at top (upcoming events from followed clubs)
- Priority: Club events prominently surfaced in feed
- Pull-to-refresh, optimistic likes/comments

### Screen: Events Discovery
- Header filter bar: category tabs (All, Running, Cycling, Yoga/Zumba, Sports, Treks, Fun)
- Toggle: List view / Map view (Google Maps with event pins)
- Event cards: thumbnail, title, organiser, date/time, location, participant count, price (free/paid)
- Recommended events section (based on past categories)
- Date range filter, distance filter (within X km), free/paid filter
- Search within events

### Screen: Event Detail
- Cover photo/media
- Title, organiser (club/personal), category badge
- Date, time, precise location + mini map
- Description
- Participant count + avatar stack (showing who's going)
- JOIN / RSVP button (if paid: triggers Razorpay payment flow)
- Pre/post event chatroom (temporary, expires 24h after event end time)
- Post-event: rating and review submission form
- Share event (deep link)

### Screen: Event Chatroom
- Temporary group chat tied to a specific event
- Opens when user RSVPs, closes 24h after event
- Purpose: discussion, logistics, info sharing, post-event photo sharing
- Push notifications for new messages in joined event chats

### Screen: Create Event
- Form: Title, Category (dropdown), Date picker, Time picker, Location (map pin selector + address), Description, Max capacity, Price (₹0 = free, else paid), Cover image upload, Additional info fields
- Preview before posting
- Submit publishes event + creates feed post + creates event chatroom

### Screen: Search
- Global search bar
- Tabs: People | Clubs | Events | Locations | Categories
- Each tab has relevant filter options
- Map view toggle (shows nearby results pinned on map — Party Hunt style UX)
- Recommended/trending section when search is empty
- Recent searches

### Screen: Categories
- Category grid: Running, Cycling, Yoga/Zumba, Sports & Games, Treks, Fun Events (e.g., beer runs)
- Tapping a category shows events + clubs + people in that category
- Each category has a sub-feed of posts tagged with that category

### Screen: Leaderboard
- Toggle: Personal | Club
- Personal leaderboard metrics: Steps (Strava-linked), Events Attended, Events Organised
- Club leaderboard metrics: Number of events hosted, Total participants/footfall, Frequency of events, Members count, Average rating/review score
- Time filter: This Week | This Month | All Time
- Rank badges, highlight top 3

### Screen: Profile — Personal
- Avatar, display name, bio, link
- Stats bar: Steps, Events Attended, Events Organised
- Posts grid (Instagram-style) with tabs: Posts | Events
- Follow / Message / Share buttons
- Settings gear (own profile)

### Screen: Profile — Club
- Cover photo + avatar, name, description, admin info
- Stats: Events Organised, Avg Footfall, Avg Rating, Members
- Unique sections: Supporting Other Clubs, Upcoming Events, Photo Gallery (past events), Feedback & Reviews
- Tabs: Posts | Events | Gallery
- Follow / Message / Share / Join Club buttons

### Screen: Messages (DMs)
- Conversation list (personal DMs + club group chats)
- Personal DM: 1:1 realtime chat, text + image + GIF
- Club community chat split into: Discussions channel + Announcements channel (only admins post to announcements)
- Unread badges, message delivery receipts

### Screen: Posting
- Post type selector: Photo | Video | Text | Link | Event Invitation | Route (Strava import)
- Photo: multi-image selector, crop, filter, caption, tag people, add category
- Video: upload or record, trim, caption
- Text: rich text with mentions (@user), hashtags
- Link: URL with auto-preview card
- Event Invitation: pulls from your created events to share as a post card
- Route (Personal): Import from Strava or manually draw on map

### Screen: Notifications
- Activity: likes, comments, follows, event RSVPs to your events
- Events: upcoming event reminders (24h, 1h before)
- Messages: DM preview notifications

## Technical Requirements

### Stack (Recommended — Option A: Full Custom)
- **Mobile**: React Native with Expo SDK 52+, Expo Router (file-based navigation)
- **State**: Zustand (global), React Query/TanStack (server state + caching)
- **Styling**: NativeWind (Tailwind for React Native)
- **Backend**: Node.js 22 LTS + Fastify with TypeScript
- **Database**: PostgreSQL 16 (primary), Redis (Upstash) for caching + leaderboards + rate limiting
- **Real-time**: Socket.io for DMs, event chatrooms, live notifications
- **Media Storage**: Cloudflare R2 (S3-compatible, cost-effective)
- **CDN**: Cloudflare for global asset delivery
- **Auth**: Custom JWT (15-min access, 30-day refresh) + Supabase Auth OR Clerk
- **Search**: Typesense (self-hosted or cloud) — People, Clubs, Events, Location
- **Maps**: Google Maps SDK (React Native Maps)
- **Payments**: Razorpay SDK (India-first, UPI + cards + netbanking)
- **Push Notifications**: Expo Push + Firebase Cloud Messaging (FCM) + APNs
- **Third-party Integration**: Strava OAuth API (activity import)
- **Background Jobs**: BullMQ + Redis (notification dispatch, video processing, digest emails)
- **Hosting**: Railway.app (backend + PostgreSQL + Redis), Cloudflare (media + CDN)
- **CI/CD**: GitHub Actions → Railway deploy, Expo EAS Build for app builds
- **Monitoring**: Sentry (error tracking), PostHog (analytics), Uptime Robot (uptime monitoring)

### Stack (Option B — Supabase MVP, faster launch)
- **Mobile**: React Native with Expo SDK 52+, Expo Router
- **Backend-as-a-Service**: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **Custom logic**: Supabase Edge Functions (Deno/TypeScript) for payments, notifications, Strava integration
- **Search**: Typesense Cloud
- **Maps**: Google Maps SDK
- **Payments**: Razorpay via Edge Function
- **Push Notifications**: Expo Push Notifications
- Migrate complex backend to custom Node.js when reaching 10k+ MAU

### Security Non-Negotiables
- bcrypt password hashing (12 rounds minimum)
- JWT access tokens: 15-minute expiry, refresh tokens: 30-day expiry
- Rate limiting: 5 auth attempts/minute, 100 API calls/minute per user
- Input sanitisation on ALL user content (SQL injection prevention, XSS prevention)
- Media upload validation: file type whitelist (jpg, png, mp4, mov), 50MB max size
- Row Level Security (RLS) on all database tables — users can only read/write their own data
- HTTPS enforced, HSTS headers, CORS whitelist
- Environment variables for ALL secrets — no hardcoded keys
- OWASP Top 10 checklist before app store submission
- PII handling: GDPR/PDPB-compliant data deletion flow (account deletion removes all user data)

### Performance Requirements
- Feed load time: < 2 seconds on 4G
- Image optimisation: WebP format, lazy loading, progressive loading
- Video: HLS streaming, thumbnail generation on upload
- Infinite scroll with cursor-based pagination (no offset pagination)
- Redis caching for: user sessions, feed caching (15-min TTL), leaderboard scores
- Database indexing: all foreign keys, all geo-location columns (PostGIS), all timestamp columns used for sorting
- CDN for all media assets (sub-100ms delivery)
- App bundle size: < 10MB initial download

### Code Quality Standards
- TypeScript strict mode throughout (no `any` types)
- ESLint + Prettier enforced via pre-commit hooks (Husky + lint-staged)
- All API endpoints have Zod schema validation on request and response
- All database queries use parameterised queries or ORM (Prisma or Drizzle ORM)
- API response format standardised: `{ success: boolean, data: T, error?: string, meta?: PaginationMeta }`
- Error handling middleware on all routes — no unhandled promise rejections
- Environment configuration via `zod` schema validation on startup (fail fast if env vars missing)
- Git commit convention: Conventional Commits (feat/fix/chore/docs/refactor)
- Feature branches → PR → review → merge to main
- No secrets in version control — `.env` in `.gitignore`

### File Structure (React Native + Fastify)

**Mobile (Expo Router):**
```
mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/
│   │   ├── index.tsx          # Home feed
│   │   ├── events.tsx         # Events discovery
│   │   ├── search.tsx         # Search + Map
│   │   ├── messages.tsx       # DMs
│   │   └── profile.tsx        # Own profile
│   ├── event/[id].tsx         # Event detail
│   ├── profile/[id].tsx       # Other user profile
│   ├── chat/[id].tsx          # DM or group chat
│   └── _layout.tsx
├── components/
│   ├── feed/PostCard.tsx
│   ├── events/EventCard.tsx
│   ├── events/EventMap.tsx
│   ├── profile/ProfileHeader.tsx
│   ├── leaderboard/LeaderboardCard.tsx
│   ├── messages/ChatBubble.tsx
│   └── ui/ (Button, Input, Avatar, Badge, Modal, etc.)
├── hooks/
├── stores/ (Zustand)
├── services/ (API client, Supabase client, Socket.io)
├── utils/
└── constants/
```

**Backend (Node.js + Fastify):**
```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   ├── events.ts
│   │   ├── messages.ts
│   │   ├── search.ts
│   │   ├── leaderboard.ts
│   │   ├── payments.ts
│   │   └── notifications.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── services/
│   │   ├── feed.service.ts
│   │   ├── events.service.ts
│   │   ├── messaging.service.ts
│   │   ├── notifications.service.ts
│   │   ├── strava.service.ts
│   │   ├── payment.service.ts
│   │   └── search.service.ts
│   ├── db/
│   │   ├── schema.ts (Drizzle ORM)
│   │   └── migrations/
│   ├── realtime/
│   │   └── socketHandler.ts
│   ├── jobs/ (BullMQ workers)
│   └── config/
├── tests/
└── prisma/ or drizzle.config.ts
```

## Feature Implementation Priority

### P0 — Must have at MVP launch
- Auth (email, Google, Apple)
- Personal + Club profile creation
- Home feed (posts, likes, comments)
- Photo + text + video posting
- Event creation, discovery, RSVP
- Event detail page + map
- Event temporary chatroom
- 1:1 DMs
- Search (people, clubs, events)
- Push notifications (basic)

### P1 — Launch + 30 days
- Club community group chats (discussions + announcements)
- Map view in events/search
- Leaderboard (personal + club)
- Post-event ratings and reviews
- Paid events (Razorpay integration)
- Strava OAuth import

### P2 — Month 2–3
- Categories screen
- Event boosting (paid promotion)
- Advanced recommendation engine
- Stories/active events bar in feed
- Route posting (import from Strava or draw on map)
- Club photo gallery
- In-app analytics for club admins

## API Design Principles
- RESTful APIs with clear resource naming
- Versioning: `/api/v1/`
- Cursor-based pagination for all list endpoints: `?cursor=<id>&limit=20`
- Location-based queries use PostGIS `ST_DWithin` for radius search
- Feed algorithm: weighted score of recency + engagement + follow relationship + location proximity
- All timestamps in ISO 8601 UTC format
- File uploads via pre-signed URLs (client uploads directly to R2, backend only stores the URL)

## Strava Integration
- OAuth 2.0 flow to connect Strava account
- Sync: recent activities (runs, rides, swims), step count, routes
- Display Strava data on personal profile
- Use Strava data in leaderboard (steps metric)
- Webhook subscription for real-time activity sync

## Razorpay Payment Flow
- Club creates paid event with ticket price
- User taps JOIN → Razorpay order created on backend → payment sheet opens in app
- On success: webhook confirms payment → RSVP confirmed → participant added to event chatroom
- Platform fee (10–15%) deducted at settlement via Razorpay route/split feature
- Refund flow: if event cancelled by organiser, auto-refund initiated

## When to Generate Documentation
When processing this steering document, generate the following:
1. Complete database schema with all tables, columns, types, foreign keys, indexes
2. Full API endpoint list with HTTP methods, paths, request/response schemas, auth requirements
3. Component tree for all screens listed above
4. Environment variables checklist
5. Third-party service integration checklist
6. Security audit checklist
7. Performance optimisation checklist
8. Deployment runbook (step-by-step Railway + Expo EAS deployment)
9. Testing strategy (unit, integration, E2E with Detox)
10. Git branching strategy and PR template
