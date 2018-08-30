import GPUComputationRenderer from '../../vendor/yomboprime/GPUComputationRenderer'
import {
  PlaneGeometry,
  Mesh,
  PointLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector2
} from "three";

import { TextureMaterial } from './material';
import velocityDensityFragmentShader from '../glsl/compute-shaders/velocity-density.glsl'

const canvas = document.querySelector("#canvas");
const dpr = window.devicePixelRatio
const { offsetWidth: width, offsetHeight: height } = canvas;
const calculateViewportHeight = (perspectiveAngle, distance) => {
  return Math.tan(perspectiveAngle / 180 * Math.PI) * distance;
};

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({ canvas, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);

const viewportHeight = calculateViewportHeight(75, 30);
const geometry = new PlaneGeometry(
  viewportHeight * width / height,
  viewportHeight,
  32
);

const material = new TextureMaterial();
const plane = new Mesh(geometry, material);
scene.add(plane);

const light = new PointLight(0xffffff, 1, 100);
light.position.set(20, 10, 30);
scene.add(light);

// window.addEventListener('mousemove', e => {
//   material.uniforms.u_mouse.value = new Vector2(e.clientX * dpr, (window.innerHeight - e.clientY) * dpr)
// })

const gpuCompute = new GPUComputationRenderer(width * dpr, height * dpr, renderer);
const gpTexture = gpuCompute.createTexture();
initTexture(gpTexture);

const gpVariable = gpuCompute.addVariable('textureVelocityDensity', velocityDensityFragmentShader, gpTexture);
gpuCompute.setVariableDependencies(gpVariable, [gpVariable]);

gpVariable.material.uniforms = {
  u_inv_resolution: {
    value: new Vector2(1 / (width * dpr), 1 / (height * dpr))
  },
  u_resolution: {
    value: new Vector2(width * dpr, height * dpr)
  },
  u_delta: {
    value: 1000 / 60
  }
}

const error = gpuCompute.init();
if (error !== null) {
    throw error;
}

function initTexture(texture) {
  const pixels = texture.image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.random();
    pixels[i + 1] = Math.random();
    pixels[i + 2] = Math.random();
    pixels[i + 3] = 1;
  }
}

const render = () => {
  
  requestAnimationFrame(render);

  // Set uniforms: mouse interaction
  gpVariable.material.uniforms.u_delta.value = 1000 / 60;

  // Do the gpu computation
  gpuCompute.compute();

  // Get compute output in custom uniform
  const renderTarget = gpuCompute.getCurrentRenderTarget(gpVariable)
  material.uniforms.u_texture.value = renderTarget.texture;

  renderer.render(scene, camera);

};

render();