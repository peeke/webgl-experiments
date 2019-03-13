import { ShaderMaterial, Vector2, Vector3 } from "three";
import vertexShader from "../../glsl/vertex-shaders/basic.glsl";
import fragmentShader from "../../glsl/fragment-shaders/color-plane.glsl";

const dpr = window.devicePixelRatio
const colors = Array(20).fill(0).map(() => {
  // return new Vector3(1,1,1)
  return new Vector3(Math.random(), Math.random(), Math.random())
})

const positions = Array(16).fill(0).map(() => {
  return new Vector2(Math.random() * window.innerWidth * dpr, Math.random() * window.innerHeight * dpr)
})

positions.push(new Vector2(0, 0))
positions.push(new Vector2(window.innerWidth * dpr, 0))
positions.push(new Vector2(0, window.innerHeight * dpr))
positions.push(new Vector2(window.innerWidth * dpr, window.innerHeight * dpr))

export default function PerlinMaterial() {
  return new ShaderMaterial({
    uniforms: {
      u_time: { value: performance.now() / 1000 },
      u_resolution: {
        value: new Vector2(window.innerWidth * dpr, window.innerHeight * dpr)
      },
      u_mouse: {
        value: new Vector2(-window.innerWidth * dpr, -window.innerHeight * dpr)
      },
      u_points_color: {
        type: 'v3v',
        value: colors 
      },
      u_points_position: {
        type: 'v2v',
        value: positions
      }
    },
    vertexShader,
    fragmentShader
  });
}
