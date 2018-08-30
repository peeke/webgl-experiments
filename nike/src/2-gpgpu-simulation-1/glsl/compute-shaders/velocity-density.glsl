
uniform float u_delta;
uniform vec2 u_resolution;
uniform vec2 u_inv_resolution;

void main() {

  vec2 uv = gl_FragCoord.xy * u_inv_resolution.xy;

  vec3 value = texture2D(textureVelocityDensity, uv).xyz;
  value = fract(value + vec3(0.01, 0.01, 0.01));

  //Find neighboring velocities:
  vec2 t = gl_FragCoord.xy;
  vec2 n = texture2D(textureVelocityDensity, vec2(t.x, t.y + 1.0) * u_inv_resolution).xy;
  vec2 s = texture2D(textureVelocityDensity, vec2(t.x, t.y - 1.0) * u_inv_resolution).xy;
  vec2 e = texture2D(textureVelocityDensity, vec2(t.x + 1.0, t.y) * u_inv_resolution).xy; 
  vec2 w = texture2D(textureVelocityDensity, vec2(t.x - 1.0, t.y) * u_inv_resolution).xy; 

  gl_FragColor = vec4(value, 1.0);

}
