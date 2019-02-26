uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;

void main(){
  
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  vec4 val=texture2D(u_texture,uv);
  float alpha=.2+.8*(val.x+val.y+val.z/3.);
  
  gl_FragColor=vec4(0.);//vec4(val.xyz,.5);
}