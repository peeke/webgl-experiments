import GPUComputationRenderer from '../../vendor/yomboprime/GPUComputationRenderer'
import {
  PlaneGeometry,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector2,
  TextureLoader
} from "three";

import TexturePass from "../../js/utils/TexturePass";
import reactionDiffusionFragmentShader from '../glsl/compute-shaders/reaction-diffusion.glsl'
import displayShader from '../glsl/fragment-shaders/display.glsl'

import maskTexture from "../img/mask.png";

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

const displayPass = new TexturePass(renderer, displayShader);

const viewportHeight = calculateViewportHeight(75, 30);
const geometry = new PlaneGeometry(
  viewportHeight * width / height,
  viewportHeight,
  32
);

const material = new MeshBasicMaterial();
const plane = new Mesh(geometry, material);
scene.add(plane);

const light = new PointLight(0xffffff, 1, 100);
light.position.set(20, 10, 30);
scene.add(light);

window.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = (window.innerHeight - e.clientY) - rect.top
  gpVariable.material.uniforms.u_mouse.value = new Vector2(mouseX * dpr, mouseY * dpr)
})

const gpuCompute = new GPUComputationRenderer(width * dpr, height * dpr, renderer);
const gpTexture = gpuCompute.createTexture();
initTexture(gpTexture);

const gpVariable = gpuCompute.addVariable('textureReactionDiffusion', reactionDiffusionFragmentShader, gpTexture);
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
  },
  u_mouse: {
    value: new Vector2(-2, -2)
  },
  u_mask: {
    value: new TextureLoader().load(maskTexture)
  }
}

const error = gpuCompute.init();
if (error !== null) {
    throw error;
}

function initTexture(texture) {
  const pixels = texture.image.data;
  const radius = width * dpr *.9;
  for (let i = 0; i < pixels.length; i += 4) {
    const x = i / 4 % (width * dpr) - radius
    const y = i / 4 / (width * dpr) - radius
    const length = Math.sqrt(x ** 2 + y ** 2)
    // const solid = Math.round(length / 8 % 2)
    pixels[i] = 1;
    pixels[i + 1] = length < radius / 8 ? 1 : 0;
    pixels[i + 2] = 1;
    pixels[i + 3] = 1;
  }
}

const render = () => {
  
  requestAnimationFrame(render);

  // Set uniforms: mouse interaction
  gpVariable.material.uniforms.u_delta.value = 1000 / 60;

  // Do the gpu computation
  let i = 2
  while (i--) {
    gpuCompute.compute();
  }

  // Get compute output in custom uniform
  const renderTarget = gpuCompute.getCurrentRenderTarget(gpVariable)
  const displayTexture = displayPass.process(renderTarget.texture);

  material.map = displayTexture;

  renderer.render(scene, camera);

};

// window.addEventListener('keydown', e => {
//   if (e.code === 'Space') {
//     gpuCompute.compute();
//   }
// })

render();