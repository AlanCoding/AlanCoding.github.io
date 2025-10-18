# Codex Brief: Add “First Breath” (GPU Diffusion MVP) to AlanCoding.github.io

> **Goal:** Implement and publish the first page of a GPU-first, WebGPU diffusion “story game” to the existing GitHub Pages site under `projects/`. This MVP shows a source emitting concentration that diffuses and is consumed by a sink. It must be **GPU-centric** (compute on GPU; no CPU pixel math), minimal UI, and clean integration with the current site’s structure and styling.

---

## 1) Repository & Placement

* **Repo:** `AlanCoding/AlanCoding.github.io`
* **Target path:** `projects/diffusion-first-breath/`
* **Create files:**

  ```
  projects/diffusion-first-breath/
    index.html
    main.ts                # or main.js if TypeScript is not desired
    pipelines.ts
    gpu.ts                 # WebGPU device/adapter helpers + fallback
    ui.ts                  # tiny Start/Pause UI wiring; no frameworks
    styles.css             # keep minimal; prefer site global styles if present
    shaders/
      diffuse.wgsl
      inject.wgsl
      blit_colormap.wgsl
    assets/
      viridis.png          # 256x1 LUT; also allow grayscale fallback
  ```
* **Linking:** Add a card/link from the **main games/projects landing** (where other games live), including:

  * Title: **First Breath (GPU Diffusion)**
  * Subtitle: “WebGPU diffusion MVP — click Start to emit and watch the flow.”
  * Badge/pill: `GPU` / `WebGPU`.

> Keep all code self-contained within this folder to avoid global namespace pollution and simplify later “Page 2/3” iterations.

---

## 2) Technical Requirements (Hard Constraints)

* **Graphics API:** **WebGPU** required; **no** CPU pixel loops, **no** `readPixels`, **no** WebGL in this MVP (we’ll consider a GL fallback later).
* **Compute-first design:** Simulation steps must be done in **compute shaders (WGSL)**, outputting to **float textures**. Rendering pass only maps scalar to color.
* **Textures & formats:**

  * Simulation textures: 32-bit float per pixel (store scalar in **R** channel; **A = 1.0**, **G/B unused**).
  * Rendering: sample scalar from texture; apply LUT.
* **Resolution:**

  * Default simulation grid: **1024×1024**.
  * Auto-scale down to **512×512** if adapter limits demand it (see device limits).
* **Passes per frame:**

  1. **Inject pass (compute):** add source (+emitRate inside circle) and sink (−sinkRate inside circle).
  2. **Diffuse pass (compute):** explicit 5-point stencil on scalar field (ping-pong A→B).
  3. **Render pass:** full-screen triangle sampling the latest field → canvas.
* **Ping-pong:** Maintain two textures `stateA`, `stateB`; swap references after each diffusion step.
* **Stability:** For explicit scheme, enforce `alpha ≤ 0.25`. Provide a uniform to tune `alpha` (default 0.2).
* **Zero CPU copies:** The scalar field stays on GPU; the only output is the canvas render.

---

## 3) UI & Interaction (MVP scope)

* **Minimal UI elements (top-right overlay or site-consistent header block):**

  * **Start** button: begins the inject + diffuse loop.
  * **Pause/Resume** toggle (single button after Start).
  * A tiny readout: `FPS: xx`, `alpha: 0.20`, `res: 1024×1024`.
* **No mouse painting yet.** Source/sink positions are **fixed constants** for Page 1:

  * `sourcePos = (0.30 * width, 0.50 * height)`
  * `sinkPos   = (0.70 * width, 0.50 * height)`
  * `radiusPx  = 40` (scale with resolution).
* **Keyboard:** Space toggles Pause/Resume.
* **Accessibility:**

  * Respect `prefers-reduced-motion`: cap diffusion substeps to **1 per frame** when enabled.
  * Provide `?mono=1` query param to force grayscale colormap.

---

## 4) Shaders (WGSL) — Behavioral Contracts

> **Do not paste full code here; implement according to these interfaces.**

### 4.1 `shaders/diffuse.wgsl` (compute)

* **Bindings (group 0):**

  * `@binding(0) srcTex: texture_2d<f32>` — read-only current field.
  * `@binding(1) dstTex: texture_storage_2d<rgba32float, write>` — write next field.
  * `@binding(2) sim: uniform { alpha: f32; }` — diffusion coefficient/time step.
* **Workgroup:** `@workgroup_size(16, 16)`.
* **Kernel:** For pixel `(x,y)` compute 5-point stencil Laplacian with **Neumann** edges (clamp neighbor coords to bounds).
  `out = clamp(c + alpha * lap, 0.0, 1.0)`; write to `dstTex.r`; set `a=1.0`.

