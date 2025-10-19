const MONO_QUERY_KEY = 'mono';

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMonoEnabled() {
  const params = new URLSearchParams(window.location.search);
  return params.get(MONO_QUERY_KEY) === '1';
}

export async function initGPU(canvas) {
  if (!('gpu' in navigator)) {
    return { supported: false, reason: 'missing-webgpu' };
  }

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) {
    return { supported: false, reason: 'no-adapter' };
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) {
    return { supported: false, reason: 'no-context' };
  }

  const format = navigator.gpu.getPreferredCanvasFormat();

  const maxDimension = device.limits.maxTextureDimension2D;
  let simResolution = 1024;
  if (maxDimension < 1024) {
    simResolution = Math.min(512, maxDimension);
  }
  if (simResolution < 256) {
    simResolution = Math.max(256, Math.floor(maxDimension / 2)) || 256;
  }

  canvas.width = simResolution;
  canvas.height = simResolution;

  const presentationUsage =
    GPUTextureUsage.RENDER_ATTACHMENT |
    GPUTextureUsage.COPY_SRC |
    GPUTextureUsage.COPY_DST;

  try {
    context.configure({
      device,
      format,
      usage: presentationUsage,
      alphaMode: 'premultiplied'
    });
  } catch (error) {
    console.warn('[diffusion] Canvas configure failed, retrying with minimal usage.', error);
    context.configure({
      device,
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      alphaMode: 'premultiplied'
    });
  }

  return {
    supported: true,
    adapter,
    device,
    context,
    format,
    resolution: simResolution
  };
}
