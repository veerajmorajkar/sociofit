# Mumbai Fitness Mafia (SocioFit) — Complete Mobile UI Inventory

**Purpose of this document:** Paste into another AI (e.g. to generate a Cursor / Fable-5 design-revamp prompt). It describes every screen, shared component, current visual language, and known UI problems so a redesign can remake components with cleaner layout, better hierarchy, and intentional micro-interactions — without inventing missing screens.

**App type:** React Native / Expo (iOS + Android), social fitness community for Mumbai — feed, events, messaging, profiles, search/map.

**Product name:** Mumbai Fitness Mafia (MFM)  
**Code name:** SocioFit / FitSocial

---

## 0. How to use this with a design AI (prompt starter)

Copy everything below the line into your design AI, then add:

> Redesign this entire React Native app UI. Preserve all screens and flows listed. Improve visual hierarchy, spacing, typography, and component consistency. Add tasteful micro-interactions (press states, list item entrance, pull-to-refresh, tab indicator, sheet snaps, like/heart bounce, send button enable). Keep brand identity (fitness / Mumbai / community) but make the UI cooler, cleaner, and less cluttered. Flag and fix broken/orphan/legacy UI. Output: (1) new design system tokens, (2) redesigned component specs, (3) screen-by-screen layout notes, (4) interaction list. Do not invent screens that are not listed.

---

## 1. Current design system (as implemented)

### Brand & colors (dark-mode-first “Purple Pulse”)

| Role | Dark tokens | Notes |
|------|-------------|--------|
| Background | `#0E0E14` | Primary canvas |
| Surfaces | `#17172A` / `#1F1F38` / `#2A2A48` | Cards, pills, panels |
| Purple brand | `#3B1F8C` → `#5B2ECC` → `#7B4DFF` → `#A882FF` | Hero, accents, section labels |
| Teal CTA | `#00E5C3` / `#00BFA5` / `#007A6A` | Primary buttons, active tab |
| On-teal text | `#001A14` | Text on teal buttons |
| Gold | `#C9A84C` / `#E8C96A` | Club prestige accents |
| Text | `#FFFFFF` / `#C4BEFF` / `#7A74A8` | Primary / secondary / muted |
| Error / live | `#FF4D6D` | Errors, LIVE badges |
| Light mode | Exists (`#F4F2FF` bg, dark purple text) | Many auth screens ignore it (hardcoded dark) |

### Typography
- **Primary:** Outfit (weights 300–900)
- **Loaded but unused in theme map:** Space Grotesk
- Patterns: ALL CAPS section titles (`EVENTS`, `MESSAGES`), teal uppercase CTAs (`LOG IN`, `JOIN →`), purple soft micro-labels (`EMAIL`, letter-spacing ~1.5)

### Layout patterns
- Floating pill tab bar (icons only, animated teal indicator)
- Auth: full-bleed looping video backdrop + dark glass forms
- Feed/home: absolute header + infinite list + bottom fade under tab bar
- Sheets/modals: comments, members, settings, report, country picker
- Empty states: icon + CAPS title + muted body + one teal CTA

### Logo / branding assets
- Wordmark PNG (`Mumbai_fitness_mafia_logo`) — header ~88px wide, hero ~240px
- Athlete / club account silhouette icons (teal athlete, purple+gold club)
- Auth welcome video loop

---

## 2. App navigation map

```
App launch
├── Authenticated → Tab shell
│     ├── Home (Feed)
│     ├── Messages (inbox)
│     ├── Search (map + sheet)
│     ├── Events
│     └── Profile (own)
│     └── [hidden] Post tab (legacy placeholder)
│
├── Stack overlays (from tabs / deep links)
│     ├── Create Post (modal)
│     ├── Post Detail
│     ├── Create Event
│     ├── Event Detail
│     ├── Chat /[id]
│     ├── Create Group
│     ├── Profile /[id] (other user)
│     ├── Edit Profile
│     ├── Connections (followers/following)
│     ├── Notifications
│     └── Leaderboard (stub)
│
└── Unauthenticated → Auth
      ├── Welcome
      ├── Signup type (Athlete / Club)
      ├── Login options (Apple / Google / Email)
      ├── Login (email/password)
      ├── Signup athlete / club (2-step form)
      ├── Verify email (OTP)
      ├── OAuth complete profile
      ├── Link account (OAuth ↔ password)
      ├── Forgot / Reset password
      └── Onboarding (ORPHAN — not linked from welcome)
```

