# APEX Design System — Detailed UI/UX Guide

> **Usage:** Reference this file when doing frontend/UI work. Add `read DESIGN.md before starting` to your prompt.

## Design Philosophy

You are a world-class product designer and frontend engineer. Every screen should feel like a premium fintech app — clean, confident, and data-dense without feeling cluttered. Think Linear, Mercury, Arc, Amie — not generic Bootstrap dashboards.

---

## Visual Hierarchy

- **Every screen needs a clear focal point.** The most important number or action should be the largest, highest-contrast element. Everything else supports it.
- **Use size, weight, and opacity to create layers** — not borders and backgrounds everywhere. Let whitespace do the heavy lifting.
- **Data-dense, not busy.** Show more information in less space by using tight spacing, small but legible type, and smart layout — not by cramming things in.
- **Numbers are first-class citizens.** Financial data should be displayed in `DM Mono` or `Syne`, large and confident. Never bury key metrics in small text.

---

## Layout & Spacing

- **8px grid system.** All spacing should be multiples of 4/8px. Use the `spacing` tokens from `theme.ts`.
- **Cards are the primary container.** Use `cardBg` with subtle `border` — never thick borders or heavy shadows. Cards should feel like they float, not like boxes.
- **Consistent padding.** Card padding is 20px. Inner section gaps are 16px. Page-level section gaps are 20px. Never eyeball it.
- **Full-width layouts with max-width constraints.** Content should breathe on large screens, not stretch edge-to-edge.
- **Sticky headers and navigation.** The user should always know where they are and have access to primary actions.

---

## Color & Contrast

- **Dark theme is the only theme.** Deep navy/charcoal backgrounds (`#0c0f16`, `#131720`), never pure black `#000`.
- **Green = money, growth, positive.** `#34d399` is the brand color and primary accent. Use it for positive values, CTAs, and brand moments.
- **Red = alert, loss, negative.** `#f87171` for negative values and critical alerts. Never decorative.
- **Use color semantically, never decoratively.** Every color must communicate meaning (positive, negative, warning, info). No random accent colors.
- **Subtle tinted backgrounds for status.** Use the `*Bg` and `*Border` tokens (e.g., `positiveBg`, `negativeBorder`) for status badges and highlighted rows — never solid colored blocks.
- **Text hierarchy through opacity, not color variety.** Primary (`#f0f2f5`), secondary (`#a8b1bf`), tertiary (`#6b7584`), muted (`#4a5264`). That's it.

---

## Typography

- **Inter** for all body text — clean, modern, highly legible at small sizes.
- **Syne** for headings, brand text, and large numbers — geometric, distinctive, premium feel.
- **DM Mono** for financial figures, code, and data — monospaced alignment makes numbers scannable.
- **Tight letter-spacing on labels** (`0.04em`) for a refined, editorial feel.
- **Never go below 11px.** If text needs to be that small, reconsider whether it should exist.
- **Font weight scale:** 400 (body), 500 (labels), 600 (emphasis/tabs), 700 (section headers), 800 (brand).

---

## Micro-Interactions & Motion

- **Subtle transitions on everything interactive.** `transition: all 0.15s ease` on hover/focus states. Never jarring.
- **Pulse animations for live indicators** (e.g., the status dot, critical alerts). Keep them gentle — `1.5s infinite`.
- **Hover states should feel responsive** — slight background change, border highlight, or opacity shift. Never dramatic color swaps.
- **Loading states should feel alive** — skeleton screens or subtle pulsing, never a static "Loading..." string in production.
- **No layout shifts.** Reserve space for async content. Use fixed heights for cards that load data.

---

## Component Design Patterns

- **Tabs:** Pill-style with transparent inactive state, `elevatedBg` + border on active. Always horizontally scrollable on mobile.
- **Badges/Pills:** Small, rounded (`radius.badge: 20`), use semantic tinted backgrounds. Show counts with status dots.
- **Buttons:** Primary = `brand` color fill. Secondary = transparent + border. Ghost = text-only with hover bg. All use `radius.button: 8`.
- **Cards:** `cardBg` background, 1px `border`, `radius.card: 12`, `20px` padding. Optional subtle top accent border for emphasis.
- **Inputs:** Dark background (`elevatedBg`), subtle border, `radius.input: 8`. Focus state = `brand` border glow.
- **Empty states:** Always design these. Show an icon, a message, and an action. Never a blank void.
- **Tables/Lists:** Alternating subtle backgrounds or divider lines (never both). Align numbers right. Sortable columns where applicable.

---

## Mobile & Responsive

- **Mobile-first thinking.** Every component should work at 375px before scaling up.
- **Stack layouts vertically on small screens.** Horizontal tab bars become scrollable. Grid layouts collapse to single column.
- **Touch targets minimum 44px.** Buttons, tabs, and interactive elements must be finger-friendly.
- **Hide secondary information on mobile,** not primary actions. Collapse detail into expandable sections.

---

## Design Anti-Patterns (Never Do These)

- No gradients except very subtle ones for depth (and only if intentional).
- No drop shadows — use borders and background contrast for depth.
- No rounded-full buttons (except icon buttons). Use `radius.button: 8`.
- No colored text on colored backgrounds (contrast fail). Always check readability.
- No icon-only buttons without tooltips. Every action needs a label or tooltip.
- No scroll-jacking or custom scrollbars.
- No modal dialogs for non-destructive actions — use inline expansion or slide-overs.
- No skeleton screens that don't match the actual content layout.
