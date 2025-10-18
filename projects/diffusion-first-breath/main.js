import { initGPU, prefersReducedMotion, isMonoEnabled } from './gpu.js';
import { createPipelines, loadLutTexture } from './pipelines.js';
import { setupUI } from './ui.js';

const ALPHA = 0.2;
const EMIT_RATE = 0.015;
const SINK_RATE = 0.02;
const RADIUS_BASE = 40;
const WORKGROUP_SIZE = 16;

const state = {
  running: false,
  substeps: prefersReducedMotion() ? 1 : 2,
  fpsSamples: [],
  lastFrameTime: performance.now(),
  monoForced: isMonoEnabled(),
  resolution: 1024
};

const canvas = document.getElementById('diffusionCanvas');
const appRoot = document.querySelector('[data-app]');
const fallbackMessage = appRoot.querySelector('[data-fallback]');
const overlay = appRoot.querySelector('.diffusion-overlay');

let ui;
let frameHandler = null;
let visibilityHandler = null;
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
reducedMotionQuery.addEventListener('change', (event) => {
  state.substeps = event.matches ? 1 : 2;
});

(async function bootstrap() {
  const gpu = await initGPU(canvas);
  if (!gpu.supported) {
    overlay.hidden = true;
    fallbackMessage.hidden = false;
    fallbackMessage.focus?.();
    return;
  }

  state.resolution = gpu.resolution;
  ui = setupUI(appRoot, {
    onStart: () => {
      if (!frameHandler) {
        return false;
      }
      state.running = true;
      state.fpsSamples = [];
      state.lastFrameTime = performance.now();
      requestAnimationFrame(frameHandler);
      return true;
    },
    onToggle: (running) => {
      state.running = running;
      if (running && frameHandler) {
        state.fpsSamples = [];
        state.lastFrameTime = performance.now();
        requestAnimationFrame(frameHandler);
      }
    }
  });

  ui.updateStats({ alpha: ALPHA, resolution: state.resolution, fps: 0 });

  try {
    const prep = await prepareSimulation(gpu);
    frameHandler = prep.frame;
    visibilityHandler = prep.onVisibilityChange;
    window.addEventListener('visibilitychange', visibilityHandler);
  } catch (error) {
    console.error('Failed to start diffusion demo', error);
    overlay.hidden = true;
    fallbackMessage.hidden = false;
    fallbackMessage.textContent = 'WebGPU initialization failed. Please try reloading on a compatible browser.';
  }
})();

