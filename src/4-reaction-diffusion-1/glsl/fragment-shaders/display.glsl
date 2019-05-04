precision mediump float;

#define colorA vec3(255.0, 222.0, 0.0) / 255.0
#define colorB vec3(229.0, 22.0, 97.0) / 255.0
#define colorC vec3(12.0, 19.0, 79.0) / 255.0

uniform vec2 u_resolution;
uniform sampler2D u_texture;
uniform sampler2D u_mask;

void main() {
  
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec4 sampled = texture2D(u_texture, uv);

  float color = sampled.x - sampled.y;
  vec3 result = color < .5
    ? mix(colorA, colorB, smoothstep(0.1, .9, color / .5))
    : mix(colorB, colorC, smoothstep(0.1, .9, (color - .5) / .5));

  gl_FragColor = vec4(result, 1.0);

}
