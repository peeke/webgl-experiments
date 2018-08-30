#define POINTS_COUNT 0
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

uniform vec2 u_points_position[ 20 ];
uniform vec3 u_points_color[ 20 ];

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;

  float wei = 0.0;
  vec3 col = vec3(0.0, 0.0, 0.0);
  for (int i = 0; i < 20; i++) {
    vec2 _diff = st - u_points_position[i] / u_resolution;
    float _wei = 1.0 - dot(_diff, _diff) / 2.0;
    _wei = pow(_wei, _wei * 50.0);
    col += u_points_color[i] * _wei;
    wei += _wei;
  }

  vec2 _diff = st - u_mouse / u_resolution;
    float _wei = 1.0 - dot(_diff, _diff) / 2.0;
    _wei = pow(_wei, _wei * 50.0);
    col += vec3(1.0,1.0,1.0) * _wei;
    wei += _wei;

  col /= wei;

  gl_FragColor = vec4(col, 1.0);
}
