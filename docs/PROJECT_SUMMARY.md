# Mumbai Fitness Mafia (SocioFit / FitSocial) — Complete Project Summary

> **Purpose:** Design system + screen reference for UI work.  
> **Production audit (A→Z processes, security, go-live):** see [`PRODUCTION_AUDIT_CONTEXT.md`](./PRODUCTION_AUDIT_CONTEXT.md)  
> **Last updated:** June 2026 · **Repo:** `sociofit` monorepo  
> **App name:** Mumbai Fitness Mafia (branded mobile) · **Internal slug:** `fitsocial`

---

## 1. Executive Summary

**Mumbai Fitness Mafia** (codebase: SocioFit / FitSocial) is a **hyperlocal fitness social network and events platform** targeting India (Mumbai-first). It connects personal fitness enthusiasts and fitness clubs through:

- A **social feed** (posts, likes, comments, reposts)
- **Event discovery & RSVP** (free/paid events, maps, categories)
- **Messaging** (DMs, groups, event chats, club announcements)
- **Profiles** (personal + club account types, followers/following)
- **Search** (people, clubs, events, map-based discovery)
- **Notifications** and **content moderation**

The product is built as a **production-grade monorepo**: React Native (Expo) mobile app + Node.js/Fastify TypeScript API + PostgreSQL (Drizzle ORM). Design is **dark-mode-only** under the **"Purple Pulse"** design system.

---

## 2. Design Philosophy — "Purple Pulse" v3.0

**Source of truth:** `.kiro/steering/ui-design.md`  
**Implementation tokens:** `mobile/constants/theme.ts`  
**Tailwind bridge:** `mobile/tailwind.config.js` (NativeWind v4)

### 2.1 Core Visual Identity

| Role | Colour family | Meaning |
|------|---------------|---------|
| **Purple** | `purpleDeep` → `purpleSoft` | Brand, community, identity, sent chat bubbles, map accents |
| **Teal** | `tealPrimary` → `tealDark` | **All primary actions** — JOIN, CREATE, SIGN UP, refresh spinners, active states |
| **Gold** | `gold` / `goldLight` | **Sparse only** — elite badges, leaderboard #1, achievements |
| **Dark canvas** | `bgPrimary` `#0E0E14` | Near-black violet base — **never pure black `#000`** |

**Strict rules:**
1. Teal = action. Purple = brand/community. Gold = elite only.
2. Text on teal backgrounds → `onTeal` (`#001A14`). Text on gold → `onGold` (`#1A0E00`).
3. **Never hardcode hex** in components — import from `theme.ts`.
4. **Dark mode first, light mode supported** — `ThemeContext` toggles full light palette; splash still dark.
5. Icons: **Lucide React Native** only — recolour, never replace icon set.

### 2.2 Complete Colour Palette

#### Backgrounds & Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| `bgPrimary` / `bg` | `#0E0E14` | Every screen root background |
| `surface1` / `surface` | `#17172A` | Cards, sheets, modals, nav pill |
| `surface2` | `#1F1F38` | Inputs, nested cards, dropdowns |
| `surface3` / `border` | `#2A2A48` | Borders, dividers, pressed states |

#### Brand Purple
| Token | Hex | Usage |
|-------|-----|-------|
| `purpleDeep` | `#3B1F8C` | Tribe banners, deep gradient start |
| `purpleBrand` | `#5B2ECC` | Active highlights, sent chat bubbles |
| `purpleHero` | `#7B4DFF` | Hero gradients, event accents, map pins |
| `purpleSoft` / `sageLight` | `#A882FF` | Chips, links, secondary labels |

#### Electric Teal (Primary Action)
| Token | Hex | Usage |
|-------|-----|-------|
| `tealPrimary` / `lime` | `#00E5C3` | Primary CTAs, pull-refresh spinner, active tab circle |
| `tealMid` | `#00BFA5` | Map pins, progress, online indicator |
| `tealDark` / `limeDark` | `#007A6A` | Pressed teal states, teal-tinted surfaces |

