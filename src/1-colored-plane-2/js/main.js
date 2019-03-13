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

const render = () => {
  material.uniforms.u_time.value = performance.now() / 1000;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

const dpr = window.devicePixelRatio
window.addEventListener('mousemove', e => {
  material.uniforms.u_points_position.value[0] = new Vector2(e.clientX * dpr, (window.innerHeight - e.clientY) * dpr)
  // console.log(material.uniforms.u_points_position.value[19])
  // return  
  // material.uniforms.u_points_position.value = material.uniforms.u_points_position.value
  //   .slice(19)
  //   .push()
  // material.uniforms.u_points_position[19].value = new Vector2(e.clientX * dpr, (window.innerHeight - e.clientY) * dpr)
})

render();