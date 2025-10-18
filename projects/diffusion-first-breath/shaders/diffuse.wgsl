struct SimParams {
  alpha: f32;
  _pad0: f32;
  _pad1: f32;
  _pad2: f32;
};

@group(0) @binding(0) var srcTex: texture_2d<f32>;
@group(0) @binding(1) var dstTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> sim: SimParams;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(srcTex);
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  let coord = vec2<i32>(gid.xy);
  let maxCoord = vec2<i32>(vec2<u32>(dims) - vec2<u32>(1u));

  let center = textureLoad(srcTex, coord, 0).r;
  let left = textureLoad(srcTex, vec2<i32>(max(coord.x - 1, 0), coord.y), 0).r;
  let right = textureLoad(srcTex, vec2<i32>(min(coord.x + 1, maxCoord.x), coord.y), 0).r;
  let down = textureLoad(srcTex, vec2<i32>(coord.x, max(coord.y - 1, 0)), 0).r;
  let up = textureLoad(srcTex, vec2<i32>(coord.x, min(coord.y + 1, maxCoord.y)), 0).r;

  let lap = left + right + up + down - 4.0 * center;
  let nextValue = clamp(center + sim.alpha * lap, 0.0, 1.0);

  textureStore(dstTex, coord, vec4<f32>(nextValue, 0.0, 0.0, 1.0));
}
