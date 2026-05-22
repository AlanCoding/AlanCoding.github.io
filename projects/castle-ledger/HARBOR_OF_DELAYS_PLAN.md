# Harbor Of Delays Plan

Status: planning

Shared DLC systems live in [projects/castle-ledger/DLC_PLAN.md](/home/arominge/repos/AlanCoding.github.io/projects/castle-ledger/DLC_PLAN.md).

## Core Premise

This DLC is a harbor-and-launch campaign where everyone insists the ship is completely ready, right up until launch fails for an absurdly obscure reason.

The core joke:

- the ship is always "ready"
- there are always "no blockers"
- every individual denies fault
- each solved blocker reveals another blocker
- getting the ship launched takes dramatically longer than preparing it

This is an allegory for trying to merge a code patch that is already done, uncontroversial, and correct, yet somehow takes forever to clear checks and coordination.

## War Context

The launch matters because an enemy force must be engaged.

Pressure sources:

- the king wants the ship sailing now
- the lords financing the venture want it sailing now
- both can run into the player and be furious for military and financial reasons

No one should become less confident in public. The public line remains:

- the ship is ready
- there is no serious blocker
- any issue is minor
- any issue is certainly not the current speaker’s fault

## Structural Shape

Unlike the castle and battle DLCs, this DLC should start with a short, fairly linear main corridor of obvious locations.

The player’s first pass should feel like:

- move straightforwardly through the harbor chain
- speak to the obvious people
- receive repeated assurances that launch is imminent
- reach the launch point
- get blocked by something impossibly obscure

Only after the first failed launch should the map branch outward more aggressively.

Topology rule:

- main spine is short and readable
- offshoots are relatively tree-structured
- each blocker tends to open one or two new side branches
- retracing is common

## Proposed Core Spine

Recommended initial main path:

- `harbor_road`
- `reckoning_house`
- `salt_storehouse`
- `rope_crane_pier`
- `signal_beacon_tower`
- `launch_quay`

The player should be able to march through that route on a first pass without much ambiguity.

Status note:

- this spine is a strong current candidate, not a final lock
- `reckoning_house` is preferred over `customs_wharf` because the blocking tone should be more technical than civic-bureaucratic
- `reckoning_house` is the one place where formal financial authority is allowed to intrude directly

## Expansion Branches

As blockers emerge, open branches such as:

- `mudflat_skiff_landing`
- `pilots_tavern`
- `storm_breakwater`
- `harbor_ledger_office`
- `pitch_shed`
- `oarmaker_yard`
- `victualler_row`
- `crows_nest`

`crows_nest` is required for visual diversity and because it sounds fun.

Benchmark note:

- the most promising branch set right now is:
  - `capstan_walk`
  - `boatyard_slip`
  - `lamp_room`
  - `mudflat_skiff_landing`
  - `crows_nest`
  - `pilots_tavern`
- `harbor_ledger_office`, `victualler_row`, and `storm_breakwater` remain available but feel less central at the moment

Recommended harbor-side additions for texture and offshoot variety:

- `caulking_shed`
  - tar, oakum, pitch smoke, and seam work
- `net_drying_racks`
  - mostly local harbor clutter, laborers, and spare cordage
- `lamp_room`
  - signal lanterns, shutters, oils, and code confusion
- `boatyard_slip`
  - rollers, props, wedges, and hull-side fittings
- `capstan_walk`
  - heavy cable, hauling gear, and men working in circles

Best candidates to keep:

- `caulking_shed`
- `lamp_room`
- `boatyard_slip`

Those give better visual diversity than adding more generic storage.

## Branch Topology Suggestion

The offshoots should not all hang directly from the same point. A better tree shape is:

- `harbor_road`
  - to `customs_wharf`
- `customs_wharf`
  - to `salt_storehouse`
  - to `harbor_ledger_office`
- `salt_storehouse`
  - to `victualler_row`
- `rope_crane_pier`
  - to `pitch_shed`
  - to `boatyard_slip`
  - to `crows_nest`
- `signal_beacon_tower`
  - to `lamp_room`
  - to `storm_breakwater`
- `launch_quay`
  - to `mudflat_skiff_landing`
  - to `pilots_tavern`

This keeps the map readable while still letting each new blocker open a small new sub-tree.

Status note:

- this is a recommended topology sketch, not yet a final map lock
- it should be treated as a benchmark for the current direction

## Core Progression Rule

This DLC should stay focused on items, unlocks, and expanding option sets.

The intended feel is:

- on a first pass, the harbor seems simple and almost too linear
- the player walks the obvious spine quickly
- one blocker stops launch
- an item gathered elsewhere makes an old dead-end useful
- returning to familiar locations reveals new options because the player now has the right item
- some actions require multiple items to be present at a location, where they combine into a more specific item
- that new item then unlocks some distant location on the other side of the harbor or ship

This means the map should grow over time.

Design rule:

- do not mutate location art in response to progress
- do not rely on scene-state image swaps
- use inventory, unlocks, and newly revealed options instead
- notation should frequently point the player to another far-off location
- back-and-forth traversal is part of the joke and should be intentionally emphasized

