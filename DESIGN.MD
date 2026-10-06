# DESIGN.md — Gym Planificación

## Vision
Modern, confident, athletic. Calm neutral surfaces with a single vivid brand
accent. Content-first cards, big numbers, minimal chrome. Feels like a
premium fitness tool, not a spreadsheet.

## Theming model
- One runtime brand color: `--brand` (default #EF4444). All accent usage derives from it.
- Derived tokens: hover = brand −10% lightness; highlight = +40%; shadow = −30%.
- On-brand text: black if lightness > 60%, otherwise white.
- Never hard-code red; always reference brand tokens.

## Color (light / dark)
- Background:      #F7F7F8 / #0E0F11
- Surface (card):  #FFFFFF / #17181B
- Surface raised:  #F0F1F3 / #1F2125
- Border:          #E4E5E9 / #2A2C31
- Text primary:    #111214 / #F4F5F7
- Text secondary:  #5F6470 / #9EA3AE
- Success #22C55E · Warning #F59E0B · Danger #EF4444 (distinct from brand: use icon + label)
- Exigence badges: A #DC2626 · B #EA580C · C #CA8A04 · D #16A34A (soft tinted backgrounds)
- Muscle intensity chips: primary = solid brand tint, secondary = outlined, tertiary = muted

## Typography
- Family: Inter (UI), tabular numerals for weights/reps/timer.
- Scale: 12 / 14 / 16 / 20 / 28 / 40 (timer: 72–96, weight: 32)
- Weights: 400 body, 600 labels, 700 headings & numbers.
- Sentence case everywhere; no all-caps except tiny badges.

## Spacing & layout
- 4px base grid; use 4, 8, 12, 16, 24, 32, 48.
- Mobile: 16px side gutters, single column, max content 480px.
- Desktop: 240px sidebar, content max 1120px, 24px gutters.
- Touch targets ≥ 48px on mobile, ≥ 36px on desktop.

## Shape & elevation
- Cards: radius 16px, 1px border, very soft shadow (0 1px 2px rgba(0,0,0,.05)).
- Inputs/buttons: radius 12px. Chips/badges: fully rounded.
- Bottom sheets and side sheets: radius 24px on leading edge, scrim 40%.
- Elevation used sparingly: floating timer pill and sheets only.

## Components
- Card: header (title + status), body, optional footer actions; no nested cards.
- Buttons: primary (brand fill), secondary (outline), ghost, destructive; icon buttons collapse labels on mobile.
- Set row: [round #] [weight stepper] [reps stepper] [check]; completed row tinted brand 10%.
- Bottom tab bar (mobile): 4–5 items, active = brand icon + label.
- Sidebar (desktop): grouped by role, active item = brand-tinted pill.
- Toggle: brand-colored switch, 44×24.
- Empty state: soft icon, one sentence, one action.
- Skeletons: pulsing rounded blocks matching card geometry.

## Motion
- 150–200ms ease-out for state changes; sheets 250ms.
- Timer last 5s: gentle brand pulse. Respect prefers-reduced-motion.

## Accessibility
- WCAG AA contrast on all brand-derived pairs.
- Never rely on color alone (badges include letters/icons).
- Visible focus ring: 2px brand outline with 2px offset.

## Tone
Short, direct, encouraging. EN/ES parity; allow 25% text expansion.