#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
precision mediump float;
#endif

// https://www.shadertoy.com/view/4t3GWM

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

vec2 screen2uv(in vec2 fragCoord)
{
    return fragCoord / u_resolution.xy;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = screen2uv(fragCoord);
  float height = texture(iChannel0, uv).x;
	fragColor = 0.5+vec4(height)*0.5;
	//fragColor = 0.5 + 0.5*texture(iChannel1, uv)*100.0;
    
  return;
  
  float t = dot(normalize(vec3(dFdx(height), dFdy(height), 1.)), normalize(vec3(1.)));
  t = max(0., t);
    
	fragColor = vec4(t);
}