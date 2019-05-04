#define FEED_RATE .042 // 0.042 // 0.042 // 0.03
#define KILL_RATE .063 // 0.063 // 0.063 // 0.058
#define DIFFUSION_A 1.0
#define DIFFUSION_B .4

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;
uniform sampler2D u_mask;

vec4 sample(vec2 uv){
  return texture2D(u_texture,uv);
}

vec4 sample(vec2 uv,vec2 o){
  vec2 no=o*u_inv_resolution;
  
  if(texture2D(u_mask, uv+no).x<.5){
    return texture2D(u_texture,uv);
  }
  
  return texture2D(u_texture,uv+no);
}

void main(){
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;
  vec4 sampled=sample(uv);
  
  vec4 lapla=sampled*-1.+

    sample(uv,vec2(-1.,.0)) * .057+
    sample(uv,vec2(1.,.0)) * .057+
    sample(uv,vec2(.0,-1.)) * .057+
    sample(uv,vec2(.0,1.)) * .057+
    sample(uv,vec2(-1.,-1.)) * .057+
    sample(uv,vec2(1.,1.)) * .057+
    sample(uv,vec2(1.,-1.)) * .057+
    sample(uv,vec2(-1.,1.)) * .057+

    sample(uv,vec2(-2.,.0)) * .054+
    sample(uv,vec2(2.,.0)) * .054+
    sample(uv,vec2(.0,-2.)) * .054+
    sample(uv,vec2(.0,2.)) * .054+

    sample(uv,vec2(-2.,1.)) * .041+
    sample(uv,vec2(-2.,-1.)) * .041+
    sample(uv,vec2(2.,1.)) * .041+
    sample(uv,vec2(2.,-1.)) * .041+
    sample(uv,vec2(1.,-2.)) * .041+
    sample(uv,vec2(-1.,-2.)) * .041+
    sample(uv,vec2(1.,2.)) * .041+
    sample(uv,vec2(-1.,2.)) * .041;
    

  float k = KILL_RATE;// + uv.x * -.0125;
  float f = FEED_RATE;// + uv.y * -.025;

  float a = clamp(sampled.x+(DIFFUSION_A*lapla.x) - sampled.x * sampled.y * sampled.y + f * (1.0 - sampled.x), 0.0, 1.0);
  float b = clamp(sampled.y+(DIFFUSION_B*lapla.y) + sampled.x * sampled.y * sampled.y - (k + f) * sampled.y, 0.0, 1.0);
  
  float distance = length(gl_FragCoord.xy - u_mouse);
  if (distance < 32.0) {
    a = mix(1., a, distance / 32.0);
    b = mix(.0, b, distance / 32.0);
  }

  float maskValue = texture2D(u_mask, uv).x;
  if(maskValue<1.){
    a = mix(1.0, a, maskValue);
    b = mix(0., b, maskValue);
  }

  gl_FragColor=vec4(a, b, sampled.zw);
}
