import GPUComputationRenderer from "../../vendor/yomboprime/GPUComputationRenderer";
import {
  PlaneGeometry,
  Mesh,
  AmbientLight,
  DirectionalLight,
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  WebGLRenderTarget,
  Vector2,
  MeshBasicMaterial,
  MeshPhongMaterial,
  TextureLoader,
  CubeTextureLoader,
  MixOperation,
  Texture,
  PCFSoftShadowMap
} from "three";

import TexturePass from "../../js/utils/TexturePass";
import normalMapShader from "../glsl/fragment-shaders/normal-map.glsl";
import refractShader from "../glsl/fragment-shaders/refract.glsl";
import screenShader from "../glsl/fragment-shaders/screen.glsl";
import wavesShader from "../glsl/compute-shaders/waves.glsl";
import causticsShader from "../glsl/fragment-shaders/caustics.glsl";

import calculateViewportHeight from "../../js/utils/calculateViewportHeight";
import { startRecording, stopRecording, download } from "../../js/utils/record";

import envPx from "../img/px.jpg";
import envPy from "../img/py.jpg";
import envPz from "../img/py.jpg";
import envNx from "../img/nx.jpg";
import envNz from "../img/nz.jpg";
import white from "../img/white.png";
import bottom from "../img/bottom.jpg";
import mask from "../img/mask.png";

// Load textures
const maskTexture = new TextureLoader().load(mask);
const groundTexture = new TextureLoader().load(bottom);
const envMap = new CubeTextureLoader().load([
  envPx,
  envNx,
  envPy,
  white,
  envPz,
  envNz
]);

// Setup THREE js boilerplate
const canvas = document.querySelector("#canvas");
const { offsetWidth: width, offsetHeight: height } = canvas;
const viewportHeight = calculateViewportHeight(75, 30);

const intermediateTarget = new WebGLRenderTarget(width, height);
const renderer = new WebGLRenderer({
  canvas,
  alpha: true
});

renderer.setSize(width, height);
renderer.setClearColor(0xffffff);

const camera = new OrthographicCamera(
  viewportHeight / -2,
  viewportHeight / 2,
  viewportHeight / 2,
  viewportHeight / -2,
  1,
  1000
);
camera.position.z = 30;

// Texture passes (apply a texture to a shader)
const normalMapPass = new TexturePass(renderer, normalMapShader);
const causticsPass = new TexturePass(renderer, causticsShader);
const refractPass = new TexturePass(renderer, refractShader, {
  u_refract: {
    value: new Texture()
  }
});
const groundPass = new TexturePass(renderer, screenShader, {
  u_texture2: {
    value: groundTexture
  }
});

// Setup scene's, geometries, materials and meshes
const belowSurfaceScene = new Scene();
const finalScene = new Scene();

const planeGeometry = new PlaneGeometry(
  (viewportHeight * width) / height,
  viewportHeight,
  32
);

const groundMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  map: groundTexture
});
const groundPlane = new Mesh(planeGeometry, groundMaterial);
groundPlane.position.set(0, 0, -10);
belowSurfaceScene.add(groundPlane);

const belowSurfaceMaterial = new MeshBasicMaterial({
  color: 0xffffff
});
const belowSurface = new Mesh(planeGeometry, belowSurfaceMaterial);
belowSurface.position.set(0, 0, -10);
finalScene.add(belowSurface);

const surfaceMaterial = new MeshPhongMaterial({
  color: 0xd1faf2,
  premultipliedAlpha: true,
  transparent: true,
  alphaMask: mask,
  opacity: 0.45,
  shininess: 100,
  specular: 0x18588e,
  envMap,
  combine: MixOperation,
  reflectivity: 0.8
});

const surfacePlane = new Mesh(planeGeometry, surfaceMaterial);
surfacePlane.position.set(0, 0, 0);
finalScene.add(surfacePlane);

const light = new DirectionalLight(0xffffff, 1);
light.position.set(viewportHeight * 2, viewportHeight * 2, viewportHeight);
light.lookAt(0, 0, 0);
light.castShadow = true;
belowSurfaceScene.add(light.clone());
finalScene.add(light);

const ambientLight = new AmbientLight(0xffffff, 1); // soft white light
belowSurfaceScene.add(ambientLight.clone());
finalScene.add(ambientLight);

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
    value: maskTexture
  }
};

gpuCompute.init();

function initTexture(texture) {
  const pixels = texture.image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0.5;
    pixels[i + 1] = 0.5;
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

  // Process all shaders
  const heightMap = gpuCompute.getCurrentRenderTarget(gpVariable).texture;
  const normalMap = normalMapPass.process(heightMap);
  const caustics = causticsPass.process(normalMap);
  const groundWithCaustics = groundPass.process(caustics);

  groundMaterial.map = groundWithCaustics;

  renderer.render(belowSurfaceScene, camera, intermediateTarget);

  refractPass.uniforms.u_refract.value = heightMap;
  const refractedComposite = refractPass.process(intermediateTarget.texture);

  surfaceMaterial.normalMap = normalMap;
  belowSurfaceMaterial.map = refractedComposite;

  renderer.render(finalScene, camera);

  // Reset mouse after it's used in the calculation
  mouse =
    Math.random() > 0.1
      ? new Vector2(-width, -height)
      : new Vector2(Math.random() * width, Math.random() * height);
};

let mouse = new Vector2(-viewportHeight, -viewportHeight);
const offset = canvas.getBoundingClientRect();
window.addEventListener("mousemove", e => {
  mouse = new Vector2(e.clientX - offset.left, height - e.clientY + offset.top);
});

requestIdleCallback(() => render());

// Enable recording on space key press
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