#### Prestige Gold (rare)
| Token | Hex | Usage |
|-------|-----|-------|
| `gold` | `#C9A84C` | ELITE badges, #1 leaderboard |
| `goldLight` | `#E8C96A` | Gold shimmer text |
| `goldGlow` | `#F5E0A0` | Achievement unlock backgrounds |

#### Typography Colours
| Token | Hex | Usage |
|-------|-----|-------|
| `textPrimary` / `text1` / `cream` | `#FFFFFF` | Headlines, usernames, titles |
| `textSecondary` / `text2` | `#C4BEFF` | Body copy, captions |
| `textMuted` / `text3` | `#7A74A8` | Timestamps, placeholders, metadata |
| `textDisabled` / `text4` | `#3A3A5A` | Disabled labels only |
| `onTeal` / `textInverse` | `#001A14` | Text on teal buttons |
| `onGold` | `#1A0E00` | Text on gold badges |

#### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#00E5C3` | Confirmations, joined states |
| `error` / `live` | `#FF4D6D` | Errors, delete, LIVE badge |
| `warning` | `#F5A623` | Expiring events, form nudges |
| `info` | `#A882FF` | Tips, soft nudges |

### 2.3 Gradients (`gradients` in theme.ts)

```
gradient-hero:        #3B1F8C → #7B4DFF → #00E5C3
gradient-brand:        #5B2ECC → #7B4DFF
gradient-teal:         #007A6A → #00E5C3
gradient-fab:           #5B2ECC → #00E5C3
gradient-story-ring:    #7B4DFF → #00E5C3
```

**Event category gradients** (via `eventGradient(categorySlug)`):
- Running: `#1A0A3A → #5B2ECC`
- Cycling: `#0A1A3A → #3B6FCC`
- Yoga/Zumba: `#0A2A2A → #00BFA5`
- Competitive/Sports: `#1A0020 → #7B2FBE`
- Social/Fun: `#1A1A0A → #7A5C2E`
- Outdoor/Treks: `#0A1A0A → #2D6A4F`
- Default fallback: `gradient-brand`

### 2.4 Typography

**Primary font:** Outfit (all UI text) — weights 300–900, loaded in `app/_layout.tsx`  
**Secondary font:** Space Grotesk — stats, labels, captions, metadata only

| Token | Family | Weight | Size | Style |
|-------|--------|--------|------|-------|
| `display` | Outfit | 900 | 32–40px | Hero/onboarding |
| `h1` | Outfit | 700 | 24px | Screen titles |
| `h2` | Outfit | 600 | 18px | Section headings |
| `h3` | Outfit | 600 | 15px | Subsections |
| `body` | Outfit | 400 | 14–15px | Body copy |
| `bodyStrong` | Outfit | 600 | 14px | Emphasised body |
| `label` | Outfit | 600 | 11–12px | UPPERCASE labels |
| `button` | Outfit | 700 | 12–15px | CTA text |
| `caption` | Outfit | 400 | 12px | Metadata |
| `stat` | Outfit | 700 | 14–16px | Profile stats |

Screen titles are often **UPPERCASE** with letter-spacing (e.g. `MESSAGES`, `CREATE EVENT`).

### 2.5 Spacing, Radius, Shadows

**Spacing base unit:** 4px — `spacing` tokens: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64  
**Screen edge padding:** 16px mobile  
**Card internal padding:** 16px  
**List gap:** 12px  

**Border radius (`radius`):**
- `xs` 6px — chips, badges
- `sm` 8px — small buttons
- `md` / `card` 12px — inputs, buttons
- `lg` 16px — feed/event cards
- `xl` 24px — bottom sheets
- `full` 9999 — pills, FAB, tab indicator

**Shadows (`shadows`):** `sm`, `md`, `lg`, `teal`, `purple` — cards use `shadow-md`; active teal CTAs use `shadow-teal`.

### 2.6 Neumorphism Tokens (`neumorph` in theme.ts)

Used heavily on **Messages**, **Search**, **Connections** screens:

