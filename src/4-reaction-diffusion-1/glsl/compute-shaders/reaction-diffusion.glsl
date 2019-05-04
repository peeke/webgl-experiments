uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;
uniform sampler2D u_mask;
uniform sampler2D u_blurred_x;
uniform sampler2D u_blurred_y;
uniform float u_feed_rate;
uniform float u_kill_rate;

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

  float a = clamp(texture2D(u_blurred_x,uv).x - sampled.x * sampled.y * sampled.y + u_feed_rate * (1.0 - sampled.x), 0.0, 1.0);
  float b = clamp(texture2D(u_blurred_y,uv).y + sampled.x * sampled.y * sampled.y - (u_kill_rate + u_feed_rate) * sampled.y, 0.0, 1.0);
  
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
