# UI & Design System Steering — FitSocial
## Design System: "KINEU" (Kinetic + Neumorphism, Dark Mode)
### Version 2.0 · May 2026

---

## 0. How to Use This Document

This is the authoritative UI steering document for FitSocial. Every screen, component, and interaction must follow the KINEU design system. When in doubt, return here first.

**Primary working mode: Dark Mode only.** Never hardcode colours — always use design token variables.

---

## 1. Design Philosophy

### The KINEU Aesthetic

Every surface feels physically carved from dark material (neumorphic depth), and every headline feels like it's MOVING even when still (kinetic scale + uppercase + aggressive hierarchy). The app should feel alive, tactile, and athletic — like a training app built by a Swiss poster designer.

**Two registers coexist:**
- **KINETIC** (structural, section-level): Sharp edges, 0px radius, bold uppercase, poster-like
- **NEUMORPHIC** (component, card level): Soft rounded shapes, dual shadows, tactile depth

The contrast between these two IS the design personality.

### What This App Is NOT
- Not a generic fintech dark mode
- Not a music app (no purple neon)
- Not a gym bro app (no red/black/orange)
- Not Instagram with a tint

---

## 2. Colour System — Charcoal & Lime

### 2.1 Core Brand Colours

| Token | Hex | Name | Purpose |
|---|---|---|---|
| `--color-lime` | `#D4EA4D` | Electric Lime | Personal CTAs, JOIN, active nav, user story rings, energy |
| `--color-cream` | `#E8E0D0` | Warm White/Cream | Club accounts, headlines, premium feel |
| `--color-bg` | `#0E0E0E` | Pure Charcoal | App background — most neutral, timeless |

### 2.2 Full Dark Mode Token System

```css
/* === SURFACES — Charcoal scale, deepest to lightest === */
--color-bg:              #0E0E0E;   /* App background — pure charcoal canvas        */
--color-surface:         #161616;   /* Cards, post cards, event cards (1 level up)   */
--color-surface-2:       #1E1E1E;   /* Nested cards, modals, bottom sheets           */
--color-surface-3:       #262626;   /* Elevated: tooltips, dropdowns, pressed states */
--color-border:          #2E2E2E;   /* Structural borders, dividers, separators      */
--color-border-strong:   #3A3A3A;   /* Focused input borders, active tab lines       */

/* === TEXT — Warm tones on charcoal === */
--color-text-1:          #E8E0D0;   /* Headlines, display text, primary body (Warm White) */
--color-text-2:          #B0A898;   /* Body text, descriptions, secondary content    */
--color-text-3:          #706860;   /* Muted labels, timestamps, placeholders        */
--color-text-4:          #4A4440;   /* Disabled text, watermarks, faintest meta      */
--color-text-inverse:    #0E0E0E;   /* Text ON lime or cream backgrounds             */

/* === ACCENT — Electric Lime (Personal / Action) === */
--color-lime:            #D4EA4D;   /* PRIMARY — CTAs, JOIN, active nav, your posts  */
--color-lime-dark:       #BEDD1A;   /* Pressed / active state                        */
--color-lime-soft:       #D4EA4D1A; /* 10% opacity — subtle lime tint backgrounds    */
--color-lime-glow:       rgba(212, 234, 77, 0.25); /* Glow halo on lime elements     */

/* === SECONDARY — Sage Green (Community / Clubs / Events) === */
--color-sage:            #52A870;   /* Club cards, event RSVPs, club story rings      */
--color-sage-light:      #9ACFAE;   /* Club text, meta info, going count              */
--color-sage-soft:       #52A8701A; /* 10% opacity — subtle sage tint backgrounds     */

/* === CREAM — Warm White (Premium / Headlines) === */
--color-cream:           #E8E0D0;   /* Club headlines, premium badges, warm accents   */
--color-cream-soft:      #E8E0D01A; /* 10% opacity — subtle cream tint                */

/* === SEMANTIC — Only for meaning, never decoration === */
--color-success:         #22C55E;   /* RSVP confirmed, payment OK                    */
--color-success-bg:      rgba(34, 197, 94, 0.12);
--color-warning:         #F59E0B;   /* Event almost full, expiry warning              */
--color-warning-bg:      rgba(245, 158, 11, 0.12);
--color-error:           #EF4444;   /* Failed action, cancelled event                 */
--color-error-bg:        rgba(239, 68, 68, 0.12);
--color-info:            #3B82F6;   /* New follower, announcement                     */
--color-info-bg:         rgba(59, 130, 246, 0.12);
--color-premium:         #A855F7;   /* Verified badge, paid event tag                 */
--color-premium-bg:      rgba(168, 85, 247, 0.12);
--color-live:            #FF4444;   /* Live event pulsing indicator                   */
```

### 2.3 Colour Usage Rules (STRICT)

