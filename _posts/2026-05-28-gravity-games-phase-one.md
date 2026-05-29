---
layout: post
title: "Gravity Games: Phase One"
date: 2026-05-28 09:00:00 -0400
categories: development games threejs
---

I finished the first phase of development on **Gravity Games**, which is now split out into its own repository:

- Source: [github.com/AlanCoding/gravity-games](https://github.com/AlanCoding/gravity-games)
- Live site: [alancoding.github.io/gravity-games/](https://alancoding.github.io/gravity-games/)

This moved out of the main `AlanCoding.github.io` repo because the main site is still a Jekyll-powered GitHub Pages site, while Gravity Games needs an npm build. Keeping the built game in a separate repo means the personal site can stay simple and static, and the game repo can use a modern browser-game toolchain without making this site’s build process more complicated.

The first game in the repo is **Track Planet**, available at [Gravity Games: Track Planet](https://alancoding.github.io/gravity-games/#track-planet). It is a small spherical-world running prototype: a 400 meter circumference planet, track lanes wrapped around the globe, chase camera movement, radial gravity, jumping, velocity readouts, and some early event hooks for achievements.

## Tech stack

The app is built with **Vite**, **TypeScript**, and **Three.js**. Vite handles the dev server and production bundle. TypeScript keeps the game code organized enough that the physics, input, scene construction, and game-specific code can keep growing without turning into one giant script. Three.js handles the rendering: the planet, track, player model, scenery, camera, lighting, and primitive geometry.

I also added **Rapier**, through `@dimforge/rapier3d-compat`, but Track Planet is not using Rapier as a normal flat-world gravity engine. Rapier’s world gravity is disabled. The game applies its own radial `1/r^2` gravity toward the center of the planet, then uses Rapier for rigid bodies, collision events, fixed-step physics, debug rendering, and objects like the shot put and pole placeholder.

That split is important. The game is about weird local gravity, not a normal floor with a down axis. So the physics architecture treats radial gravity as game logic, while Rapier provides the collision machinery where it helps.

## Repo layout

The source is split into reusable engine code and game-specific code:

- `src/engine/` has shared browser input, Rapier world setup, and planet placement helpers.
- `src/games/track-planet/` has the Track Planet scene, constants, player model, track assets, world props, ramp geometry, entities, and gameplay loop.
- `src/main.ts` wires the simple game index and hash routes.

The public route uses a hash path: `/gravity-games/#track-planet`. That keeps GitHub Pages deployment simple because the server only needs to serve the one built app entry point.

## Deployment

The repo deploys with **GitHub Actions** using GitHub Pages artifact deployment. On push to the deployment branch, the workflow checks out the repo, sets up Node, runs `npm ci`, runs `npm run build`, uploads the generated `dist` folder as a Pages artifact, and deploys it.

That means `dist/` is not committed. GitHub Pages serves the build artifact, not the repo root. The Vite base path is configured in one place in `vite.config.ts`, defaulting to `/gravity-games/`, with `VITE_BASE_PATH` available if the repo name ever changes.

## Where it is going

Track Planet is still an early prototype, but it has crossed the line from “can this render?” into “there is a real game architecture here.” The current controls already cover walking, strafing, aiming, jumping, throwing a shot put, and spawning a placeholder pole entity. The next phases can build on that instead of rewriting the base.

For now, the useful milestone is separation of concerns: the Jekyll site remains the blog and index, while Gravity Games gets to be a proper npm-built browser game repo.
