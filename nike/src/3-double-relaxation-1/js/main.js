import {
  SphereGeometry,
  Mesh,
  PointLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  MeshBasicMaterial,
} from "three"

import clampNumber from '../../js/clampNumber'
import mapNumber from '../../js/mapNumber'
import SpatialHashMap from '../../js/SpatialHashMap'
import { multiplyScalar, length, lengthSq, add, subtract, dot, unit, unitApprox, lerp } from '../../js/2dVectorOperations'

const PARTICLE_COUNT = 2500

const STIFFNESS = .4
const STIFFNESS_NEAR = 1
const REST_DENSITY = 10
const REST_DENSITY_INV = 1 / REST_DENSITY
const INTERACTION_RADIUS = 1.5
const INTERACTION_RADIUS_INV = 1 / INTERACTION_RADIUS
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS ** 2
const GRAVITY = [0, -13]
const VISCOSITY = .01
const WALL_DISTANCE = .1 * INTERACTION_RADIUS
const WALL_DISTANCE_INV = 1 / WALL_DISTANCE

console.log({
  PARTICLE_COUNT,
  REST_DENSITY,
  INTERACTION_RADIUS,
  GRAVITY,
  VISCOSITY
})

const vars = {
  x: new Float32Array(PARTICLE_COUNT),
  y: new Float32Array(PARTICLE_COUNT),
  oldX: new Float32Array(PARTICLE_COUNT),
  oldY: new Float32Array(PARTICLE_COUNT),
  vx: new Float32Array(PARTICLE_COUNT),
  vy: new Float32Array(PARTICLE_COUNT),
  p: new Float32Array(PARTICLE_COUNT),
  pNear: new Float32Array(PARTICLE_COUNT),
  color: new Uint8Array(PARTICLE_COUNT),
  mesh: []
}

const colors = [0xff4e91, 0xffe04e, 0x3568e5]

const canvas = document.querySelector("#canvas")
const dpr = window.devicePixelRatio
const { offsetWidth: width, offsetHeight: height } = canvas
const calculateViewportHeight = (perspectiveAngle, distance) => {
  return Math.tan(perspectiveAngle / 2 / 180 * Math.PI) * distance * 2
}

const scene = new Scene()
const camera = new PerspectiveCamera(75, width / height, 0.1, 1000)
camera.position.z = 30

