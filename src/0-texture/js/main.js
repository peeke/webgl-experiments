import {
  PlaneGeometry,
  Mesh,
  Scene,
  PerspectiveCamera,
  WebGLRenderer
} from "three";

import PerlinMaterial from "./material/perlin";

const canvas = document.querySelector("#canvas");
const { offsetWidth: width, offsetHeight: height } = canvas;

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({ canvas, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);

const geometry = new PlaneGeometry(5, 20, 32);
const material = new PerlinMaterial();
const plane = new Mesh(geometry, material);
scene.add(plane);

const render = () => {
  material.uniforms.u_time.value = performance.now() / 1000;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

render();
