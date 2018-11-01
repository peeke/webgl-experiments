precision mediump float;

uniform vec2 resolution;
uniform float horizontalCells;
uniform float verticalCells;

uniform sampler2D tDiffuse;
uniform sampler2D grid;

const vec3 COLOR1 = vec3(244.0, 60.0, 108.0) / 255.0;
const vec3 COLOR2 = vec3(25.0, 236.0, 184.0) / 255.0;
const vec3 COLOR3 = vec3(48.0, 48.0, 163.0) / 255.0;

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
  // vec4 sample = textureBicubic(grid, uv, vec2(horizontalCells, verticalCells));
  vec4 sil = texture2D(tDiffuse, uv);

  vec3 color = sil.x > sil.y && sil.x > sil.z 
    ? COLOR1
    : sil.y > sil.z ? COLOR2 : COLOR3;

  float o = sil.x + sil.y + sil.z / 3.0;
  bool solid = sil.x <= 0.5 || sil.y <= 0.5 || sil.z <= 0.5;

  gl_FragColor = vec4(color, solid ? 1.0 : 0.0);
}