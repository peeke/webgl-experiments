import {
  BufferAttribute,
  BufferGeometry,
  Points,
  PointLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PointsMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  VertexColors,
  Color,
  DataTexture,
  RGBAFormat,
  UnsignedByteType
} from "three";

import BlendPointsShader from "./BlendPointsShader";

import EffectComposer from "../../js/EffectComposer";
import RenderPass from "../../js/RenderPass";
import ShaderPass from "../../js/ShaderPass";

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

const calculateViewportHeight = (perspectiveAngle, distance) => {
  return Math.tan((perspectiveAngle / 2 / 180) * Math.PI) * distance * 2;
};

const viewportHeight = calculateViewportHeight(75, 30);

const PARTICLE_COUNT = 2000;
const GRID_CELLS = 64;
const RENDER_POINTS = false;
const RENDER_PLANE = true;

const STIFFNESS = 6;
const STIFFNESS_NEAR = 20;
const REST_DENSITY = 3;
const INTERACTION_RADIUS = (viewportHeight / GRID_CELLS) * 2;
const UNCERTAINTY = INTERACTION_RADIUS;
const INTERACTION_RADIUS_INV = 1 / INTERACTION_RADIUS;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS ** 2;
const GRAVITY = [0, -20];
const VISCOSITY = 0.01;

console.log({
  UNCERTAINTY,
  PARTICLE_COUNT,
  REST_DENSITY,
  INTERACTION_RADIUS,
  GRAVITY,
  VISCOSITY
});

