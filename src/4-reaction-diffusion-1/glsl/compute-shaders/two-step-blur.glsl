//"in" attributes from our vertex shader

uniform vec2 u_resolution;
uniform vec2 u_inv_resolution;
uniform sampler2D u_texture;
uniform vec2 u_dir;
uniform float u_radius;

void main() {
  vec2 uv=gl_FragCoord.xy*u_inv_resolution.xy;

	vec4 sum = vec4(0.0);
    
	float blur = u_radius / 2.0;
    
	// weights from: http://dev.theomader.com/gaussian-kernel-calculator/
    
	sum += texture2D(u_texture, uv - 2.0 * blur * u_dir * u_inv_resolution) * 0.06136;
	sum += texture2D(u_texture, uv - 1.0 * blur * u_dir * u_inv_resolution) * 0.24477;
	sum += texture2D(u_texture, uv) * 0.38774;
	sum += texture2D(u_texture, uv + 1.0 * blur * u_dir * u_inv_resolution) * 0.24477;
	sum += texture2D(u_texture, uv + 2.0 * blur * u_dir * u_inv_resolution) * 0.06136;

	gl_FragColor = vec4(sum.rgb, 1.0);
}