---

## 3. Screens — Auth & shell

### 3.1 Root redirect — `app/index.tsx`
- Blank themed view → Redirect to tabs or auth
- Issue: brief empty flash

### 3.2 Root layout — `app/_layout.tsx`
- Fonts, auth hydrate, React Query, ThemeProvider, Stack
- Loading: centered teal spinner
- Issue: outer wrapper hardcodes light bg; Space Grotesk unused

### 3.3 Tab layout — `app/(tabs)/_layout.tsx`
- `AuthGuard` + `FloatingTabBar`
- Tabs: Home, Messages, Search, Events, Profile (icons only)
- Hidden Post tab

### 3.4 Welcome — `app/(auth)/index.tsx`
- Video backdrop + MFM hero logo
- Legal footer (Terms / Privacy)
- Pill **Create Account** (white)
- Text link **Log in**
- Issues: hardcoded light StatusBar / white text; no theme awareness

### 3.5 Signup type — `app/(auth)/signup-type.tsx`
- Title: **Who are you joining as?**
- Two cards: **ATHLETE** (“Train, connect & join events”) / **CLUB** (“Host sessions & grow your community”)
- Legal footer
- Issues: both cards look “selected”; glass borders hardcoded

### 3.6 Login options — `app/(auth)/login-options.tsx`
- Back, hero brand, optional “Joining as ATHLETE|CLUB”
- Social pills: Apple / Google / Email
- Issues: Google always shown (disabled if unconfigured)

### 3.7 Login — `app/(auth)/login.tsx`
- **Welcome back** + subtitle
- EMAIL field, Password field, **Forgot password?**
- Teal **LOG IN**
- **New here? Create account**
- Can route to verify-email if unverified
- Issues: no show/hide password; hardcoded dark palette; password has no section label

### 3.8 Signup athlete / club — wrappers → `SignupFlow`
**Step 1 – Details**
- Type badge, **Create account**, name, username (+ hint), EMAIL, DOB, password + confirm + strength hint
- **CONTINUE**, **Already have an account? Log in**

**Step 2 – Activities**
- Activity chip grid (emoji + label), min 3 selected
- **CREATE ACCOUNT** → goes to verify-email (no immediate session)

### 3.9 Verify email — `app/(auth)/verify-email.tsx`
- **Check your email** + masked address
- 6-digit code input (letter-spaced)
- **VERIFY EMAIL**, Resend with 30s cooldown
- Issue: verify + resend share one loading flag

### 3.10 OAuth complete — `app/(auth)/oauth-complete.tsx`
- 2-step dots, account type badge
- Details: read-only email, name, username, DOB, CONTINUE
- Activities: picker + **CREATE ACCOUNT**
- Issue: club still required to pick DOB (same form as athlete)

### 3.11 Link account — `app/(auth)/link-account.tsx`
- **Link your account** — prove password for existing email when OAuth matches
- **LINK ACCOUNT** / Cancel
- Issues: no password visibility; back goes to login-options

### 3.12 Forgot / Reset password
- Forgot: email + **SEND RESET LINK**
- Reset: new password fields + **UPDATE PASSWORD**
- Issues: CTA height inconsistent; no dedicated expired-token UI

### 3.13 Onboarding — `app/(auth)/onboarding.tsx` ⚠️ ORPHAN
- Logo + “Connect with fitness enthusiasts…”
- **Get Started** / **I already have an account**
- **Not linked from welcome** — dead path unless deep-linked
- Only auth screen that properly uses theme tokens

---

## 4. Screens — Main app (tabs)

### 4.1 Home / Feed — `(tabs)/index.tsx`
**Purpose:** Infinite social feed

**Chrome:** Absolute `AppHeader` — create `+` | MFM logo | bell + unread badge  
**List:** `PostCard` rows + inserted `FeedFollowSuggestions` carousels  
**End copy:** “Follow more people to see more posts”  
**States:** loading spinner · “COULD NOT LOAD FEED” + RETRY · “YOUR FEED IS QUIET” + FIND PEOPLE · pull-to-refresh · load-more  
**Issues:** create-post easy to miss; empty CTA jumps to Search map (not people-first)

