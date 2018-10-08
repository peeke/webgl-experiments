import {
  BufferAttribute,
  BufferGeometry,
  Points,
  PointLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PointsMaterial,
  VertexColors,
  Color
} from "three";

import EffectComposer from "../../js/EffectComposer";
import RenderPass from "../../js/RenderPass";
import ShaderPass from "../../js/ShaderPass";
import SepiaShader from "../../js/SepiaShader";

import clampNumber from "../../js/clampNumber";
import mapNumber from "../../js/mapNumber";
import SpatialHashMap from "../../js/SpatialHashMap";
import {
  multiplyScalar,
  length,
  lengthSq,
  add,
  subtract,
  dot,
  unit,
  unitApprox,
  lerp
} from "../../js/2dVectorOperations";

const PARTICLE_COUNT = 1500;

const STIFFNESS = 12;
const STIFFNESS_NEAR = 18;
const REST_DENSITY = 3;
const REST_DENSITY_INV = 1 / REST_DENSITY;
const INTERACTION_RADIUS = 1.5;
const CELLS_PER_IR = 3;
const INTERACTION_RADIUS_INV = 1 / INTERACTION_RADIUS;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS ** 2;
const GRAVITY = [0, -18];
const VISCOSITY = 0.01;
const WALL_FRICTION = 0.5;
const WALL_DISTANCE = 0.1 * INTERACTION_RADIUS;
const WALL_DISTANCE_INV = 1 / WALL_DISTANCE;

console.log({
  PARTICLE_COUNT,
  REST_DENSITY,
  INTERACTION_RADIUS,
  GRAVITY,
  VISCOSITY
});

const vars = {
  pos: new Float32Array(PARTICLE_COUNT * 2),
  oldX: new Float32Array(PARTICLE_COUNT),
  oldY: new Float32Array(PARTICLE_COUNT),
  vx: new Float32Array(PARTICLE_COUNT),
  vy: new Float32Array(PARTICLE_COUNT),
  p: new Float32Array(PARTICLE_COUNT),
  pNear: new Float32Array(PARTICLE_COUNT),
  color: new Uint8Array(PARTICLE_COUNT)
  // mesh: []
};

const colors = [new Color(0xff4e91), new Color(0xffe04e), new Color(0x3568e5)];

const canvas = document.querySelector("#canvas");
const dpr = window.devicePixelRatio;
const { offsetWidth: width, offsetHeight: height } = canvas;
const calculateViewportHeight = (perspectiveAngle, distance) => {
  return Math.tan((perspectiveAngle / 2 / 180) * Math.PI) * distance * 2;
};

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({ canvas, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);

const viewportHeight = calculateViewportHeight(75, 30);
const boundingArea = {
  w: viewportHeight * 0.66,
  h: viewportHeight * 0.66,
  l: viewportHeight * -0.33,
  r: viewportHeight * 0.33,
  t: viewportHeight * 0.33,
  b: viewportHeight * -0.33
};

const screenToWorldSpace = ({ x, y }) => ({
  x: (((-0.5 + x / width) * viewportHeight) / height) * width,
  y: -1 * (-0.5 + y / height) * viewportHeight
});

const light = new PointLight(0xffffff, 1, 100);
light.position.set(20, 10, 30);
scene.add(light);

const mouse = [-1000, -1000];
let mouseDown = false;

for (let i = 0; i < PARTICLE_COUNT; i++) {
  vars.pos[i * 2] = boundingArea.l + Math.random() * boundingArea.w;
  vars.pos[i * 2 + 1] = boundingArea.b + Math.random() * boundingArea.h;
  vars.oldX[i] = vars.pos[i * 2];
  vars.oldY[i] = vars.pos[i * 2 + 1];
  vars.vx[i] = 0;
  vars.vy[i] = 0;
  vars.color[i] = Math.floor(Math.random() * 3);
}

const geometry = new BufferGeometry();
console.log(Array.from(vars.color).map(i => colors[i]));
geometry.addAttribute("position", new BufferAttribute(vars.pos, 2));
const colorAttribute = vars.color.reduce((result, color, i) => {
  result[i * 3] = colors[color].r;
  result[i * 3 + 1] = colors[color].g;
  result[i * 3 + 2] = colors[color].b;
  return result;
}, new Float32Array(vars.color.length * 3));
geometry.addAttribute("color", new BufferAttribute(colorAttribute, 3));

const material = new PointsMaterial({
  size: (viewportHeight / window.innerHeight / 0.66) * 6,
  vertexColors: VertexColors
});

const points = new Points(geometry, material);
scene.add(points);

const hashMap = new SpatialHashMap(
  boundingArea.r,
  INTERACTION_RADIUS / CELLS_PER_IR,
  INTERACTION_RADIUS
);

const simulate = dt => {
  hashMap.clear();

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    vars.oldX[i] = vars.pos[i * 2];
    vars.oldY[i] = vars.pos[i * 2 + 1];

    applyGlobalForces(i, dt);

    vars.pos[i * 2] += vars.vx[i] * dt;
    vars.pos[i * 2 + 1] += vars.vy[i] * dt;

    hashMap.add(vars.pos[i * 2], vars.pos[i * 2 + 1], i);
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const results = hashMap.query(vars.pos[i * 2], vars.pos[i * 2 + 1]);
    let neighbors = [];

    for (let k = 0; k < results.length; k++) {
      const j = results[k];
      if (i === j) continue;
      const g = particleGradient(i, j);
      if (!g) continue;
      neighbors.push([j, g]);
    }

    contain(i, dt);

    for (let k = 0; k < neighbors.length; k++) {
      const j = neighbors[k][0];
      contain(j, dt);
    }

    updateDensities(i, neighbors);

    // perform double density relaxation
    relax(i, neighbors, dt);
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    contain(i, dt);

    // Calculate new velocities
    calculateVelocity(i, dt);

    // Update
    geometry.attributes.position.needsUpdate = true;
  }
};

