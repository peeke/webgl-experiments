#define POINTS_COUNT 0
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

uniform vec2 u_points_position[ 20 ];
uniform vec3 u_points_color[ 20 ];

float distanceSq(vec2 p1, vec2 p2) {
  vec2 d = p1 - p2;
  return dot(d, d);
}

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;

  float fsum = 0.0;
  vec3 col = vec3(0.0);

  for (int i = 0; i < 20; i++) {
    float d = smoothstep(-0.001, 10000.0, distanceSq(st, u_points_position[i] / u_resolution));
    float f = 1.0 / d;
    col += f * u_points_color[i];
    fsum += f;
  }

  col /= fsum;

  gl_FragColor = vec4(col, 1.0);
}
