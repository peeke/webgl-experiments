import {
  PlaneGeometry,
  Mesh,
  PointLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector2
} from "three";

import ColoredPlaneMaterial from "./material/colored-plane";

const dpr = window.devicePixelRatio
const resolution = {
  x: window.innerWidth * dpr,
  y: window.innerHeight * dpr
}

const canvas = document.querySelector("#canvas");
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
const material = new ColoredPlaneMaterial();
const plane = new Mesh(geometry, material);
scene.add(plane);

const light = new PointLight(0xffffff, 1, 100);
light.position.set(20, 10, 30);
scene.add(light);

const velocities = Array(20).fill(0).map(v => ({
  x: 5 * (Math.random() - .5),
  y: 5 * (Math.random() - .5)
}))

const simulate = () => {
  material.uniforms.u_points_position.value = material.uniforms.u_points_position.value.map((v, i) => {
    if (v.x < 0 || v.x > resolution.x) velocities[i].x *= -1
    if (v.y < 0 || v.y > resolution.y) velocities[i].y *= -1
    return new Vector2(v.x + velocities[i].x, v.y + velocities[i].y)
  })
}

const render = () => {
  simulate();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

render();