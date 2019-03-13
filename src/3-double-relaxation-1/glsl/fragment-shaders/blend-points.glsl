precision mediump float;

uniform vec2 resolution;
uniform float horizontalCells;
uniform float verticalCells;

uniform sampler2D tDiffuse;
uniform sampler2D grid;

const vec3 COLOR1 = vec3(46.0, 32.0, 103.0) / 255.0;
const vec3 COLOR2 = vec3(0.0, 125.0, 255.0) / 255.0;
const vec3 COLOR3 = vec3(0.0, 230.0, 180.0) / 255.0;

float min(float a, float b, float c) {
  return min(min(a, b), c);
}

float max(float a, float b, float c) {
  return max(max(a, b), c);
}

vec4 sample(vec2 uv) {
  vec4 source = texture2D(tDiffuse, uv);
  
  vec3 color = vec3(0.0);
  float weight = 0.0;
  float minval = min(source.x, source.y, source.z);
  float maxval = max(source.x, source.y, source.z);

  if (source.x != minval) {
    color += COLOR1 * source.x;
    weight += source.x;
  }

  if (source.y != minval) {
    color += COLOR2 * source.y;
    weight += source.y;
  }

  if (source.z != minval) {
    color += COLOR3 * source.z;
    weight += source.z;
  }

  if (source.x == maxval) {
    color += COLOR1 * source.x * 2.5;
    weight += source.x * 2.5;
  }

  if (source.y == maxval) {
    color += COLOR2 * source.y * 2.5;
    weight += source.y * 2.5;
  }

  if (source.z == maxval) {
    color += COLOR3 * source.z * 2.5;
    weight += source.z * 2.5;
  }

  color /= weight;
  
  return maxval >= .1
    ? vec4(color, maxval * 9.0)
    : vec4(1.0, 1.0, 1.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 step = vec2(1.0) / resolution.xy;
  
  vec4 color = sample(uv);

  gl_FragColor = color;
}