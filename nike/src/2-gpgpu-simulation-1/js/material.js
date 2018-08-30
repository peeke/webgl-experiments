import { ShaderMaterial, Texture, Vector2 } from "three";
import vertexShader from "../glsl/vertex-shaders/basic.glsl";
import fragmentShader from "../glsl/fragment-shaders/basic.glsl";

const dpr = window.devicePixelRatio

function TextureMaterial() {
  return new ShaderMaterial({
    uniforms: {
      u_inv_resolution: {
        value: new Vector2(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr))
      },
      u_resolution: {
        value: new Vector2(window.innerWidth * dpr, window.innerHeight * dpr)
      },
      u_texture: {
        type: 't',
        value: new Texture()
      }
    },
    vertexShader,
    fragmentShader
  });
}

export {
  TextureMaterial
}