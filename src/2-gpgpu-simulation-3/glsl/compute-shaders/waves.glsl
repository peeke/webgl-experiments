
uniform vec2 u_mouse;
uniform vec2 u_inv_resolution;
uniform sampler2D u_waveMask;

#define OX vec2(1.,.0)
#define OY vec2(0.,1.)

vec4 sample(vec2 p){
  vec2 uv=p*u_inv_resolution;
  return texture2D(textureWaves,uv);
}

vec4 sample(vec2 p,vec2 o){
  vec2 uv=p*u_inv_resolution;
  vec2 no=o*u_inv_resolution;
  
  // Bounce at the edges of the wave mask
  if(texture2D(u_waveMask,uv+no).x<1.){
    return texture2D(textureWaves,uv);
  }
  
  return texture2D(textureWaves,uv+no);
}

float dot(vec2 v){
  return dot(v,v);
}

float lerp(float a,float b,float t){
  return a+clamp(t,0.,1.)*(b-a);
}

void main(){
  
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  vec2 t=gl_FragCoord.xy;
  
  // https://web.archive.org/web/20160418004149/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm
  // Buffer1 = x
  // Buffer2 = y
  
  float surroundSample=
  sample(t,OX).x+
  sample(t,-OX).x+
  sample(t,OY).x+
  sample(t,-OY).x;
  
  float height=surroundSample/2.-sample(t).y;
  
  // Mouse
  float dist=length(u_mouse-t.xy);
  if(dist<40.){
    float t=1.-dist/40.;
    float eased=(1.+sin(3.1415*t-3.1415/2.))/2.;
    height=lerp(height,height+.00025,eased);
  }
  
  // Diffuse
  height=height*.999+(surroundSample)/4.*.001;
  
  // Dampen
  height=clamp(height*.9995+.5*.0005,0.,1.);
  
  // Update
  float newColor=height;
  float oldColor=sample(t).x;
  
  gl_FragColor=vec4(newColor,oldColor,1.,1.);
  
}
