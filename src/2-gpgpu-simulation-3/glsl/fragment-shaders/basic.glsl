precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_texture;

void main(){
  
  vec2 uv=gl_FragCoord.xy/u_resolution.xy;
  vec4 tex=texture2D(u_texture,uv);
  
  gl_FragColor=vec4(vec3(tex.x),1.);
  
}
