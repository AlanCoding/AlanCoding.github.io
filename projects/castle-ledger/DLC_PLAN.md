# Castle Ledger DLC Systems Plan

Status: planning

This file is the shared DLC systems doc for `Castle Ledger`.

Expansion-specific planning lives in:

- [projects/castle-ledger/BATTLE_OF_MASTINGS_PLAN.md](/home/arominge/repos/AlanCoding.github.io/projects/castle-ledger/BATTLE_OF_MASTINGS_PLAN.md)
- [projects/castle-ledger/HARBOR_OF_DELAYS_PLAN.md](/home/arominge/repos/AlanCoding.github.io/projects/castle-ledger/HARBOR_OF_DELAYS_PLAN.md)

## Shared Premise

The game pretends to support premium DLC installs gated by fake browser-friendly checkout and an `alanbucks` currency.

The joke works best if the UX is played completely straight:

- the player "buys" alanbucks through a fake payment form
- the form should look real enough for browsers to recognize card fields and offer autofill
- the form accepts any values, or no values at all
- submitting the form increases the local alanbucks balance
- once the player has enough alanbucks, they can "install" DLC
- installation should show a comically slow progress bar
- once installed, each DLC can be entered either directly or via an in-world connection point

## Shared State

- add persistent state for `alanbucksBalance`
- add install flags for each DLC
- add install-progress state if a fake install should survive refreshes
- treat alanbucks as separate from in-world silver pennies

Suggested starting rules:

- player starts with `0` alanbucks
- fake checkout grants fixed bundles, for example `500`, `1200`, or `3000`
- battle DLC price: `900` alanbucks
- harbor DLC price: `1100` alanbucks

## Fake Checkout

The form should use recognizable payment-field semantics so the browser can identify it:

- `autocomplete="cc-name"`
- `autocomplete="cc-number"`
- `autocomplete="cc-exp"`
- `autocomplete="cc-csc"`

Behavior:

- no serious validation
- submit always succeeds
- success text should imply payment processing without ever actually doing any
- alanbucks are credited locally to the ledger

## DLC Install UX

- each DLC has an `Install` button when affordable
- clicking install starts a slow progress bar
- while installing, disable the install button and show status text
- on completion, persist installed state and add a log entry

Tone:

- absurdly serious
- slightly too ceremonial for a local unlock
- no explicit fourth-wall break beyond the obviously fake store premise

## Access Model

Installed DLC should be reachable in two ways:

- direct jump from a DLC menu
- in-world travel from the main castle game

Installed DLC links should appear in both places:

- on the `south_road` scene of the main game
- on the standalone DLC hub page

Entry structure:

- first story entry into battle DLC requires the full `archives -> summons -> carriage -> battle arrival` sequence
- direct navigation after install may skip that sequence and jump to the battle entrypoint
- repeat entries after the first full introduction should also skip to the DLC entrypoint
- harbor DLC can use the same general rule: first-time story entry is diegetic, repeat/direct entries may skip to the harbor entrypoint

## Separate Inventory Rule

Each DLC should have its own inventory instead of reusing the base-game inventory.

Why:

- the base game inventory would get too crowded
- each DLC has a distinct material culture
- each DLC should feel like its own campaign pocket

Shared design rule:

- inventory items should be combinatorial
- many gates should need multiple supporting objects
- retracing should feel annoying but purposeful
- progress should only occasionally open another branch

## Shared Page Structure

The DLC/store flow uses separate HTML pages outside the normal room graph:

- `projects/castle-ledger/dlc/index.html`
- `projects/castle-ledger/dlc/alanbucks.html`
- `projects/castle-ledger/dlc/battle-of-mastings.html`
- `projects/castle-ledger/dlc/harbor-of-delays.html`

Recommended detail-page behavior:

- keep `installing` and `installed` as states on each DLC detail page
- do not split those into additional pages unless the flow becomes messy

## Shared Illustration Rules

Illustrations now live under:

- `assets/illustrations/base/`
- `assets/illustrations/dlc/battle-of-mastings/`
- `assets/illustrations/dlc/harbor-of-delays/`

As each DLC is developed:

- every location should get a corresponding prompt file left on disk until the image exists
- once the image exists, the prompt can be deleted
- filenames should align to location ids whenever possible
- generated location images should contain composition-level hints toward neighboring areas

Navigation-aware composition should come through things like:

- roads
- ridgelines
- doors
- piers
- gangways
- slopes
- banners
- terrain breaks
- crowd orientation

Each DLC also needs a Steam-capsule-style banner image for the store/home surfaces.