const applyGlobalForces = (i, dt) => {
  let force = Array.from(GRAVITY);

  force[1] += vars.color[i] / 5;

  if (mouseDown) {
    const fromMouse = subtract([vars.pos[i * 2], vars.pos[i * 2 + 1]], mouse);
    const scalar = Math.min(100, 1000 / lengthSq(fromMouse));
    const mouseForce = multiplyScalar(unitApprox(fromMouse), scalar);
    force = add(force, mouseForce);
  }

  const dv = multiplyScalar(force, dt);

  vars.vx[i] += dv[0];
  vars.vy[i] += dv[1];
};

const updateDensities = (i, neighbors) => {
  let density = 0;
  let nearDensity = 0;

  for (let k = 0; k < neighbors.length; k++) {
    const g = neighbors[k][1];
    density += g * g;
    nearDensity += g * g * g;
  }

  vars.p[i] = STIFFNESS * (density - REST_DENSITY);
  vars.pNear[i] = STIFFNESS_NEAR * nearDensity;
};

const relax = (i, neighbors, dt) => {
  const p = [vars.pos[i * 2], vars.pos[i * 2 + 1]];

  for (let k = 0; k < neighbors.length; k++) {
    const j = neighbors[k][0];
    const g = neighbors[k][1];
    const n = [vars.pos[j * 2], vars.pos[j * 2 + 1]];

    const magnitude = vars.p[i] * g + vars.pNear[i] * g * g;
    const f = 1; // (vars.color[i] === vars.color[j]) ? 1.1 : .9
    const d = multiplyScalar(
      unitApprox(subtract(n, p)),
      magnitude * f * dt * dt
    );

    vars.pos[i * 2] -= d[0] * 0.5;
    vars.pos[i * 2 + 1] -= d[1] * 0.5;

    vars.pos[j * 2] += d[0] * 0.5;
    vars.pos[j * 2 + 1] += d[1] * 0.5;
  }
};

const particleGradient = (i, j) => {
  return gradient(
    [vars.pos[i * 2], vars.pos[i * 2 + 1]],
    [vars.pos[j * 2], vars.pos[j * 2 + 1]]
  );
};

const gradientCache = new Float32Array(Math.ceil(INTERACTION_RADIUS_SQ * 10));

const gradient = (a, b) => {
  const lsq = lengthSq(subtract(a, b));
  if (lsq > INTERACTION_RADIUS_SQ) return 0;

  const cacheIndex = (lsq * 10) | 0;
  if (gradientCache[cacheIndex]) return gradientCache[cacheIndex];

  const g = Math.max(0, 1 - Math.sqrt(lsq) * INTERACTION_RADIUS_INV);

  gradientCache[cacheIndex] = g;
  return g;
};

const contain = (i, dt) => {
  const sx = Math.sign(vars.pos[i * 2]);
  const sy = Math.sign(vars.pos[i * 2 + 1]);

  if (vars.pos[i * 2] * sx > boundingArea.r) {
    //  vars.pos[i * 2] = boundingArea.t * sx
    const dx = vars.pos[i * 2] - vars.oldX[i];
    vars.pos[i * 2] = 2 * boundingArea.t * sx - vars.pos[i * 2];
    vars.oldX[i] = vars.pos[i * 2] + dx;
  }

  if (vars.pos[i * 2 + 1] * sy > boundingArea.t) {
    // vars.pos[i * 2 + 1] = boundingArea.t * sy
    const dy = vars.pos[i * 2 + 1] - vars.oldY[i];
    vars.pos[i * 2 + 1] = 2 * boundingArea.t * sy - vars.pos[i * 2 + 1];
    vars.oldY[i] = vars.pos[i * 2 + 1] + dy;
  }
};

const calculateVelocity = (i, dt) => {
  const p = [vars.pos[i * 2], vars.pos[i * 2 + 1]];
  const old = [vars.oldX[i], vars.oldY[i]];

  const v = multiplyScalar(subtract(p, old), 1 / dt);

  vars.vx[i] = v[0];
  vars.vy[i] = v[1];
};

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const sepiaPass = new ShaderPass(SepiaShader);
sepiaPass.renderToScreen = true;
composer.addPass(sepiaPass);

const maxFrameDuration = 1 / 20;

let frame;
let tPrev;

function loop() {
  const t = performance.now();
  simulate(1 / 60);
  // simulate(Math.min((t - tPrev) / 1000, maxFrameDuration))
  tPrev = t;

  composer.render();
  frame = requestAnimationFrame(loop);
}

const start = () => {
  tPrev = performance.now() - 16;
  exit();
  loop();
};

const exit = () => {
  cancelAnimationFrame(frame);
};

document.addEventListener(
  "keyup",
  e => e.which === 32 && (frame ? exit() : start())
);

window.addEventListener("mousemove", e => {
  const { x, y } = screenToWorldSpace({ x: e.clientX, y: e.clientY });
  mouse[0] = x;
  mouse[1] = y;
});

window.addEventListener("mousedown", () => (mouseDown = true));
window.addEventListener("mouseup", () => (mouseDown = false));
