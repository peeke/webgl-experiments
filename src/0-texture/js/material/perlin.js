import { ShaderMaterial, Vector2 } from "three";
import vertexShader from "../../glsl/vertex-shaders/basic.glsl";
import fragmentShader from "../../glsl/fragment-shaders/classic-perlin-3d.glsl";

// Is this a factory or a facade?
export default function PerlinMaterial() {
  return new ShaderMaterial({
    uniforms: {
      u_time: { value: performance.now() / 1000 },
      u_resolution: {
        value: new Vector2(window.innerWidth, window.innerHeight)
      }
    },
    vertexShader,
    fragmentShader
  });
}
