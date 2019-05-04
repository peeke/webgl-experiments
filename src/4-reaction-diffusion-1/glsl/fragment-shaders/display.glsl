precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_texture;

void main() {
  
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec4 sampled = texture2D(u_texture, uv);

  float color = sampled.x - sampled.y;

  gl_FragColor = vec4(vec3(smoothstep(0.0, 1.0, color)), 1.0);

}
