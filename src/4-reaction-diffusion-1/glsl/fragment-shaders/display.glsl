precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_texture;

void main() {
  
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec4 sampled = texture2D(u_texture, uv);

  float color = 1.0 - sampled.y * 4.0;

  gl_FragColor = vec4(vec3(color), 1.0);

}
