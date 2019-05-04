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
  TextureLoader,
  DataTexture,
  RGBAFormat
} from "three";

import calculateViewportHeight from "../../js/utils/calculateViewportHeight";
import TexturePass from "../../js/utils/TexturePass";

import reactionDiffusionShader from '../glsl/compute-shaders/reaction-diffusion.glsl'
import displayShader from '../glsl/fragment-shaders/display.glsl'
import basicShader from '../glsl/fragment-shaders/basic.glsl'

import maskTexturePath from "../img/mask.png";

const canvas = document.querySelector("#canvas");
const { offsetWidth: width, offsetHeight: height } = canvas;

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({ canvas, alpha: true });
renderer.setPixelRatio(1);
renderer.setSize(width, height);

const maskTexture = new TextureLoader().load(maskTexturePath)
maskTexture.repeat.set(1, 1)

const data = new Uint8Array(4 * width * height).map((_, i) => [255, 0, 0, 255][i % 4])

let textureA = new DataTexture(data, width, height, RGBAFormat)
let textureB = textureA.clone()
textureA.needsUpdate = true
textureB.needsUpdate = true

const swapPass = new TexturePass(renderer, basicShader);

const displayPass = new TexturePass(renderer, displayShader, {
  u_mask: {
    value: maskTexture
  }
});

const reactionDiffusionPass = new TexturePass(renderer, reactionDiffusionShader, {
  u_mouse: {
    value: new Vector2
  },
  u_mask: {
    value: maskTexture
  }
});

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
  reactionDiffusionPass.uniforms.u_mouse.value = new Vector2(mouseX, mouseY)
})

const render = () => {
  
  requestAnimationFrame(render);

  // Do the gpu computation
  let i = 2
  while (i--) {
    textureA = swapPass.process(textureB)
    textureB = reactionDiffusionPass.process(textureA)
  }

  material.map = displayPass.process(textureB);
  renderer.render(scene, camera);

};

render();