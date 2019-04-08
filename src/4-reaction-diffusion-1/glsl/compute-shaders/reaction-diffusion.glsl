
uniform float u_delta;
uniform vec2 u_resolution;
uniform vec2 u_inv_resolution;

vec4 blur(sampler2D texture,vec2 uv,vec2 direction){
  vec4 color=vec4(0.);
  vec2 off1=vec2(1.3333333333333333)*direction;
  color+=texture2D(texture,uv)*.29411764705882354;
  color+=texture2D(texture,uv+(off1*u_inv_resolution))*.35294117647058826;
  color+=texture2D(texture,uv-(off1*u_inv_resolution))*.35294117647058826;
  return color;
}

void main(){
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  vec4 diffused1=(blur(textureReactionDiffusion,uv,vec2(4.,0.))+blur(textureReactionDiffusion,uv,vec2(0.,4.)))/2.;
  vec4 diffused4=(blur(textureReactionDiffusion,uv,vec2(16.,0.))+blur(textureReactionDiffusion,uv,vec2(0.,16.)))/2.;
  
  vec4 diff=diffused4-diffused1;
  vec4 amplified = (vec4(-.25) + diff) * 10.0;
  
  gl_FragColor=clamp(amplified,vec4(0.,0.,0.,1.),vec4(1.));
  
}