async function prepareSimulation(gpu) {
  const { device, context, format, resolution, adapter } = gpu;
  const pipelines = await createPipelines(device, format);
  const lut = await loadLutTexture(device);
  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });

  const renderUniformBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const useMono = state.monoForced || !lut;
  device.queue.writeBuffer(renderUniformBuffer, 0, new Uint32Array([useMono ? 1 : 0]));

  const alphaBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(alphaBuffer, 0, new Float32Array([ALPHA]));

  const radius = RADIUS_BASE * (resolution / 1024);
  const sourcePos = new Float32Array([0.3 * resolution, 0.5 * resolution]);
  const sinkPos = new Float32Array([0.7 * resolution, 0.5 * resolution]);
  const injectBuffer = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const injectData = new Float32Array([
    sourcePos[0],
    sourcePos[1],
    sinkPos[0],
    sinkPos[1],
    radius,
    EMIT_RATE,
    SINK_RATE,
    0
  ]);
  device.queue.writeBuffer(injectBuffer, 0, injectData);

  const textureUsage =
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.STORAGE_BINDING |
    GPUTextureUsage.COPY_SRC |
    GPUTextureUsage.COPY_DST;

  const stateTextures = [
    createStateTexture(device, resolution, textureUsage),
    createStateTexture(device, resolution, textureUsage)
  ];
  const stateViews = stateTextures.map((texture) => texture.createView());

  const renderLayout = pipelines.renderPipeline.getBindGroupLayout(0);
  const diffuseLayout = pipelines.diffusePipeline.getBindGroupLayout(0);
  const injectLayout = pipelines.injectPipeline.getBindGroupLayout(0);

  const lutResource = lut ?? createMonoLut(device);
  const lutView = lutResource.view;

  const renderBindGroups = stateViews.map((view) =>
    device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: view },
        { binding: 1, resource: sampler },
        { binding: 2, resource: lutView },
        { binding: 3, resource: { buffer: renderUniformBuffer } }
      ]
    })
  );

  const diffuseBindGroups = [
    device.createBindGroup({
      layout: diffuseLayout,
      entries: [
        { binding: 0, resource: stateViews[0] },
        { binding: 1, resource: stateViews[1] },
        { binding: 2, resource: { buffer: alphaBuffer } }
      ]
    }),
    device.createBindGroup({
      layout: diffuseLayout,
      entries: [
        { binding: 0, resource: stateViews[1] },
        { binding: 1, resource: stateViews[0] },
        { binding: 2, resource: { buffer: alphaBuffer } }
      ]
    })
  ];

  const injectBindGroups = stateViews.map((view) =>
    device.createBindGroup({
      layout: injectLayout,
      entries: [
        { binding: 0, resource: view },
        { binding: 1, resource: { buffer: injectBuffer } }
      ]
    })
  );

  const workgroupCount = Math.ceil(resolution / WORKGROUP_SIZE);
  let activeIndex = 0;

  setTimeout(async () => {
    try {
      const info = await queryAdapterInfo(adapter);
      console.info('[First Breath] Adapter:', info.name);
      console.info('[First Breath] Limits:', { resolution });
    } catch (error) {
      console.info('[First Breath] Limits:', { resolution });
    }
  }, 2000);

  function renderFrame() {
    const commandEncoder = device.createCommandEncoder();
    const substeps = state.substeps;

    for (let step = 0; step < substeps; step += 1) {
      const injectPass = commandEncoder.beginComputePass();
      injectPass.setPipeline(pipelines.injectPipeline);
      injectPass.setBindGroup(0, injectBindGroups[activeIndex]);
      injectPass.dispatchWorkgroups(workgroupCount, workgroupCount);
      injectPass.end();

      const diffusePass = commandEncoder.beginComputePass();
      diffusePass.setPipeline(pipelines.diffusePipeline);
      const diffuseBindGroup = activeIndex === 0 ? diffuseBindGroups[0] : diffuseBindGroups[1];
      diffusePass.setBindGroup(0, diffuseBindGroup);
      diffusePass.dispatchWorkgroups(workgroupCount, workgroupCount);
      diffusePass.end();

      activeIndex = 1 - activeIndex;
    }

    const currentTexture = context.getCurrentTexture();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: currentTexture.createView(),
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    });
    renderPass.setPipeline(pipelines.renderPipeline);
    renderPass.setBindGroup(0, renderBindGroups[activeIndex]);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  let rafId;
  const frame = (timestamp) => {
    if (!state.running) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = undefined;
      }
      return;
    }

    renderFrame();
    updateFps(timestamp);
    rafId = requestAnimationFrame(frame);
  };

  const updateFps = (timestamp) => {
    const delta = timestamp - state.lastFrameTime;
    state.lastFrameTime = timestamp;
    if (delta > 0) {
      const fps = 1000 / delta;
      state.fpsSamples.push(fps);
      if (state.fpsSamples.length > 60) {
        state.fpsSamples.shift();
      }
      const avg = state.fpsSamples.reduce((sum, sample) => sum + sample, 0) / state.fpsSamples.length;
      ui.updateStats({ fps: avg, alpha: ALPHA, resolution: state.resolution });
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden && state.running) {
      state.running = false;
      ui.setRunning(false);
    }
  };

  return { frame, onVisibilityChange };
}

function createStateTexture(device, resolution, usage) {
  return device.createTexture({
    size: [resolution, resolution, 1],
    format: 'rgba8unorm',
    usage
  });
}

function createMonoLut(device) {
  const texture = device.createTexture({
    size: [1, 1, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
  });
  const data = new Uint8Array([255, 255, 255, 255]);
  device.queue.writeTexture(
    { texture },
    data,
    { bytesPerRow: 4 },
    { width: 1, height: 1, depthOrArrayLayers: 1 }
  );
  return { texture, view: texture.createView() };
}

async function queryAdapterInfo(adapter) {
  if (adapter && 'requestAdapterInfo' in adapter) {
    try {
      const info = await adapter.requestAdapterInfo();
      if (info) {
        return { name: info.description || info.vendor || 'Unknown adapter' };
      }
    } catch (error) {
      return { name: 'Unknown adapter' };
    }
  }
  return { name: 'Unknown adapter' };
}
