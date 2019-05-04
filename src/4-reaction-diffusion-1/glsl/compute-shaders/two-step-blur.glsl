//"in" attributes from our vertex shader

uniform vec2 u_resolution;
uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;
uniform vec2 u_dir;
uniform float u_radius;

void main() {
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;

	//this will be our RGBA sum
	vec4 sum = vec4(0.0);
    
	float blur = u_radius;
    
	//apply blurring, using a 9-tap filter with predefined gaussian weights
    
	sum += texture2D(u_texture, uv - 4.0 * u_radius * u_dir * u_inv_resolution) * 0.0162162162;
	sum += texture2D(u_texture, uv - 3.0 * u_radius * u_dir * u_inv_resolution) * 0.0540540541;
	sum += texture2D(u_texture, uv - 2.0 * u_radius * u_dir * u_inv_resolution) * 0.1216216216;
	sum += texture2D(u_texture, uv - 1.0 * u_radius * u_dir * u_inv_resolution) * 0.1945945946;
	
	sum += texture2D(u_texture, uv) * 0.2270270270;
	
	sum += texture2D(u_texture, uv + 1.0 * u_radius * u_dir * u_inv_resolution) * 0.1945945946;
	sum += texture2D(u_texture, uv + 2.0 * u_radius * u_dir * u_inv_resolution) * 0.1216216216;
	sum += texture2D(u_texture, uv + 3.0 * u_radius * u_dir * u_inv_resolution) * 0.0540540541;
	sum += texture2D(u_texture, uv + 4.0 * u_radius * u_dir * u_inv_resolution) * 0.0162162162;

	//discard alpha for our simple demo, multiply by vertex color and return
	gl_FragColor = vec4(sum.rgb, 1.0);
}