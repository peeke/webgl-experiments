uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;

void main(){
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  float val=texture2D(u_texture,uv).x;
  
  float val_u=texture2D(u_texture,uv+vec2(u_inv_resolution.x,0.)).x;
  float val_v=texture2D(u_texture,uv+vec2(0.,u_inv_resolution.y)).x;
  
  float height=.015;
  vec3 normal=(.5*normalize(vec3(val-val_u,val-val_v,height))+.5);
  float angle=acos(dot(normal,vec3(.0,.0,1.)));
  
  float color=clamp(1.-sin(angle*1.33)/.00925,0.,1.);
  
  gl_FragColor=vec4(vec3(.5+.5*color),1.);
}