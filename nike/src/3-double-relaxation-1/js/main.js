import {
  PointLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  LinearFilter
} from "three";

import BlendPointsShader from "./BlendPointsShader";
import gradientCircle from "./gradientCircle";

import { startRecording, stopRecording, download } from "../../js/utils/record";

import SpatialHashMap from "../../js/SpatialHashMap";
import normalRandom from "../../js/normalRandom";
import {
  multiplyScalar,
  lengthSq,
  add,
  subtract,
  unit,
  unitApprox
} from "../../js/2dVectorOperations";
import EffectComposer from "../../js/EffectComposer";
import RenderPass from "../../js/RenderPass";
import ShaderPass from "../../js/ShaderPass";

const calculateViewportHeight = (perspectiveAngle, distance) => {
  return Math.tan((perspectiveAngle / 2 / 180) * Math.PI) * distance * 2;
};

const viewportHeight = calculateViewportHeight(75, 30);

const PARTICLE_COUNT = 1500;
const GRID_CELLS = 54;
const RENDER_PLANE = true;
const RECORD = false;

const STIFFNESS = 15;
const STIFFNESS_NEAR = 40;
const REST_DENSITY = 5;
const INTERACTION_RADIUS = (viewportHeight / GRID_CELLS) * 2;
const INTERACTION_RADIUS_INV = 1 / INTERACTION_RADIUS;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS ** 2;
const GRAVITY = [0, -35];
const BROWNIAN_MOTION = 0.5;

const colors = [
  new Color(255, 222, 0),
  new Color(245, 13, 73),
  new Color(250, 205, 35)
];

const particleMeshes = [
  gradientCircle(INTERACTION_RADIUS, REST_DENSITY, new Color(1, 0, 0)),
  gradientCircle(INTERACTION_RADIUS, REST_DENSITY, new Color(0, 1, 0)),
  gradientCircle(INTERACTION_RADIUS, REST_DENSITY, new Color(0, 0, 1))
];

const vars = {
  pos: new Float32Array(PARTICLE_COUNT * 3),
  oldX: new Float32Array(PARTICLE_COUNT),
  oldY: new Float32Array(PARTICLE_COUNT),
  vx: new Float32Array(PARTICLE_COUNT),
  vy: new Float32Array(PARTICLE_COUNT),
  p: new Float32Array(PARTICLE_COUNT),
  pNear: new Float32Array(PARTICLE_COUNT),
  color: new Uint8Array(PARTICLE_COUNT),
  mesh: []
};

