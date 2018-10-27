precision mediump float;

uniform vec2 resolution;
uniform float horizontalCells;
uniform float verticalCells;

uniform sampler2D grid;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  // vec2 suv = gl_FragCoord / vec2(horizontalCells, verticalCells);

  float dx = 1.0 / horizontalCells;
  float dy = 1.0 / verticalCells;
  
  vec4 sample = texture2D(grid, uv + vec2(dx * 0.5, dy * 0.5));

  vec2 weight = fract(uv * vec2(horizontalCells, verticalCells));

  vec4 bottomleft = texture2D(grid, uv);
  vec4 bottomright = texture2D(grid, uv + vec2(dx, 0.0));
  vec4 bottom = mix(
    bottomleft.w > 0.0 ? bottomleft : sample,
    bottomright.w > 0.0 ? bottomright : sample,
    weight.x
  );

  vec4 topleft = texture2D(grid, uv + vec2(0.0, dy));
  vec4 topright = texture2D(grid, uv + vec2(dx, dy));
  vec4 top = mix(
    topleft.w > 0.0 ? topleft : sample,
    topright.w > 0.0 ? topright : sample,
    weight.x
  );
  
  vec4 color = mix(
    bottom.w > 0.0 ? bottom : sample, 
    top.w > 0.0 ? top : sample, 
    weight.y
  );

  gl_FragColor = vec4(color.xyz, 1.0);
}