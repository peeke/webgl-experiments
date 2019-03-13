uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;

void main(){
  
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  vec4 s=texture2D(u_texture,uv);
  float val=s.xyz*s.w+vec3(1.)*(1.-s.w);
  
  gl_FragColor=vec4(vec3(val),1.);
  
}