| Token | Purpose |
|-------|---------|
| `glass` / `glassPill` / `glassPanel` | Semi-transparent overlays on maps |
| `raised` / `pill` / `panel` | Soft raised cards |
| `chatCard` / `chatCardUnread` | Message list rows (unread gets teal border glow) |
| `insetWell` | Recessed avatar socket on cards |
| `fabCircle` | Circular FAB containers |

Neumorph style = soft borders with directional light (`borderTopColor` purple-tint, `borderBottomColor` dark), minimal Android elevation.

### 2.7 Tab Bar & Layout

**Floating pill tab bar** (`FloatingTabBar.tsx`):
- 88% screen width pill, `surface1`-like dark fill
- **5 slots:** Home · Messages · Search (centre) · Events · Profile
- Active tab: **teal circle** (`tealPrimary`) slides with spring animation (damping 26, stiffness 130)
- Inactive icons: `textMuted`
- Bottom safe-area padding + `TabBarBottomFade` gradient vignette on all tab screens
- `SCROLL_BOTTOM_PADDING` = nav height + 16px clearance

**App header** (`AppHeader.tsx`):
- Fixed above feed on Home (does not scroll with list)
- Gradient fade: `#08080C → bgPrimary`
- MFM logo centred; **+** (create post) left; **bell** (notifications) right
- Teal unread dot on notifications

---

## 3. UI Component Patterns (Current Implementation)

### 3.1 Buttons
- **Primary:** `tealPrimary` bg, `onTeal` text, radius 12–14px, uppercase label, teal glow shadow
- **Secondary:** `surface1` + purple border, `purpleSoft` text
- **Destructive:** `error` bg, white text
- **Header actions:** Simple chevron back (no bordered button) on sub-screens; centred uppercase titles with balanced side columns (~72px)

### 3.2 Cards
- **Feed post card** (`PostCard.tsx`): `surface1`, 16px radius, author row, media carousel (`expo-image`), like/comment/repost actions, moderation menu
- **Event discovery card** (`events.tsx` inline): 20px radius, cover image or category gradient, CLUB/PERSON badge, LIVE badge, price/FREE pill, RSVP JOINED/RSVP button
- **Message row** (`ConversationRow.tsx`): Neumorphic `chatCard`, inset avatar well, inline type tags (DM, GROUP, EVENT, CLUB)
- **Profile event grid** (`ProfileEventsTab.tsx`): 1.25 aspect cards with banner + title overlay gradient

### 3.3 Chat Bubbles (`ChatMessageRow.tsx`)
- **Adaptive radius:** pill shape for short text (≤2 lines), softer corners for long text
- **Sent:** `purpleBrand` background, white text
- **Received:** `surface2`, `textSecondary`
- **Club announcements:** read-only gold bottom bar (`ChatComposer` `readOnlyTone: 'gold'`), no top status pill

### 3.4 Pull-to-Refresh (Custom Teal — NOT Native Spinner)

**Important:** The app deliberately **does not use the native iOS/Android RefreshControl spinner** (grey). Instead:

- **Hook:** `useTealRefresh(refetch)` → returns `refreshListProps`
- **Component:** `TealRefreshHeader` — 44px slot with `ActivityIndicator` colour `tealPrimary`
- **Behaviour:** Scroll pull detection → slot opens → data refetches → slot closes
- **Used on:** Home, Events, Messages, Notifications, Connections
- Background tab refetch (`useRefreshOnFocus`) runs **silently** without spinner

### 3.5 Forms
- Inputs: `surface2` bg, `surface3` border, `textPrimary` text
- Create event / edit profile: pill category chips, Google Places autocomplete, date pickers
- Signup: personal/club account type, activity selection, birthdate picker

---

## 4. Navigation Architecture