### 4.2 Messages inbox — `(tabs)/messages.tsx`
**Title:** MESSAGES + conversation count  
**CTA:** teal gradient circle (Users icon) → create group  
**List:** `ConversationRow`  
**Empty:** “NO CONVERSATIONS YET” + CREATE GROUP + FIND ATHLETES  
**Issues:** no search/filter; new-group is icon-only

### 4.3 Search — `(tabs)/search.tsx` (heaviest screen)
**Purpose:** Full-bleed Mumbai map + draggable bottom sheet

**Top:** search (“Search athletes, events, clubs...”) + filter pills: All, Activity (dropdown), Athletes, Clubs, Events, Near me  
**Sheet modes:** peek / mid / preview / full  
**Idle:** EVENTS NEAR YOU chips, RECENT SEARCHES  
**Results:** people rows or event rows  
**Preview:** EVENT PREVIEW card — banner, LIVE, price, Follow, View Event  
**Fallback:** “MAP UNAVAILABLE — Requires a development or production build”  
**Issues:** dense; Expo Go maps fail; follow state in preview not seeded; mixed list types

### 4.4 Events — `(tabs)/events.tsx`
**Chrome:** Search icon | **EVENTS** | teal + Create event  
**Expandable search:** “Search events…”  
**Category chips:** ALL + Running/Cycling/Yoga/…  
**Cards (inline, not shared EventCard):** cover, ATHLETE/CLUB badge, LIVE, FREE/price, title, organiser, date, location, “N going”, JOIN → / JOINED  
**Issues:** lime accent on some empty/error vs teal elsewhere; participantCount inflated with `Math.max(...,1)`; two close controls in search

### 4.5 Own Profile — `(tabs)/profile.tsx`
**Body:** `ProfileView` (own variant)  
**Settings sheet:** Dark/Light toggle, Edit Profile, Share Profile, Sign Out  
**Issues:** settings only via gear; theme toggle not smoothly animated; no privacy/security entries

### 4.6 Hidden Post tab — `(tabs)/post.tsx` ⚠️ LEGACY
- “SHARE YOUR WORKOUT” + CREATE POST  
- Hardcoded colors; tab not in bar — dead if navigated

---

## 5. Screens — Stack / feature

### 5.1 Create Post — `post/create.tsx` (modal)
**Modes:** Photo gallery → Details · or Text compose  
**UI:** Photo|Text toggle, multi-select grid (max 10), caption, `ComposePostOptions` (location + tag people), **Share**  
**Issues:** gallery step needs Proceed before Share; no video; verbose Expo Go permission copy

### 5.2 Post Detail — `post/[id].tsx`
**Nav:** ← POST · trash (owner) or ContentActionsMenu  
**Body:** `PostCard` (detail) + comments list + sticky `CommentComposer`  
**Empty comments:** “No comments yet. Start the conversation.”  
**Issues:** no Comments section title; empty right nav spacer

### 5.3 Create Event — `event/create.tsx`
**Long form:** Banner, Title, Description, Category chips, Location search (Places), Location details, Date, Start/End time, Max capacity, “Still needed:” checklist, **CREATE EVENT**  
**Issues:** no stepper; price always free; pickers expand inline on iOS

### 5.4 Event Detail — `event/[id].tsx`
**Hero:** cover/gradient, back, EVENT title, menu, LIVE, price, title, time/location pills  
**Sections:** Organiser card + DM, category, ABOUT, EVENT DETAILS, DISCUSSION (gated)  
**Sticky footer:** attendee avatars + JOIN NOW / JOINED / HOSTING  
**Issues:** footer fade always dark; long titles collide; no Share Event

### 5.5 Chat — `chat/[id].tsx`
**Header:** back, title (opens members for groups), type badge  
**Body:** bubbles + day separators; empty “Say hello…”  
**Footer:** `ChatComposer` (or read-only pill)  
**Sheet:** `ChatMembersSheet`  
**Issues:** `ChatReadOnlyBanner` wired for read-only channels; `ChatStatusPill` removed (superseded); attach slot visual-only / not wired

