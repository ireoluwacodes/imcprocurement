# Design system: borrow the reference structure, keep Integra dark + teal

Shadcn and Tailwind are already installed and wired up (Tailwind v4 via `src/styles.css`, shadcn components in `src/components/ui`). No setup needed — this is about turning the reference layout ideas into a consistent, reusable set of building blocks in the existing dark teal look.

## What I take from the reference

Structure and rhythm only, not its colours:

- Small pill "eyebrow" label above big headlines
- Large, tight headlines with one short supporting line
- Pill-shaped buttons: one solid primary, one outlined secondary
- Numbered step cards (STEP 01 / 02 / 03) for the approval chain
- Big-number stat tiles
- A closing call-to-action band
- Uniform feature cards with generous padding and quiet borders

## Building blocks to add

Reusable pieces so every page is built from the same parts:

- `Eyebrow` — pill label, uppercase, teal outline
- `SectionHeading` — eyebrow + headline + supporting line, left or centred
- `StepCard` — numbered card for sequences
- `StatTile` — large figure with caption
- `FeatureCard` — icon, title, body, consistent padding
- `CtaBand` — full-width closing panel with two buttons

Plus small styling updates to existing pieces: pill button shape, a softer raised-panel treatment, and a `stat-figure` text style. Existing `panel` and `rule-label` styles stay.

## Where it shows up

- **Landing page** rebuilt from the new blocks: eyebrow + headline + two buttons, feature cards for the three forms, the five-stage approval chain as numbered steps, a stat row, and a closing call-to-action.
- **Internal screens** keep their current layout; they simply inherit the updated button shape and panel treatment.

## Technical notes

- New components under `src/components/design/`, exported from one index file.
- Tokens and utilities added to `src/styles.css` under the existing `@theme inline` / `@utility` blocks — no new colour values, only spacing, radius and surface refinements using current tokens.
- Button pill shape applied through the existing shadcn `buttonVariants`, so all buttons update at once.
- No backend, data or routing changes.
