struct InjectParams {
  sourcePos: vec2<f32>;
  sinkPos: vec2<f32>;
  radius: f32;
  emitRate: f32;
  sinkRate: f32;
  _pad0: f32;
};

@group(0) @binding(0) var stateTex: texture_storage_2d<rgba8unorm, read_write>;
@group(0) @binding(1) var<uniform> params: InjectParams;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(stateTex);
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  let coord = vec2<i32>(gid.xy);
  var value = textureLoad(stateTex, coord).r;

  let pixel = vec2<f32>(f32(coord.x), f32(coord.y));
  let radiusSq = params.radius * params.radius;

  let sourceDist = distanceSquared(pixel, params.sourcePos);
  if (sourceDist <= radiusSq) {
    value = value + params.emitRate;
  }

  let sinkDist = distanceSquared(pixel, params.sinkPos);
  if (sinkDist <= radiusSq) {
    value = max(value - params.sinkRate, 0.0);
  }

  value = clamp(value, 0.0, 1.0);
  textureStore(stateTex, coord, vec4<f32>(value, 0.0, 0.0, 1.0));
}

fn distanceSquared(a: vec2<f32>, b: vec2<f32>) -> f32 {
  let delta = a - b;
  return dot(delta, delta);
}
