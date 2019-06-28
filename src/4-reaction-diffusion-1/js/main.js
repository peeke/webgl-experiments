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
  RGBAFormat,
  Texture
} from "three";

import calculateViewportHeight from "../../js/utils/calculateViewportHeight";
import { noise } from "../../js/utils/noise";
import TexturePass from "../../js/utils/TexturePass";
import clampNumber from "../../js/clampNumber";
import mapNumber from "../../js/mapNumber";
import { startRecording, stopRecording, download } from "../../js/utils/record";

import reactionDiffusionShader from '../glsl/compute-shaders/reaction-diffusion.glsl'
import twoStepBlurShader from '../glsl/compute-shaders/two-step-blur.glsl'
import displayShader from '../glsl/fragment-shaders/display.glsl'
import basicShader from '../glsl/fragment-shaders/basic.glsl'

import maskTexturePath from "../img/basic-mask.png";

const PASSES = 9

const texturesLoading = []

const canvas = document.querySelector("#canvas");
const { offsetWidth: width, offsetHeight: height } = canvas;

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({ canvas, alpha: true });
renderer.setPixelRatio(1);
renderer.setSize(width, height);

let maskTextureLoaded
texturesLoading.push(new Promise(resolve => { maskTextureLoaded = resolve }))
const maskTexture = new TextureLoader().load(maskTexturePath, maskTextureLoaded)

const seed = Math.random() * 1000

const data = new Uint8Array(4 * width * height).map((_, i) => {
  const x = Math.floor(i / 4) % width
  const y = Math.floor(i / 4 / width)
  return i % 4 !== 1
    ? 255
    : clampNumber(noise.perlin3(x / 50, y / 50, seed), 0, 1) * 255
})

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

const blurX = 3
const blurY = 1.4

const feedA = .022
const feedB = .090
const killA = .065
const killB = .065

const twoStepBlurShaderXStep1 = new TexturePass(renderer, twoStepBlurShader, {
  u_radius: { value: blurX },
  u_dir: { value: new Vector2(1, 0) }
})

const twoStepBlurShaderXStep2 = new TexturePass(renderer, twoStepBlurShader, {
  u_radius: { value: blurX },
  u_dir: { value: new Vector2(0, 1) }
})

const twoStepBlurShaderYStep1 = new TexturePass(renderer, twoStepBlurShader, {
  u_radius: { value: blurY },
  u_dir: { value: new Vector2(1, 0) }
})

const twoStepBlurShaderYStep2 = new TexturePass(renderer, twoStepBlurShader, {
  u_radius: { value: blurY },
  u_dir: { value: new Vector2(0, 1) }
})

const reactionDiffusionPass = new TexturePass(renderer, reactionDiffusionShader, {
  u_mouse: {
    value: new Vector2
  },
  u_mask: {
    value: maskTexture
  },
  u_blurred_x: {
    value: new Texture()
  },
  u_blurred_y: {
    value: new Texture()
  },
  u_feed_rate: {
    value: 0
  },
  u_kill_rate: {
    value: 0
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
  let i = PASSES
  while (i--) {
    const blurredX = twoStepBlurShaderXStep2.process(twoStepBlurShaderXStep1.process(textureA))
    const blurredY = twoStepBlurShaderYStep2.process(twoStepBlurShaderYStep1.process(textureA))
    // const f = noise.perlin2(performance.now() / 2500, seed)
    const f = Math.abs(performance.now() % 6000 - 3000) / 3000
    const feed = mapNumber(f, -1, 1, feedA, feedB)
    const kill = mapNumber(f, -1, 1, killA, killB)

    reactionDiffusionPass.uniforms.u_blurred_x.value = blurredX
    reactionDiffusionPass.uniforms.u_blurred_y.value = blurredY
    reactionDiffusionPass.uniforms.u_feed_rate.value = feed
    reactionDiffusionPass.uniforms.u_kill_rate.value = kill
    const reactionTexture = reactionDiffusionPass.process(textureA)

    textureB = reactionTexture
    textureA = swapPass.process(textureB)
  }

  material.map = displayPass.process(textureB);
  renderer.render(scene, camera);

};

let recording = false
document.addEventListener("keyup", e => {
  if (e.which !== 32) return;

  if (recording) {
    stopRecording();
    download();
  } else {
    startRecording()
    Promise.all(texturesLoading).then(render)
  }

  recording = !recording
});

window.render = render