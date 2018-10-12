precision mediump float;

uniform vec2 resolution;
uniform float horizontalCells;
uniform float verticalCells;

uniform sampler2D grid;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  float x = floor(uv.x * horizontalCells) / horizontalCells;
  float y = floor(uv.y * verticalCells) / verticalCells;

  vec4 sample = texture2D(grid, vec2(x, y));

  gl_FragColor = vec4(sample.xyz, sample.w >= 1.0 / 255.0 ? 1.0 : 0.0);
}