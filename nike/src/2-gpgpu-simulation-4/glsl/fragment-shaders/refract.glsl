uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;
uniform sampler2D u_refract;

void main(){
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  vec2 d=texture2D(u_refract,uv).xy*u_inv_resolution.xy-u_inv_resolution.xy*.5;
  vec4 sample=texture2D(u_texture,uv+d*200.);
  
  gl_FragColor=sample;
}