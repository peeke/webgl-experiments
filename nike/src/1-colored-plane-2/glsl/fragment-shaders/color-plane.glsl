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

  vec3 closest1;
  vec3 closest2;
  vec3 closest3;
  vec3 distances = vec3(dot(u_resolution, u_resolution));

  for (int i = 0; i < 20; i++) {
    float d = distanceSq(st, u_points_position[i] / u_resolution);
    if (d < distances.x) {
      distances = vec3(d, distances.x, distances.y);
      closest3 = closest2;
      closest2 = closest1;
      closest1 = u_points_color[i];
    } else if (d < distances.y) {
      distances = vec3(distances.x, d, distances.y);
      closest3 = closest2;
      closest2 = u_points_color[i];
    } else if (d < distances.z) {
      distances = vec3(distances.x, distances.y, d);
      closest3 = u_points_color[i];
    }
  }

  vec3 f = vec3(1.0) / distances;
  float fsum = dot(f, vec3(1.0));
  vec3 col = vec3(0.0);
  col += closest1 * f.x;
  col += closest2 * f.y;
  col += closest3 * f.z;
  col /= fsum;

  gl_FragColor = vec4(col, 1.0);
}
