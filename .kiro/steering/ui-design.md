# UI & Design System Steering — Mumbai Fitness Mafia (SocioFit)
## Design System: "PURPLE PULSE" (Deep Purple + Electric Teal, Dark Mode)
### Version 3.0 · Last Updated: June 1, 2026

---

## 0. How to Use This Document

This is the authoritative UI steering document for Mumbai Fitness Mafia (SocioFit). Every screen, component, and interaction must follow this design system. When in doubt, return here first.

**Primary working mode: Dark Mode only.** There is no light mode. Never hardcode colours — always import design tokens from `mobile/constants/theme.ts` (or use the matching NativeWind classes in `mobile/tailwind.config.js`).

---

## 1. Design Philosophy

A dark, premium, athletic social app. Deep purple is the **brand identity**, electric teal is the **action/energy** colour, and prestige gold is reserved for **elite achievement** moments. Surfaces feel layered and tactile on a near-black violet canvas; gradients add depth and motion to hero areas and event cards.

**Colour language (learn it, never break it):**
- **Purple = brand / identity / community** → banners, brand text accents, sent chat bubbles, avatars, map pins
- **Teal = action / energy** → every primary CTA (JOIN, CREATE, BOOK, SIGN UP), active states, success
- **Gold = elite / achievement** → ELITE badges, leaderboard #1, milestone unlocks (sparse use only)

---

## 2. Colour System — Deep Purple & Electric Teal

All tokens live in `mobile/constants/theme.ts` (`colors`) and `mobile/tailwind.config.js`.

### 2.1 Backgrounds & Surfaces

| Token | Hex | Purpose |
|---|---|---|
| `bgPrimary` | `#0E0E14` | Base app background — every screen root (NOT pure black) |
| `surface1` | `#17172A` | Cards, bottom sheets, modals, drawers |
| `surface2` | `#1F1F38` | Input fields, nested cards, dropdown backgrounds |
| `surface3` | `#2A2A48` | Borders, dividers, separators, hover/pressed states |

### 2.2 Brand Purple Family

| Token | Hex | Purpose |
|---|---|---|
| `purpleDeep` | `#3B1F8C` | Tribe banners, section header backgrounds, deep gradient start |
| `purpleBrand` | `#5B2ECC` | Primary brand — active tab highlight, sent chat bubbles, secondary CTAs |
| `purpleHero` | `#7B4DFF` | Hero gradients, event accents, trainer CTAs, map pins |
| `purpleSoft` | `#A882FF` | Secondary text highlights, info chips, link text, subtle labels |

### 2.3 Electric Teal (Primary Action)

| Token | Hex | Purpose |
|---|---|---|
| `tealPrimary` | `#00E5C3` | PRIMARY CTA — JOIN, CREATE EVENT, BOOK SESSION, SIGN UP |
| `tealMid` | `#00BFA5` | Map pins (events), active states, progress fills, online indicator |
| `tealDark` | `#007A6A` | Teal-tinted card backgrounds, pressed state of teal buttons |

### 2.4 Prestige Gold (sparse — elite & achievement ONLY)

| Token | Hex | Purpose |
|---|---|---|
| `gold` | `#C9A84C` | ELITE tribe badges, Leaderboard #1 rank, achievement medals |
| `goldLight` | `#E8C96A` | Gold text on dark surfaces, shimmer text on milestone screens |
| `goldGlow` | `#F5E0A0` | Subtle gold background tint on achievement-unlocked screens only |

### 2.5 Typography Colours

| Token | Hex | Purpose |
|---|---|---|
| `textPrimary` | `#FFFFFF` | Headlines, usernames, event titles, screen titles |
| `textSecondary` | `#C4BEFF` | Body copy, descriptions, captions, card subtitles |
| `textMuted` | `#7A74A8` | Timestamps, metadata, placeholders, inactive labels, word counts |
| `textDisabled` | `#3A3A5A` | Disabled state labels only |
| `onTeal` | `#001A14` | Near-black text drawn on teal CTAs |
| `onGold` | `#1A0E00` | Near-black text drawn on gold badges |

