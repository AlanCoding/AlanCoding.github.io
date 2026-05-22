# Castle Ledger Plan

Status: active

## Near-Term

- Fill illustration coverage for every location in the game.
- Keep `assets/final-prompts/` aligned only to locations that still need images.
- After the remaining images exist, wire them into the game so every illustrated location renders its matching scene image.
- Plan the DLC system and the first two expansion areas.

## DLC Planning

- Shared DLC systems doc: [projects/castle-ledger/DLC_PLAN.md](/home/arominge/repos/AlanCoding.github.io/projects/castle-ledger/DLC_PLAN.md)
- Battle-specific plan: [projects/castle-ledger/BATTLE_OF_MASTINGS_PLAN.md](/home/arominge/repos/AlanCoding.github.io/projects/castle-ledger/BATTLE_OF_MASTINGS_PLAN.md)
- Harbor-specific plan: [projects/castle-ledger/HARBOR_OF_DELAYS_PLAN.md](/home/arominge/repos/AlanCoding.github.io/projects/castle-ledger/HARBOR_OF_DELAYS_PLAN.md)
- Current scope:
  - fake `alanbucks` purchase flow with browser-recognizable but non-functional credit-card fields
  - slow fake installer for each DLC
  - DLC 1: Battle-of-Hastings parody area
  - DLC 2: harbor launch area built around repeated readiness-blocker cycles

## Image Optimization

- Evaluate downsizing or recompressing the current illustration set after coverage is complete.
- For DLC art specifically, defer the bulk resize/downsize pass until both DLCs are content-complete, so prompt iteration and regeneration are not fighting an optimization step midstream.
- Current images are `1024x1024`, while the practical on-page image width is roughly `605px` at the largest desktop layout.
- Likely options:
  - keep dimensions and recompress more aggressively
  - generate smaller derivatives for web delivery
  - convert to `WebP` or `AVIF` if that yields meaningful savings without visible loss

## Notes

- This plan is intentionally project-local so agents working inside `projects/castle-ledger/` can discover it quickly.
- The projects-level plan index lives at [projects/PLANS.md](/home/arominge/repos/AlanCoding.github.io/projects/PLANS.md).
