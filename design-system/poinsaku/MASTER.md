# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** PoinSaku
**Updated:** 2026-03-19
**Style:** Glassmorphism
**Stack:** Nuxt 4 + Vue 3 + Nuxt UI 4 + Tailwind CSS 4

---

## Global Rules

### Color Palette

| Role | Value | Tailwind |
|------|-------|----------|
| Primary | Sky (#0ea5e9) | `text-primary`, `bg-primary` |
| Neutral | Slate | `text-muted`, `bg-muted` |
| Accent | Cyan (#06b6d4) | Used in gradients alongside primary |

Configured in `app/app.config.ts`:
```ts
ui: { colors: { primary: 'sky', neutral: 'slate' } }
```

### Typography

- **Heading Font:** Poppins (`font-heading`)
- **Body Font:** Open Sans (`font-sans`)
- Google Fonts loaded via `nuxt.config.ts`

### Glass Utilities (defined in `app/assets/css/main.css`)

| Utility | Use For | Blur | Opacity |
|---------|---------|------|---------|
| `glass` | Navbar, hero cards, CTA panels | 24px | 70% white / 60% slate-900 |
| `glass-subtle` | Footer, light sections | 12px | 50% white / 40% slate-900 |
| `glass-card` | Dashboard cards, form cards | 16px | 55% white / 45% slate-900 |
| `glass-sidebar` | Dashboard sidebar | 20px | 65% white / 55% slate-900 |
| `gradient-mesh` | Content area backgrounds | N/A | Radial gradients with primary |

All glass utilities auto-switch between light/dark mode via CSS custom properties.

### Glass Effect Requirements

1. **Vibrant background required** — Glass panels need gradient orbs or `gradient-mesh` behind them
2. **Decorative orbs pattern** — Use `absolute` positioned `rounded-full blur-3xl` elements with `bg-primary/8` or `bg-cyan-300/10`
3. **Dark mode uses dark slate** — `rgb(15 23 42 / opacity)` not white
4. **Border opacity is low** — 0.08-0.2 range for subtle edge definition

---

## Style Guidelines

**Style:** Glassmorphism

**Key Effects:**
- Backdrop blur (10-24px)
- Subtle border (1px solid rgba white 0.08-0.2)
- Translucent backgrounds (white or dark slate with varying opacity)
- Decorative gradient orbs behind glass panels
- Layered depth with shadows

**Best For:** Modern SaaS, dashboards, modal overlays, navigation

---

## Layout Patterns

### Public Pages (default layout)
- Fixed glass navbar with `top-4 left-4 right-4` floating
- Decorative gradient orbs in fixed background layer
- Glass-subtle footer

### Dashboard Pages (dashboard layout)
- Glass sidebar with `glass-sidebar`
- Glass-subtle header
- `gradient-mesh` + decorative orbs in content background
- All cards use `glass-card`

### Cashier Pages (cashier layout)
- Glass header (not solid primary)
- Decorative gradient orbs in background
- All action cards use `glass-card`

### Auth Pages (no layout)
- Centered glass card on gradient background
- Decorative blur orbs behind card

---

## Anti-Patterns (Do NOT Use)

- Emojis as icons (use Lucide SVG icons)
- Missing `cursor-pointer` on clickable elements
- Layout-shifting hovers (avoid scale transforms)
- Low contrast text (maintain 4.5:1 minimum)
- Instant state changes (always use transitions 150-300ms)
- Invisible focus states
- Excessive animation
- Solid opaque backgrounds on cards (defeats glass effect)
- Glass without vibrant background behind it

---

## Pre-Delivery Checklist

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from Lucide icon set
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Glass elements visible in both light and dark mode
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] Gradient orbs present behind glass panels
