import {
  PlaneGeometry,
  SphereGeometry,
  Mesh,
  PointLight,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector2,
  MeshBasicMaterial,
  VertexColors,
  Color
} from "three"

import SpatialHashMap from '../../js/SpatialHashMap'
import { multiplyScalar, length, lengthSq, add, subtract, dot, unit } from '../../js/2dVectorOperations'

const PARTICLE_COUNT = 1500

let counter = 0

const STIFFNESS = .4
const STIFFNESS_NEAR = 1
const REST_DENSITY = 4
const WALL_PRESSURE = 1.5
const INTERACTION_RADIUS = 2
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS ** 2
const GRAVITY = [0, -5]
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
  color: new Uint32Array(PARTICLE_COUNT),
  mesh: []
}

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
  h: viewportHeight * .66
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
  vars.x[i] = boundingArea.w * -.5 + Math.random() * boundingArea.w
  vars.y[i] = boundingArea.h * -.5 + Math.random() * boundingArea.h
  vars.oldX[i] = vars.x[i]
  vars.oldY[i] = vars.y[i]
  vars.vx[i] = 0
  vars.vy[i] = 0
  vars.color[i] = Math.random() * 0xffffff

  const geometry = new SphereGeometry(viewportHeight / height * 3, 2, 2)
  const material = new MeshBasicMaterial({ color: vars.color[i] })
  const sphere = new Mesh(geometry, material)
  sphere.position.x = vars.x[i]
  sphere.position.y = vars.y[i]
  vars.mesh[i] = sphere
  scene.add(sphere)
}

const hashMap = new SpatialHashMap(boundingArea.w / 2, boundingArea.w / 4 / INTERACTION_RADIUS)

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
      .query(vars.x[i], vars.y[i], INTERACTION_RADIUS)
      .filter(j => i !== j)
      .map(j => ([j, particleGradient(i, j)]))

    // applyViscosity(i, neighbors, dt)
    
    updateDensities(i, neighbors)
    
    // perform double density relaxation
    relax(i, neighbors, dt)

    contain(i, dt)

  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    
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
    const mouseForce = multiplyScalar(unit(fromMouse), scalar)
    force = add(force, mouseForce)
  }

  const dv = multiplyScalar(force, dt)

  vars.vx[i] += dv[0]
  vars.vy[i] += dv[1]
}

const applyViscosity = (i, neighbors, dt) => {
  const x = vars.x[i]
  const y = vars.y[i]

  neighbors.forEach(([j, g]) => {
    if (i >= j) return
    if (!g) return

    const nx = vars.x[j]
    const ny = vars.y[j]
    const vx = vars.vx[i]
    const vy = vars.vy[i]
    const nvx = vars.vx[j]
    const nvy = vars.vy[j]

    const unitPosition = unit(subtract([nx, ny], [x, y]))
    const u = dot(subtract([vx, vy], [nvx, nvy]), unitPosition)

    let dvx = 0
    let dvy = 0
    let ndvx = 0
    let ndvy = 0

    if (u > 0) {
      const impulse = multiplyScalar(unitPosition, dt * g * VISCOSITY * u * u)
      dvx += impulse[0] * -.5
      dvy += impulse[1] * -.5
      ndvx += impulse[0] * .5
      ndvy += impulse[1] * .5
    }
    
    vars.vx[i] = vx + dvx
    vars.vy[i] = vy + dvy
    vars.vx[j] = nvx + ndvx
    vars.vy[j] = nvy + ndvy
  })  
}

const updateDensities = (i, neighbors) => {
  let density = 0
  let nearDensity = 0

  neighbors.forEach(([j, g]) => {
    if (!g) return
    density += g ** 2
    nearDensity += g ** 3
  })

  vars.p[i] = STIFFNESS * (density - REST_DENSITY)
  vars.pNear[i] = STIFFNESS_NEAR * nearDensity
}

const relax = (i, neighbors, dt) => {

  const pressure = vars.p[i]
  const nearPressure = vars.pNear[i]
  const x = vars.x[i]
  const y = vars.y[i]
  let dx = 0
  let dy = 0

  neighbors.forEach(([j, g]) => {
    if (!g) return

    const nx = vars.x[j]
    const ny = vars.y[j]

    const magnitude = pressure * g + nearPressure * g ** 2
    const u = unit(subtract([nx, ny], [x, y]))
    const d = multiplyScalar(u, dt * dt * magnitude)
    
    dx += d[0] * -.5
    dy += d[1] * -.5

    vars.x[j] = nx + d[0] * .5
    vars.y[j] = ny + d[1] * .5
    
    contain(j, dt)
  })

  vars.x[i] = x + dx
  vars.y[i] = y + dy
}

const particleGradient = (i, j) => {
  return gradient([vars.x[i], vars.y[i]], [vars.x[j], vars.y[j]])
}

const gradient = (a, b) => {
  const lsq = lengthSq(subtract([a[0], a[1]], [b[0], b[1]]))
  if (lsq > INTERACTION_RADIUS_SQ) return 0
  return Math.max(0, 1 - Math.sqrt(lsq) / INTERACTION_RADIUS)
}

const contain = (i, dt) => {

  const x = vars.x[i] = Math.max(boundingArea.w / -2 + .001, Math.min(boundingArea.w / 2 - .001, vars.x[i]))
  const y = vars.y[i] = Math.max(boundingArea.h / -2 + .001, Math.min(boundingArea.h / 2 - .001, vars.y[i]))
  
  if (x === 0 && y === 0) return

  const nx = boundingArea.w / 2 * Math.sign(x)
  const ny = boundingArea.h / 2 * Math.sign(y)
  const walls = [[x, ny], [nx, y]]

  walls.forEach(wall => {
    const g = gradient([x, y], wall)
    if (g === 0) return
  
    const magnitude = WALL_PRESSURE * g ** 2
    const u = unit(subtract(wall, [x, y]))
    const d = multiplyScalar(u, dt * dt * magnitude)
  
    vars.x[i] += d[0] * -.5
    vars.y[i] += d[1] * -.5
  })
  
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

let animationFrame

let frame
let tPrev

const loop = () => {
  renderer.render(scene, camera)
  frame = requestAnimationFrame(loop)
  const t = performance.now()
  simulate((t - tPrev) / 1000)
  tPrev = t
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