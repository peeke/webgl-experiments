import GPUComputationRenderer from "../../vendor/yomboprime/GPUComputationRenderer";
import {
  PlaneGeometry,
  CircleGeometry,
  Mesh,
  PointLight,
  AmbientLight,
  DirectionalLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  WebGLRenderTarget,
  Vector2,
  MeshBasicMaterial,
  MeshPhongMaterial,
  MeshLambertMaterial,
  SphereGeometry,
  CubeTextureLoader,
  MixOperation,
  RGBFormat
} from "three";

import TexturePass from "../../js/utils/TexturePass";
import normalMapShader from "../glsl/fragment-shaders/normal-map.glsl";
import overlayShader from "../glsl/fragment-shaders/overlay-blending.glsl";
import wavesShader from "../glsl/compute-shaders/waves.glsl";
import causticsShader from "../glsl/fragment-shaders/caustics.glsl";

import { startRecording, stopRecording, download } from "../../js/utils/record";
import envPx from "../img/px.jpg";
import envPy from "../img/py.jpg";
import envPz from "../img/py.jpg";
import envNx from "../img/nx.jpg";
import envNy from "../img/ny.jpg";
import envNz from "../img/nz.jpg";

const rad = deg => (deg / 180) * Math.PI;

const canvas = document.querySelector("#canvas");
const { offsetWidth: width, offsetHeight: height } = canvas;
const calculateViewportHeight = (perspectiveAngle, distance) => {
  return Math.tan(rad(perspectiveAngle / 2)) * distance * 2;
};

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({
  canvas,
  alpha: true
});
// renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
renderer.setClearColor(0xffffff);

const intermediateTarget = new WebGLRenderTarget(width, height);
const normalMapPass = new TexturePass(renderer, normalMapShader);
const causticsPass = new TexturePass(renderer, causticsShader);

const viewportHeight = calculateViewportHeight(75, 30);
const planeGeometry = new PlaneGeometry(
  (viewportHeight * width) / height,
  viewportHeight,
  32
);

const envMap = new CubeTextureLoader().load([
  envPx,
  envNx,
  envPy,
  envNy,
  envPz,
  envNz
]);
scene.background = envMap;

const bottomPlaneMaterial = new MeshBasicMaterial({ color: 0xebe5bf });
const bottomPlane = new Mesh(planeGeometry, bottomPlaneMaterial);
bottomPlane.position.set(0, 0, 0);
scene.add(bottomPlane);

const topPlaneMaterial = new MeshPhongMaterial({
  color: 0xc6e8ff,
  premultipliedAlpha: true,
  transparent: true,
  opacity: 0.66,
  shininess: 1,
  specular: 0x32535d,
  envMap,
  combine: MixOperation,
  reflectivity: 0.5
});
const topPlane = new Mesh(planeGeometry, topPlaneMaterial);
topPlane.position.set(0, 0, 0);
scene.add(topPlane);

// const shpereMaterial = new MeshPhongMaterial({
//   color: 0xcccccc,
//   premultipliedAlpha: true,
//   shininess: 30,
//   specular: 0xffffff
// });
// const sphere = new Mesh(
//   new SphereGeometry(viewportHeight / 10),
//   shpereMaterial
// );
// sphere.position.set(0, 0, 0);
// scene.add(sphere);

const light = new DirectionalLight(0xffffff, 1);
light.position.set(viewportHeight * 2, viewportHeight * 2, viewportHeight);
light.lookAt(0, 0, 0);
scene.add(light);

const ambientLight = new AmbientLight(0xffffff, 0.5); // soft white light
scene.add(ambientLight);

const gpuCompute = new GPUComputationRenderer(width, height, renderer);
const gpTexture = gpuCompute.createTexture();
initTexture(gpTexture);

const gpVariable = gpuCompute.addVariable(
  "textureWaves",
  wavesShader,
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
  let i = 3;
  while (i--) {
    gpuCompute.compute();
  }

  // Get compute output in custom uniform
  const renderTarget = gpuCompute.getCurrentRenderTarget(gpVariable);
  const heightMap = renderTarget.texture;
  const normalMap = normalMapPass.process(heightMap);

  const caustics = causticsPass.process(heightMap);

  bottomPlaneMaterial.map = caustics;
  topPlaneMaterial.normalMap = normalMap;

  renderer.render(scene, camera);

  mouse = new Vector2(-2, -2);
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
