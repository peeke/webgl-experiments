uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;
uniform sampler2D u_texture2;

void main(){
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  vec4 sample=texture2D(u_texture,uv)*texture2D(u_texture2,uv);
  
  gl_FragColor=sample;
}