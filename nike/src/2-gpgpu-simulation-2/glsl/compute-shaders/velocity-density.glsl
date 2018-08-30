
uniform float u_delta;
uniform vec2 u_resolution;
uniform vec2 u_inv_resolution;
uniform float u_gravity;

float overlap(vec2 a, vec2 b) {
  float left = max(a.x, b.x);
  float right = min(a.x + 1.0, b.x + 1.0);
  float bottom = max(a.y, b.y);
  float top = min(a.y + 1.0, b.y + 1.0);
  return max(1.0, (right - left) * (top - bottom));
}

vec4 sample(vec2 p) {
  vec2 uv = p * u_inv_resolution;
  if (uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture2D(textureVelocityDensity, uv);
}

void main() {

  vec2 uv = gl_FragCoord.xy * u_inv_resolution.xy;
  vec2 t = gl_FragCoord.xy;

  vec2 v = texture2D(textureVelocityDensity, uv).xy;
  float d = texture2D(textureVelocityDensity, uv).z;

  vec2 nextt = t + sign(v);

  // Factor leaving speed and density
  d = clamp(d - d * abs(v.y), 0.0, 1.0);
  v.y -= abs(v.y * v.y);

  // Factor incoming speed and density
  vec4 s = sample(t + vec2(0.0, -1.0));
  if (s.y > 0.0) {
    d += s.z * abs(s.y);
    v.y += s.y * abs(s.y);
  }

  vec4 n = sample(t + vec2(0.0, 1.0));
  if (n.y < 0.0) {
    d += n.z * abs(n.y);
    v.y += n.y * abs(n.y);
  }

  // Apply forces
  v.y = clamp(v.y - u_gravity * u_delta, -1.0, 1.0);

  // Bounce
  // if (nextt.y < 0.0) {
  //   v.y *= -1.0;
  // }

  gl_FragColor = vec4(vec3(v.x, v.y, d), 1.0);

}
