precision mediump float;

uniform vec2 resolution;
uniform float horizontalCells;
uniform float verticalCells;

uniform sampler2D tDiffuse;
uniform sampler2D grid;

const vec3 COLOR2 = vec3(255.0, 245.0, 30.0) / 255.0;
const vec3 COLOR1 = vec3(255.0, 0.0, 70.0) / 255.0;
const vec3 COLOR3 = vec3(46.0, 32.0, 103.0) / 255.0;

// vec4 cubic(float v) {
//   vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
//   vec4 s = n * n * n;
//   float x = s.x;
//   float y = s.y - 4.0 * s.x;
//   float z = s.z - 4.0 * s.y + 6.0 * s.x;
//   float w = 6.0 - x - y - z;
//   return vec4(x, y, z, w) * (1.0/6.0);
// }

// vec4 textureBicubic(sampler2D sampler, vec2 texCoords, vec2 texSize) {

//   vec2 invTexSize = 1.0 / texSize;
   
//   vec4 baseSample = texture2D(sampler, texCoords);

//   texCoords = texCoords * texSize - 0.5;
   
//   vec2 fxy = fract(texCoords);
//   texCoords -= fxy;

//   vec4 xcubic = cubic(fxy.x);
//   vec4 ycubic = cubic(fxy.y);

//   vec4 c = texCoords.xxyy + vec2(-0.5, +1.5).xyxy;
  
//   vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
//   vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;
  
//   offset *= invTexSize.xxyy;
  
//   vec4 sample0 = texture2D(sampler, offset.xz);
//   vec4 sample1 = texture2D(sampler, offset.yz);
//   vec4 sample2 = texture2D(sampler, offset.xw);
//   vec4 sample3 = texture2D(sampler, offset.yw);

//   float sx = s.x / (s.x + s.y);
//   float sy = s.z / (s.z + s.w);

//   return mix(
//     mix(sample3, sample2, sx), mix(sample1, sample0, sx), 
//     sy
//   );
// }

float min(float a, float b, float c) {
  return min(min(a, b), c);
}

float max(float a, float b, float c) {
  return max(max(a, b), c);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 sil = texture2D(tDiffuse, uv);

  float n1weight = min(sil.x, sil.y, sil.z);
  vec3 n1color = sil.x == n1weight
    ? COLOR1 
    : sil.y == n1weight ? COLOR2 : COLOR3;

  float n3weight = max(sil.x, sil.y, sil.z);
  vec3 n3color = sil.x == n3weight
    ? COLOR1 
    : sil.y == n3weight ? COLOR2 : COLOR3;

  float n2weight = (sil.x == n1weight && sil.y == n3weight
    ? sil.z
    : sil.x == n1weight && sil.z == n3weight
      ? sil.y
      : sil.x);

  vec3 n2color = sil.x == n2weight
    ? COLOR1 
    : sil.y == n2weight ? COLOR2 : COLOR3;

  n1weight = 1.0 - n1weight;
  n2weight = 1.0 - n2weight;
  n3weight = 1.0 - n3weight;

  vec3 color = (
      n1color * 8.0 + 
      n2color * max(0.0, pow(1.0 - n1weight + n2weight, 1.0)) +
      n3color * max(0.0, pow(1.0 - n1weight + n3weight, 1.0)) + 
      0.0
    ) / (
      8.0 +
      max(0.0, pow(1.0 - n1weight + n2weight, 1.0)) + 
      max(0.0, pow(1.0 - n1weight + n3weight, 1.0)) + 
      0.0
    );
  
  bool o = min(sil.x, sil.y, sil.z) <= .5;

  gl_FragColor = vec4(color, o ? 1.0 : 0.0);
}