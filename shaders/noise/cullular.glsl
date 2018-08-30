// Author: @patriciogv
// Title: CellularNoise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

vec2 random2( vec2 p ) {
  return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

void main() {
  
  vec2 st = gl_FragCoord.xy/u_resolution.x;
  vec2 st_mouse = u_mouse.xy/u_resolution.x;
  vec3 color = vec3(.0);

  // Scale
  st *= 3.;
  st_mouse *= 3.;

  // Tile the space
  vec2 i_st = floor(st);
  vec2 f_st = fract(st);

  float m_dist = 1.;  // minimun distance

  for (int y= -1; y <= 1; y++) {
    for (int x= -1; x <= 1; x++) {
      // Neighbor place in the grid
      vec2 neighbor = vec2(float(x),float(y));

      // Animate the point
      // vec2 point = 0.5 + 0.5*sin(u_time + 6.2831*random2(i_st + neighbor));
      vec2 point = 0.5 + 0.5*sin(6.2831*random2(i_st + neighbor));

      // Vector between the pixel and the point
      vec2 diff = neighbor + point - f_st;
      vec2 diff_mouse = st - st_mouse;

      // Keep the closer distance
      m_dist = min(m_dist, length(diff));
      m_dist = min(m_dist, length(diff_mouse));
    }
  }

  // Draw the min distance (distance field)
  color += m_dist;

  // Draw cell center
  color += 1.-step(.02, m_dist);

  // Draw grid
  color.r += step(.98, f_st.x) + step(.98, f_st.y);

  // Show isolines
  // color -= step(.7,abs(sin(27.0*m_dist)))*.5;

  gl_FragColor = vec4(color,1.0);
}
