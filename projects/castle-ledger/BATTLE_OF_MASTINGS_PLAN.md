# Battle Of Mastings Plan

Status: planning

Shared DLC systems live in [projects/castle-ledger/DLC_PLAN.md](/home/arominge/repos/AlanCoding.github.io/projects/castle-ledger/DLC_PLAN.md).

## Core Premise

This DLC is an obvious parody of the Battle of Hastings.

Locked names:

- DLC title: `The Battle Of Mastings`
- battlefield cluster: `Mastings Field`
- invader: `Duke Gilliam of Mormandy`
- defender: `Garold Godwinson`

Only the rival rulers need parody names. Most other historical references may stay real.

## Player Position

The player primarily moves through the attacker’s side.

Why:

- it is funnier that a castle clerk gets sent into the enemy camp
- the attacker side has richer logistics for gameplay
- archers, mounted elements, feigned retreat, and supply pressure all fit better there

The player should not meaningfully enter the defender camp.

## Entry Structure

The hook begins in `archives`.

First-time story entry:

- `archives`
- `royal_summons_chamber`
- `carriage_to_mastings`
- battle entry

The justification for the carriage should sound plausible but absurdly convoluted:

- levy rolls need reconciling
- supply tallies need duplication
- oath and witness names need a clerk
- northern fighting against vikings has left everyone tired and chaotic
- this somehow results in the player being shipped out with records and strings to a war zone

Direct or repeat entry may skip the carriage and jump to the battle entrypoint.

## Historical Saturation

Dialogue should naturally mention:

- the delayed water crossing
- the succession crisis
- mockery of Gilliam’s thin claim
- chainmail hauberks
- defenders being infantry-heavy because of the northern fighting
- `Senlac Hill`
- archers
- shieldwall discipline
- pursuit downhill
- relics, oaths, banners, fatigue, and rumor

## Outcomes

Only two endings:

- `attacker_victory`
- `defender_victory`

Ending structure:

- both are game-over pages
- defender win should be very explicit that the player did good spy work
- attacker win should leave the attackers unaware the player was a spy
- both endings should include a direct harbor-DLC teaser link

## Location Set

### Prologue

- `archives`
- `royal_summons_chamber`
- `carriage_to_mastings`

### Arrival / Staging

- `pevensey_road`
- `roman_shore_fort`
- `hoar_apple_wagons`
- `telham_horse_lines`

### Command Side

- `telham_pavilion`
- `bishop_ddos_mass_tent`
- `senlac_approach`

### Battlefield Edge

- `senlac_foot`
- `shieldwall_face`
- `weald_edge`
- `false_flight_descent`
- `malfosse_break`

### Consequence Layer

- `hauberk_leech_hollow`
- `dragon_banner_fall`
- `senlac_dusk_tally`

## Plot / Topology

High-level structure:

- prologue
- camp-usefulness layer
- approach/frontline layer
- collapse/consequence layer

Important destination-emphasis rule:

- when a location is the current obvious progression target, its name should be bold in player-facing text
- especially for escape/progression nodes like `**senlac_approach**`

## Inventory And Gating

The battle should not be trivially traversable. Sensitive areas should require historical kit and overly specific military material.

### Phase 1: Become Camp-Useful

Entry scenes:

- `pevensey_road`
- `hoar_apple_wagons`
- `bishop_ddos_mass_tent`

Loose items:

- `horn_nock`
- `bodkin_pile`
- `goose_fletch_whipping`
- `ration_hook`
- `ventail_lace`
- `bandage_tie`
- `witness_token`

Combined item:

- `proof_arrow`
  - `horn_nock` + `bodkin_pile` + `goose_fletch_whipping`

Purpose:

- become visibly useful in camp
- unlock `**senlac_approach**`

### Phase 2: Become Field-Recognized

Mid scenes:

- `senlac_approach`
- `telham_pavilion`
- `shieldwall_face`

Loose items:

- `girth_buckle`
- `bridle_cheekpiece`
- `horse_tally_cord`
- `hauberk_ring_pouch`
- `mail_repair_awl`
- `spear_pennon_cord`

Combined items:

- `cavalry_service_harness`
  - `girth_buckle` + `bridle_cheekpiece`
- `mail_repair_set`
  - `hauberk_ring_pouch` + `mail_repair_awl`

Purpose:

- gain real access to the arrow-accounting system
- unlock `shieldwall_face` and major falsification opportunities

Critical material:

- arrow counts are explicit
- the player should see semi-accurate tallies of arrows, shields, hauberks, horses, and ugly supply counts
- one tally source should be honest enough to become the core lie surface

### Phase 3: Reach The Swing Scenes

Late scenes:

- `false_flight_descent`
- `dragon_banner_fall`
- `malfosse_break`
- `hauberk_leech_hollow`

Loose items:

- `banner_ferrule`
- `dragon_cloth_strip`
- `salt_pork_tie`
- `wine_skin_seal`

Combined items:

- `field_banner_token`
  - `banner_ferrule` + `dragon_cloth_strip`
- `lordly_ration_bundle`
  - `salt_pork_tie` + `wine_skin_seal`

Purpose:

- influence collapse and command continuity
- let petty supply manipulation bleed into the final phase
- feed into `senlac_dusk_tally`

## Tone And Texture

- obvious parody in names and setup
- not broad slapstick
- grounded in mud, fear, logistics, and medieval texture
- poor infantry should feel materially poorer than lords
- quartermaster detail should include ugly counts like pigs, ducks, and cabbage loads

## Remaining Execution Work

- exact `archives` dialogue and summons chain
- exact room text and options
- exact item-to-scene mapping
- explicit arrow-count falsification scenes
- final battle illustration prompts and room wiring