### 2.6 Semantic / Functional

| Token | Hex | Purpose |
|---|---|---|
| `success` | `#00E5C3` | Joined confirmation, completed goals, active event badge |
| `error` | `#FF4D6D` | Validation errors, leave/delete actions, failed states |
| `warning` | `#F5A623` | Streak at risk, expiring event, incomplete form nudge |
| `info` | `#A882FF` | Tips, informational tooltips, soft nudges |

### 2.7 Gradient Definitions (`gradients` in theme.ts)

```
gradient-hero:        135deg  #3B1F8C → #7B4DFF → #00E5C3
gradient-brand:       135deg  #5B2ECC → #7B4DFF
gradient-teal:        135deg  #007A6A → #00E5C3
gradient-fab:         135deg  #5B2ECC → #00E5C3
gradient-story-ring:  135deg  #7B4DFF → #00E5C3

# Event card category gradients (apply by activity type):
gradient-event-running:     135deg  #1A0A3A → #5B2ECC
gradient-event-cycling:     135deg  #0A1A3A → #3B6FCC
gradient-event-yoga:        135deg  #0A2A2A → #00BFA5
gradient-event-competitive: 135deg  #1A0020 → #7B2FBE
gradient-event-social:      135deg  #1A1A0A → #7A5C2E
gradient-event-outdoor:     135deg  #0A1A0A → #2D6A4F
```

Use the `eventGradient(categorySlug)` helper from `theme.ts` to resolve an event's gradient from its category.

### 2.8 Colour Usage Rules (STRICT)

