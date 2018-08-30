precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

void main() {
  float f = u_resolution.x/u_resolution.y;
  vec2 st = gl_FragCoord.xy/u_resolution.xy;
  st.x *= f;

  vec2 st_mouse = u_mouse.xy/u_resolution.xy;
  st_mouse.x *= f;

  vec2 diff = st - st_mouse;

  vec3 color = vec3(step(.99, 1.0 - length(diff)));
  gl_FragColor = vec4(color,1.0);
}