# FitSocial — Complete Project Specification

> Version 1.0 | Generated from Product Steering Document
> Last updated: April 2026

---

## Table of Contents

1. [Technical Architecture](#1-technical-architecture)
2. [Database Schema](#2-database-schema)
3. [Complete File Structure](#3-complete-file-structure)
4. [API Contracts](#4-api-contracts)
5. [Component Tree](#5-component-tree)
6. [Environment Variables](#6-environment-variables)
7. [Third-Party Integrations](#7-third-party-integrations)
8. [Security Audit Checklist](#8-security-audit-checklist)
9. [Performance Optimisation Checklist](#9-performance-optimisation-checklist)
10. [Deployment Runbook](#10-deployment-runbook)
11. [Testing Strategy](#11-testing-strategy)
12. [Git Strategy & PR Template](#12-git-strategy--pr-template)
13. [Feature Implementation Plan](#13-feature-implementation-plan)

---

## 1. Technical Architecture

### 1.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT                            │
│  React Native + Expo SDK 52+ / Expo Router / NativeWind         │
│  State: Zustand (local) + TanStack Query (server)               │
│  Maps: react-native-maps (Google Maps SDK)                      │
│  Payments: Razorpay React Native SDK                            │
│  Push: expo-notifications                                       │
└──────────────┬──────────────────────┬───────────────────────────┘
               │ HTTPS REST           │ WebSocket (Socket.io)
               ▼                      ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│     API GATEWAY          │  │   REALTIME SERVER         │
│  Fastify + TypeScript    │  │   Socket.io on Fastify    │
│  Zod validation          │  │   Auth via JWT handshake  │
│  Rate limiting (Redis)   │  │   Rooms: DMs, Event chats │
│  JWT auth middleware      │  │   Live notifications      │
│  /api/v1/*               │  └──────────┬───────────────┘
└──────────┬───────────────┘             │
           │                             │
     ┌─────┴──────────┬─────────────┬────┘
     ▼                ▼             ▼
┌──────────┐  ┌──────────────┐  ┌──────────────┐
│PostgreSQL│  │    Redis      │  │ Typesense    │
│  16 +    │  │  (Upstash)    │  │  (Search)    │
│ PostGIS  │  │  Cache/Queue  │  │  People,     │
│ Drizzle  │  │  Leaderboard  │  │  Clubs,      │
│  ORM     │  │  Rate Limit   │  │  Events      │
└──────────┘  │  Sessions     │  └──────────────┘
              │  BullMQ Jobs  │
              └───────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│              EXTERNAL SERVICES               │
│  Cloudflare R2 (media) + CDN                 │
│  Razorpay (payments + webhooks)              │
│  Strava API (OAuth + webhooks)               │
│  Firebase Cloud Messaging / APNs (push)      │
│  Sentry (errors) + PostHog (analytics)       │
└──────────────────────────────────────────────┘
```

### 1.2 Stack Decision: Option A (Full Custom)

Selected for production-grade control, performance tuning, and long-term scalability.

| Layer | Technology | Rationale |
|---|---|---|
| Mobile | React Native + Expo SDK 52+, Expo Router | File-based routing, OTA updates, EAS Build |
| State | Zustand + TanStack Query | Minimal boilerplate, built-in cache invalidation |
| Styling | NativeWind v4 | Tailwind utility classes in RN, consistent design tokens |
| Backend | Node.js 22 LTS + Fastify | Fastest Node.js framework, schema-based validation |
| ORM | Drizzle ORM | Type-safe, SQL-first, lightweight, great migrations |
| Database | PostgreSQL 16 + PostGIS | Geo-queries, JSONB, RLS, mature ecosystem |
| Cache | Redis (Upstash) | Serverless Redis, sorted sets for leaderboards |
| Realtime | Socket.io | Mature, fallback transports, room-based architecture |
| Search | Typesense | Typo-tolerant, geo-search, sub-50ms latency |
| Media | Cloudflare R2 + CDN | S3-compatible, zero egress fees |
| Auth | Custom JWT | Full control over token lifecycle |
| Payments | Razorpay | India-first, UPI support, route/split for platform fees |
| Jobs | BullMQ | Redis-backed, retries, delayed jobs, dashboard |
| Push | Expo Push + FCM + APNs | Unified push across iOS/Android |
| CI/CD | GitHub Actions + EAS Build | Automated deploys, preview builds |
| Hosting | Railway.app | Simple deploys, managed Postgres + Redis |
| Monitoring | Sentry + PostHog + Uptime Robot | Errors, analytics, uptime |

### 1.3 Data Flow Patterns

**Feed Loading:**
```
Client → GET /api/v1/feed?cursor=X&limit=20
  → Auth middleware (JWT verify)
  → Rate limit check (Redis)
  → Check Redis feed cache (15-min TTL)
  → Cache miss: Query PostgreSQL (weighted algorithm)
  → Hydrate post data (author, media URLs, counts)
  → Set Redis cache
  → Return paginated response with cursor
```

**Event RSVP (Paid):**
```
Client → POST /api/v1/events/:id/rsvp
  → Auth middleware
  → Validate capacity not full
  → Create Razorpay order (backend)
  → Return order_id to client
Client → Opens Razorpay payment sheet
  → Payment success → Razorpay webhook → POST /api/v1/webhooks/razorpay
  → Verify signature → Confirm RSVP → Add to event chatroom
  → BullMQ job: send push notification to organiser
  → BullMQ job: send confirmation push to participant
```

**Realtime Messaging:**
```
Client → Socket.io connect (JWT in handshake)
  → Server validates JWT, joins user to their rooms
  → Client emits "message:send" { conversationId, content, type }
  → Server persists to PostgreSQL
  → Server broadcasts to room members
  → BullMQ job: push notification to offline members
  → Client receives "message:new" event, optimistic UI already rendered
```

---

## 2. Database Schema

### 2.1 Entity Relationship Overview

Core entities: Users, Clubs, Posts, Events, Messages, Conversations, Notifications, Payments.

### 2.2 Complete Table Definitions

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE,
  phone           VARCHAR(20) UNIQUE,
  password_hash   VARCHAR(255),           -- bcrypt, 12 rounds
  account_type    VARCHAR(10) NOT NULL CHECK (account_type IN ('personal', 'club')),
  display_name    VARCHAR(100) NOT NULL,
  username        VARCHAR(50) UNIQUE NOT NULL,
  bio             TEXT,
  avatar_url      VARCHAR(500),
  cover_photo_url VARCHAR(500),
  website_url     VARCHAR(500),
  city            VARCHAR(100),
  neighbourhood   VARCHAR(100),
  location        GEOGRAPHY(POINT, 4326), -- PostGIS point
  auth_provider   VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'apple', 'phone')),
  google_id       VARCHAR(255) UNIQUE,
  apple_id        VARCHAR(255) UNIQUE,
  strava_id       VARCHAR(255) UNIQUE,
  strava_access_token   TEXT,
  strava_refresh_token  TEXT,
  strava_token_expires  TIMESTAMPTZ,
  expo_push_token VARCHAR(255),
  is_verified     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================
-- CLUB PROFILES (extends users where account_type = 'club')
-- ============================================================
CREATE TABLE club_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  description     TEXT,
  admin_name      VARCHAR(100),
  admin_email     VARCHAR(255),
  admin_phone     VARCHAR(20),
  category        VARCHAR(50),            -- running, cycling, yoga, sports, etc.
  member_count    INTEGER DEFAULT 0,
  avg_footfall    DECIMAL(10,2) DEFAULT 0,
  avg_rating      DECIMAL(3,2) DEFAULT 0,
  total_reviews   INTEGER DEFAULT 0,
  events_count    INTEGER DEFAULT 0,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_club_profiles_user_id ON club_profiles(user_id);
CREATE INDEX idx_club_profiles_category ON club_profiles(category);

-- ============================================================
-- CLUB MEMBERS
-- ============================================================
CREATE TABLE club_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_user_id ON club_members(user_id);

-- ============================================================
-- CLUB SUPPORT (clubs supporting other clubs)
-- ============================================================
CREATE TABLE club_supports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supporter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supported_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supporter_id, supported_id)
);

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE follows (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================
-- FITNESS CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) UNIQUE NOT NULL,
  slug        VARCHAR(50) UNIQUE NOT NULL,
  icon_url    VARCHAR(500),
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: running, cycling, yoga_zumba, sports_games, treks, fun_events

-- ============================================================
-- USER CATEGORY INTERESTS
-- ============================================================
CREATE TABLE user_categories (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, category_id)
);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_type       VARCHAR(20) NOT NULL CHECK (post_type IN ('photo', 'video', 'text', 'link', 'event_invite', 'route')),
  caption         TEXT,
  link_url        VARCHAR(500),
  link_preview    JSONB,                  -- { title, description, image, domain }
  route_data      JSONB,                  -- GeoJSON for Strava routes
  strava_activity_id VARCHAR(255),
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  location        GEOGRAPHY(POINT, 4326),
  location_name   VARCHAR(255),
  like_count      INTEGER DEFAULT 0,
  comment_count   INTEGER DEFAULT 0,
  share_count     INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_event ON posts(event_id);
CREATE INDEX idx_posts_location ON posts USING GIST(location);
CREATE INDEX idx_posts_type ON posts(post_type);

-- ============================================================
-- POST MEDIA (supports multi-image posts)
-- ============================================================
CREATE TABLE post_media (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type  VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
  url         VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  width       INTEGER,
  height      INTEGER,
  duration_ms INTEGER,                    -- video duration
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_media_post ON post_media(post_id);

-- ============================================================
-- POST TAGS (people tagged in posts)
-- ============================================================
CREATE TABLE post_tags (
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

-- ============================================================
-- LIKES
-- ============================================================
CREATE TABLE likes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,  -- threaded replies
  content     TEXT NOT NULL,
  like_count  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organiser_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  category_id     UUID NOT NULL REFERENCES categories(id),
  cover_image_url VARCHAR(500),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  location_name   VARCHAR(255) NOT NULL,
  location_address TEXT,
  max_capacity    INTEGER,
  price_inr       INTEGER DEFAULT 0,      -- price in paise (0 = free)
  currency        VARCHAR(3) DEFAULT 'INR',
  participant_count INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'live', 'completed', 'cancelled')),
  chatroom_active BOOLEAN DEFAULT TRUE,
  chatroom_expires_at TIMESTAMPTZ,        -- end_time + 24h
  avg_rating      DECIMAL(3,2) DEFAULT 0,
  total_reviews   INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_organiser ON events(organiser_id);
CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_location ON events USING GIST(location);
CREATE INDEX idx_events_price ON events(price_inr);
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- ============================================================
-- EVENT PARTICIPANTS (RSVPs)
-- ============================================================
CREATE TABLE event_participants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'waitlisted')),
  payment_id  UUID REFERENCES payments(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);

-- ============================================================
-- EVENT REVIEWS
-- ============================================================
CREATE TABLE event_reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_reviews_event ON event_reviews(event_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  razorpay_order_id   VARCHAR(255) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(255) UNIQUE,
  razorpay_signature  VARCHAR(500),
  amount_inr          INTEGER NOT NULL,     -- in paise
  platform_fee_inr    INTEGER DEFAULT 0,    -- in paise
  status              VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'captured', 'refunded', 'failed')),
  refund_id           VARCHAR(255),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_event ON payments(event_id);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            VARCHAR(20) NOT NULL CHECK (type IN ('dm', 'event_chat', 'club_discussion', 'club_announcement')),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  club_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(200),
  last_message_at TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_event ON conversations(event_id);
CREATE INDEX idx_conversations_club ON conversations(club_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- ============================================================
-- CONVERSATION PARTICIPANTS
-- ============================================================
CREATE TABLE conversation_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at    TIMESTAMPTZ,
  is_muted        BOOLEAN DEFAULT FALSE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT,
  message_type    VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'gif', 'system')),
  media_url       VARCHAR(500),
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL,   -- like, comment, follow, event_rsvp, event_reminder, message, etc.
  title           VARCHAR(200),
  body            TEXT,
  data            JSONB,                  -- { postId, eventId, userId, etc. }
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  device_info VARCHAR(255),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================
-- STRAVA ACTIVITIES (synced from Strava)
-- ============================================================
CREATE TABLE strava_activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strava_id       VARCHAR(255) UNIQUE NOT NULL,
  activity_type   VARCHAR(50),            -- Run, Ride, Swim, etc.
  name            VARCHAR(255),
  distance_m      DECIMAL(12,2),
  moving_time_s   INTEGER,
  elapsed_time_s  INTEGER,
  total_elevation DECIMAL(10,2),
  start_date      TIMESTAMPTZ,
  map_polyline    TEXT,                   -- encoded polyline
  step_count      INTEGER,
  calories        INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strava_activities_user ON strava_activities(user_id);
CREATE INDEX idx_strava_activities_date ON strava_activities(start_date DESC);

-- ============================================================
-- LEADERBOARD SNAPSHOTS (materialised, refreshed by BullMQ job)
-- ============================================================
CREATE TABLE leaderboard_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period          VARCHAR(20) NOT NULL CHECK (period IN ('week', 'month', 'all_time')),
  metric          VARCHAR(30) NOT NULL,   -- steps, events_attended, events_organised, etc.
  score           DECIMAL(15,2) DEFAULT 0,
  rank            INTEGER,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period, metric)
);

CREATE INDEX idx_leaderboard_period_metric ON leaderboard_entries(period, metric, score DESC);

-- ============================================================
-- CLUB GALLERY
-- ============================================================
CREATE TABLE club_gallery (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  image_url   VARCHAR(500) NOT NULL,
  caption     VARCHAR(500),
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_club_gallery_club ON club_gallery(club_id);

-- ============================================================
-- REPORTS (content moderation)
-- ============================================================
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type     VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'event', 'message')),
  target_id       UUID NOT NULL,
  reason          VARCHAR(50) NOT NULL,
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
```

---

## 3. Complete File Structure

### 3.1 Mobile App (Expo Router)

```
mobile/
├── app.json                          # Expo config
├── babel.config.js
├── tailwind.config.js                # NativeWind config
├── tsconfig.json
├── package.json
├── eas.json                          # EAS Build config
├── metro.config.js
├── app/
│   ├── _layout.tsx                   # Root layout (providers, fonts, splash)
│   ├── index.tsx                     # Entry redirect (auth check)
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx               # Auth stack layout
│   │   ├── splash.tsx                # Splash + logo
│   │   ├── onboarding.tsx            # Value prop carousel
│   │   ├── account-type.tsx          # Personal / Club selection
│   │   ├── login.tsx                 # Email/phone + social login
│   │   ├── signup.tsx                # Registration form
│   │   ├── forgot-password.tsx       # Password reset flow
│   │   └── profile-setup.tsx         # Post-signup wizard
│   │
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab bar layout (5 tabs)
│   │   ├── index.tsx                 # Home feed
│   │   ├── events.tsx                # Events discovery
│   │   ├── search.tsx                # Search + map
│   │   ├── messages.tsx              # Conversations list
│   │   └── profile.tsx               # Own profile
│   │
│   ├── event/
│   │   ├── [id].tsx                  # Event detail
│   │   ├── create.tsx                # Create event form
│   │   └── [id]/
│   │       ├── chat.tsx              # Event chatroom
│   │       ├── participants.tsx      # Participant list
│   │       └── review.tsx            # Post-event review form
│   │
│   ├── profile/
│   │   ├── [id].tsx                  # Other user/club profile
│   │   └── edit.tsx                  # Edit own profile
│   │
│   ├── chat/
│   │   └── [id].tsx                  # DM or group chat
│   │
│   ├── post/
│   │   ├── create.tsx                # Create post (type selector)
│   │   └── [id].tsx                  # Post detail (comments)
│   │
│   ├── category/
│   │   ├── index.tsx                 # Category grid
│   │   └── [slug].tsx                # Category detail (events + clubs + posts)
│   │
│   ├── leaderboard.tsx               # Leaderboard screen
│   ├── notifications.tsx             # Notifications screen
│   ├── settings.tsx                  # App settings
│   └── strava-callback.tsx           # Strava OAuth redirect handler
│
├── components/
│   ├── feed/
│   │   ├── PostCard.tsx              # Unified post card renderer
│   │   ├── PhotoPost.tsx
│   │   ├── VideoPost.tsx
│   │   ├── TextPost.tsx
│   │   ├── LinkPreviewPost.tsx
│   │   ├── EventInvitePost.tsx
│   │   ├── RoutePost.tsx
│   │   ├── ActiveEventsBar.tsx       # Stories-style horizontal scroll
│   │   └── FeedList.tsx              # Infinite scroll wrapper
│   │
│   ├── events/
│   │   ├── EventCard.tsx             # Event list card
│   │   ├── EventMap.tsx              # Google Maps with event pins
│   │   ├── EventFilterBar.tsx        # Category tabs + filters
│   │   ├── ParticipantStack.tsx      # Avatar stack
│   │   └── RSVPButton.tsx            # Join/RSVP with payment flow
│   │
│   ├── profile/
│   │   ├── ProfileHeader.tsx         # Personal profile header
│   │   ├── ClubProfileHeader.tsx     # Club profile header
│   │   ├── StatsBar.tsx              # Steps, events, etc.
│   │   ├── PostsGrid.tsx             # Instagram-style grid
│   │   ├── ClubGallery.tsx
│   │   ├── ReviewsList.tsx
│   │   └── SupportingClubs.tsx
│   │
│   ├── leaderboard/
│   │   ├── LeaderboardCard.tsx
│   │   ├── LeaderboardList.tsx
│   │   └── RankBadge.tsx
│   │
│   ├── messages/
│   │   ├── ConversationItem.tsx      # Chat list item
│   │   ├── ChatBubble.tsx            # Message bubble
│   │   ├── ChatInput.tsx             # Text input + media picker
│   │   └── TypingIndicator.tsx
│   │
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── SearchTabs.tsx
│   │   ├── SearchResultCard.tsx
│   │   └── MapSearchView.tsx
│   │
│   ├── notifications/
│   │   └── NotificationItem.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── TextArea.tsx
│       ├── Avatar.tsx
│       ├── Badge.tsx
│       ├── Modal.tsx
│       ├── BottomSheet.tsx
│       ├── Card.tsx
│       ├── Chip.tsx
│       ├── Divider.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       ├── Icon.tsx
│       ├── ImagePicker.tsx
│       ├── LoadingSpinner.tsx
│       ├── Skeleton.tsx
│       ├── TabBar.tsx
│       ├── Toast.tsx
│       └── VerifiedBadge.tsx
│
├── hooks/
│   ├── useAuth.ts                    # Auth state + actions
│   ├── useFeed.ts                    # Feed queries (TanStack)
│   ├── useEvents.ts                  # Event queries + mutations
│   ├── useMessages.ts                # Message queries + socket
│   ├── useNotifications.ts
│   ├── useSearch.ts
│   ├── useLeaderboard.ts
│   ├── useLocation.ts                # Device location
│   ├── useSocket.ts                  # Socket.io connection
│   ├── useImageUpload.ts             # Pre-signed URL upload
│   ├── useStrava.ts                  # Strava OAuth + data
│   └── usePayment.ts                 # Razorpay flow
│
├── stores/
│   ├── authStore.ts                  # JWT tokens, user session
│   ├── feedStore.ts                  # Feed preferences
│   ├── socketStore.ts                # Socket connection state
│   ├── notificationStore.ts          # Unread counts
│   └── uiStore.ts                    # Theme, modals, toasts
│
├── services/
│   ├── api.ts                        # Axios/fetch client with interceptors
│   ├── auth.service.ts
│   ├── users.service.ts
│   ├── posts.service.ts
│   ├── events.service.ts
│   ├── messages.service.ts
│   ├── search.service.ts
│   ├── leaderboard.service.ts
│   ├── notifications.service.ts
│   ├── upload.service.ts             # Pre-signed URL + R2 upload
│   ├── strava.service.ts
│   ├── payment.service.ts
│   └── socket.service.ts             # Socket.io client singleton
│
├── utils/
│   ├── formatDate.ts
│   ├── formatDistance.ts
│   ├── formatCurrency.ts
│   ├── validators.ts                 # Zod schemas for forms
│   ├── storage.ts                    # SecureStore wrapper
│   ├── linking.ts                    # Deep link config
│   └── constants.ts
│
├── constants/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── categories.ts
│   └── config.ts                     # API_URL, env-based config
│
├── types/
│   ├── user.ts
│   ├── post.ts
│   ├── event.ts
│   ├── message.ts
│   ├── notification.ts
│   ├── payment.ts
│   ├── api.ts                        # ApiResponse<T>, PaginationMeta
│   └── navigation.ts
│
└── assets/
    ├── images/
    ├── fonts/
    └── animations/                   # Lottie files
```

### 3.2 Backend (Fastify + TypeScript)

```
backend/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── Dockerfile
├── docker-compose.yml                # Local dev (Postgres + Redis)
├── .env.example
├── .eslintrc.js
├── .prettierrc
│
├── src/
│   ├── index.ts                      # Server entry point
│   ├── app.ts                        # Fastify app factory
│   │
│   ├── config/
│   │   ├── env.ts                    # Zod-validated env vars
│   │   ├── database.ts               # Drizzle + pg pool
│   │   ├── redis.ts                  # Upstash Redis client
│   │   ├── typesense.ts              # Typesense client
│   │   ├── r2.ts                     # Cloudflare R2 (S3) client
│   │   ├── razorpay.ts               # Razorpay instance
│   │   └── socket.ts                 # Socket.io server setup
│   │
│   ├── db/
│   │   ├── schema.ts                 # Drizzle ORM schema (all tables)
│   │   ├── relations.ts              # Drizzle relations
│   │   ├── migrate.ts                # Migration runner
│   │   └── migrations/               # SQL migration files
│   │       └── 0001_initial.sql
│   │
│   ├── routes/
│   │   ├── auth.ts                   # /api/v1/auth/*
│   │   ├── users.ts                  # /api/v1/users/*
│   │   ├── posts.ts                  # /api/v1/posts/*
│   │   ├── events.ts                 # /api/v1/events/*
│   │   ├── messages.ts               # /api/v1/messages/*
│   │   ├── search.ts                 # /api/v1/search/*
│   │   ├── leaderboard.ts            # /api/v1/leaderboard/*
│   │   ├── payments.ts               # /api/v1/payments/*
│   │   ├── notifications.ts          # /api/v1/notifications/*
│   │   ├── categories.ts             # /api/v1/categories/*
│   │   ├── upload.ts                 # /api/v1/upload/*
│   │   ├── strava.ts                 # /api/v1/strava/*
│   │   └── webhooks.ts               # /api/v1/webhooks/* (Razorpay, Strava)
│   │
│   ├── middleware/
│   │   ├── auth.ts                   # JWT verification + user injection
│   │   ├── rateLimit.ts              # Redis-based rate limiting
│   │   ├── errorHandler.ts           # Global error handler
│   │   ├── requestLogger.ts          # Structured logging
│   │   └── cors.ts                   # CORS configuration
│   │
│   ├── services/
│   │   ├── auth.service.ts           # Registration, login, token refresh, OAuth
│   │   ├── user.service.ts           # Profile CRUD, follow/unfollow
│   │   ├── feed.service.ts           # Feed algorithm, caching
│   │   ├── post.service.ts           # Post CRUD, likes, comments
│   │   ├── event.service.ts          # Event CRUD, RSVP, reviews
│   │   ├── messaging.service.ts      # Conversations, messages
│   │   ├── search.service.ts         # Typesense indexing + querying
│   │   ├── leaderboard.service.ts    # Score calculation, Redis sorted sets
│   │   ├── notification.service.ts   # Create + dispatch notifications
│   │   ├── payment.service.ts        # Razorpay order/capture/refund
│   │   ├── strava.service.ts         # OAuth, activity sync, webhooks
│   │   └── upload.service.ts         # Pre-signed URL generation
│   │
│   ├── realtime/
│   │   ├── socketHandler.ts          # Socket.io event handlers
│   │   ├── rooms.ts                  # Room management (DMs, event chats)
│   │   └── presence.ts               # Online/typing indicators
│   │
│   ├── jobs/
│   │   ├── queue.ts                  # BullMQ queue definitions
│   │   ├── workers/
│   │   │   ├── notification.worker.ts    # Push notification dispatch
│   │   │   ├── video.worker.ts           # Video transcoding + thumbnail
│   │   │   ├── search-index.worker.ts    # Typesense index sync
│   │   │   ├── leaderboard.worker.ts     # Leaderboard recalculation
│   │   │   ├── event-cleanup.worker.ts   # Close expired chatrooms
│   │   │   └── strava-sync.worker.ts     # Strava activity sync
│   │   └── scheduler.ts             # Cron-like scheduled jobs
│   │
│   ├── schemas/
│   │   ├── auth.schema.ts            # Zod schemas for auth endpoints
│   │   ├── user.schema.ts
│   │   ├── post.schema.ts
│   │   ├── event.schema.ts
│   │   ├── message.schema.ts
│   │   ├── search.schema.ts
│   │   ├── payment.schema.ts
│   │   └── common.schema.ts          # Pagination, ID params, etc.
│   │
│   ├── types/
│   │   ├── fastify.d.ts              # Fastify type augmentation (request.user)
│   │   └── index.ts                  # Shared types
│   │
│   └── utils/
│       ├── jwt.ts                    # Sign, verify, decode
│       ├── hash.ts                   # bcrypt wrapper
│       ├── pagination.ts             # Cursor-based pagination helpers
│       ├── geo.ts                    # PostGIS query builders
│       ├── sanitise.ts               # Input sanitisation
│       ├── response.ts               # Standardised response builder
│       └── logger.ts                 # Pino logger config
│
├── tests/
│   ├── setup.ts                      # Test DB, fixtures
│   ├── helpers/
│   │   ├── auth.helper.ts            # Generate test tokens
│   │   └── factory.ts                # Test data factories
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── posts.test.ts
│   │   ├── events.test.ts
│   │   └── messages.test.ts
│   └── e2e/
│
└── scripts/
    ├── seed.ts                       # Seed categories + test data
    └── migrate.ts                    # Run migrations
```

---

## 4. API Contracts

All endpoints prefixed with `/api/v1`. Standard response envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}
```

### 4.1 Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register with email/phone |
| POST | `/auth/login` | Public | Login with email/phone + password |
| POST | `/auth/login/google` | Public | Google OAuth login |
| POST | `/auth/login/apple` | Public | Apple Sign-In |
| POST | `/auth/verify-otp` | Public | Verify phone OTP |
| POST | `/auth/send-otp` | Public | Send OTP to phone |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | User | Revoke refresh token |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public | Reset password with token |

**POST /auth/register**
```typescript
// Request
{
  email?: string;
  phone?: string;
  password: string;           // min 8 chars, 1 upper, 1 number
  accountType: 'personal' | 'club';
  displayName: string;        // 2-100 chars
  username: string;           // 3-50 chars, alphanumeric + underscore
}

// Response 201
{
  success: true,
  data: {
    user: { id, email, accountType, displayName, username },
    accessToken: string,      // JWT, 15-min expiry
    refreshToken: string      // 30-day expiry
  }
}
```

**POST /auth/login**
```typescript
// Request
{
  email?: string;
  phone?: string;
  password: string;
}

// Response 200
{
  success: true,
  data: {
    user: User,
    accessToken: string,
    refreshToken: string
  }
}
```

### 4.2 Users & Profiles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | User | Get own profile |
| PATCH | `/users/me` | User | Update own profile |
| DELETE | `/users/me` | User | Delete account (GDPR) |
| GET | `/users/:id` | User | Get user/club profile |
| POST | `/users/:id/follow` | User | Follow user/club |
| DELETE | `/users/:id/follow` | User | Unfollow user/club |
| GET | `/users/:id/followers` | User | List followers |
| GET | `/users/:id/following` | User | List following |
| GET | `/users/:id/posts` | User | List user's posts |
| GET | `/users/:id/events` | User | List user's events |
| PATCH | `/users/me/push-token` | User | Update Expo push token |
| POST | `/users/me/profile-setup` | User | Complete profile setup wizard |

**GET /users/:id**
```typescript
// Response 200
{
  success: true,
  data: {
    id: string,
    accountType: 'personal' | 'club',
    displayName: string,
    username: string,
    bio: string | null,
    avatarUrl: string | null,
    coverPhotoUrl: string | null,
    city: string | null,
    isVerified: boolean,
    followerCount: number,
    followingCount: number,
    isFollowing: boolean,       // relative to requesting user
    stats: {
      steps: number,            // from Strava
      eventsAttended: number,
      eventsOrganised: number
    },
    // Club-only fields (null for personal)
    clubProfile?: {
      description: string,
      category: string,
      memberCount: number,
      avgFootfall: number,
      avgRating: number,
      totalReviews: number,
      eventsCount: number,
      isVerified: boolean
    }
  }
}
```

### 4.3 Club-Specific

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/clubs/:id/members` | User | List club members |
| POST | `/clubs/:id/join` | User | Join club |
| DELETE | `/clubs/:id/leave` | User | Leave club |
| PATCH | `/clubs/:id/members/:userId` | Club Admin | Update member role |
| DELETE | `/clubs/:id/members/:userId` | Club Admin | Remove member |
| GET | `/clubs/:id/gallery` | User | Get club photo gallery |
| POST | `/clubs/:id/gallery` | Club Admin | Add gallery photo |
| DELETE | `/clubs/:id/gallery/:photoId` | Club Admin | Remove gallery photo |
| GET | `/clubs/:id/reviews` | User | Get club reviews |
| GET | `/clubs/:id/supporting` | User | Clubs this club supports |
| POST | `/clubs/:id/support/:targetId` | Club Admin | Support another club |

### 4.4 Posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/feed` | User | Get personalised feed |
| POST | `/posts` | User | Create post |
| GET | `/posts/:id` | User | Get post detail |
| DELETE | `/posts/:id` | Owner | Delete post |
| POST | `/posts/:id/like` | User | Like post |
| DELETE | `/posts/:id/like` | User | Unlike post |
| GET | `/posts/:id/comments` | User | List comments |
| POST | `/posts/:id/comments` | User | Add comment |
| DELETE | `/comments/:id` | Owner | Delete comment |

**GET /feed**
```typescript
// Query params
{
  cursor?: string;            // last post ID
  limit?: number;             // default 20, max 50
}

// Response 200
{
  success: true,
  data: Post[],               // hydrated with author, media, counts
  meta: {
    cursor: string | null,
    hasMore: boolean
  }
}
```

**POST /posts**
```typescript
// Request
{
  postType: 'photo' | 'video' | 'text' | 'link' | 'event_invite' | 'route',
  caption?: string,
  mediaUrls?: string[],       // pre-uploaded to R2
  linkUrl?: string,
  eventId?: string,           // for event_invite type
  routeData?: GeoJSON,        // for route type
  stravaActivityId?: string,
  categoryId?: string,
  taggedUserIds?: string[],
  locationName?: string,
  latitude?: number,
  longitude?: number
}

// Response 201
{
  success: true,
  data: Post
}
```

### 4.5 Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events` | User | List/discover events |
| POST | `/events` | User | Create event |
| GET | `/events/:id` | User | Get event detail |
| PATCH | `/events/:id` | Organiser | Update event |
| DELETE | `/events/:id` | Organiser | Cancel event |
| POST | `/events/:id/rsvp` | User | RSVP to event |
| DELETE | `/events/:id/rsvp` | User | Cancel RSVP |
| GET | `/events/:id/participants` | User | List participants |
| POST | `/events/:id/reviews` | Participant | Submit review |
| GET | `/events/:id/reviews` | User | List reviews |
| GET | `/events/map` | User | Events within radius (geo) |

**GET /events**
```typescript
// Query params
{
  cursor?: string,
  limit?: number,             // default 20
  category?: string,          // category slug
  status?: 'upcoming' | 'live',
  priceType?: 'free' | 'paid',
  latitude?: number,
  longitude?: number,
  radiusKm?: number,          // default 25
  startDate?: string,         // ISO 8601
  endDate?: string,
  search?: string             // text search
}

// Response 200
{
  success: true,
  data: Event[],
  meta: { cursor, hasMore }
}
```

**POST /events**
```typescript
// Request
{
  title: string,              // 5-200 chars
  description?: string,
  categoryId: string,
  coverImageUrl?: string,
  startTime: string,          // ISO 8601
  endTime: string,
  locationName: string,
  locationAddress?: string,
  latitude: number,
  longitude: number,
  maxCapacity?: number,
  priceInr: number            // 0 = free, else amount in paise
}

// Response 201
{
  success: true,
  data: Event                 // includes generated chatroom
}
```

### 4.6 Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/conversations` | User | List conversations |
| POST | `/conversations` | User | Create DM conversation |
| GET | `/conversations/:id/messages` | Participant | List messages |
| POST | `/conversations/:id/messages` | Participant | Send message (REST fallback) |
| PATCH | `/conversations/:id/read` | Participant | Mark as read |
| PATCH | `/conversations/:id/mute` | Participant | Mute/unmute |

**Socket.io Events (realtime):**
```typescript
// Client → Server
'message:send'    { conversationId, content, messageType, mediaUrl? }
'typing:start'    { conversationId }
'typing:stop'     { conversationId }
'conversation:join'  { conversationId }

// Server → Client
'message:new'     { message: Message }
'typing:update'   { conversationId, userId, isTyping }
'presence:update'  { userId, isOnline, lastSeen }
'notification:new' { notification: Notification }
```

### 4.7 Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | User | Universal search |
| GET | `/search/people` | User | Search people |
| GET | `/search/clubs` | User | Search clubs |
| GET | `/search/events` | User | Search events |
| GET | `/search/suggestions` | User | Trending/recommended |

**GET /search**
```typescript
// Query params
{
  q: string,                  // search query
  type?: 'people' | 'clubs' | 'events' | 'all',
  latitude?: number,
  longitude?: number,
  radiusKm?: number,
  limit?: number
}

// Response 200
{
  success: true,
  data: {
    people: UserSummary[],
    clubs: UserSummary[],
    events: EventSummary[]
  }
}
```

### 4.8 Leaderboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/leaderboard/personal` | User | Personal leaderboard |
| GET | `/leaderboard/clubs` | User | Club leaderboard |
| GET | `/leaderboard/me` | User | Own rank |

**GET /leaderboard/personal**
```typescript
// Query params
{
  metric: 'steps' | 'events_attended' | 'events_organised',
  period: 'week' | 'month' | 'all_time',
  limit?: number              // default 50
}

// Response 200
{
  success: true,
  data: {
    entries: Array<{
      rank: number,
      user: UserSummary,
      score: number
    }>,
    myRank?: {
      rank: number,
      score: number
    }
  }
}
```

### 4.9 Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/create-order` | User | Create Razorpay order |
| POST | `/payments/verify` | User | Verify payment signature |
| GET | `/payments/history` | User | Payment history |
| POST | `/webhooks/razorpay` | Public* | Razorpay webhook (*signature verified) |

**POST /payments/create-order**
```typescript
// Request
{
  eventId: string
}

// Response 200
{
  success: true,
  data: {
    orderId: string,          // Razorpay order ID
    amount: number,           // in paise
    currency: 'INR',
    key: string               // Razorpay key_id (public)
  }
}
```

### 4.10 Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | User | List notifications |
| PATCH | `/notifications/:id/read` | User | Mark as read |
| PATCH | `/notifications/read-all` | User | Mark all as read |
| GET | `/notifications/unread-count` | User | Unread count |

### 4.11 Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upload/presigned-url` | User | Get pre-signed upload URL |

**POST /upload/presigned-url**
```typescript
// Request
{
  fileName: string,
  fileType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/quicktime',
  fileSize: number            // bytes, max 50MB
}

// Response 200
{
  success: true,
  data: {
    uploadUrl: string,        // Pre-signed R2 URL
    publicUrl: string,        // CDN URL after upload
    expiresIn: 3600           // seconds
  }
}
```

### 4.12 Strava

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/strava/auth-url` | User | Get Strava OAuth URL |
| POST | `/strava/callback` | User | Exchange code for tokens |
| POST | `/strava/sync` | User | Manual activity sync |
| DELETE | `/strava/disconnect` | User | Disconnect Strava |
| POST | `/webhooks/strava` | Public* | Strava webhook (*verified) |

### 4.13 Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | User | List all categories |
| GET | `/categories/:slug` | User | Category detail |
| GET | `/categories/:slug/events` | User | Events in category |
| GET | `/categories/:slug/clubs` | User | Clubs in category |
| GET | `/categories/:slug/posts` | User | Posts in category |

---

## 5. Component Tree

```
App (Root)
├── Providers
│   ├── QueryClientProvider (TanStack)
│   ├── AuthProvider (Zustand)
│   ├── SocketProvider
│   ├── NotificationProvider
│   └── ThemeProvider (NativeWind)
│
├── (auth) Stack
│   ├── SplashScreen
│   │   └── Logo, Tagline
│   ├── OnboardingScreen
│   │   └── ValuePropCarousel (3 slides)
│   ├── AccountTypeScreen
│   │   ├── PersonalCard
│   │   └── ClubCard
│   ├── SignupScreen
│   │   ├── Input (email/phone)
│   │   ├── Input (password)
│   │   ├── GoogleSignInButton
│   │   ├── AppleSignInButton
│   │   └── OTPInput
│   ├── LoginScreen
│   │   ├── Input (email/phone)
│   │   ├── Input (password)
│   │   ├── GoogleSignInButton
│   │   ├── AppleSignInButton
│   │   └── ForgotPasswordLink
│   ├── ForgotPasswordScreen
│   │   └── Input (email), Button
│   └── ProfileSetupScreen
│       ├── AvatarPicker
│       ├── Input (displayName)
│       ├── TextArea (bio)
│       ├── CategorySelector (multi-select chips)
│       └── LocationPicker (city/neighbourhood)
│
├── (tabs) TabNavigator
│   ├── HomeTab
│   │   ├── ActiveEventsBar
│   │   │   └── ActiveEventItem[] (horizontal scroll)
│   │   └── FeedList (FlatList, infinite scroll)
│   │       └── PostCard
│   │           ├── PostHeader (Avatar, Name, Timestamp, MoreMenu)
│   │           ├── PostContent (varies by type)
│   │           │   ├── PhotoPost → ImageCarousel
│   │           │   ├── VideoPost → VideoPlayer
│   │           │   ├── TextPost → RichText
│   │           │   ├── LinkPreviewPost → LinkCard
│   │           │   ├── EventInvitePost → EventCard (mini)
│   │           │   └── RoutePost → MapView (static)
│   │           └── PostActions (Like, Comment, Share)
│   │
│   ├── EventsTab
│   │   ├── EventFilterBar
│   │   │   ├── CategoryChips (horizontal scroll)
│   │   │   ├── ViewToggle (List / Map)
│   │   │   └── FilterButton → FilterBottomSheet
│   │   │       ├── DateRangePicker
│   │   │       ├── DistanceSlider
│   │   │       └── PriceToggle (Free / Paid / All)
│   │   ├── EventList (FlatList)
│   │   │   └── EventCard
│   │   │       ├── CoverImage
│   │   │       ├── Title, Organiser, CategoryBadge
│   │   │       ├── DateTime, Location
│   │   │       ├── ParticipantStack
│   │   │       └── PriceBadge
│   │   └── EventMap (Google Maps)
│   │       └── EventPin[] → EventCard (callout)
│   │
│   ├── SearchTab
│   │   ├── SearchBar
│   │   ├── SearchTabs (People | Clubs | Events | Locations | Categories)
│   │   ├── TrendingSection (when empty)
│   │   │   ├── TrendingClubs
│   │   │   └── TrendingEvents
│   │   ├── SearchResults
│   │   │   └── SearchResultCard (varies by tab)
│   │   └── MapSearchView (toggle)
│   │
│   ├── MessagesTab
│   │   └── ConversationList (FlatList)
│   │       └── ConversationItem
│   │           ├── Avatar
│   │           ├── Name, LastMessage preview
│   │           ├── Timestamp
│   │           └── UnreadBadge
│   │
│   └── ProfileTab
│       ├── PersonalProfile
│       │   ├── ProfileHeader (Avatar, Name, Bio, Link)
│       │   ├── StatsBar (Steps, Events Attended, Events Organised)
│       │   ├── ActionButtons (Edit, Settings, Share)
│       │   ├── TabSelector (Posts | Events)
│       │   └── PostsGrid / EventsList
│       └── ClubProfile
│           ├── ClubProfileHeader (Cover, Avatar, Name, Description)
│           ├── StatsBar (Events, Footfall, Rating, Members)
│           ├── ActionButtons (Follow, Message, Share, Join)
│           ├── SupportingClubs (horizontal scroll)
│           ├── UpcomingEvents (horizontal scroll)
│           ├── TabSelector (Posts | Events | Gallery)
│           └── PostsGrid / EventsList / GalleryGrid
│
├── Event Detail Stack
│   ├── EventDetailScreen
│   │   ├── CoverImage
│   │   ├── Title, OrganiserRow, CategoryBadge
│   │   ├── DateTimeRow
│   │   ├── LocationRow + MiniMap
│   │   ├── Description
│   │   ├── ParticipantStack + "X going"
│   │   ├── RSVPButton (free) / PayButton (paid)
│   │   ├── ChatroomLink
│   │   └── ShareButton
│   ├── EventChatroomScreen
│   │   ├── MessageList (FlatList, inverted)
│   │   │   └── ChatBubble
│   │   └── ChatInput
│   ├── ParticipantsScreen
│   │   └── UserList
│   └── ReviewScreen
│       ├── StarRating
│       ├── TextArea
│       └── SubmitButton
│
├── Chat Stack
│   └── ChatScreen
│       ├── MessageList
│       │   └── ChatBubble (text, image, gif, system)
│       ├── TypingIndicator
│       └── ChatInput (text + media picker + GIF picker)
│
├── Post Stack
│   ├── CreatePostScreen
│   │   ├── PostTypeSelector
│   │   ├── MediaPicker / CameraCapture
│   │   ├── CaptionInput (with @mentions, #hashtags)
│   │   ├── CategoryPicker
│   │   ├── TagPeople
│   │   ├── LocationPicker
│   │   └── PostButton
│   └── PostDetailScreen
│       ├── PostCard (full)
│       └── CommentsList
│           ├── CommentItem (threaded)
│           └── CommentInput
│
├── Category Stack
│   ├── CategoryGridScreen
│   │   └── CategoryCard[] (grid)
│   └── CategoryDetailScreen
│       ├── CategoryHeader
│       ├── TabSelector (Events | Clubs | Posts)
│       └── FilteredList
│
├── LeaderboardScreen
│   ├── ToggleTabs (Personal | Club)
│   ├── MetricSelector
│   ├── PeriodFilter (Week | Month | All Time)
│   ├── Top3Podium
│   └── LeaderboardList
│       └── LeaderboardCard (Rank, Avatar, Name, Score)
│
├── NotificationsScreen
│   └── NotificationList
│       └── NotificationItem (icon, text, timestamp, read state)
│
└── SettingsScreen
    ├── EditProfile
    ├── ConnectStrava
    ├── NotificationPreferences
    ├── PrivacySettings
    ├── BlockedUsers
    ├── DeleteAccount
    └── Logout
```

---

## 6. Environment Variables

### 6.1 Backend (.env)

```bash
# ── Server ──
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
API_VERSION=v1
CORS_ORIGINS=https://fitsocial.app

# ── Database ──
DATABASE_URL=postgresql://user:pass@host:5432/fitsocial?sslmode=require
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ── Redis ──
REDIS_URL=rediss://default:token@host:6379
REDIS_TLS=true

# ── JWT ──
JWT_ACCESS_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# ── Cloudflare R2 ──
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET_NAME=fitsocial-media
R2_PUBLIC_URL=https://media.fitsocial.app

# ── Razorpay ──
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=<razorpay-secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret>
RAZORPAY_PLATFORM_FEE_PERCENT=12

# ── Strava ──
STRAVA_CLIENT_ID=<strava-client-id>
STRAVA_CLIENT_SECRET=<strava-client-secret>
STRAVA_REDIRECT_URI=https://api.fitsocial.app/api/v1/strava/callback
STRAVA_WEBHOOK_VERIFY_TOKEN=<random-token>

# ── Typesense ──
TYPESENSE_HOST=<typesense-host>
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=<typesense-admin-key>

# ── Push Notifications ──
EXPO_ACCESS_TOKEN=<expo-push-token>

# ── Google Maps ──
GOOGLE_MAPS_API_KEY=<server-side-key>

# ── Monitoring ──
SENTRY_DSN=https://xxx@sentry.io/xxx
POSTHOG_API_KEY=<posthog-key>
POSTHOG_HOST=https://app.posthog.com

# ── BullMQ ──
BULL_REDIS_URL=${REDIS_URL}
```

### 6.2 Mobile (app.json / .env via expo-constants)

```bash
EXPO_PUBLIC_API_URL=https://api.fitsocial.app/api/v1
EXPO_PUBLIC_SOCKET_URL=wss://api.fitsocial.app
EXPO_PUBLIC_GOOGLE_MAPS_KEY=<client-side-key>
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
EXPO_PUBLIC_STRAVA_CLIENT_ID=<strava-client-id>
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
EXPO_PUBLIC_POSTHOG_KEY=<posthog-key>
```

---

## 7. Third-Party Integrations

| Service | Purpose | Setup Required |
|---------|---------|----------------|
| **Google Cloud** | Maps SDK (iOS + Android), OAuth | API key with Maps SDK enabled, OAuth consent screen |
| **Apple Developer** | Apple Sign-In, APNs | App ID with Sign-In capability, APNs key |
| **Razorpay** | Payments (UPI, cards, netbanking) | Business account, KYC, webhook URL, route/split config |
| **Strava** | OAuth, activity sync, webhooks | API application, webhook subscription |
| **Cloudflare** | R2 storage, CDN, DNS | Account, R2 bucket, custom domain, CORS policy |
| **Firebase** | FCM push notifications | Project, service account key, Android SHA-1 |
| **Expo** | Push notifications, EAS Build, OTA | Expo account, EAS project, push credentials |
| **Typesense** | Full-text search | Cloud cluster or self-hosted, API keys, collection schemas |
| **Upstash** | Serverless Redis | Account, database, REST/Redis URL |
| **Railway** | Backend hosting, managed Postgres | Project, service, environment variables |
| **Sentry** | Error tracking | Project (React Native + Node.js), DSN |
| **PostHog** | Product analytics | Project, API key |
| **Uptime Robot** | Uptime monitoring | Monitors for API + WebSocket endpoints |
| **GitHub** | Source control, Actions CI/CD | Repository, secrets for deploy keys |

---

## 8. Security Audit Checklist

- [ ] **Authentication**: bcrypt 12 rounds, JWT 15-min access / 30-day refresh
- [ ] **Rate limiting**: 5 auth attempts/min, 100 API calls/min per user (Redis-backed)
- [ ] **Input validation**: Zod schemas on every endpoint (request + response)
- [ ] **SQL injection**: Drizzle ORM parameterised queries only, no raw SQL interpolation
- [ ] **XSS prevention**: Sanitise all user-generated content before storage and rendering
- [ ] **CORS**: Whitelist only `fitsocial.app` domains
- [ ] **HTTPS**: Enforced everywhere, HSTS headers with `max-age=31536000`
- [ ] **File upload**: Whitelist `jpg, png, webp, mp4, mov` only, 50MB max, content-type validation
- [ ] **Row Level Security**: All DB queries scoped to authenticated user
- [ ] **Secrets management**: All secrets in env vars, `.env` in `.gitignore`, no hardcoded keys
- [ ] **Dependency audit**: `npm audit` in CI, Dependabot enabled
- [ ] **OWASP Top 10**: Injection, broken auth, sensitive data exposure, XXE, broken access control, misconfig, XSS, insecure deserialisation, known vulnerabilities, insufficient logging
- [ ] **PII/GDPR/PDPB**: Account deletion cascades all user data, export endpoint
- [ ] **Webhook verification**: Razorpay signature verification, Strava verify token
- [ ] **Token storage**: Refresh tokens hashed in DB, access tokens in secure memory only
- [ ] **Mobile security**: No secrets in app bundle, certificate pinning for API calls
- [ ] **Logging**: No PII in logs, structured logging with request IDs

---

## 9. Performance Optimisation Checklist

- [ ] **Feed**: < 2s load on 4G, Redis cache (15-min TTL), cursor-based pagination
- [ ] **Images**: WebP format, responsive sizes (thumbnail/medium/full), lazy loading, progressive JPEG fallback
- [ ] **Video**: HLS streaming, auto-generated thumbnails, max 50MB upload
- [ ] **Pagination**: Cursor-based everywhere (no offset), default limit 20, max 50
- [ ] **Database indexes**: All FKs, geo columns (GIST), timestamp sort columns, composite indexes for feed queries
- [ ] **Redis caching**: Sessions, feed cache, leaderboard sorted sets, rate limit counters
- [ ] **CDN**: All media via Cloudflare CDN, cache headers (`max-age=31536000, immutable`)
- [ ] **App bundle**: < 10MB initial, code splitting, tree shaking, Hermes engine
- [ ] **API response**: Gzip compression, minimal payload (select only needed fields)
- [ ] **Socket.io**: Binary transport, message batching, reconnection with exponential backoff
- [ ] **Search**: Typesense < 50ms response, geo-search with pre-computed indexes
- [ ] **Background jobs**: Video processing, notification dispatch, search indexing — all async via BullMQ
- [ ] **Database**: Connection pooling (min 2, max 10), prepared statements, query analysis with EXPLAIN
- [ ] **Mobile**: FlatList with `getItemLayout`, `windowSize` tuning, memoised components, image caching (expo-image)

---

## 10. Deployment Runbook

### 10.1 Backend → Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and link project
railway login
railway link

# 3. Provision services
railway add --plugin postgresql   # PostgreSQL 16
railway add --plugin redis        # Redis

# 4. Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
# ... (all env vars from Section 6.1)

# 5. Deploy
railway up

# 6. Run migrations
railway run npx drizzle-kit push

# 7. Seed categories
railway run npx tsx scripts/seed.ts

# 8. Verify
curl https://<your-app>.railway.app/api/v1/health
```

### 10.2 CI/CD — GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_DB: fitsocial_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
        working-directory: backend
      - run: npm run lint
        working-directory: backend
      - run: npm run test
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/fitsocial_test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/cli-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          command: up --service backend
```

### 10.3 Mobile → Expo EAS Build

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configure (first time)
eas build:configure

# 4. Build for stores
eas build --platform ios --profile production
eas build --platform android --profile production

# 5. Submit to stores
eas submit --platform ios
eas submit --platform android

# 6. OTA update (JS-only changes)
eas update --branch production --message "Bug fix v1.0.1"
```

### 10.4 eas.json

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "team@fitsocial.app", "ascAppId": "XXXXXXXXXX" },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

---

## 11. Testing Strategy

### 11.1 Backend Testing

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Vitest | Services, utils, validators — 80%+ |
| Integration | Vitest + Supertest | API routes with test DB — all endpoints |
| E2E | Vitest | Critical flows (auth, RSVP, payment) |

```bash
# Run all backend tests
npm run test              # Vitest
npm run test:coverage     # With coverage report
npm run test:integration  # Integration tests only
```

**Test database**: Separate PostgreSQL instance, migrations run before suite, truncated between tests.

**Key test scenarios:**
- Auth: register, login, token refresh, expired token rejection, rate limiting
- Posts: create all types, like/unlike, comment, feed pagination, feed algorithm ordering
- Events: create, RSVP (free + paid), capacity limits, review submission, geo-search
- Messages: create conversation, send/receive, Socket.io events
- Payments: order creation, webhook verification, refund flow
- Search: index sync, query accuracy, geo-radius filtering

### 11.2 Mobile Testing

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Jest + React Native Testing Library | Components, hooks — 70%+ |
| Integration | Jest + MSW (Mock Service Worker) | Screen flows with mocked API |
| E2E | Detox | Critical user journeys on real devices |

**Detox E2E scenarios:**
1. Onboarding → Sign up → Profile setup → Home feed
2. Create event → View in discovery → RSVP → Event chatroom
3. Create post (photo) → View in feed → Like → Comment
4. Search for club → Follow → View profile
5. Send DM → Receive reply → Read receipt
6. Strava connect → Activity sync → Leaderboard update

### 11.3 CI Test Pipeline

```
Push to feature branch
  → Lint (ESLint + Prettier)
  → Type check (tsc --noEmit)
  → Unit tests
  → Integration tests
  → Build check
  → PR ready for review

Merge to main
  → All above + deploy to staging
  → Detox E2E on staging
  → Deploy to production
```

---

## 12. Git Strategy & PR Template

### 12.1 Branching Strategy

```
main (production)
  ├── develop (staging)
  │   ├── feature/auth-google-oauth
  │   ├── feature/event-creation
  │   ├── feature/dm-messaging
  │   ├── fix/feed-pagination-cursor
  │   ├── chore/upgrade-expo-sdk-53
  │   └── refactor/event-service-split
  │
  └── hotfix/payment-webhook-signature  (branches from main, merges to main + develop)
```

**Rules:**
- `main` = production, always deployable
- `develop` = staging, integration branch
- Feature branches from `develop`, merge back via PR
- Hotfixes branch from `main`, merge to both `main` and `develop`
- Branch naming: `type/short-description` (feature/, fix/, chore/, refactor/, docs/)
- Squash merge to keep history clean

### 12.2 Commit Convention

```
feat(events): add event creation with Razorpay payment flow
fix(feed): correct cursor pagination returning duplicate posts
chore(deps): upgrade drizzle-orm to 0.35.0
docs(api): add Strava webhook endpoint documentation
refactor(auth): extract JWT utils into separate module
test(events): add integration tests for RSVP flow
```

### 12.3 PR Template

```markdown
## Summary
<!-- Brief description of what this PR does -->

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Chore
- [ ] Documentation

## Changes
<!-- List the key changes made -->
-
-
-

## Screenshots / Videos
<!-- For UI changes, attach before/after screenshots -->

## Testing
<!-- Describe what was tested -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Tested on iOS
- [ ] Tested on Android

## Checklist
- [ ] TypeScript strict mode — no `any` types
- [ ] Zod validation on new/modified endpoints
- [ ] No hardcoded secrets or API keys
- [ ] Database migration included (if schema change)
- [ ] Typesense index updated (if searchable entity changed)
- [ ] Error handling covers edge cases
- [ ] Accessibility labels on new UI elements
- [ ] Performance: no N+1 queries, pagination used

## Related Issues
<!-- Link to related issues: Closes #123 -->
```

---

## 13. Feature Implementation Plan

### Phase 0: Project Setup (Week 1)

| Task | Details |
|------|---------|
| Monorepo setup | Root `package.json`, `mobile/` + `backend/` workspaces |
| Backend scaffold | Fastify + TypeScript, Drizzle ORM, env validation |
| Mobile scaffold | Expo SDK 52+, Expo Router, NativeWind, Zustand, TanStack Query |
| Database | PostgreSQL + PostGIS on Railway, initial migration |
| Redis | Upstash Redis provisioned |
| CI/CD | GitHub Actions for lint + test + deploy |
| Dev tooling | ESLint, Prettier, Husky, lint-staged, Conventional Commits |

### Phase 1: P0 — MVP Core (Weeks 2–8)

**Sprint 1–2: Auth + Profiles**
- Email/phone registration + login
- Google OAuth + Apple Sign-In
- JWT access/refresh token flow
- Profile setup wizard
- Personal + Club profile screens
- Follow/unfollow

**Sprint 3–4: Posts + Feed**
- Post creation (photo, video, text, link)
- Media upload via pre-signed URLs → R2
- Home feed with algorithm (recency + engagement + follows)
- Like, comment, share
- Infinite scroll with cursor pagination
- Feed caching (Redis, 15-min TTL)

**Sprint 5–6: Events**
- Event creation form
- Events discovery (list view, category filter)
- Event detail screen with mini map
- Free event RSVP
- Event chatroom (Socket.io room, expires 24h post-event)
- Push notification on RSVP

**Sprint 7–8: Messaging + Search + Notifications**
- 1:1 DM conversations (Socket.io)
- Conversation list with unread badges
- Typesense indexing (users, clubs, events)
- Search screen with tabs
- Push notifications (likes, comments, follows, event reminders)
- Notification screen

### Phase 2: P1 — Post-Launch (Weeks 9–12)

| Feature | Sprint |
|---------|--------|
| Club community group chats (discussions + announcements) | 9 |
| Map view in events + search (Google Maps) | 9 |
| Leaderboard (personal + club, Redis sorted sets) | 10 |
| Post-event ratings and reviews | 10 |
| Paid events (Razorpay integration, webhooks) | 11 |
| Strava OAuth + activity sync + webhook | 12 |

### Phase 3: P2 — Growth (Weeks 13–20)

| Feature | Sprint |
|---------|--------|
| Categories screen + category feeds | 13 |
| Event boosting (paid promotion) | 14 |
| Stories/active events bar | 15 |
| Route posting (Strava import + map draw) | 16 |
| Club photo gallery | 17 |
| Advanced recommendation engine | 18 |
| In-app analytics for club admins | 19–20 |

### Milestone Summary

| Milestone | Target | Key Deliverable |
|-----------|--------|-----------------|
| M0 | Week 1 | Project scaffolded, CI/CD running, DB provisioned |
| M1 | Week 4 | Auth + profiles + basic feed working end-to-end |
| M2 | Week 6 | Events creation + discovery + RSVP |
| M3 | Week 8 | **MVP launch** — DMs, search, notifications, all P0 features |
| M4 | Week 12 | P1 complete — payments, Strava, leaderboard, map views |
| M5 | Week 20 | P2 complete — categories, recommendations, analytics |

---

*This specification is a living document. Update it as requirements evolve and implementation decisions are made.*
