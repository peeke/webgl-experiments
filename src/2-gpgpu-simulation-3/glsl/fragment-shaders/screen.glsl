uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;
uniform sampler2D u_texture2;

void main(){
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  vec3 base=texture2D(u_texture,uv).xyz;
  vec3 blend=texture2D(u_texture2,uv).xyz;
  vec3 sample=min(base+blend,vec3(1.));
  gl_FragColor=vec4(sample,1.);
}