const canvas = document.querySelector("#canvas");
const dpr = window.devicePixelRatio;
const { offsetWidth: width, offsetHeight: height } = canvas;

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({ canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
renderer.setClearColor(new Color(0xffffff));

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
renderPass.renderToScreen = !RENDER_PLANE;
composer.addPass(renderPass);

const blendPointsPass = new ShaderPass(BlendPointsShader);
if (RENDER_PLANE) {
  blendPointsPass.renderToScreen = true;
  blendPointsPass.uniforms.horizontalCells.value = GRID_CELLS;
  blendPointsPass.uniforms.verticalCells.value = GRID_CELLS;
  composer.addPass(blendPointsPass);
}

const boundingArea = {
  w: viewportHeight,
  h: viewportHeight,
  l: viewportHeight * -0.5,
  r: viewportHeight * 0.5,
  t: viewportHeight * 0.5,
  b: viewportHeight * -0.5,
  radius: viewportHeight * 0.5,
  radiusSq: (viewportHeight * 0.5) ** 2
};

window.boundingArea = boundingArea;

const screenToWorldSpace = ({ x, y }) => ({
  x:
    (x / width - (0.5 * (window.innerWidth - width)) / width - 0.5) *
    boundingArea.w,
  y:
    (y / height - (0.5 * (window.innerHeight - height)) / height - 0.5) *
    -boundingArea.h
});

const worldXToGridX = x =>
  ((x + boundingArea.w / 2) / boundingArea.w) * GRID_CELLS;
const worldYToGridY = y =>
  ((y + boundingArea.h / 2) / boundingArea.h) * GRID_CELLS;

const mass = i => {
  return 0.85 + vars.color[i] / 10;
};

const hashMap = new SpatialHashMap(GRID_CELLS, GRID_CELLS);

const light = new PointLight(0xffffff, 1, 100);
light.position.set(20, 10, 30);
scene.add(light);

const mouse = [-1000, -1000];
let mouseDown = false;

const data = new Uint8Array(4 * GRID_CELLS * GRID_CELLS);

blendPointsPass.uniforms.resolution.value.set(
  canvas.offsetWidth * dpr,
  canvas.offsetHeight * dpr
);

const dataTexture = new DataTexture(
  data,
  GRID_CELLS,
  GRID_CELLS,
  RGBAFormat,
  UnsignedByteType
);

dataTexture.magFilter = LinearFilter;
blendPointsPass.uniforms.grid.value = dataTexture;

for (let i = 0; i < PARTICLE_COUNT; i++) {
  vars.pos[i * 3] =
    Math.cos(Math.random() * 2 * Math.PI) *
    Math.sqrt(Math.random()) *
    boundingArea.r;
  vars.pos[i * 3 + 1] =
    Math.cos(Math.random() * 2 * Math.PI) *
    Math.sqrt(Math.random()) *
    boundingArea.t;
  vars.oldX[i] = vars.pos[i * 3];
  vars.oldY[i] = vars.pos[i * 3 + 1];
  vars.vx[i] = 0;
  vars.vy[i] = 0;
  vars.color[i] = Math.floor(Math.random() * colors.length);

  hashMap.add(
    worldXToGridX(vars.pos[i * 3]),
    worldYToGridY(vars.pos[i * 3 + 1]),
    i
  );
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const mesh = particleMeshes[vars.color[i]].clone();
  vars.mesh[i] = mesh;
  scene.add(mesh);
}

const simulate = dt => {
  hashMap.clear();

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Update old position
    vars.oldX[i] = vars.pos[i * 3];
    vars.oldY[i] = vars.pos[i * 3 + 1];

    applyGlobalForces(i, dt);

    // Update positions
    vars.pos[i * 3] += vars.vx[i] * dt;
    vars.pos[i * 3 + 1] += vars.vy[i] * dt;

    // Update hashmap
    hashMap.add(
      worldXToGridX(vars.pos[i * 3]),
      worldYToGridY(vars.pos[i * 3 + 1]),
      i
    );
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const neighbors = getNeighborsWithGradients(i);

    updateDensities(i, neighbors);

    // perform double density relaxation
    relax(i, neighbors, dt);
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Constrain the particles to a container
    contain(i, dt);

    // Calculate new velocities
    calculateVelocity(i, dt);

    // Update
    vars.mesh[i].position.set(vars.pos[i * 3], vars.pos[i * 3 + 1], 0);
  }
};

const applyGlobalForces = (i, dt) => {
  let force = [0, 0];
  const m = mass(i);
  force = add(force, multiplyScalar(Array.from(GRAVITY), m));
  force = add(force, [0, -0.25 * vars.color[i]]);

  if (mouseDown) {
    const fromMouse = subtract([vars.pos[i * 3], vars.pos[i * 3 + 1]], mouse);
    const scalar = Math.min(250, 2500 / lengthSq(fromMouse));
    const mouseForce = multiplyScalar(unitApprox(fromMouse), scalar);
    force = add(force, mouseForce);
  }

  const dv = multiplyScalar(force, dt / m);

  vars.vx[i] += dv[0];
  vars.vy[i] += dv[1];
};

const getNeighborsWithGradients = i => {
  const results = hashMap.query(
    worldXToGridX(vars.pos[i * 3]),
    worldYToGridY(vars.pos[i * 3 + 1]),
    (INTERACTION_RADIUS / boundingArea.w) * GRID_CELLS * 2
  );

  let neighbors = [];

  for (let k = 0; k < results.length; k++) {
    const j = results[k];
    if (i === j) continue;
    const g = particleGradient(i, j);
    if (!g) continue;
    neighbors.push([j, g]);
  }

  return neighbors;
};

const updateDensities = (i, neighbors) => {
  let density = 0;
  let nearDensity = 0;

  for (let k = 0; k < neighbors.length; k++) {
    const g = neighbors[k][1];
    const m = mass(i);
    density += g * g * m;
    nearDensity += g * g * g * m;
  }

  const m = mass(i);
  vars.p[i] = STIFFNESS * (density - REST_DENSITY) * m;
  vars.pNear[i] = STIFFNESS_NEAR * nearDensity * m;
};

const relax = (i, neighbors, dt) => {
  const p = [vars.pos[i * 3], vars.pos[i * 3 + 1]];
  for (let k = 0; k < neighbors.length; k++) {
    const j = neighbors[k][0];
    const g = neighbors[k][1];
    const n = [vars.pos[j * 3], vars.pos[j * 3 + 1]];

    const magnitude = vars.p[i] * g + vars.pNear[i] * g * g;
    const f = vars.color[i] === vars.color[j] ? 1 - vars.color[i] * 0.15 : 1;
    const d = multiplyScalar(
      unitApprox(subtract(n, p)),
      magnitude * f * dt * dt
    );

    const massI = mass(i);
    const massJ = mass(j);
    const mt = massI + massJ;

    vars.pos[i * 3] -= d[0] * (massJ / mt);
    vars.pos[i * 3 + 1] -= d[1] * (massJ / mt);

    vars.pos[j * 3] += d[0] * (massI / mt);
    vars.pos[j * 3 + 1] += d[1] * (massI / mt);
  }
};

const particleGradient = (i, j) => {
  return gradient(
    [vars.pos[i * 3], vars.pos[i * 3 + 1]],
    [vars.pos[j * 3], vars.pos[j * 3 + 1]]
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

const contain = i => {
  let pos = [vars.pos[i * 3], vars.pos[i * 3 + 1]];

  if (lengthSq(pos) > boundingArea.radiusSq) {
    pos = multiplyScalar(unit(pos), boundingArea.radius);
    vars.pos[i * 3] = pos[0];
    vars.pos[i * 3 + 1] = pos[1];
  }
};

const calculateVelocity = (i, dt) => {
  const pos = [vars.pos[i * 3], vars.pos[i * 3 + 1]];
  const old = [vars.oldX[i], vars.oldY[i]];

  const dtSqrt = Math.sqrt(dt);
  const p = vars.pNear[i] / REST_DENSITY ** 3;

  old[0] += normalRandom(0, dtSqrt * p) * BROWNIAN_MOTION;
  old[1] += normalRandom(0, dtSqrt * p) * BROWNIAN_MOTION;

  const v = multiplyScalar(subtract(pos, old), 1 / dt);

  vars.vx[i] = v[0];
  vars.vy[i] = v[1];
};

const maxFrameDuration = 1 / 20;

let frame;
let tPrev;

function loop() {
  composer.render();

  const t = performance.now();
  simulate(Math.min((t - tPrev) / 1000, maxFrameDuration));
  tPrev = t;

  frame = requestAnimationFrame(loop);
}

const start = () => {
  tPrev = performance.now() - 16;

  exit();

  simulate(0.0001);
  loop();
};

const exit = () => {
  cancelAnimationFrame(frame);
};

document.addEventListener("keyup", e => {
  if (e.which !== 32) return;

  if (frame) {
    exit();
    RECORD && stopRecording();
    RECORD && download();
  } else {
    start();
    RECORD && setTimeout(startRecording, 100);
  }
});

window.addEventListener("mousemove", e => {
  const { x, y } = screenToWorldSpace({ x: e.clientX, y: e.clientY });
  mouse[0] = x;
  mouse[1] = y;
});

window.addEventListener("mousedown", () => (mouseDown = true));
window.addEventListener("mouseup", () => (mouseDown = false));