```
app/
├── index.tsx                    → auth redirect (tabs or login)
├── _layout.tsx                  → fonts, splash, QueryClient, Stack
├── (auth)/
│   ├── login.tsx
│   ├── signup.tsx
│   ├── onboarding.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── (tabs)/                      → AuthGuard wrapped
│   ├── index.tsx                → Home feed
│   ├── messages.tsx             → Messages list
│   ├── search.tsx               → Map + search overlay
│   ├── events.tsx               → Events discovery
│   ├── profile.tsx              → Own profile
│   └── post.tsx                 → hidden (href: null)
├── event/[id].tsx               → Event detail (hero cover, RSVP, DM organiser)
├── event/create.tsx             → Create event form
├── post/[id].tsx                → Post detail + comments
├── post/create.tsx              → Create post modal
├── profile/[id].tsx             → Other user/club profile
├── profile/edit.tsx             → Edit profile
├── profile/connections.tsx      → Followers / following list
├── chat/[id].tsx                → Chat thread
├── messages/create-group.tsx    → New group chat
├── notifications.tsx
└── leaderboard.tsx              → placeholder/stub
```

**Tab order in FloatingTabBar:** Home (0) · Messages (1) · Search (2) · Events (3) · Profile (4)

---

## 5. Screen-by-Screen Functional State (June 2026)

| Screen | Status | Key features |
|--------|--------|--------------|
| **Onboarding/Auth** | ✅ Built | Email signup/login, personal/club accounts, activities, JWT in SecureStore |
| **Home Feed** | ✅ Built | Blended feed (network + engagement ranking), infinite scroll, like/repost, pull-refresh, moderation menu, fixed AppHeader |
| **Events** | ✅ Built | Category filters, search, infinite list, cover images, RSVP toggle, neumorphic chrome |
| **Search** | ✅ Built | Full-screen dark Google Map, event pins with cover crops, filter chips (All/People/Clubs/Events/Near me), recent search history |
| **Messages** | ✅ Built | Neumorphic list, unread badges, group FAB, conversation types |
| **Chat** | ✅ Built | DM/group/event/club announcement, adaptive bubbles, polling, read receipts, member sheet |
| **Profile (own)** | ✅ Built | Posts grid, Events tab (attended/organised), stats, settings sheet, avatar |
| **Profile (other)** | ✅ Built | Follow/message, club announcement gate (must follow), posts grid, hosted events |
| **Connections** | ✅ Built | Followers/following with neumorphic cards |
| **Event detail** | ✅ Built | Hero banner, `coverNavTone` adaptive nav, participants, RSVP, discussion link |
| **Event create** | ✅ Built | Banner upload, Places autocomplete, categories, date/time |
| **Post create** | ✅ Built | Media picker, caption, location, tags |
| **Post detail** | ✅ Built | Comments bottom sheet |
| **Notifications** | ✅ Built | List, mark read, mark all |
| **Leaderboard** | 🔶 Stub | Screen exists, minimal implementation |
| **Payments/Razorpay** | ❌ Not built | Schema exists, no mobile flow |
| **Strava** | ❌ Not built | Schema fields exist |
| **Socket.io realtime** | 🔶 Partial | Client dep present; REST polling used for chat |

---

## 6. Repository Structure

```
sociofit/
├── mobile/                      # Expo SDK 54, React Native 0.81
│   ├── app/                     # Expo Router file-based routes
│   ├── components/
│   │   ├── feed/                # PostCard, CommentComposer, CommentsBottomSheet
│   │   ├── messages/            # Chat UI, ConversationRow
│   │   ├── profile/             # ProfileView, grids, event tabs
│   │   ├── moderation/          # ContentActionsMenu
│   │   └── ui/                  # AppHeader, FloatingTabBar, TealRefresh, avatars
│   ├── constants/               # theme.ts, layout.ts, activities, moderation
│   ├── hooks/                   # TanStack Query wrappers
│   ├── services/                # API clients
│   ├── stores/                  # authStore (Zustand)
│   ├── types/                   # TypeScript interfaces
│   └── utils/                   # formatDate, heroTone, chatBubble, categoryStyle
├── backend/                     # Fastify 5, TypeScript ESM
│   ├── src/
│   │   ├── routes/              # HTTP route handlers
│   │   ├── services/            # Business logic
│   │   ├── schemas/             # Zod validation
│   │   ├── middleware/          # auth, error handler
│   │   └── db/schema.ts         # Drizzle ORM schema
│   └── scripts/                 # seed.ts, seed-club-users.ts
├── docs/
│   ├── SPECIFICATION.md           # Full architecture spec (~2000 lines)
│   ├── DEPLOY.md
│   ├── PROJECT_SUMMARY.md         # This file (design + screens)
│   └── PRODUCTION_AUDIT_CONTEXT.md  # A→Z process wiring + production audit
└── .kiro/steering/
    ├── ui-design.md               # Purple Pulse design system v3.0
    └── product.md                 # Product requirements
```

