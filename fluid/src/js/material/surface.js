import { ShaderMaterial, Vector2, ShaderLib, UniformsUtils } from "three";
import vertexShader from "../../glsl/vertex-shaders/surface.glsl";

const fragmentShader = ShaderLib.normal.fragmentShader;
const vertexShader = ShaderLib.normal.vertexShader;
const uniforms = UniformsUtils.clone(ShaderLib.normal.uniforms);
console.log(ShaderLib.normal.vertexShader);
// todo: Object.assign --> {...}

export default function SurfaceMaterial() {
  return new ShaderMaterial({
    uniforms: Object.assign(uniforms, {
      ambientLightColor: { value: [1, 0, 0] }, // Material color
      u_time: { value: performance.now() / 1000 },
      u_resolution: {
        value: new Vector2(window.innerWidth, window.innerHeight)
      },
      lights: true
    }),
    vertexShader,
    fragmentShader
  });
}