The structure should feel like a tree that keeps sprouting new branches from previously boring nodes.

## Initial Player Experience

The first run through the harbor should be intentionally easy to read.

Target feeling:

- there are only a few obvious options
- one or two side paths exist mostly for sightseeing or texture
- the player reaches the launch point quickly
- the first real blocker produces the first hard dead end

After that:

- item pickups begin reopening old places
- the town side gains new branches
- the ship side gains new branches
- places that were previously inert become combinational work sites
- the navigation burden increases in an intentional and mildly irritating way

This should make the DLC feel as if it keeps getting bigger the longer the player spends trying to solve one "simple" launch.

## Launch-Blocker Rhythm

The DLC should go through multiple launch-attempt cycles.

Recommended rhythm:

1. everyone says launch is ready
2. player reaches `launch_quay`
3. obscure blocker appears
4. player resolves blocker through side branches and item combinations
5. launch is attempted again
6. a fresh blocker appears, often caused by the previous fix

At least some blockers should be self-inflicted chain reactions:

- fixing the spar tally breaks the rope allocation
- solving the rope issue exposes a pilot or tide conflict
- fixing the pilot issue reveals a signaling or ballast inconsistency
- clearing a manifest causes financing or victualing objections

The feeling should be:

- each step seems like the last one
- it never is

The public line must remain absurdly constant throughout:

- the ship is fully ready
- launch is imminent
- there are no real blockers
- any current issue is tiny
- any current issue is definitely somebody else’s responsibility

Current benchmark direction:

- the strongest version of the joke is that readiness is always conditional on one omitted detail
- the problem is often not that someone lied outright
- the problem is that everyone truthfully omitted the one operational detail that mattered next

## Suggested Blocker Families

Use blockers that feel obscure, material, and harbor-specific rather than theatrical.

Good blocker types:

- a missing mast-band wedge
- a signal lantern code mismatch
- a ballast-mark discrepancy
- a tide slate copied against the wrong moon mark
- an anchor-cable splice not witnessed by the right petty officer
- a pilot marker attached to the wrong launch order
- a victualing count that says pork for lords but only cabbage for rowers
- a missing boat-hook collar pin
- a caulking sequence done in the wrong order for the tide window
- a launch signal shown from the wrong height or with the wrong shutters
- a procedural insistence that a cable, spar, or ballast correction must be witnessed again in the proper maritime manner

Each blocker should sound like something that absolutely should not stop a war launch, yet somehow does.

## Town And Ship Growth Direction

The map should expand on both sides of the harbor divide.

Town-side growth should favor:

- `reckoning_house`
- `victualler_row`
- `harbor_ledger_office`
- `pilots_tavern`
- `oarmaker_yard`
- `caulking_shed`

Ship-and-quay-side growth should favor:

- `launch_quay`
- `rope_crane_pier`
- `capstan_walk`
- `boatyard_slip`
- `lamp_room`
- `signal_beacon_tower`
- `mudflat_skiff_landing`
- `crows_nest`

This supports the core rhythm:

- an obscure ship problem sends you into town
- a town-side fix sends you back to the ship
- the fix reveals a new ship-side option
- that ship-side option points you back into town again

The player should feel repeatedly dispatched to the far side of everything.

## Current Benchmark Blocker Thread

This is the strongest speculative thread so far. It should be preserved as a benchmark even if later revisions replace parts of it.

### Cycle 1: The Ship Cannot Leave The Quay

- everyone says the ship is ready
- at `launch_quay`, the player discovers the ship still needs to be hauled or warped clear
- this type of vessel is currently assumed to need the capstan crew
- the capstan was "ready," but no one told them the launch decision had actually been made
- this is an error of omission rather than an outright contradiction

Promising locations:

- `launch_quay`
- `capstan_walk`

Promising items:

- `captains_word`
- `capstan_order_tally`
- `quay_release_knot`

Promising combination:

- `launch_order`
  - `captains_word` + `capstan_order_tally`

Status:

- strong speculative direction
- not yet locked as the final first blocker

### Cycle 2: The Shore Warp Is Still Wrong

- once the hauling crew is engaged, another detail appears
- the last shore warp is led wrong, fastened wrong, or must be corrected from the quay side
- the ship cannot simply solve this from aboard
- this sends the player into dockside technical branches

Promising locations:

- `boatyard_slip`
- `mudflat_skiff_landing`

Promising items:

- `hawser_marker`
- `quay_ring_token`
- `bollard_pin`

Promising combination:

- `proper_warp_lead`
  - `hawser_marker` + `quay_ring_token`

Status:

- strong speculative direction
- pairs well with the capstan idea

### Cycle 3: Procedure Now Blocks Departure

- after the ship is physically clear enough, someone insists a procedure is still wrong
- likely candidates:
  - launch signal shown incorrectly
  - tide slate copied against the wrong mark
  - some maritime witnessing step done in the wrong sequence
- this is where the player starts learning that some "proper" procedures can be bypassed, inverted, or done the categorically wrong way to get results

Promising locations:

