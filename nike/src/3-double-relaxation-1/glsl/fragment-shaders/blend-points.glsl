precision mediump float;

uniform vec2 resolution;
uniform float horizontalCells;
uniform float verticalCells;

uniform sampler2D grid;

vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0/6.0);
}

vec4 textureBicubic(sampler2D sampler, vec2 texCoords, vec2 texSize) {

  vec2 invTexSize = 1.0 / texSize;
   
  vec4 baseSample = texture2D(sampler, texCoords);

  texCoords = texCoords * texSize - 0.5;
   
  vec2 fxy = fract(texCoords);
  texCoords -= fxy;

  vec4 xcubic = cubic(fxy.x);
  vec4 ycubic = cubic(fxy.y);

  vec4 c = texCoords.xxyy + vec2(-0.5, +1.5).xyxy;
  
  vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
  vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;
  
  offset *= invTexSize.xxyy;
  
  vec4 sample0 = texture2D(sampler, offset.xz);
  vec4 sample1 = texture2D(sampler, offset.yz);
  vec4 sample2 = texture2D(sampler, offset.xw);
  vec4 sample3 = texture2D(sampler, offset.yw);

  // todo: this is for when enable marching squares
  // sample0 = sample0.w > 0.0 ? sample0 : baseSample;
  // sample1 = sample1.w > 0.0 ? sample1 : baseSample;
  // sample2 = sample2.w > 0.0 ? sample2 : baseSample;
  // sample3 = sample3.w > 0.0 ? sample3 : baseSample;

  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);

  return mix(
    mix(sample3, sample2, sx), mix(sample1, sample0, sx), 
    sy
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  // vec4 sample = texture2D(grid, uv);
  vec4 sample = textureBicubic(grid, uv, vec2(horizontalCells, verticalCells));

  gl_FragColor = vec4(sample.xyz, sample.w > 0.0 ? 1.0 : 0.0);
}