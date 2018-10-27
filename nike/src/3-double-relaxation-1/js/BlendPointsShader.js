import basicVertexShader from "../glsl/vertex-shaders/basic.glsl";
import blendPointsFragmentShader from "../glsl/fragment-shaders/blend-points.glsl";

import { Vector2 } from "three";

const dpr = window.devicePixelRatio;

const BlendPointsShader = {
  uniforms: {
    resolution: {
      value: new Vector2(window.innerWidth * dpr, window.innerHeight * dpr)
    },
    horizontalCells: { value: 48 },
    verticalCells: { value: 48 },
    grid: {
      value: null
    }
  },
  vertexShader: basicVertexShader,
  fragmentShader: blendPointsFragmentShader
};

export default BlendPointsShader;