### 4.2 `shaders/inject.wgsl` (compute)

* **Bindings (group 0):**

  * `@binding(0) stateTex: texture_storage_2d<rgba32float, read_write>` — in-place modification.
  * `@binding(1) params: uniform { sourcePos: vec2<f32>; sinkPos: vec2<f32>; radius: f32; emitRate: f32; sinkRate: f32; }`
* **Behavior:**

  * For each pixel, compute distance to `sourcePos`/`sinkPos`.
  * If inside source circle: `v += emitRate`.
  * If inside sink circle: `v = max(v - sinkRate, 0.0)`.
  * Clamp final `v` to `[0,1]`. Write back.

> **Note:** We inject directly into whichever texture will be read by `diffuse` next (keep ordering deterministic).

### 4.3 `shaders/blit_colormap.wgsl` (render)

* **Bindings (group 0):**

  * `@binding(0) fieldTex: texture_2d<f32>` — latest scalar field.
  * `@binding(1) samplerLinear: sampler` — linear sampling.
  * `@binding(2) lutTex: texture_2d<f32>` — 256×1 LUT (optional).
  * `@binding(3) u: uniform { useMono: u32; }` — 0=color LUT, 1=grayscale.
* **Vertex:** Full-screen triangle (NDC), no per-vertex buffer.
* **Fragment:** Sample scalar `s = clamp(fieldTex.r, 0, 1)`.

  * If `useMono == 1`: output `vec4(s, s, s, 1)`.
  * Else: sample `lutTex` at `(s, 0.5)` and output.

---

## 5) JavaScript/TypeScript Structure

### 5.1 `gpu.ts`

* `initGPU(canvas: HTMLCanvasElement): Promise<{ device, queue, context, format, adapter, limits }>`

  * Configure `canvas.getContext('webgpu')`.
  * Choose `preferredCanvasFormat`.
  * Pick texture resolution target (`SIM_W`, `SIM_H`) based on device limits (prefer 1024, fallback 512).
  * Throw a clear error with remediation if WebGPU is unavailable; show a polite fallback message in the DOM (no WebGL here).

### 5.2 `pipelines.ts`

* `createDiffusionPipeline(device): GPUComputePipeline`
* `createInjectPipeline(device): GPUComputePipeline`
* `createRenderPipeline(device, format): GPURenderPipeline`
* Utility: `createBindGroups(...)` returning bind groups for each pass for the **current** (A/B) textures and uniform buffers.

### 5.3 `main.ts`

* **State:**

  * Two `GPUTexture`s: `stateA`, `stateB` (rgba32float, `storage | texture-binding`).
  * `uniform buffers`: `simUBO`, `injectUBO`, `blitUBO`.
  * Bind groups for inject/diffuse/render (rebuild after swap).
  * `running` flag; step counters; FPS calculator.
* **Loop (requestAnimationFrame):**

  * If `running`:

    1. **Inject** (compute) into the **read/source** texture of this frame.
    2. **Diffuse** (compute): read `A` → write `B`.
    3. **Swap**: `A ↔ B`.
  * **Render** current field to canvas.
* **Start/Pause wiring** to `ui.ts`.
* **Parameters (constants for MVP):**

  * `alpha = 0.20`
  * `emitRate = 0.010`
  * `sinkRate = 0.008`
  * `radius = 40` (scale if SIM_W != 1024)
  * `sourcePos`, `sinkPos` from §3.
* **Resize handling:** keep simulation texture fixed; just resize the canvas drawing buffer and reprovision the render `colorAttachment` if needed.

### 5.4 `ui.ts`

* Create minimal DOM for Start/Pause/FPS.
* Keyboard handling (space toggles).
* Query param `?mono=1` sets `blitUBO.useMono`.

---

## 6) HTML & Styling

### 6.1 `index.html`

* Use site’s base layout if available; otherwise a slim HTML with:

  * `<canvas id="gpu-canvas" width="1280" height="720"></canvas>`
  * A header/title and a small paragraph describing the experiment.
  * A control bar (Start/Pause, FPS).
* Load entry script as a module: `<script type="module" src="./main.ts"></script>`

### 6.2 `styles.css`

* Full-bleed canvas responsive box (maintain aspect).
* Overlay controls in top-right; z-index over canvas; match site fonts.

---

## 7) Build Tooling