const vars = {
  pos: new Float32Array(PARTICLE_COUNT * 3),
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

const scene = new Scene();
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 30;

const renderer = new WebGLRenderer({ canvas, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);

const boundingArea = {
  w: viewportHeight,
  h: viewportHeight,
  l: viewportHeight * -0.5,
  r: viewportHeight * 0.5,
  t: viewportHeight * 0.5,
  b: viewportHeight * -0.5
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

const hashMap = new SpatialHashMap(GRID_CELLS, GRID_CELLS);

const light = new PointLight(0xffffff, 1, 100);
light.position.set(20, 10, 30);
scene.add(light);

const mouse = [-1000, -1000];
let mouseDown = false;

const planeGeometry = new PlaneGeometry(viewportHeight, viewportHeight);
const planeMaterial = new ShaderMaterial(BlendPointsShader);
const plane = new Mesh(planeGeometry, planeMaterial);

const data = new Uint8Array(4 * GRID_CELLS * GRID_CELLS);

planeMaterial.uniforms.resolution.value.set(
  canvas.offsetWidth * dpr,
  canvas.offsetHeight * dpr
);
planeMaterial.uniforms.grid.value = new DataTexture(
  data,
  GRID_CELLS,
  GRID_CELLS,
  RGBAFormat,
  UnsignedByteType
);

if (RENDER_PLANE) {
  scene.add(plane);
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  vars.pos[i * 3] = boundingArea.l + Math.random() * boundingArea.w;
  vars.pos[i * 3 + 1] = boundingArea.b + Math.random() * boundingArea.h;
  vars.oldX[i] = vars.pos[i * 3];
  vars.oldY[i] = vars.pos[i * 3 + 1];
  vars.vx[i] = 0;
  vars.vy[i] = 0;
  vars.color[i] = Math.floor(Math.random() * 3);

  hashMap.add(
    worldXToGridX(vars.pos[i * 3]),
    worldYToGridY(vars.pos[i * 3 + 1]),
    i
  );
}

let geometry;
const colorAttribute = vars.color.reduce((result, color, i) => {
  result[i * 3] = colors[color].r;
  result[i * 3 + 1] = colors[color].g;
  result[i * 3 + 2] = colors[color].b;
  return result;
}, new Float32Array(vars.color.length * 3));

if (RENDER_POINTS) {
  geometry = new BufferGeometry();
  geometry.addAttribute("position", new BufferAttribute(vars.pos, 3));

  geometry.addAttribute("color", new BufferAttribute(colorAttribute, 3));

  const material = new PointsMaterial({
    size: 0.5,
    vertexColors: VertexColors
  });

  const points = new Points(geometry, material);
  scene.add(points);
}

const simulate = dt => {
  hashMap.clear();

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    vars.oldX[i] = vars.pos[i * 3];
    vars.oldY[i] = vars.pos[i * 3 + 1];

    applyGlobalForces(i, dt);

    vars.pos[i * 3] += vars.vx[i] * dt;
    vars.pos[i * 3 + 1] += vars.vy[i] * dt;

    contain(i, dt);

    hashMap.add(
      worldXToGridX(vars.pos[i * 3]),
      worldYToGridY(vars.pos[i * 3 + 1]),
      i
    );
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const results = hashMap.query(
      worldXToGridX(vars.pos[i * 3]),
      worldYToGridY(vars.pos[i * 3 + 1]),
      (INTERACTION_RADIUS / boundingArea.w) * GRID_CELLS * 1.5
    );
    let neighbors = [];

    for (let k = 0; k < results.length; k++) {
      const j = results[k];
      if (i === j) continue;
      const g = particleGradient(i, j);
      if (!g) continue;
      neighbors.push([j, g]);
    }

    updateDensities(i, neighbors);

    // perform double density relaxation
    relax(i, neighbors, dt);

    contain(i, dt);

    for (let k = 0; k < results.length; k++) {
      const j = results[k];
      contain(j, dt);
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Calculate new velocities
    calculateVelocity(i, dt);

    // Update
    if (RENDER_POINTS) {
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }
  }
};

const applyGlobalForces = (i, dt) => {
  let force = Array.from(GRAVITY);

  force[1] += vars.color[i];

  if (mouseDown) {
    const fromMouse = subtract([vars.pos[i * 3], vars.pos[i * 3 + 1]], mouse);
    const scalar = Math.min(150, 1500 / lengthSq(fromMouse));
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
  const p = [vars.pos[i * 3], vars.pos[i * 3 + 1]];
  for (let k = 0; k < neighbors.length; k++) {
    const j = neighbors[k][0];
    const g = neighbors[k][1];
    const n = [vars.pos[j * 3], vars.pos[j * 3 + 1]];

    const magnitude = vars.p[i] * g + vars.pNear[i] * g * g;
    const f = vars.color[i] === vars.color[j] ? 0.99 : 1.01;
    const d = multiplyScalar(
      unitApprox(subtract(n, p)),
      magnitude * f * dt * dt
    );

    vars.pos[i * 3] -= d[0] * 0.5;
    vars.pos[i * 3 + 1] -= d[1] * 0.5;

    vars.pos[j * 3] += d[0] * 0.5;
    vars.pos[j * 3 + 1] += d[1] * 0.5;
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

const contain = (i, dt) => {
  const sx = Math.sign(vars.pos[i * 3]);
  const sy = Math.sign(vars.pos[i * 3 + 1]);

  if (vars.pos[i * 3] * sx > boundingArea.r) {
    const dx = Math.max(0, (Math.random() - 0.5) * UNCERTAINTY * dt);
    vars.pos[i * 3] = (boundingArea.r - dx) * sx;
  }

  if (vars.pos[i * 3 + 1] * sy > boundingArea.t) {
    const dy = Math.max(0, (Math.random() - 0.5) * UNCERTAINTY * dt);
    vars.pos[i * 3 + 1] = (boundingArea.t - dy) * sy;
  }
};

const calculateVelocity = (i, dt) => {
  const p = [vars.pos[i * 3], vars.pos[i * 3 + 1]];
  const old = [vars.oldX[i], vars.oldY[i]];

  const v = multiplyScalar(subtract(p, old), 1 / dt);

  vars.vx[i] = v[0];
  vars.vy[i] = v[1];
};

const sample = () => {
  const stride = 4;
  const color = new Color(0x000000);

  for (let i = 0; i < GRID_CELLS; i++) {
    for (let j = 0; j < GRID_CELLS; j++) {
      color.setHex(0x000000);

      const sampleDensity = hashMap.query(i, j).length;
      const sampleColor = hashMap.query(i, j, 1).reduce(
        (result, p) => {
          result.count++;
          result.color = result.color.lerp(
            colors[vars.color[p]],
            1 / result.count
          );
          return result;
        },
        { color, count: 0 }
      ).color;

      data[(i + j * GRID_CELLS) * stride] = sampleColor.r * 255;
      data[(i + j * GRID_CELLS) * stride + 1] = sampleColor.g * 255;
      data[(i + j * GRID_CELLS) * stride + 2] = sampleColor.b * 255;
      data[(i + j * GRID_CELLS) * stride + 3] = sampleDensity;
    }
  }

  planeMaterial.uniforms.grid.value.needsUpdate = true;
};

// const composer = new EffectComposer(renderer);
// const renderPass = new RenderPass(c);
// renderPass.renderToScreen = true;
// composer.addPass(renderPass);

// const blendPointsPass = new ShaderPass(BlendPointsShader);
// blendPointsPass.renderToScreen = true;
// composer.addPass(blendPointsPass);

const maxFrameDuration = 1 / 20;

let frame;
let tPrev;

function loop() {
  renderer.render(scene, camera);

  const t = performance.now();
  // simulate(1 / 60);
  simulate(Math.min((t - tPrev) / 1000, maxFrameDuration));
  sample();
  tPrev = t;

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

  // const mouseNeighbors = hashMap.query(worldXToGridX(x), worldXToGridX(y))
  // const p = mouseNeighbors.reduce((result, i) => result + vars.pNear[i], 0) / mouseNeighbors.length
  // console.log(p)
});

window.addEventListener("mousedown", () => (mouseDown = true));
window.addEventListener("mouseup", () => (mouseDown = false));