- `lamp_room`
- `signal_beacon_tower`
- `crows_nest`

Promising items:

- `signal_shutter`
- `tide_slate`
- `moon_mark_scrap`
- `lantern_slide`

Promising combinations:

- `corrected_launch_signal`
  - `signal_shutter` + `lantern_slide`
- `proper_tide_mark`
  - `tide_slate` + `moon_mark_scrap`

Status:

- promising speculative direction
- not yet narrowed to one canonical blocker

## Maritime Procedure Research Direction

The writing should lean on real-seeming maritime procedure categories, especially where there are "wrong ways" to do something that technically invalidate a launch step.

Research targets:

- signaling procedure
- pilotage and tide timing
- cable, anchor, and mooring procedure
- ballast handling and loading order
- victualing, ration issue, and who is entitled to what
- witnessing and certification customs around launch readiness

Design rule:

- when possible, unblocking the ship should involve doing a thing in the categorically wrong but effective way
- that is where some of the funniest progress can come from
- the text should make it feel like the player is violating proper harbor orthodoxy, not just finding a key

## Inventory And Gating

Harbor inventory should be separate from both the base game and the battle DLC.

The inventory should remain combinatorial and annoying:

- multiple supporting things to prove one small point
- frequent retracing
- lots of partial fittings, seals, tallies, slates, and cordage
- occasional new branch unlocks rather than constant expansion

Suggested item families:

- launch writs
- tide slates
- dock tokens
- mooring hooks
- rope tallies
- cargo seals
- pilot markers
- mast-band wedges
- ballast pegs
- lantern shutters
- anchor splice witnesses
- victualing tallies

Current benchmark additions:

- `captains_word`
- `capstan_order_tally`
- `hawser_marker`
- `quay_ring_token`
- `bollard_pin`
- `warp_hook`
- `signal_shutter`
- `lantern_slide`
- `moon_mark_scrap`
- `sea_warrant`

Recommended progression shape:

### Harbor Phase 1: The Ship Is Ready

Purpose:

- walk the obvious spine
- collect the first basic launch artifacts
- get told repeatedly that launch is imminent
- hit the first blocker at `launch_quay`

### Harbor Phase 2: No One Is Responsible

Purpose:

- open the first wave of side branches
- discover that each official only controls one tiny part
- assemble small combinations that satisfy no one completely
- attempt launch again and fail differently

### Harbor Phase 3: Coordination Failure

Purpose:

- work through the larger branch tree
- reconcile conflicting tallies, signals, ropes, and victualing
- solve one blocker in a way that causes another
- reach the final human bottleneck

### Harbor Phase 4: Throw Someone In The Brig

Purpose:

- the player finally loses patience
- a specific obstructive person gets thrown in the `brig`
- that removal clears the last social blocker
- the ship launches
- one brief launch scene ends the DLC

## Brig Sequence

Backing up from the final launch:

- the last obstructive person should rely on medieval legalistic arguments about jurisdiction
- they should insist they cannot be punished here because proper justice belongs on land in proper court
- another figure reminds the player that once under sea authority, the relevant command power is different
- this gives the player a narrow, grimly satisfying path forward

Required sequence:

- learn or be reminded that you have full authority at sea
- write your own warrant
- gain a warrant item in inventory
- confront the antagonist
- lock them in the brig
- trigger the changed brig art
- clear the final human blocker
- launch

Suggested inventory item:

- `sea_warrant`

Tone:

- not triumphant heroism
- more like exhausted administrative fury finally hardening into action

## Temporary Areas

Some harbor locations should exist only while the ship is still berthed and blocked.

Current benchmark candidates:

- `capstan_walk`
- `mudflat_skiff_landing`
- `boatyard_slip`

Rule:

- once the launch completes, these should no longer be navigable
- this helps the harbor feel event-driven rather than permanently explorable in the same way as the castle

## Narrative Tone

The writing should stay in the same world as the castle and battle DLCs:

- grounded medieval maritime logistics
- wartime urgency
- lordly pressure
- petty responsibility splitting
- no modern coding jokes stated outright

The allegory should be visible through structure, not explained in text.

## Social Logic

Every person should maintain two simultaneous positions:

- yes, the ship should already have launched
- no, the problem is not mine

This should create a highly specific tone of:

- false readiness
- fragmented ownership
- furious top-down pressure
- endless sideways work

## Visual Diversity

Target scene variety:

- muddy road into the harbor
- customs frontage
- cranes and piers
- salt and victualing storage
- signal tower
- lamp room
- tide flats
- tavern or pilot room
- breakwater
- boatyard slip
- caulking shed
- rigging seen from a crow’s nest
- launch quay
- brig
- one brief launch scene

## End State

The end should not be a long voyage.

The ending should be:

- one final blocker or obstructive human bottleneck
- the player gets angry
- someone gets thrown in the brig
- the ship launches
- one short launch scene
- DLC complete

## Recommended Immediate Next Planning Steps

- lock the exact initial harbor spine room names
- define the first three blocker cycles
- define the obstructive person who ends up in the brig
- define the first concrete item-combination chains
- decide which three locations definitely get dual-state art
