uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;

#define REFRACTION 1.33
#define LIGHT normalize(vec3(1.,1.,1.))
#define DEPTH 10.
// #define HALF_SUNDISK .004884

float caustic(vec2 uv){
  vec4 normal=(texture2D(u_texture,uv)-.5)*2.;
  float angle=acos(dot(normal.xyz,LIGHT));
  return 1.-clamp(angle*REFRACTION,0.,1.25)/1.2;
}

void main(){
  vec2 d=LIGHT.xy/LIGHT.z*DEPTH;
  vec2 uv=(gl_FragCoord.xy+d)*u_inv_resolution.xy;
  
  float color=caustic(uv);
  
  gl_FragColor=vec4(vec3(color*.4),1.);
}