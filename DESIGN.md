# DESIGN.md: 9Router Pulse

## Design Read

Real-time telemetry dashboard for a developer who runs 9Router, using a mission-control visual language. Dials: **ENERGY 2 / RHYTHM 2 / MOTION 2**.

## Why this direction

- **Dark theme, no toggle.** 9Router is developer infrastructure used next to a terminal and an IDE. A dark console reduces glare and matches the proxy's own interface. Only one theme ships, so there is no half-working second mode.
- **One focal point.** The topology canvas is the hero of the page. Every other block defers to it: the metric strip is a single band, the live feed is a side rail, and the provider health grid is compact.
- **Identity motif: radar rings.** Concentric rings, tick marks, and a rotating sweep around the router core read as air-traffic control for AI requests. The rings live only inside the topology canvas, where they give spatial reference for node positions. They are not a page-wide background pattern.
- **Amber accent.** Amber is 9Router's existing primary color. Here it appears only on the router core, the primary action, and the last-used edge. Active traffic uses each provider's own brand color, so the accent stays scarce.
- **Typography.** Sora for interface text (geometric grotesk, technical without the default Inter/Geist look) and IBM Plex Mono for every number (engineering provenance, tabular alignment for live values).
- **Data colors are semantic.** Cyan marks input tokens, blue marks cached tokens, green marks output tokens, amber marks cost. These colors appear only on the numbers they describe, never as decoration.
- **Motion is evidence.** Particles moving along an edge mean a request is in flight right now. Idle edges are static hairlines. Page-wide entrance animations are deliberately absent. `prefers-reduced-motion` disables particles, rotation, and row transitions.
- **Surfaces, not floating cards.** Panels are matte with a 1px border. Only the active router core and active edges glow, because glow communicates live state.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| canvas | `#07080a` | Page background |
| surface | `#0c0e12` | Panels |
| surface-2 | `#11141a` | Inputs, nested rows |
| line | `#1c212a` | Hairline borders |
| line-strong | `#2a313d` | Hover borders |
| ink | `#e8ebf1` | Primary text |
| ink-muted | `#9aa3b1` | Secondary text |
| amber | `#f6b73c` | Live core, primary action, last-used edge |
| cyan | `#5cc8ff` | Input tokens |
| blue | `#7c9aff` | Cached tokens |
| green | `#63e6a5` | Output tokens |
| red | `#ff6b6b` | Errors |

Provider brand colors are semantic identifiers on nodes and edges. They are not part of the interface accent system.

## Shape and spacing

- Panels: 14px radius.
- Controls and inputs: 9px radius.
- Small chips and badges: 6px radius.
- Base spacing unit: 4px, with 8px, 12px, 16px, 24px, 32px steps.
- Buttons and inputs are at least 44px tall for touch targets.

## Interaction rules

- Click or keyboard-activate any provider node or provider card to open the detail drawer.
- The drawer closes with Escape, the close button, or a backdrop click, and returns focus to the trigger.
- The live stream can be paused. Pausing freezes the feed and the graph while keeping the last state visible.
- Period changes refetch aggregate stats. Live fields stay connected.
- Search dims non-matching nodes instead of removing them, so the map never reshuffles under the user.

## Accessibility

- Text contrast meets WCAG AA on the dark canvas.
- Every control has a visible focus ring.
- The provider health grid offers the same detail drawer as the canvas, so pointer use is not required.
- Reduced motion removes particle travel, core rotation, and row entrance transitions.
- All data views ship loading, empty, and error states.

## Non-goals

- No fabricated metrics, testimonials, or usage claims. Demo data is explicitly labeled "Mode demo".
- No page-wide grid, glassmorphism, or glow.
- No login with stored passwords: the password is exchanged once for a 24-hour session cookie and is never written to disk.
