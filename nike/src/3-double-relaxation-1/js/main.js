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

const PARTICLE_COUNT = 3000

const REST_DENSITY = 3
const INTERACTION_RADIUS = 2
const GRAVITY = [0, -100]
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

const hashMap = new SpatialHashMap(INTERACTION_RADIUS / 10)

const simulate = () => {
  const dt = 60 / 1000
  
  hashMap.clear()

  for (let i = 0; i < PARTICLE_COUNT; i++) {

    applyGlobalForces(i, dt)
    
    vars.oldX[i] = vars.x[i]
    vars.oldY[i] = vars.y[i]
    
    vars.x[i] += vars.vx[i] * dt
    vars.y[i] += vars.vy[i] * dt
    
    hashMap.add(vars.x[i], vars.y[i], i)

  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {

    const neighbors = hashMap
      .query(vars.x[i], vars.y[i], INTERACTION_RADIUS)
      .filter(j => i !== j)

    // applyViscosity(i, neighbors, dt)
    
    updateDensities(i, neighbors)
    
    // perform double density relaxation
    relax(i, neighbors, dt)

    contain(i, dt)

  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    
    // Calculate new velocities
    calculateVelocity(i)

    // Update
    const mesh = vars.mesh[i]
    mesh.position.x = vars.x[i]
    mesh.position.y = vars.y[i]
    mesh.verticesNeedUpdate = true

  }

}

const applyGlobalForces = (i, dt) => {
  const fromMouse = subtract([vars.x[i], vars.y[i]], mouse)
  const scalar = Math.min(500, 4000 / lengthSq(fromMouse))
  const mouseForce = multiplyScalar(unit(fromMouse), scalar)

  const dv = multiplyScalar(add(GRAVITY, mouseForce), dt)

  vars.vx[i] += dv[0]
  vars.vy[i] += dv[1]
}

const applyViscosity = (i, neighbors, dt) => {
  const x = vars.x[i]
  const y = vars.y[i]

  neighbors.forEach(j => {
    if (i >= j) return
    const g = gradient(i, j)
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

  neighbors.forEach(j => {
    const g = gradient(i, j)
    if (!g) return
    density += g ** 2
    nearDensity += g ** 3
  })

  vars.p[i] = .04 * (density - REST_DENSITY)
  vars.pNear[i] = nearDensity
}

const relax = (i, neighbors, dt) => {
  if (!neighbors.length) return

  const pressure = vars.p[i]
  const nearPressure = vars.pNear[i]
  const x = vars.x[i]
  const y = vars.y[i]
  let dx = 0
  let dy = 0

  neighbors.forEach(j => {
    const g = gradient(i, j)
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

const gradient = (i, j) => {
  const x = vars.x[i]
  const y = vars.y[i]
  const nx = vars.x[j]
  const ny = vars.y[j]
  const d = subtract([nx, ny], [x, y])
  return Math.max(0, 1 - length(d) / INTERACTION_RADIUS)
}

const contain = (i, dt) => {

  const x = vars.x[i]
  const y = vars.y[i]

  let dx = 0
  let dy = 0

  if (x < boundingArea.w / -2 + INTERACTION_RADIUS) {
    const q = 1 - Math.abs((x - (boundingArea.w / -2)) / INTERACTION_RADIUS)
    dx += .05 * q * q * dt
  } else if (x > boundingArea.w / 2 - INTERACTION_RADIUS) {
    const q = 1 - Math.abs((x - (boundingArea.w / 2)) / INTERACTION_RADIUS)
    dx -= .05 * q * q * dt
  }

  if (y < boundingArea.h / -2 + INTERACTION_RADIUS) {
    const q = 1 - Math.abs((y - (boundingArea.h / -2)) / INTERACTION_RADIUS)
    dy += .05 * q * q * dt
  } else if (y > boundingArea.h / 2 - INTERACTION_RADIUS) {
    const q = 1 - Math.abs((y - (boundingArea.h / 2)) / INTERACTION_RADIUS)
    dy -= .05 * q * q * dt
  }

  vars.x[i] = Math.max(boundingArea.w / -2 + .01, Math.min(boundingArea.w / 2 - .01, x + dx))
  vars.y[i] = Math.max(boundingArea.h / -2 + .01, Math.min(boundingArea.h / 2 - .01, y + dy))
}

const calculateVelocity = i => {
  const x = vars.x[i]
  const y = vars.y[i]
  const oldX = vars.oldX[i]
  const oldY = vars.oldY[i]
  
  const v = subtract([x, y], [oldX, oldY])
  
  vars.vx[i] = v[0]
  vars.vy[i] = v[1]
}

const t0 = performance.now()
const runFor = 10000

let animationFrame

const render = () => renderer.render(scene, camera)
const loop = () => {
  animationFrame && cancelAnimationFrame(animationFrame)
  requestAnimationFrame(render)
  simulate()
}

const interval = setInterval(loop, 1000 / 60)
setTimeout(() => clearInterval(interval), runFor)

document.addEventListener('keyup', e => e.which === 32 && render())
document.addEventListener('keyup', e => e.which === 32 && console.log(particles))

window.addEventListener('mousemove', e => {
  const { x, y } = screenToWorldSpace({ x: e.clientX, y: e.clientY })
  mouse[0] = x
  mouse[1] = y
})