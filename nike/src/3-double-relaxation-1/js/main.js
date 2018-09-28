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

const signIsEqual = (a, b) => a * b > 0

const PARTICLE_COUNT = 1600
let counter = 0

const STIFFNESS = .4
const STIFFNESS_NEAR = 1
const REST_DENSITY = 3
const INTERACTION_RADIUS = 1.5
const INTERACTION_RADIUS_INV = 1 / INTERACTION_RADIUS
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS ** 2
const GRAVITY = [0, -15]
const VISCOSITY = .01

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
  vars.y[i] = boundingArea.b + Math.random() * boundingArea.h / 3.5
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

const hashMap = new SpatialHashMap(boundingArea.r, boundingArea.w / 4 / INTERACTION_RADIUS, INTERACTION_RADIUS)

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

    const neighbors = hashMap
      .query(vars.x[i], vars.y[i])
      .map(j => ([j, particleGradient(i, j)]))
      .filter(([j, g], i) => {
        if (i === j) return false
        if (!g) return false
        return true
      })

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
  let force = GRAVITY

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

  neighbors.forEach(([j, g]) => {
    density += g ** 2
    nearDensity += g ** 3
  })

  vars.p[i] = STIFFNESS * (density - REST_DENSITY)
  vars.pNear[i] = STIFFNESS_NEAR * nearDensity
}

const relax = (i, neighbors, dt) => {
  
  const x = vars.x[i]
  const y = vars.y[i]

  const pressure = vars.p[i]
  const nearPressure = vars.pNear[i]
  
  let dx = 0
  let dy = 0

  neighbors.forEach(([j, g]) => {

    const nx = vars.x[j]
    const ny = vars.y[j]

    const magnitude = pressure * g + nearPressure * g ** 2
    const f = (vars.color[i] !== (vars.color[j] + 1) % colors.length) ? .99 : 1.01
    const u = unitApprox(subtract([nx, ny], [x, y]))
    const d = multiplyScalar(u, dt * dt * magnitude * f)
    
    dx += d[0] * -.5
    dy += d[1] * -.5

    vars.x[j] = nx + d[0] * .5
    vars.y[j] = ny + d[1] * .5
    
  })

  vars.x[i] += dx
  vars.y[i] += dy

}

const particleGradient = (i, j) => {
  return gradient([vars.x[i], vars.y[i]], [vars.x[j], vars.y[j]])
}

const gradientCache = new Float32Array(Math.ceil(INTERACTION_RADIUS_SQ * 5))
const gradient = (a, b) => {
  const lsq = lengthSq(subtract([a[0], a[1]], [b[0], b[1]]))
  if (lsq > INTERACTION_RADIUS_SQ) return 0
  const cacheIndex = Math.round(lsq * 5)
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

  const I = INTERACTION_RADIUS / 10 * Math.max(1, vars.pNear[i] / REST_DENSITY)

  // vars.mesh[i].material.color.setHSL(0, 1, f)

  if (x * sx > boundingArea.r - I){
    const g = 1 - Math.abs(boundingArea.r * sx - x) / I;
    vars.x[i] -= sx * REST_DENSITY * g ** 2 * dt * 0.5;
  }

  if (y * sy > boundingArea.t - I){
    const g = 1 - Math.abs(boundingArea.t * sy - y) / I;
    vars.y[i] -= sy * REST_DENSITY * g ** 2 * dt * 0.5;
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
  const x = vars.x[i]
  const y = vars.y[i]
  const oldX = vars.oldX[i]
  const oldY = vars.oldY[i]

  const v = multiplyScalar(subtract([x, y], [oldX, oldY]), 1 / dt)

  vars.vx[i] = v[0]
  vars.vy[i] = v[1]
}

const t0 = performance.now()
const runFor = 15000

let frame
let tPrev

const loop = () => {
  const t = performance.now()
  simulate(Math.min((t - tPrev) / 1000, 1 / 30))
  tPrev = t

  counter = 0

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