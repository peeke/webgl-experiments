precision mediump float;

uniform float u_time;

void main() {
    float scale = 25.0;
    vec2 st = gl_FragCoord.xy / scale;
    float x = cos(u_time + st.x);
    float y = sin(u_time + st.y);
    float c = x * y;
    gl_FragColor = vec4(c, c, c, 1.0);
}