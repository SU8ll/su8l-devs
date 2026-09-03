# Cloud Configurator — Current Design Spec

## Overview

A dark-themed "deep space" dashboard for a game bot configuration panel.  
**Primary color:** Purple (#7c3aed → #a855f7)  
**Layout:** Sidebar + Main content area (Desktop) / Horizontal scroll tabs (Mobile)  
**Font:** Inter (EN) / Cairo (AR)  
**Border radius:** 12–20px everywhere  

---

## 1. Color Palette

```css
--bg: #08081a;           /* page background */
--bg-deep: #050510;      /* body / deepest layer */
--panel: rgba(255,255,255, 0.035);        /* glass panel bg */
--panel-strong: rgba(14,12,28, 0.78);     /* stronger glass */
--border: rgba(168,85,247, 0.15);         /* default border */
--border-strong: rgba(168,85,247, 0.4);   /* hover / active border */
--primary: #7c3aed;       /* main purple */
--glow: #a855f7;          /* lighter purple (glow) */
--glow-bright: #c084fc;   /* brightest purple */
--accent: #22d3ee;        /* cyan accent */
--accent2: #f472b6;       /* pink accent */
--text: #f0ecff;          /* primary text */
--muted: #a09bb8;         /* secondary text */
--success: #34d399;       /* green */
--danger: #f87171;        /* red */
```

---

## 2. Background Layers (Back to Front)

| Layer | Class | What |
|-------|-------|------|
| z:-3 | `.app-bg` | Solid `--bg-deep` |
| z:-2 | `.grid-overlay` | 64px purple grid lines, masked to center |
| z:-2 | `#particles-canvas` | JS particle animation |
| z:-1 | `.scanlines` | CRT scanline effect (opacity 0.08) |
| — | `.bg-nebula.n1/n2/n3` | 3 blurred radial gradient orbs that pulse slowly |

---

## 3. Glass Panels

### `.glass` (Sidebar, Light panels)
```
bg: rgba(255,255,255, 0.035)
border: 1px solid rgba(168,85,247, 0.15)
backdrop-filter: blur(16px)
border-radius: 20px
shadow: 0 0 40px rgba(124,58,237, 0.04), inset 0 1px 0 rgba(255,255,255, 0.04)
```

### `.glass-strong` (Main content area)
```
bg: rgba(14,12,28, 0.78)
border: 1px solid rgba(168,85,247, 0.15)
backdrop-filter: blur(20px)
border-radius: 20px
shadow: 0 0 50px rgba(124,58,237, 0.06), inset 0 1px 0 rgba(255,255,255, 0.05)
```

### `.glow-border` (gradient border overlay)
```
::before pseudo-element
background: linear-gradient(135deg, purple 0.35, cyan 0.15 @35%, purple 0.1 @60%, transparent @85%)
mask-composite: exclude (creates border-only effect)
```

---

## 4. Layout Structure

### Desktop (>1024px)
```
┌─────────────────────────────────────────────┐
│  Header (Kicker + Title + Status + Account) │
├─────────────────────────────────────────────┤
│  Lock Banner (Edit/Cancel button)           │
├──────────┬──────────────────────────────────┤
│ Sidebar  │  Main Content Panel              │
│ (280px)  │  ┌──────────────────────────┐    │
│ .glass   │  │ Category Title + Groups   │    │
│ sticky   │  │ Boolean Rows              │    │
│          │  │ Number/Select Fields      │    │
│ Category │  │ Ratio Grids (100% triplets)│   │
│ Items    │  │ Save/Cancel Bar           │    │
│          │  └──────────────────────────┘    │
└──────────┴──────────────────────────────────┘
```

### Mobile (<1024px)
```
┌─────────────────────────┐
│ Top Bar (Lang Toggle)   │
├─────────────────────────┤
│ Status / Account Row    │
├─────────────────────────┤
│ Edit Banner             │
├─────────────────────────┤
│ Category Pills (scroll) │
├─────────────────────────┤
│ Content Card (.m-card)  │
│ Boolean Rows            │
│ Number/Select Fields    │
│ Group Cards             │
├─────────────────────────┤
│ Sticky Save Bar (fixed) │
└─────────────────────────┘
```

---

## 5. Components

### 5.1 Sidebar Item
```
padding: 12px 12px
border-radius: 16px
icon (20px emoji) + title (14px bold)
active: bg gradient purple → glow, ring glow/30%
inactive: hover bg white/4%
```

### 5.2 Boolean Row (Toggle row)
```
display: flex, justify-between, items-center
padding: 16px 20px
border-radius: 12px
border: 1px solid white/8%
bg: white/2.5%
hover: bg white/4%
label: 14px semibold, white/90%
description: 12px, --muted
```

### 5.3 Toggle Switch
```
44×26px, border-radius: 999px
OFF: bg white/10%, ring white/10%
ON: bg gradient primary→glow, shadow glow 0.3
knob: 20×20px white circle, shadow-md
transition: 0.16s left
```

### 5.4 Number / Select Input
```
padding: 12px 14px
border-radius: 12px
border: 1px solid --border
bg: white/4%
text: --text
focus: border --glow, shadow glow 0.15
select: custom dropdown arrow (purple chevron)
```

### 5.5 Radio Buttons (Pill style)
```
padding: 6px 16px, border-radius: 999px
font: 14px semibold
active: bg gradient primary→glow, text white, shadow glow 0.25
inactive: border white/8%, bg white/3%, text --muted
```

### 5.6 Slider
```
track: 8px height, rounded
fill: linear-gradient purple
thumb: 22×22px white, border 2px --glow, shadow glow 0.5
hover thumb: scale(1.2)
```

### 5.7 Section Title
```
icon: 36×36px rounded-xl, bg gradient purple/20→glow/20
title: 18px bold, white
description: 14px, --muted
```

### 5.8 Group Card (nested)
```
border-radius: 16px
border: 1px solid glow/12%
bg: gradient from glow/3% to transparent
padding: 16–24px
```

### 5.9 Ratio Grid (100% triplets)
```
header row: 6.5px uppercase tracking, --muted
row: rounded-xl, border white/10%, bg white/3%
invalid row: border amber/40%, bg amber/10%
inline number inputs: 8px border-radius, centered, bold
total badge: green (valid) / amber (invalid)
```

### 5.10 Buttons
```
.btn-primary:
  bg: gradient #7c3aed → #9333ea → #6d28d9
  border-radius: 14px
  padding: 12px 27px
  font: 700 15px
  shadow: glow 0.25 + 0.2
  hover: translateY(-2px) scale(1.02), glow 0.45
  shimmer::before animation on hover

.btn-ghost:
  bg: white/2.5%
  border: 1px solid --border
  hover: border strong, bg purple/6%
```

### 5.11 Lock Banner
```
bg: linear-gradient(120deg, purple/10%, purple/3%)
border: 1px solid purple/25%
border-radius: 20px
backdrop-filter: blur(16px)
icon: 40×40px rounded-xl
title: 12px uppercase tracking-widest, --glow
```

### 5.12 Modal
```
backdrop: rgba(5,5,16, 0.8), blur(16px)
panel: max-width 27rem, border-radius 28px
bg: gradient dark purple
border: 1px solid purple/30%
shadow: 0 0 60px purple/20%, 0 0 120px purple/10%
animation: modalPop (scale + blur)
```

### 5.13 Success Modal (Check Animation)
```
check-core: 84px circle, radial gradient purple
shadow: 0 0 24px purple/50%, 0 0 60px purple/20%
3 expanding ring animations (pulse outward)
checkmark: SVG stroke-dasharray draw animation
```

---

## 6. Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Kicker (section label) | 12.5px | 700 | gradient cyan→purple |
| Page title | 24px | 800 | text-gradient |
| Section title | 18px | 700 | white |
| Field label | 14px | 600 | white/90% |
| Description | 12–13px | 400 | --muted |
| Toggle text | 14px | 600 | white/90% |
| Button text | 15px | 700 | white |
| Ratio header | 6.5px | 700 | --muted, uppercase tracking-widest |

---

## 7. Spacing

- Page padding: 0
- Section gap: 24px
- Group internal gap: 20px
- Boolean row gap: 10px (between rows)
- Field gap: 20px (in 2-col grid)
- Sidebar item padding: 10px 12px
- Content panel padding: 32px (desktop sm:)

---

## 8. Mobile-Specific

- Category pills: horizontal scroll, flex-shrink 0
- All inputs: font-size 16px (prevents iOS zoom)
- Save bar: fixed bottom, above tab bar
- Cards (.m-card): bg white/3%, border white/6%, border-radius 14px
- Toggle: 44×26px (touch-friendly)
- Spacing slightly tighter than desktop

---

## 9. Animations

| Animation | Duration | What |
|-----------|----------|------|
| nebulaPulse | 8s alternate | Background orbs fade + drift |
| pulseGlow | 2s infinite | Status dot blink |
| heroReveal | 1s | Title fade-up on load |
| modalPop | 0.5s | Modal scale + blur entrance |
| checkCore | 0.55s | Success check bounce |
| ringPulse | 2.4s infinite | Expanding rings |
| drawCheck | 0.55s | SVG checkmark stroke |

---

## 10. Key Issues (for redesign)

1. **Too many glow effects** — text-glow, glow-border, shadow-glow everywhere causes eye strain
2. **Low contrast** — muted text (#a09bb8) on very dark bg (#050510) hard to read
3. **Glass panels** — backdrop-filter blur is heavy on performance
4. **Visual noise** — scanlines + grid overlay + nebula + particles = too much
5. **Inconsistent borders** — some white/6%, some white/8%, some white/10%
6. **Mobile** — category pills overflow, save bar can overlap content
7. **Ratio grid** — complex layout, hard to read on small screens
