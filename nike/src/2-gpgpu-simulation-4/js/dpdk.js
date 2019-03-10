import GPUComputationRenderer from "../../vendor/yomboprime/GPUComputationRenderer";
import {
  PlaneGeometry,
  BoxGeometry,
  Geometry,
  CylinderGeometry,
  Mesh,
  PointLight,
  AmbientLight,
  DirectionalLight,
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  WebGLRenderTarget,
  Vector2,
  MeshBasicMaterial,
  MeshPhongMaterial,
  MeshLambertMaterial,
  ShadowMaterial,
  SphereGeometry,
  TextureLoader,
  CubeTextureLoader,
  MixOperation,
  Texture,
  RGBFormat,
  PCFSoftShadowMap
} from "three";

import TexturePass from "../../js/utils/TexturePass";
import normalMapShader from "../glsl/fragment-shaders/normal-map.glsl";
import refractShader from "../glsl/fragment-shaders/refract.glsl";
import screenShader from "../glsl/fragment-shaders/screen.glsl";
import wavesShader from "../glsl/compute-shaders/waves.glsl";
import causticsShader from "../glsl/fragment-shaders/caustics.glsl";

import { startRecording, stopRecording, download } from "../../js/utils/record";

import envPx from "../img/px.jpg";
import envPy from "../img/py.jpg";
import envPz from "../img/py.jpg";
import envNx from "../img/nx.jpg";
import envNy from "../img/ny.jpg";
import envNz from "../img/nz.jpg";
import bottom from "../img/bottom-dpdk.jpg";
import stencil from "../img/stencil.png";
import logoTexture from "../img/logo.png";
import waveMaskTexture from "../img/wave-mask.png";

const rad = deg => (deg / 180) * Math.PI;

const canvas = document.querySelector("#canvas");
const { offsetWidth: width, offsetHeight: height } = canvas;
const calculateViewportHeight = (perspectiveAngle, distance) => {
  return Math.tan(rad(perspectiveAngle / 2)) * distance * 2;
};
const viewportHeight = calculateViewportHeight(75, 30);

const topScene = new Scene();
const bottomScene = new Scene();

const camera = new OrthographicCamera(
  viewportHeight / -2,
  viewportHeight / 2,
  viewportHeight / 2,
  viewportHeight / -2,
  -1000,
  1000
);
camera.position.z = 30;

const intermediateTarget = new WebGLRenderTarget(width, height);
const renderer = new WebGLRenderer({
  canvas,
  alpha: true
});
// renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
renderer.setClearColor(0xffffff);

const normalMapPass = new TexturePass(renderer, normalMapShader);
const causticsPass = new TexturePass(renderer, causticsShader);
const refractPass = new TexturePass(renderer, refractShader, {
  u_refract: {
    value: new Texture()
  }
});
const combinePass = new TexturePass(renderer, screenShader, {
  u_texture2: {
    value: new Texture()
  }
});

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
// scene.background = envMap;

const stencilMap = new TextureLoader().load(stencil);
const bottomTexture = new TextureLoader().load(bottom);

const bottomPlaneMaterial = new MeshLambertMaterial({
  color: 0xffffff,
  map: bottomTexture
});
const bottomPlane = new Mesh(planeGeometry, bottomPlaneMaterial);
bottomPlane.position.set(0, 0, -2);
bottomPlane.receiveShadow = true;
bottomScene.add(bottomPlane);

const bottomFlattenedPlaneMaterial = new MeshBasicMaterial({
  color: 0xffffff
});
const bottomFlattenedPlane = new Mesh(
  planeGeometry,
  bottomFlattenedPlaneMaterial
);
bottomFlattenedPlane.position.set(0, 0, -2);
topScene.add(bottomFlattenedPlane);

const topPlaneMaterial = new MeshPhongMaterial({
  color: 0xd1faf2,
  premultipliedAlpha: true,
  transparent: true,
  opacity: 0.35,
  shininess: 100,
  specular: 0x18588e,
  envMap,
  combine: MixOperation,
  reflectivity: 0.8
});
const topPlane = new Mesh(planeGeometry, topPlaneMaterial);
topPlane.position.set(0, 0, 0);
topScene.add(topPlane);

const logoPlaneMaterial = new MeshBasicMaterial({
  transparent: true,
  map: new TextureLoader().load(logoTexture)
});
const logoPlane = new Mesh(planeGeometry.clone(), logoPlaneMaterial);
logoPlane.position.set(0, 0, 0);
topScene.add(logoPlane);

const stencilPlaneMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  alphaMap: stencilMap
});
const stencilPlane = new Mesh(planeGeometry, stencilPlaneMaterial);
stencilPlane.position.set(0, 0, 0);
topScene.add(stencilPlane);

const light = new DirectionalLight(0xffffff, 1);
light.position.set(viewportHeight * 2, viewportHeight * 2, viewportHeight);
light.lookAt(0, 0, 0);
bottomScene.add(light.clone());
topScene.add(light);

const ambientLight = new AmbientLight(0xffffff, 0.8); // soft white light
bottomScene.add(ambientLight.clone());
topScene.add(ambientLight);

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
  },
  u_waveMask: {
    value: new TextureLoader().load(waveMaskTexture)
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

  const caustics = causticsPass.process(normalMap);

  combinePass.uniforms.u_texture2.value = bottomTexture;
  const combined = combinePass.process(caustics);

  bottomPlaneMaterial.map = combined;
  // bottomPlaneMaterial.map = caustics;
  topPlaneMaterial.normalMap = normalMap;

  renderer.render(bottomScene, camera, intermediateTarget);

  // bottomFlattenedPlaneMaterial.map = intermediateTarget.texture;
  refractPass.uniforms.u_refract.value = heightMap;
  bottomFlattenedPlaneMaterial.map = refractPass.process(
    intermediateTarget.texture
  );

  renderer.render(topScene, camera);

  mouse = new Vector2(-2, -2);
};

requestIdleCallback(() => render());

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
