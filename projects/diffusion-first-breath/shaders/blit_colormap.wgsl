struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>
}

struct RenderParams {
  useMono: u32,
  _pad0: vec3<u32>
}

@group(0) @binding(0) var fieldTex: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var lutTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> renderParams: RenderParams;

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(3.0, 1.0)
  );
  var uvs = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 2.0),
    vec2<f32>(0.0, 0.0),
    vec2<f32>(2.0, 0.0)
  );

  var output: VertexOut;
  output.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
  output.uv = uvs[vertexIndex];
  return output;
}

@fragment
fn fsMain(input: VertexOut) -> @location(0) vec4<f32> {
  let value = textureSample(fieldTex, linearSampler, input.uv).r;
  if (renderParams.useMono == 1u) {
    return vec4<f32>(value, value, value, 1.0);
  }
  let mapped = textureSample(lutTex, linearSampler, vec2<f32>(value, 0.5));
  return vec4<f32>(mapped.rgb, 1.0);
}