### 5.6 Create Group — `messages/create-group.tsx`
**NEW GROUP** · name · selected chips · search athletes · CREATE  
**Issues:** athletes only; no selected-count in header

### 5.7 Other Profile — `profile/[id].tsx`
- `ProfileView` visitor: Follow/Following, Message, announcements, report/hide  
- Redirects to own tab if self

### 5.8 Edit Profile — `profile/edit.tsx`
**Hero:** EDIT PROFILE, SAVE, avatar “Tap to change photo”  
**Fields:** Display name, Email/Phone (add if missing, else read-only), Bio, Link, Activities  
**Issues:** cannot change existing email/phone here (by design — OTP flows elsewhere, no UI yet for change)

### 5.9 Connections — `profile/connections.tsx`
- FOLLOWERS / FOLLOWING list cards  
- Empty → FIND PEOPLE  
- Issue: no follow/unfollow from rows

### 5.10 Notifications — `notifications.tsx`
- NOTIFICATIONS · Read all  
- Rows: unread wash + dot, title, preview, time, optional post thumb  
- Issue: no filters/grouping

### 5.11 Leaderboard — `leaderboard.tsx` ⚠️ STUB
- Trophy + “coming soon”  
- No back chrome; unclear entry point

---

## 6. Shared components (redesign targets)

### 6.1 Shell / chrome (`components/ui/`)
| Component | Role |
|-----------|------|
| **FloatingTabBar** | Floating 5-icon pill + animated teal circle indicator |
| **AppHeader** | Home: + / logo / bell+badge |
| **MFMLogo** / **MFMLogoHero** | Wordmark image |
| **UserAvatar** | Photo or gradient initial; optional purple ring |
| **TealRefreshControl** | Custom pull-to-refresh |
| **TabBarBottomFade** | Gradient fade above tab bar |
| **SearchTopScrim** | Map top vignette |
| **KeyboardStickyFooter** | Composer docking (`default` / `comment` / `chat`) |

### 6.2 Auth (`components/auth/`)
| Component | Role |
|-----------|------|
| **AuthFormShell** | Video backdrop + scroll form + back |
| **AuthVideoBackdrop** / **AuthVideoLayer** | Looping video or gradient fallback |
| **AuthHeroBrand** | Large logo |
| **AuthBackButton** | Chevron back |
| **SocialAuthButtons** | Apple / Google / Email pills |
| **SignupFlow** | 2-step email signup |
| **ActivityPicker** | Multi-select activity chips |
| **AuthPasswordFields** | Password + confirm + hint |
| **AuthDateOfBirthField** | DOB picker field + sheet |
| **AuthPhoneInput** | Country + phone (used in edit profile, not signup) |
| **AccountTypeIcon** | Athlete/club silhouette |
| **AuthLegalFooter** | Terms / Privacy |
| **AuthPillButton** | White/purple/apple/ghost pills |
| **AuthGuard** | Redirect if logged out |

### 6.3 Feed (`components/feed/`)
| Component | Role |
|-----------|------|
| **PostCard** | Author row, caption, tags, media carousel, Like/Comment/Repost/Share; feed vs detail |
| **PostMediaCarousel** | Paged images + dots |
| **FeedFollowSuggestions** | Horizontal “people you may know” cards + Follow |
| **CommentsBottomSheet** | Modal comments + composer |
| **CommentListItem** | Single comment |
| **CommentComposer** | Avatar + pill input + Send |
| **EventCard** | ⚠️ Legacy (Events tab uses inline card instead) |

### 6.4 Messages (`components/messages/`)
| Component | Role |
|-----------|------|
| **ConversationRow** | Inbox card + unread + type badge |
| **ChatMessageRow** | Mine / theirs / system bubbles |
| **ChatComposer** | Input + Send or read-only status |
| **ChatDaySeparator** | Day hairline label |
| **ChatMembersSheet** | Member list modal |
| **ConversationTypeBadge** | DM / GROUP / DISCUSSION / ANNOUNCEMENTS |
| **ChatReadOnlyBanner** | ⚠️ Unused |
| **ChatStatusPill** | ✅ Removed (superseded by ChatReadOnlyBanner) |

