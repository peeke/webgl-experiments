import { ShaderMaterial, Texture, Vector2 } from "three";
import vertexShader from "../glsl/vertex-shaders/basic.glsl";
import fragmentShader from "../glsl/fragment-shaders/normal-map.glsl";

// const dpr = window.devicePixelRatio;

function NormalMapMaterial(width, height) {
  return new ShaderMaterial({
    uniforms: {
      u_inv_resolution: {
        value: new Vector2(1 / width, 1 / height)
      },
      u_texture: {
        type: "t",
        value: new Texture()
      }
    },
    vertexShader,
    fragmentShader
  });
}

export { NormalMapMaterial };