const renderer = new WebGLRenderer({ canvas, alpha: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(width, height)

const viewportHeight = calculateViewportHeight(75, 30)
const boundingArea = {
  w: viewportHeight * .66,
  h: viewportHeight * .66,
  l: viewportHeight * -.33,
  r: viewportHeight * .33,
  t: viewportHeight * .33,
  b: viewportHeight * -.33,
}

const screenToWorldSpace = ({ x, y }) => ({
  x: (-.5 + x / width) * viewportHeight / height * width,
  y: -1 * (-.5 + y / height) * viewportHeight
})

const light = new PointLight(0xffffff, 1, 100)
light.position.set(20, 10, 30)
scene.add(light)

const mouse = [-1000, -1000];
let mouseDown = false

for (let i = 0; i < PARTICLE_COUNT; i++) {
  vars.x[i] = boundingArea.l + Math.random() * boundingArea.w
  vars.y[i] = boundingArea.b + Math.random() ** 1.5 * .4 * boundingArea.h
  vars.oldX[i] = vars.x[i]
  vars.oldY[i] = vars.y[i]
  vars.vx[i] = 0
  vars.vy[i] = 0
  vars.color[i] = Math.floor(Math.random() * 3)

  const geometry = new SphereGeometry(.15, 4, 4)
  const material = new MeshBasicMaterial({ color: colors[vars.color[i]] })
  const sphere = new Mesh(geometry, material)
  sphere.position.x = vars.x[i]
  sphere.position.y = vars.y[i]
  vars.mesh[i] = sphere
  scene.add(sphere)
}

const hashMap = new SpatialHashMap(boundingArea.r, INTERACTION_RADIUS)

const simulate = dt => {
  
  hashMap.clear()
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {

    vars.oldX[i] = vars.x[i]
    vars.oldY[i] = vars.y[i]

    applyGlobalForces(i, dt)

    vars.x[i] += vars.vx[i] * dt
    vars.y[i] += vars.vy[i] * dt
    
    hashMap.add(vars.x[i], vars.y[i], i)

  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {

    const results = hashMap.query(vars.x[i], vars.y[i])
    let neighbors = []

    for (let k = 0; k < results.length; k++) {
      const j = results[k]
      if (i === j) continue
      const g = particleGradient(i, j)
      if (!g) continue
      neighbors.push([j, g])
    }

    updateDensities(i, neighbors)
    avoidWallClumping(i, dt)
    contain(i, dt)
    
    // perform double density relaxation
    relax(i, neighbors, dt)

  }
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    
    contain(i, dt)

    // Calculate new velocities
    calculateVelocity(i, dt)

    // Update
    const mesh = vars.mesh[i]
    mesh.position.x = vars.x[i]
    mesh.position.y = vars.y[i]
    mesh.verticesNeedUpdate = true

  }

}

const applyGlobalForces = (i, dt) => {
  let force = Array.from(GRAVITY)

  force[1] += vars.color[i] / 5

  if (mouseDown) {
    const fromMouse = subtract([vars.x[i], vars.y[i]], mouse)
    const scalar = Math.min(100, (1000 / lengthSq(fromMouse)))
    const mouseForce = multiplyScalar(unitApprox(fromMouse), scalar)
    force = add(force, mouseForce)
  }

  const dv = multiplyScalar(force, dt)

  vars.vx[i] += dv[0]
  vars.vy[i] += dv[1]
}

const updateDensities = (i, neighbors) => {
  let density = 0
  let nearDensity = 0

  for (let k = 0; k < neighbors.length; k++) {
    const g = neighbors[k][1]
    density += g * g
    nearDensity += g * g * g
  }

  vars.p[i] = STIFFNESS * (density - REST_DENSITY)
  vars.pNear[i] = STIFFNESS_NEAR * nearDensity
}

const relax = (i, neighbors, dt) => {
  const p = [vars.x[i], vars.y[i]]

  for (let k = 0; k < neighbors.length; k++) {
    const j = neighbors[k][0]
    const g = neighbors[k][1]
    const n = [vars.x[j], vars.y[j]]

    const magnitude = vars.p[i] * g + vars.pNear[i] * g * g
    const f = (vars.color[i] === vars.color[j]) ? 1.01 : .99
    const d = multiplyScalar(unitApprox(subtract(n, p)), magnitude * f * dt * dt)
    
    vars.x[i] -= d[0] * .5
    vars.y[i] -= d[1] * .5

    vars.x[j] += d[0] * .5
    vars.y[j] += d[1] * .5
  }
}

const particleGradient = (i, j) => {
  return gradient([vars.x[i], vars.y[i]], [vars.x[j], vars.y[j]])
}

const gradientCache = new Float32Array(Math.ceil(INTERACTION_RADIUS_SQ * 10))

const gradient = (a, b) => {
  const lsq = lengthSq(subtract(a, b))
  if (lsq > INTERACTION_RADIUS_SQ) return 0

  const cacheIndex = lsq * 10 | 0
  if (gradientCache[cacheIndex]) return gradientCache[cacheIndex]

  const g = Math.max(0, 1 - Math.sqrt(lsq) * INTERACTION_RADIUS_INV)

  gradientCache[cacheIndex] = g
  return g
}

const avoidWallClumping = (i, dt) => {
  const x = vars.x[i]
  const y = vars.y[i]
  const sx = x > 0 ? 1 : -1
  const sy = y > 0 ? 1 : -1
  const pNear = vars.pNear[i]

  const gx = 1 - Math.abs(boundingArea.r * sx - x) * WALL_DISTANCE_INV
  const gy = 1 - Math.abs(boundingArea.t * sy - y) * WALL_DISTANCE_INV

  if (x * sx > boundingArea.r - WALL_DISTANCE){
    vars.x[i] += -sx * INTERACTION_RADIUS * gx * pNear * REST_DENSITY_INV * dt // * f // * dt;
  }

  if (y * sy > boundingArea.t - WALL_DISTANCE){
    vars.y[i] += -sy * INTERACTION_RADIUS * gy * pNear * REST_DENSITY_INV * dt // * f // * dt;
  }

}

const contain = (i, dt) => {
  const sx = Math.sign(vars.x[i])
  const sy = Math.sign(vars.y[i])

  if (vars.x[i] * sx > boundingArea.r) {
    vars.x[i] = (boundingArea.r) * sx
  }

  if (vars.y[i] * sy > boundingArea.t) {
    vars.y[i] = (boundingArea.t) * sy
  }
}

const calculateVelocity = (i, dt) => {
  const p = [vars.x[i], vars.y[i]]
  const old = [vars.oldX[i], vars.oldY[i]]

  const v = multiplyScalar(subtract(p, old), 1 / dt)

  vars.vx[i] = v[0]
  vars.vy[i] = v[1]
}

const maxFrameDuration = 1 / 20

let frame
let tPrev

function loop() {
  const t = performance.now()
  // simulate(16 / 1000)
  simulate(Math.min((t - tPrev) / 1000, maxFrameDuration))
  tPrev = t

  renderer.render(scene, camera)
  frame = requestAnimationFrame(loop)
}

const start = () => {
  tPrev = performance.now() - 16
  exit()
  loop()
}

const exit = () => {
  cancelAnimationFrame(frame)
}

document.addEventListener('keyup', e => e.which === 32 && (frame ? exit() : start()))

window.addEventListener('mousemove', e => {
  const { x, y } = screenToWorldSpace({ x: e.clientX, y: e.clientY })
  mouse[0] = x
  mouse[1] = y
})

window.addEventListener('mousedown', () => mouseDown = true)
window.addEventListener('mouseup', () => mouseDown = false)