### 6.5 Profile (`components/profile/`)
| Component | Role |
|-----------|------|
| **ProfileView** | Hero gradient, stats, Follow/Message, Posts|Events tabs |
| **UserPostsGrid** | 2-col media/text grid |
| **ProfileEventsTab** | Organised / Attended event tiles |
| **HostedEventsList** / **JoinedEventsActivity** | Older list UIs (partly superseded) |

### 6.6 Other
| Component | Role |
|-----------|------|
| **ComposePostOptions** | Add location + tag people expanders |
| **ContentActionsMenu** | Hide / Report sheet with reason chips |

---

## 7. Known UI problems to fix in the revamp

1. **Theme inconsistency** — Auth screens hardcode dark hex; onboarding uses theme; root layout hardcodes light bg.
2. **Orphan / legacy** — Onboarding unused; hidden Post tab; unused EventCard; Leaderboard stub. ChatReadOnlyBanner live; ChatStatusPill removed.
3. **Inconsistent accents** — Teal vs lime vs purple used inconsistently (esp. Events empty/error).
4. **Dense screens** — Search (map+sheet+filters) and Event detail (hero+sticky footer) need hierarchy / breathing room.
5. **Missing micro-interactions** — Theme toggle not animated; likes/reposts feel flat; tab indicator exists but many presses lack haptics/scale.
6. **Accessibility / UX gaps** — No password visibility toggles; icon-only CTAs without labels; ALL CAPS overuse; some Alerts dump raw `API_URL`.
7. **Empty-state targeting** — Feed empty → Search map (odd); no people-discovery empty path.
8. **Phone in signup** — Deferred (email-only OTP); AuthPhoneInput only on edit profile.
9. **Email/phone change UI** — Backend OTP change exists; no dedicated mobile screens yet for changing existing contact.
10. **Maps in Expo Go** — Search shows unavailable fallback — redesign should include a graceful non-map mode.

---

## 8. Interaction inventory (current → enhance)

| Interaction | Today | Revamp opportunity |
|-------------|-------|-------------------|
| Tab switch | Animated teal circle | Add haptic + icon scale |
| Like / repost | Instant count bump | Heart bounce / spring |
| Pull to refresh | Teal spinner | Branded Lottie / morph |
| Bottom sheets | Snap points (search, comments) | Smoother spring + dim |
| Join event | Button → JOINED | Success check morph |
| Send message | Enable when non-empty | Subtle send icon spring |
| Follow | Label toggle | Optimistic + undo snackbar |
| Auth CTA press | opacity 0.8 | Scale + glow |
| Feed load | Spinner | Skeleton cards |
| Map markers | Static | Cluster + select pulse |

---

## 9. Screen count summary

| Area | Count | Notes |
|------|------:|-------|
| Auth screens | ~14 | Including orphan onboarding |
| Tab roots | 5 (+1 hidden) | Home, Messages, Search, Events, Profile |
| Stack features | ~11 | Post/Event/Chat/Profile/Notifications/Leaderboard |
| Shared component folders | 6 | ui, auth, feed, messages, profile, post, moderation |
| **Approx. total user-facing surfaces** | **~30+** | Plus sheets/menus |

---

## 10. Suggested redesign principles (for the other AI)

1. One composition per first viewport — brand-forward on auth; content-forward in app.
2. Unify tokens: one CTA color, one surface elevation system, one type scale — kill lime-vs-teal drift.
3. Prefer fewer cards/borders; use spacing and type for hierarchy.
4. Every primary action gets a micro-interaction; loading uses skeletons not only spinners.
5. Delete or merge legacy surfaces (hidden post tab, orphan onboarding, unused components).
6. Light and dark must both work — stop hardcoding auth to dark-only.
7. Keep Mumbai Fitness Mafia identity: bold, athletic, nightlife-energy — not generic purple SaaS, not cream-serif brochure.
8. Preserve all functional flows listed (auth including OTP verify + OAuth link, feed, events RSVP, chat types, moderation report/hide).

---

*Generated from the live Expo Router tree under `mobile/app/` and components under `mobile/components/`.*
