async function loadShaderModule(device, relativePath) {
  const response = await fetch(new URL(relativePath, import.meta.url));
  if (!response.ok) {
    throw new Error(`Failed to load shader ${relativePath}`);
  }
  const code = await response.text();
  return device.createShaderModule({ code });
}

export async function createPipelines(device, format) {
  const [diffuseModule, injectModule, blitModule] = await Promise.all([
    loadShaderModule(device, './shaders/diffuse.wgsl'),
    loadShaderModule(device, './shaders/inject.wgsl'),
    loadShaderModule(device, './shaders/blit_colormap.wgsl')
  ]);

  const diffusePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: diffuseModule,
      entryPoint: 'main'
    }
  });

  const injectPipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: injectModule,
      entryPoint: 'main'
    }
  });

  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: blitModule,
      entryPoint: 'vsMain'
    },
    fragment: {
      module: blitModule,
      entryPoint: 'fsMain',
      targets: [
        { format }
      ]
    },
    primitive: {
      topology: 'triangle-list'
    }
  });

  return { diffusePipeline, injectPipeline, renderPipeline };
}

export async function loadLutTexture(device) {
  try {
    const response = await fetch(new URL('./assets/viridis.png', import.meta.url));
    if (!response.ok) {
      throw new Error('Failed to load LUT');
    }
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    const texture = device.createTexture({
      size: [bitmap.width, bitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      [bitmap.width, bitmap.height]
    );
    bitmap.close();
    return { texture, view: texture.createView() };
  } catch (error) {
    console.warn('[diffusion] Falling back to grayscale colormap.', error);
    return null;
  }
}
