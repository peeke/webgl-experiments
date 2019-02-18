
uniform vec2 u_mouse;
uniform vec2 u_inv_resolution;

vec4 s(vec2 p){
  vec2 uv=p*u_inv_resolution;
  return texture2D(textureWaves,uv);
}

vec4 s(vec2 p,vec2 o){
  vec2 uv=p*u_inv_resolution;
  vec2 no=o*u_inv_resolution;
  
  vec2 normalized=(uv-vec2(.5)+no)*2.;
  if(length(normalized)>.99){
    return texture2D(textureWaves,uv);
  }
  
  return texture2D(textureWaves,uv+no);
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
  
  vec2 ox=vec2(1.,.0);// offsetX
  vec2 oy=vec2(.0,1.);// offsetY
  
  float color=(s(t,ox).x+s(t,-ox).x+s(t,oy).x+s(t,-oy).x)/2.-s(t).y;
  
  float dist=length(u_mouse-t.xy);
  if(dist<40.){
    float t=1.-dist/40.;
    float eased=(1.+sin(3.1415*t-3.1415/2.))/2.;
    color=lerp(color,color+.005*eased,eased);
  }
  
  vec2 normalized=(uv-vec2(.5))*2.;
  if(length(normalized)>1.){
    color=1.;
  }
  
  color=color*.9995+(s(t,ox).x+s(t,-ox).x+s(t,oy).x+s(t,-oy).x)/4.*.0005;
  
  float newColor=clamp(color*.995+.5*.005,0.,1.);
  float oldColor=s(t).x;
  
  gl_FragColor=vec4(newColor,oldColor,1.,1.);
  // gl_FragColor=vec4(u_mouse.x*u_inv_resolution.x);
  
}