---

## 7. Technical Stack

| Layer | Technology | Version notes |
|-------|------------|---------------|
| Mobile framework | React Native + Expo | SDK ~54 |
| Navigation | Expo Router | File-based, Stack + Tabs |
| Server state | TanStack React Query | v5, infinite queries, optimistic updates |
| Local state | Zustand | `authStore` |
| Styling | StyleSheet + theme tokens | NativeWind/tailwind present, most screens use StyleSheet |
| Images | expo-image | memory-disk cache |
| Maps | react-native-maps | Google Maps, dark styled tiles on Search |
| Animation | RN Animated + Reanimated 4 | Tab bar spring, some transitions |
| Backend | Fastify 5 | TypeScript ESM |
| ORM | Drizzle | PostgreSQL |
| Validation | Zod | Request/response schemas |
| Auth | JWT | access + refresh tokens, bcrypt passwords |
| Media | S3-compatible (R2) | presigned uploads via `upload` routes |
| Image analysis | sharp | Server-side `coverNavTone` for event banners |
| Tests | Vitest | Backend |

---

## 8. Database Schema (PostgreSQL / Drizzle)

### Core tables
| Table | Purpose |
|-------|---------|
| `users` | Personal + club accounts (`accountType`), profile, location, activities[], push token |
| `club_profiles` | Extended club metadata |
| `follows` | follower/following graph |
| `categories` | Event categories (running, cycling, yoga, etc.) |
| `posts` | Feed posts (caption, location, type) |
| `post_media` | Attached images/videos |
| `post_tags` | Tagged users on posts |
| `likes` / `reposts` / `comments` | Engagement |
| `events` | Full event model + `coverImageUrl`, `coverNavTone`, `status`, chatroom expiry |
| `event_participants` | RSVP records |
| `conversations` | `dm`, `group`, `event_chat`, `club_announcement` |
| `conversation_participants` | Roles, last read, mute |
| `messages` | Text/media messages |
| `notifications` | In-app notifications (JSONB data) |
| `reports` / `content_hides` | Moderation |
| `refresh_tokens` | JWT refresh |
| `payments` | Razorpay-ready schema |
| `password_reset_tokens` | Forgot password flow |

### Key enums / conventions
- Event `status`: `draft` | `upcoming` | `live` | `completed` | `cancelled`
- Conversation `type`: `dm` | `group` | `event_chat` | `club_announcement`
- Account `type`: `personal` | `club`
- Timestamps: ISO 8601 UTC
- Pagination: cursor-based on list endpoints

---

## 9. API Routes (`/api/v1/`)

| Prefix | Features |
|--------|----------|
| `/health` | Health check |
| `/auth` | register, login, refresh, logout, forgot/reset password (rate-limited) |
| `/posts` | feed (blended algorithm), CRUD, like, comment, repost |
| `/events` | list, detail, create, update, RSVP, participants, hosted/joined per user |
| `/users` | profiles, follow/unfollow, followers/following, search |
| `/messages` | conversations, messages, groups, event chats, club announcements |
| `/notifications` | list, mark read |
| `/categories` | event categories |
| `/upload` | presigned media URLs |
| `/places` | Google Places proxy |
| `/moderation` | report, hide content |

**Response shape:** `{ success, data, error?, meta? }`  
**Auth:** Bearer JWT on protected routes

---

## 10. Mobile Data Layer

### Services (`mobile/services/`)
- `api.ts` — axios-like fetch wrapper, token refresh on 401
- `auth.service.ts`, `posts.service.ts`, `events.service.ts`, `users.service.ts`
- `messages.service.ts`, `notifications.service.ts`, `moderation.service.ts`
- `upload.service.ts`, `places.service.ts`, `push.service.ts`