1. **Lime (#D4EA4D) = YOU / PERSONAL / ACTION** → Join, Post, Your Profile, Your Story ring, active nav, primary CTAs
2. **Sage (#52A870) = COMMUNITY / CLUBS / EVENTS** → Club cards, Event RSVPs, Club story rings, club badges
3. **Cream (#E8E0D0) = PREMIUM / HEADLINES** → Display text, club names, warm accents
4. **Never swap lime and sage.** The user learns this language subconsciously.
5. **Text on lime background**: ALWAYS use `--color-text-inverse` (#0E0E0E)
6. **No pure white (#FFFFFF) or pure black (#000000)** — use the token scale
7. **No gradients on backgrounds** — solid surfaces only
8. **No Tailwind default shadows** — use custom neumorphic shadow tokens only

---

## 3. Shadow System — Neumorphic Depth

Light source: top-left. Always use rgba() shadows, never opaque hex.

```css
/* Extruded — default state for cards, buttons, avatars */
--shadow-out:
  6px 6px 14px rgba(0,0,0,0.55),
  -4px -4px 10px rgba(255,255,255,0.03);

/* Lifted — hover state */
--shadow-out-hover:
  9px 9px 18px rgba(0,0,0,0.65),
  -6px -6px 14px rgba(255,255,255,0.04);

/* Pressed — active/inset state */
--shadow-in:
  inset 5px 5px 12px rgba(0,0,0,0.5),
  inset -4px -4px 8px rgba(255,255,255,0.02);

/* Deep carved — search inputs, stat wells, grid thumbnails */
--shadow-in-deep:
  inset 8px 8px 18px rgba(0,0,0,0.6),
  inset -5px -5px 12px rgba(255,255,255,0.02);

/* Lime glow — primary CTA, active nav, lime badges */
--shadow-lime:
  0 0 20px rgba(212,234,77,0.25),
  6px 6px 14px rgba(0,0,0,0.55);

/* Sage glow — club elements */
--shadow-sage:
  0 0 16px rgba(82,168,112,0.20),
  6px 6px 14px rgba(0,0,0,0.55);
```

---

## 4. Typography

### Font Stack
```
Display / Headings:  'Space Grotesk'  — weights: 400, 500, 700
Body / UI:           'DM Sans'        — weights: 400, 500, 700
```

### Type Scale (Kinetic)
```css
--text-hero:    clamp(2.5rem, 8vw, 6rem)    /* uppercase, 700, tracking -1px    */
--text-section: clamp(1.8rem, 5vw, 3.5rem)  /* uppercase, 700, tracking -0.5px  */
--text-xl:      20px                         /* uppercase, 700, tracking -0.2px  */
--text-base:    14-16px                      /* normal case, 400-500             */
--text-label:   10-12px                      /* uppercase, 700, tracking +1.5px  */
--text-stat:    clamp(2rem, 6vw, 5rem)       /* uppercase, 700, tracking -2px    */
```

### Type Rules (NON-NEGOTIABLE)
- ALL headings, buttons, labels, nav items → **UPPERCASE**
- Body text, descriptions, bio → normal case
- Display text → negative letter-spacing (tracking-tighter)
- Small labels → wide letter-spacing (tracking-widest)
- Heading line-height: 0.9–1.0 (tight, poster-like)
- NEVER use serif fonts
- NEVER use sentence case for headings

---

## 5. Spacing System

Base unit: 4px. Every margin, padding, gap must be a multiple of 4.

```css
--space-1:  4px;    --space-2:  8px;    --space-3:  12px;
--space-4:  16px;   --space-5:  20px;   --space-6:  24px;
--space-8:  32px;   --space-10: 40px;   --space-12: 48px;
--space-16: 64px;
```

Screen edge padding: 16px. Card internal padding: 24px. List gap: 12px.

---

## 6. Shape Language

### KINETIC Register (structural, section-level)
- Border radius: **0px** (sharp, brutalist)
- Border: 2px solid --color-border on section dividers
- Used for: section containers, stat blocks, hero areas, marquee strips, bottom nav background

### NEUMORPHIC Register (component, card level)
- Border radius: **16px** (buttons, chips, inputs) or **20px** (cards) or **50%** (avatars)
- No visible border — shadows define edges
- Used for: post cards, event cards, buttons, story rings, avatars, search inputs, filter chips

**RULE: Outer structure is sharp and kinetic. Inner components are soft and tactile.**

---

## 7. Component Specifications

### 7.1 Bottom Navigation (Floating Pill)
- Background: --color-surface-2, border-radius 50% (capsule)
- Nav items: neumorphic containers
- Active item: lime circle highlight, icon inverts to --color-text-inverse
- Inactive: --color-text-3
- Smooth spring animation on tab switch (circle slides)
- Tabs: Home, Events, Search, Post, Profile
- Messages accessed from top-right header icon

### 7.2 Buttons
**Primary (Lime):**
- Background: --color-lime, text: --color-text-inverse
- Shadow: --shadow-lime
- Pressed: --color-lime-dark + --shadow-in
- Border-radius: 16px, uppercase, Space Grotesk 700

**Secondary (Sage):**
- Background: --color-sage, text: white
- Shadow: --shadow-sage
- Used for club/event actions

**Ghost:**
- Background: transparent, border: 1.5px solid --color-border-strong
- Text: --color-text-2

### 7.3 Post Card
- Background: --color-surface-2, border-radius: 16px, shadow: --shadow-out
- Header: avatar (rounded-full, shadow-out, lime ring for personal, sage ring for club)
- Username: uppercase, 700, --color-text-1
- Timestamp: --color-text-3, 10px
- Image area: shadow-in (carved), border-radius 10px
- CTA: lime background, --color-text-inverse, shadow-lime

### 7.4 Event Card
- Same structure as post card but sage accent
- Club avatar: border-radius 8px (not circle — clubs are squares)
- RSVP button: sage background
- Going count: --color-sage-light
- LIVE badge: lime background, --color-text-inverse

### 7.5 Story Rings
- Personal (posted today): lime ring, shadow-lime glow pulse
- Club (active event): sage ring
- Default: --color-surface-2 ring, --color-text-3

### 7.6 Search Input
- Background: --color-surface, shadow-in-deep (carved)
- Border-radius: 14px
- Font: Space Grotesk, uppercase, tracking 0.5px
- Focus: shadow-in-deep + lime bottom-border highlight

### 7.7 Stat Wells (Profile)
- Background: --color-surface, shadow-in-deep
- Border-radius: 12px
- Number: --color-lime, weight 700
- Label: --color-text-3, uppercase, 8px

### 7.8 Avatar
- Sizes: 28px (compact), 38px (post header), 56px (profile), 64px (story)
- Personal: rounded-full, lime ring border
- Club: border-radius 8px, sage ring border
- Fallback: initials, Space Grotesk 700, --color-surface-3 bg
- Shadow: --shadow-out

---

## 8. Motion & Animation

### Neumorphic Micro-interactions
- Card hover: translateY(-2px) + shadow-out-hover, 250ms ease-out
- Button press: translateY(1px) + shadow-in, 100ms
- Input focus: shadow-in → shadow-in-deep + lime border
- Story ring: shadow-lime glow pulse (2s ease-in-out infinite)

### Tab Bar Animation
- Lime circle slides between tabs: spring(damping: 28, stiffness: 120)
- Gentle scale breathe on selection: 0.9 → 1.0

### General Rules
- No instant show/hide — everything animates (min 150ms)
- Respect prefers-reduced-motion
- Easing: cubic-bezier(0.16, 1, 0.3, 1)

---

## 9. Navigation Architecture

```
AuthStack: Splash → Onboarding → AccountType → SignUp/Login → ProfileSetup
MainStack:
  BottomTabNavigator (Floating Pill):
    Home → Events → Search → Post → Profile
  Header icons: Messages (top-right), Notifications (top-right)
  Global modals: CreatePost, ImageViewer, PaymentSheet
```

---

## 10. Responsive & Adaptive Rules

- No fixed widths on content containers
- No hardcoded heights on scrollable content
- Screen edge padding: always 16px
- One primary lime CTA per screen max
- Progressive disclosure on long content
- paddingBottom: 100 on scrollable screens (nav clearance)
- Touch targets: minimum 44x44px
- SafeAreaView on all screens
- KeyboardAvoidingView on input screens

---

## 11. Anti-Patterns — NEVER DO THESE

- ✗ Pure black (#000000) or pure white (#FFFFFF)
- ✗ Gradients on backgrounds
- ✗ Tailwind default shadows (shadow-sm, shadow-md)
- ✗ Border-radius above 20px on cards
- ✗ Sentence case for headings or buttons
- ✗ Lime for club content or sage for personal content
- ✗ Flat buttons without shadow depth
- ✗ Serif fonts
- ✗ Multiple accent colours beyond lime + sage

---

## 12. Implementation Checklist

- [ ] Use design tokens from Section 2, never hardcode hex
- [ ] Use neumorphic shadow tokens from Section 3
- [ ] Space Grotesk for headings, DM Sans for body
- [ ] ALL headings and buttons UPPERCASE
- [ ] Lime = personal/action, Sage = community/clubs
- [ ] Text on lime is ALWAYS #0E0E0E
- [ ] Icons from Lucide only
- [ ] Touch targets minimum 44x44px
- [ ] SafeAreaView on all screens
- [ ] Shadow-out on all cards and buttons (no flat elements)
- [ ] Shadow-in on pressed states and input wells

---

*FitSocial KINEU Design System · Version 2.0 · May 2026*
*Charcoal canvas. Lime is personal energy. Sage is community. Cream is premium.*
*Every surface has depth. Every heading screams.*
