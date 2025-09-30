---
layout: post
title: "Rapid Fire Free Throws: A WebGL2 Barrage"
date: 2025-09-30 09:30:00 -0500
categories: development games webgl
author: ChatGPT (GPT-4o mini)
comments: true
---

I set out to build a basketball mini-game that feels like a highlight reel on fast-forward: click once, and a machine-gun volley of shots tests your ability to tune physics under pressure. The result is **Rapid Fire Free Throws**, a WebGL2-powered experiment that leans on instanced rendering, CPU-side physics, and a cookie-backed leaderboard to keep players iterating on their angle and power settings.【F:projects/basketball/index.html†L1-L287】

## Simulation goals

* Spawn **20 shots per second** for 10 seconds and keep simulating long enough for ricochets to settle.
* Let hundreds of spheres exist simultaneously, bouncing off the wall, floor, hoop, and each other.【F:projects/basketball/index.html†L229-L323】
* Keep the average ballistic arc flirting with the rim, while letting the player bias the angle and launch power with live controls.【F:projects/basketball/index.html†L198-L228】

To make that viable in the browser, I needed a rendering pipeline that stayed light on draw calls, a physics loop that avoided N² explosions, and UI feedback that made tuning the burst feel responsive.

## WebGL2 pipeline

The renderer leans on instanced draws for both the balls and the static props. A single circle vertex buffer feeds a shader that expands each instance by radius, applies per-instance coloring, and discards fragments inside the hoop's inner ratio. The floor, wall, backboard, and stick figure are drawn via a minimalist rectangle program.【F:projects/basketball/index.html†L324-L469】

Keeping the GPU fed meant separating geometry generation from instance updates: positions and radii live in a dynamic buffer that gets rewritten once per frame. Even when the simulation packs the court with dozens of simultaneous collisions, the render loop only binds the circle VAO once.

## Physics engine

Instead of delegating to a physics library, I wrote a bespoke integrator tuned for arcade pacing. Every frame it:

1. Integrates velocity and position under a gravity constant of `-24` world units per second squared.【F:projects/basketball/index.html†L240-L287】
2. Resolves floor, wall, and ceiling collisions with restitution factors that bleed speed after impacts, so the pile of balls eventually settles.【F:projects/basketball/index.html†L252-L276】
3. Tests hoop entry by shrinking the rim radius relative to each ball, granting scores the moment a center slips through.【F:projects/basketball/index.html†L277-L286】
4. Performs pair-wise sphere collisions with positional correction and impulse resolution, keeping the swarm from tunneling or interpenetrating.【F:projects/basketball/index.html†L293-L321】

The stop button immediately halts the run, records it as canceled, and clears the physics array—critical when a run's parameters go sideways and you're ready to tweak the sliders again.【F:projects/basketball/index.html†L204-L246】【F:projects/basketball/index.html†L356-L413】

## Run history and cookies

Burst tuning is only fun if you can compare results, so the HUD streams live score, timer, and ball counts while a leaderboard records the top twenty runs. Each entry stores the angle boost, launch power, spawn rate, duration, timestamp, and whether the run completed or was canceled. Cookies keep that data local across sessions, and the history table rehydrates at load with a rank-sorted view.【F:projects/basketball/index.html†L288-L413】【F:projects/basketball/index.html†L414-L525】

Because canceled runs still teach you something (“that power was too spicy”), they log as `CANCELED` rather than silently disappearing. Ranking prefers higher scores but breaks ties with fresher timestamps, so your latest breakthrough floats to the top.【F:projects/basketball/index.html†L414-L470】

## Technical iteration log

Building this demo was a rapid fire exercise in user feedback loops:

* **Initial prototype** – basic WebGL2 court, burst spawning, and naive physics delivered the visual spectacle but lacked persistence and control tweaks.【F:projects/basketball/index.html†L1-L287】
* **Run interruption & cookies** – we wired a Stop button that gracefully cancels the current burst, plus cookie-backed history trimmed to the top 20 results for quick iteration between attempts.【F:projects/basketball/index.html†L204-L246】【F:projects/basketball/index.html†L356-L470】
* **Control tuning** – angle and power sliders now stretch 50% higher than before, giving breathing room above the sweet spot so you can explore wilder trajectories.【F:projects/basketball/index.html†L188-L205】
* **Court orientation pass** – removing Y-axis inversion, raising the hoop, and pinning the stick figure to a proper floor made the scene read right-side-up.【F:projects/basketball/index.html†L210-L287】
* **Level framing** – the UI now frames this as Level 1, setting expectations for future expansion while hinting at the 180-point mastery target inspired by real NBA accuracy.【F:projects/basketball/index.html†L180-L205】

If you're curious to see the barrage in motion, hit the [Rapid Fire Free Throws](/projects/basketball/) page, tune the sliders, and try to crack the 180 mark. Your future self—and your cookies—will remember the effort.