### Hooks (`mobile/hooks/`)
| Hook | Purpose |
|------|---------|
| `useFeed` | Infinite feed query, optimistic like/repost |
| `useEvents` | Infinite events + RSVP mutation |
| `useProfile` / `useMyProfile` | Profile data + update |
| `useMessages` | Conversations, chat messages, send |
| `useSearch` | Unified search |
| `useSearchHistory` | AsyncStorage recent searches |
| `useNotifications` | Notification list |
| `useModeration` | Report/hide mutations |
| `useTealRefresh` | Custom pull-to-refresh props |
| `useRefreshOnFocus` | Silent throttled refetch on tab focus |
| `useHeroNavTone` | Event detail nav text colour from `coverNavTone` |

### Auth flow
- Tokens in `expo-secure-store`
- `AuthGuard` on tabs — redirects to login if unauthenticated
- Splash: `bgPrimary` `#0E0E14`, dark `userInterfaceStyle`

---

## 11. Messaging System (Detailed)

### Conversation types
1. **DM** — 1:1 between users
2. **Group** — multi-member, creator can add members
3. **Event chat** — auto-created on RSVP, expires after event
4. **Club announcement** — broadcast channel; **read-only** for subscribers; **must follow club** to view/join

### Club announcement rules
- Follow club → auto-subscribe to announcements
- Unfollow → leave announcement channel
- Profile shows announcement button (disabled until following)
- Chat UI: gold read-only composer bar, no status pill

### Event discussions
- Phases: `open` → `organiser_only` after event
- Permissions exposed via `ConversationPermissions` on API

---

## 12. Feed Algorithm (Current — June 2026)

Production feed in `backend/src/services/feed.service.ts` returns **mixed `FeedItem[]`**:

| Item | Source |
|------|--------|
| `post` | Followed athletes/clubs + own posts (45-day window, recency + engagement rank) |
| `recommended_post` | App-wide viral posts (engagement threshold scales with platform activity) |
| `follow_suggestions` | Daily-shuffled athlete/club cards (activity overlap scoring) |

**Engagement score:** `likes×2 + comments×5 + reposts×8`  
**Injection rates:** Dynamic — more recommended posts when the app is new/quiet  
**Mobile:** `useFeed` + `FeedFollowSuggestions` + `PostCard` with `promotedLabel`

See **§8** in [`PRODUCTION_AUDIT_CONTEXT.md`](./PRODUCTION_AUDIT_CONTEXT.md) for full wiring.

---

## 13. Moderation

- **Report** posts, users, events (reason + description)
- **Hide** content per-user (removed from feed/lists for reporter)
- `ContentActionsMenu` on post cards and detail screens
- Backend filters hidden content via `moderation.service.ts`

---

## 14. Visual Screen Recipes (for prompt generation)

### Home
- `bgPrimary` background, fixed gradient `AppHeader`, FlatList feed below
- Post cards on `surface1`, teal action icons when active
- Custom teal pull-refresh (no grey native spinner)

### Events
- Top chrome: expandable search, horizontal category chips
- Cards: 20px radius, 160px cover (image or category gradient), teal RSVP pill
- `CLUB` badge = teal tint; `PERSON` badge = purple tint

### Messages
- Gradient background `#13131E → bgPrimary → #0B0B13`
- Centred `MESSAGES` title (18px h1), teal gradient group FAB
- Neumorphic `ConversationRow` cards, purple gradient divider under header

### Search
- Full-bleed dark map, floating neumorphic search bar (teal glow when focused)
- Filter pills, activity dropdown, horizontal result carousels
- Event map pins: circular cover crop with teal/purple ring

### Profile
- Hero gradient header, avatar with ring, stats row (POSTS / ATTENDED / ORGANISED)
- Tabs: POSTS grid, EVENTS (attended/organised toggle)
- Club profiles: announcement button, follow gate

### Event Detail
- Full-width hero cover, adaptive nav ink (`light`/`dark` from server `coverNavTone`)
- Gradient fade into `bgPrimary`, organiser card, RSVP, participants row