* Prefer **Vite** (simple, fast); TypeScript optional but recommended.
* Add a **tiny Vite config** at repo root **only if needed**. If the site already builds, keep this page **standalone** using native ES modules and `fetch` for WGSL:

  * If bundler **not** used: `fetch('./shaders/*.wgsl')` to load shader strings.
  * If bundler **is** used: import WGSL as text (e.g., `?raw`).
* Ensure GitHub Pages serves `wgsl`, `png`, and modules correctly.

---

## 8) Fallback Behavior

* If `navigator.gpu` is absent or initialization fails:

  * Replace canvas with a centered message:
    **“This GPU demo requires WebGPU (Chrome/Edge current). Please try on a compatible browser. A CPU/WebGL fallback is planned.”**
  * Do **not** attempt WebGL in this MVP.

---

## 9) Performance & Quality Gates

* **Desktop target:** 1024×1024 sim at vsync (≥60 FPS) on mid-range dGPU/iGPU.
* **Mobile:** Auto-downscale to 512×512 sim; still smooth ≥30 FPS.
* **Profiling:** Print one-time `console.info`:

  * Adapter name, limits, SIM resolution, estimated FPS after 2 seconds.
* **Frame budget:** ≤ 4 ms for inject + diffuse + render on typical dGPU.

---

## 10) Testing Checklist (Manual)

1. Loads on Chrome/Edge (current) without console errors.
2. Shows polite fallback on Safari/Firefox if WebGPU disabled.
3. Press **Start** → visible emission from left circle; plume diffuses right.
4. Sink circle slowly reduces nearby concentration.
5. **Pause** stops evolution; Resume continues (state should not reset).
6. `?mono=1` shows grayscale; default uses LUT.
7. Resizing the window doesn’t crash; render scales, simulation remains stable.
8. FPS readout updates; alpha shown (0.20 default).
9. No CPU readbacks; only WebGPU passes visible in devtools/Spector.js (optional).

---

## 11) Documentation & Page Copy

* Add a short description at the top of `index.html`:

  * “**First Breath**: A GPU diffusion experiment. Click **Start** to emit a plume that diffuses across the field and is absorbed by a sink. All simulation steps run entirely on your GPU via **WebGPU**.”
* Add a **small footer note**:

  * “This is *Page 1* in a multi-page story. Future pages add painting, walls, and flow/advection.”

---

## 12) Code Style & Housekeeping

* Keep modules small and named as above.
* Avoid global variables; wrap in an IIFE or module scope.
* Types: prefer explicit where meaningful (if using TS).
* Use `const`/`let`, no `var`.
* No external libraries for MVP (no UI frameworks, no math libs).
* Lint if the repo already has tooling; otherwise keep consistent formatting.

---

## 13) Integration Into Site Navigation

* Update **projects index** (where other games are listed) to include:

  * A new card linking to `/projects/diffusion-first-breath/`
  * Thumbnail: simple canvas snapshot or a static PNG `assets/thumb.png` (optional; can be generated later).
  * Short tagline (see §11).

---

## 14) Commits & PR

* Branch name: `feature/diffusion-first-breath-mvp`
* Commit granularity:

  1. scaffolding + shaders placeholders
  2. WebGPU init + textures + pipelines
  3. inject + diffuse pass
  4. render pass + LUT
  5. UI wiring + controls
  6. docs + projects index link
* PR title: **Add GPU Diffusion MVP “First Breath” (WebGPU)**
* PR body: Summarize scope, constraints, and how to run locally.

---

## 15) Future Hooks (Do Not Implement Now)

* Mouse/touch painting sources.
* Obstacle mask texture (walls).
* Velocity field + semi-Lagrangian advection.
* Scoring: deliver X mass to sink in T seconds.
* WebGL2 fallback path for non-WebGPU browsers.

---

## 16) Acceptance Criteria (Definition of Done)

* Page renders and runs on a WebGPU-capable desktop browser.
* Clicking **Start** clearly shows emission, diffusion, and absorption behavior.
* Simulation happens exclusively in GPU compute passes; render pass maps scalar to color.
* Code is confined to `projects/diffusion-first-breath/` and linked from the site’s projects page.
* Basic telemetry prints once; no console errors during normal use.

---

## 17) Notes From Product Owner

* **Story-first presentation:** keep UI minimal and elegant; emphasize the *feel* of a living field. The “game” mechanics will be layered later—this page is about the *first breath* of the simulation.
* **GPU purity:** prioritize keeping compute on the GPU even if it means a bit more boilerplate now.

---

### Done = ✅ Merge + publish to GitHub Pages.

Use this brief to implement the feature end-to-end.