1. **Teal = action.** Every primary CTA is `tealPrimary` with `onTeal` (#001A14) label text.
2. **Purple = brand/community.** Banners, sent chat bubbles, avatars, map pins, secondary CTAs.
3. **Gold is sacred.** Only for elite tiers, #1 rank, and achievement unlocks. Never decorative.
4. Text on teal is ALWAYS `onTeal`; text on gold is ALWAYS `onGold`.
5. No pure black (`#000000`) backgrounds — the base is `#0E0E14`.
6. Never hardcode hex — import tokens. Shadows may use black rgba per Section 4.

---

## 3. Shadow & Elevation System

Light source: straight-down. Use the presets in `theme.ts` (`shadows`).

```
shadow-sm:     0 2px 8px  rgba(0,0,0,0.30)
shadow-md:     0 4px 20px rgba(0,0,0,0.40)   // default for cards
shadow-lg:     0 8px 40px rgba(0,0,0,0.50)   // large modals / sheets
shadow-teal:   0 4px 20px rgba(0,229,195,0.20)  // active teal CTAs
shadow-purple: 0 4px 20px rgba(123,77,255,0.25) // purple CTAs / hero elements
```

---

## 4. Typography

### Font Stack
```
Primary (default for all text):  Outfit         — weights 300, 400, 500, 600, 700, 800, 900
Secondary (numeric/labels/meta): Space Grotesk  — weights 400, 500, 600, 700
```

Outfit is the default font on every text element. Use **Space Grotesk ONLY** for stat values, numeric data, timestamps, metadata labels, and chip/tag/category labels. Fonts are loaded via `@expo-google-fonts/outfit` and `@expo-google-fonts/space-grotesk` in `app/_layout.tsx`. Reference families via the `fonts` token (e.g. `fonts.h1`, `fonts.body`, `fonts.label`, `fonts.stat`, `fonts.caption`).

### Type Scale Tokens

| Token | Family | Weight | Size | Line / Tracking | Colour |
|---|---|---|---|---|---|
| `display` | Outfit | 900 | 32–40px | 1.1 / -0.02em | textPrimary (gradient-hero fill on hero/onboarding) |
| `h1` | Outfit | 700 | 24px | 1.2 / -0.01em | textPrimary |
| `h2` | Outfit | 600 | 18px | 1.3 | textPrimary |
| `h3` | Outfit | 600 | 15px | 1.4 | textSecondary |
| `body` | Outfit | 400 | 14–15px | 1.6 | textSecondary |
| `bodyStrong` | Outfit | 600 | 14px | — | textPrimary |
| `label` | Space Grotesk | 700 | 11–12px | +0.10–0.14em, UPPERCASE | textMuted |
| `stat` | Space Grotesk | 600 | 14–16px | -0.01em | tealPrimary (key metrics) or textPrimary |
| `caption` | Space Grotesk | 400 | 12px | 1.5 | textMuted |
| `button` | Outfit | 700 | 15px | +0.01em | (per button) |

---

## 5. Spacing System

Base unit: 4px. Every margin, padding, gap must be a multiple of 4.

```
4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
```

Screen edge padding: 16px (mobile) / 24px (tablet). Card internal padding: 16px (mobile) / 20px (tablet). List gap: 12px.

---

## 6. Shape Language — Border Radius

```
xs:   6px   chips, tags, small badges
sm:   8px   small buttons, event JOIN buttons
md:   12px  buttons, inputs, small cards
lg:   16px  feed cards, event cards, modals
xl:   24px  bottom sheets, large modals (rounded top corners)
full: 9999  pills, story rings, FAB
```

---

## 7. Component Specifications

### 7.1 Navigation
- App root background → `bgPrimary`
- Bottom nav (floating pill) → `surface2`; active tab circle → `tealPrimary` with `onTeal` icon; inactive icons → `textMuted`
- FAB / centre action → `gradient-fab`, circular, white "+", teal-tinted elevation `rgba(0,229,195,0.25)`
- Top bar/header → `bgPrimary` (gradient fade), no border unless scrolled
- Brand text → `textPrimary` white with a `tealPrimary` accent dot

### 7.2 Buttons
- **Primary** (JOIN, BOOK, CREATE, SIGN UP, SUBMIT): `tealPrimary` bg, `onTeal` text, radius `md` (12px), `button` font, 48–52px tall, `shadow-teal`
- **Secondary** (FOLLOW, SAVE, SHARE): `surface2` bg, `purpleSoft` text, 1px `purpleBrand` border, radius `md`
- **Destructive** (LEAVE, DELETE, CANCEL): `error` bg, white text
- **Trainer/Coach CTA** (BOOK SESSION, VIEW PROFILE): `purpleHero` bg, white text
- **Disabled**: `surface3` bg, `textDisabled` text, no shadow
- **Ghost/text**: transparent, `purpleSoft` text, underline on press

### 7.3 Cards & Feed
- Card bg → `surface1`; border 1px `surface3`; radius `lg` (16px); `shadow-md`
- Post avatar → `gradient-brand` fill inside a story ring (`purpleHero` / `gradient-story-ring` 2.5px)
- Username → `textPrimary` `bodyStrong`; timestamp/meta → `textMuted` `caption`
- Caption → `textSecondary` `body`
- Action icons → `textMuted` default, `tealPrimary` active; like/heart active → `error`

### 7.4 Event Cards
- Cover → `gradient-event-[type]` by category
- ACTIVE badge → `tealPrimary` bg, `onTeal` text; ELITE badge → `gold` bg, `onGold` text
- Title → `textPrimary` `h2`; meta → `textMuted` `caption`
- JOIN button → `tealPrimary`, `onTeal` label, radius `sm`; attendee count → `purpleSoft` `caption`

### 7.5 Map
- Dark map tiles enforced
- Event pins → `purpleHero` (shadow `rgba(123,77,255,0.5)`); user pin → `tealPrimary` (shadow `rgba(0,229,195,0.5)`)
- Create Event overlay button → `tealPrimary`, `onTeal` text

### 7.6 Leaderboard
- #1 → `gold` bg / `onGold`; #2 → `purpleSoft` bg / white; #3 → `purpleHero` bg / white; rest → `surface2` / `textSecondary`
- Rank number → `stat` (Space Grotesk 700); name → `bodyStrong`; score → `tealPrimary` `stat`

### 7.7 Profile
- Background → `bgPrimary`; hero header block → `gradient-hero` with white text
- Avatar ring → `gradient-story-ring` / `tealPrimary`
- Stats → `tealPrimary` value (`stat`), `textMuted` label (`label`)
- Primary CTA → `tealPrimary`; secondary → `surface2`
- Achievements → `gold` (elite earned), `purpleHero` (standard), `surface3` (locked)

### 7.8 Chat / Event Chatroom
- Background → `bgPrimary`
- Sent bubble → `purpleBrand`, white text, radius 16/16/4/16
- Received bubble → `surface2`, `textSecondary`, radius 16/16/16/4
- Timestamp → `textMuted` `caption`; input bar → `surface1` bg, `surface3` border, `tealPrimary` send

### 7.9 Forms & Inputs
- Input bg → `surface2`; border → `surface3`; focused → `purpleHero` + `rgba(123,77,255,0.2)` glow
- Error border → `error`; success border → `success`
- Text → `textPrimary`; placeholder → `textMuted`; label → `purpleSoft` `label`
- Search bar → `surface2`, `textMuted` icon, radius `md`

### 7.10 Notifications / Toasts
- Success → `tealDark` bg, `tealPrimary` left border, white text
- Error → `#2A0A10` bg, `error` left border, white text
- Warning → `#2A1A00` bg, `warning` left border, white text
- Badge/dot → `tealPrimary` bg, `onTeal` text

---

## 8. Motion & Animation

- Tab circle slides between tabs: spring(damping 26, stiffness 130), gentle scale breathe 0.85 → 1.0
- Card press: subtle scale/translate, 100–250ms
- No instant show/hide — everything animates (min 150ms)
- Respect `prefers-reduced-motion`
- Easing: cubic-bezier(0.16, 1, 0.3, 1)

---

## 9. Navigation Architecture

```
AuthStack: Onboarding → SignUp/Login
MainStack:
  BottomTabNavigator (Floating Pill):
    Home → Search → Post(FAB) → Events → Profile
  Header icons: Notifications (top-left), Messages (top-right)
  Global routes: messages, notifications, leaderboard, event/[id], profile/[id], chat/[id], post/create (modal)
```

---

## 10. Responsive & Adaptive Rules

- Mobile-first. Font sizes use clamp()/responsive units on any web/PWA layer.
- Touch targets: minimum 44×44px
- Bottom navigation height: 56px + safe-area-inset-bottom
- Card padding: 16px mobile / 20px tablet; screen edge padding: 16px mobile / 24px tablet
- Event card horizontal scroll: snap scrolling, 12px gap, first card 16px left offset
- Modals / bottom sheets: max-height 90vh, rounded top corners `xl` (24px)
- No fixed widths on content containers; `SafeAreaView` on all screens; `KeyboardAvoidingView` on input screens
- `paddingBottom` clearance on scrollable screens so content clears the floating nav

---

## 11. Anti-Patterns — NEVER DO THESE

- ✗ Pure black (`#000000`) or pure white backgrounds
- ✗ Hardcoded hex/rgba one-offs — always use tokens
- ✗ Teal for branding/community or purple for primary CTAs (keep the colour language)
- ✗ Gold used decoratively (it is elite/achievement only)
- ✗ Light text on light, or low-contrast text on gradients
- ✗ Serif fonts; using Space Grotesk for body copy
- ✗ Introducing a light mode unless explicitly requested

---

## 12. Implementation Checklist

- [ ] Use design tokens from Section 2, never hardcode hex
- [ ] Use shadow/elevation tokens from Section 3
- [ ] Outfit for everything; Space Grotesk only for stats/labels/metadata
- [ ] Teal = action, Purple = brand/community, Gold = elite (sparse)
- [ ] Text on teal is `onTeal`; text on gold is `onGold`
- [ ] Icons from Lucide only — change colour, never the icon
- [ ] Touch targets minimum 44×44px
- [ ] `SafeAreaView` on all screens; nav clearance on scroll views

---

*SocioFit / Mumbai Fitness Mafia "PURPLE PULSE" Design System · Version 3.0 · June 2026*
*Deep violet canvas. Teal is action. Purple is identity. Gold is earned.*