### Chat
- `bgPrimary`, centred bubbles with flanking avatars
- Purple sent / grey-violet received, adaptive corner radius

---

## 15. Motion & Animation Guidelines

- Tab indicator: spring `{ damping: 26, stiffness: 130 }`, scale breathe 0.85→1.0
- Card press: `activeOpacity` 0.85–0.9
- Screen transitions: `slide_from_right` (stack); tabs use `animation: 'none'` on initial load
- Pull-refresh: 44px teal slot, no native RefreshControl
- Easing preference: `cubic-bezier(0.16, 1, 0.3, 1)`
- Avoid instant layout snaps on refresh end

---

## 16. Account Types

### Personal
- Post photos, join/create events, DM, follow, profile stats

### Club
- All personal features + host events, club announcements, verified badge support
- `accountType: 'club'` drives UI badges and announcement flows

---

## 17. Seed & Dev Data

```bash
# Backend
cd backend && docker compose up -d
npm run db:push && npm run db:seed
npm run db:seed:clubs   # 4 clubs + 4 users + follows + announcements
npm run dev             # http://localhost:3000/api/v1/health

# Mobile
cd mobile && npm start  # Expo Go
# EXPO_PUBLIC_API_URL for device testing
```

---

## 18. What Is NOT Yet Built (Gaps vs Spec)

- Razorpay paid events
- Strava OAuth + route posts
- Socket.io realtime (polling used instead)
- Leaderboard full UI
- Stories / active events bar on feed
- Video posts / HLS
- Typesense search (API search uses Postgres `ilike`)
- Redis caching layer in production
- BullMQ background jobs
- Full club gallery / reviews UI

---

## 19. Prompting Guide for Perplexity / AI Tools

When generating UI, code, or design prompts for this project, **always include:**

1. **Design system:** Purple Pulse v3.0, dark-only, tokens from `theme.ts`
2. **Colour language:** teal = action, purple = brand, gold = elite-only
3. **Typography:** Outfit primary; uppercase labels; letter-spacing on headings
4. **Components:** neumorphic cards on social screens; teal primary buttons; Lucide icons
5. **Layout:** 16px horizontal padding; floating tab bar clearance; fixed headers where established
6. **No:** pure black backgrounds, grey native refresh spinners, light mode, hardcoded hex
7. **Stack:** Expo Router, TanStack Query, Zustand auth, Fastify API, Drizzle Postgres
8. **Monorepo paths:** `mobile/` for app, `backend/` for API

### Example prompt fragment
> Design a [screen] for Mumbai Fitness Mafia (SocioFit), a dark-mode fitness social app. Use Purple Pulse tokens: background `#0E0E14`, cards `#17172A`, primary CTA teal `#00E5C3` with `#001A14` text, brand purple `#7B4DFF` for accents. Outfit font, uppercase section labels, neumorphic message-style cards with inset avatar wells, floating teal pill tab bar at bottom. No light mode. Match existing patterns: centred screen titles, chevron back, teal pull-refresh without native spinner.

---

## 20. Key File Reference

| Concern | File(s) |
|---------|---------|
| Design tokens | `mobile/constants/theme.ts` |
| Design spec | `.kiro/steering/ui-design.md` |
| Product spec | `.kiro/steering/product.md` |
| Full architecture | `docs/SPECIFICATION.md` |
| DB schema | `backend/src/db/schema.ts` |
| API entry | `backend/src/app.ts` |
| Mobile routes | `mobile/app/` |
| Tab bar | `mobile/components/ui/FloatingTabBar.tsx` |
| Header | `mobile/components/ui/AppHeader.tsx` |
| Pull refresh | `mobile/hooks/useTealRefresh.tsx` |
| Feed | `mobile/app/(tabs)/index.tsx`, `useFeed.ts` |
| Events | `mobile/app/(tabs)/events.tsx` |
| Auth | `mobile/stores/authStore.ts` |

---

*Mumbai Fitness Mafia · SocioFit · Purple Pulse Design System · June 2026*
