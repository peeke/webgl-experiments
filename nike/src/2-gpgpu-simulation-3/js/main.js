import GPUComputationRenderer from "../../vendor/yomboprime/GPUComputationRenderer";
import {
  PlaneGeometry,
  Mesh,
  PointLight,
  DirectionalLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  WebGLRenderTarget,
  Vector2,
  MeshPhongMaterial
} from "three";

import { NormalMapMaterial } from "./material";
import wavesFragmentShader from "../glsl/compute-shaders/waves.glsl";

import { startRecording, stopRecording, download } from "../../js/utils/record";

const rad = deg => (deg / 180) * Math.PI;

const canvas = document.querySelector("#canvas");
const { offsetWidth: width, offsetHeight: height } = canvas;
const calculateViewportHeight = (perspectiveAngle, distance) => {
  return Math.tan(rad(perspectiveAngle / 2)) * distance * 2;
};

console.log(width, height);

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({ canvas, alpha: true });
// renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);

const viewportHeight = calculateViewportHeight(75, 30);
const geometry = new PlaneGeometry(
  (viewportHeight * width) / height,
  viewportHeight,
  32
);

// const computeMaterial = new TextureMaterial(canvas);
const material = new MeshPhongMaterial({ color: 0x00c0ff });
const plane = new Mesh(geometry, material);
scene.add(plane);

const light = new DirectionalLight(0xffffff, 0.8, 100);
light.position.set(0, 0, 30);
light.lookAt(0, 0, 0);
scene.add(light);

const light2 = new PointLight(0xffffff, 1, 100);
light2.position.set(viewportHeight, 0, 0);
light.lookAt(0, 0, 0);
scene.add(light2);

const intermediateRenderTarget = new WebGLRenderTarget(width, height);
const intermediateScene = new Scene();
const intermediateCamera = camera.clone();

const normalMapMaterial = new NormalMapMaterial(width, height);
const normalMapPlane = new Mesh(geometry.clone(), normalMapMaterial);
intermediateScene.add(normalMapPlane);

const gpuCompute = new GPUComputationRenderer(width, height, renderer);
const gpTexture = gpuCompute.createTexture();
initTexture(gpTexture);

const gpVariable = gpuCompute.addVariable(
  "textureWaves",
  wavesFragmentShader,
  gpTexture
);
gpuCompute.setVariableDependencies(gpVariable, [gpVariable]);

gpVariable.material.uniforms = {
  u_inv_resolution: {
    value: new Vector2(1 / width, 1 / height)
  },
  u_mouse: {
    value: new Vector2(-2, -2)
  }
};

let mouse = new Vector2(-2, -2);
const offset = canvas.getBoundingClientRect();
window.addEventListener("mousemove", e => {
  mouse = new Vector2(e.clientX - offset.left, height - e.clientY + offset.top);
  // material.uniforms.u_mouse.needsUpdate = true;
});

const error = gpuCompute.init();
if (error !== null) {
  throw error;
}

function initTexture(texture) {
  const pixels = texture.image.data;
  const side = width;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0.5;
    pixels[i + 1] = 0.5;
    pixels[i + 2] = 0.5;
    pixels[i + 3] = 0.5;
  }
}

const render = () => {
  requestAnimationFrame(render);

  // Set uniforms: mouse interaction
  gpVariable.material.uniforms.u_mouse.value = mouse;

  // Do the gpu computation
  let i = 2;
  while (i--) {
    gpuCompute.compute();
  }

  // Get compute output in custom uniform
  const renderTarget = gpuCompute.getCurrentRenderTarget(gpVariable);
  normalMapMaterial.uniforms.u_texture.value = renderTarget.texture;
  renderer.render(
    intermediateScene,
    intermediateCamera,
    intermediateRenderTarget
  );

  material.normalMap = intermediateRenderTarget.texture;
  // material.displacementBias = 1.0;

  renderer.render(scene, camera);
};

render();

let recording = false;
document.addEventListener("keyup", e => {
  if (e.which !== 32) return;

  if (recording) {
    stopRecording();
    download();
    recording = false;
  } else {
    setTimeout(startRecording, 100);
    recording = true;
  }
});
