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
import { makeLenses } from '../../js/typedArrayLens'
import { multiplyScalar, length, lengthSq, add, subtract, dot, unit } from '../../js/2dVectorOperations'

const PARTICLE_COUNT = 1200

const REST_DENSITY = 40
const INTERACTION_RADIUS = 5
const GRAVITY = [0, -70]
const VISCOSITY = 1

console.log({
  PARTICLE_COUNT,
  REST_DENSITY,
  INTERACTION_RADIUS,
  GRAVITY,
  VISCOSITY
})

const properties = ['x', 'y', 'oldX', 'oldY', 'vx', 'vy', 'p', 'pNear', 'color']
const data = new Float32Array(PARTICLE_COUNT * properties.length);
const particles = makeLenses(data, properties)
const meshes = []

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

const screenToWorldSpace = ({ x, y }) => ({
  x: (-.5 + x / width) * viewportHeight / height * width,
  y: -1 * (-.5 + y / height) * viewportHeight
})

const light = new PointLight(0xffffff, 1, 100)
light.position.set(20, 10, 30)
scene.add(light)

const mouse = [-1000, -1000];

particles.forEach((i, get, set) => {
  set('x', Math.sign(-.5 + Math.random()) * (.5 + Math.random() / 2) * viewportHeight * .33)
  set('y', viewportHeight * -.33 + Math.random() * viewportHeight * .66)
  set('oldX', get('x'))
  set('oldY', get('y'))
  set('vx', 0)
  set('vy', 0)
  set('color', Math.random() * 0xffffff)
})

const hashMap = new SpatialHashMap(INTERACTION_RADIUS / 10)

particles.forEach((i, get) => {
  const color = get('color')
  const x = get('x')
  const y = get('y')
  const geometry = new SphereGeometry(viewportHeight / height * 3, 2, 2)
  const material = new MeshBasicMaterial({ color })
  const sphere = new Mesh(geometry, material)
  sphere.position.x = x
  sphere.position.y = y
  meshes[i] = sphere
  scene.add(sphere)
})

const boundingArea = {
  w: viewportHeight * .66,
  h: viewportHeight * .66
}

const simulate = () => {
  const dt = 60 / 1000
  
  hashMap.clear()

  particles.forEach((i, get, set) => {

    applyGlobalForces(i, dt)

    let x = get('x')
    let y = get('y')
    
    set('oldX', x)
    set('oldY', y)

    x += get('vx') * dt
    y += get('vy') * dt
    
    set('x', x)
    set('y', y)
    
    hashMap.add(x, y, i)

  })

  particles.forEach((i, get) => {

    const neighbors = hashMap
      .query(get('x'), get('y'), INTERACTION_RADIUS)
      .filter(j => i !== j)
    
    applyViscosity(i, neighbors, dt)
    
    updateDensities(i, neighbors)
    
    // perform double density relaxation
    relax(i, neighbors, dt)

  })

  particles.forEach((i, get) => {
    
    // Calculate new velocities
    calculateVelocity(i)

    // Update
    const mesh = meshes[i]
    mesh.position.x = get('x')
    mesh.position.y = get('y')
    mesh.verticesNeedUpdate = true

  })

}

const applyGlobalForces = (i, dt) => {
  const x = particles.get(i, 'x')
  const y = particles.get(i, 'y')
  const vx = particles.get(i, 'vx')
  const vy = particles.get(i, 'vy')

  const fromMouse = subtract([x, y], mouse)
  const scalar = Math.min(500, 4000 / lengthSq(fromMouse))
  const mouseForce = multiplyScalar(unit(fromMouse), scalar)

  const [dvx, dvy] = multiplyScalar(add(GRAVITY, mouseForce), dt)

  particles.set(i, 'vx', vx + dvx)
  particles.set(i, 'vy', vy + dvy)
}

const applyViscosity = (i, neighbors, dt) => {
  const x = particles.get(i, 'x')
  const y = particles.get(i, 'y')

  neighbors.forEach(j => {
    if (i >= j) return
    const g = gradient(i, j)
    if (!g) return

    const nx = particles.get(j, 'x')
    const ny = particles.get(j, 'y')
    const vx = particles.get(i, 'vx')
    const vy = particles.get(i, 'vy')
    const nvx = particles.get(j, 'vx')
    const nvy = particles.get(j, 'vy')

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
    
    particles.set(i, 'vx', vx + dvx)
    particles.set(i, 'vy', vy + dvy)
    particles.set(j, 'vx', nvx + ndvx)
    particles.set(j, 'vy', nvy + ndvy)
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

  particles.set(i, 'p', .04 * (density - REST_DENSITY))
  particles.set(i, 'pNear', nearDensity)
}

const relax = (i, neighbors, dt) => {
  if (!neighbors.length) return

  const pressure = particles.get(i, 'p')
  const nearPressure = particles.get(i, 'pNear')
  const x = particles.get(i, 'x')
  const y = particles.get(i, 'y')
  let dx = 0
  let dy = 0

  neighbors.forEach(j => {
    const g = gradient(i, j)
    if (!g) return

    const nx = particles.get(j, 'x')
    const ny = particles.get(j, 'y')

    const magnitude = pressure * g + nearPressure * g ** 2
    const u = unit(subtract([nx, ny], [x, y]))
    const d = multiplyScalar(u, dt * dt * magnitude)
    
    dx += d[0] * -.5
    dy += d[1] * -.5

    particles.set(j, 'x', nx + d[0] * .5)
    particles.set(j, 'y', ny + d[1] * .5)
    
    contain(j, dt)
  })

  particles.set(i, 'x', x + dx)
  particles.set(i, 'y', y + dy)

  contain(i, dt)
}

const gradient = (i, j) => {
  const x = particles.get(i, 'x')
  const y = particles.get(i, 'y')
  const nx = particles.get(j, 'x')
  const ny = particles.get(j, 'y')
  const d = subtract([nx, ny], [x, y])
  return Math.max(0, 1 - length(d) / INTERACTION_RADIUS)
}

const contain = (i, dt) => {

  const x = particles.get(i, 'x')
  const y = particles.get(i, 'y')

  let dx = 0
  let dy = 0

  if (x < boundingArea.w / -2 + INTERACTION_RADIUS) {
    const q = 1 - Math.abs((x - (boundingArea.w / -2)) / INTERACTION_RADIUS)
    dx += .2 * q * q * dt
  } else if (x > boundingArea.w / 2 - INTERACTION_RADIUS) {
    const q = 1 - Math.abs((x - (boundingArea.w / 2)) / INTERACTION_RADIUS)
    dx -= .2 * q * q * dt
  }

  if (y < boundingArea.h / -2 + INTERACTION_RADIUS) {
    const q = 1 - Math.abs((y - (boundingArea.h / -2)) / INTERACTION_RADIUS)
    dy += .2 * q * q * dt
  } else if (y > boundingArea.h / 2 - INTERACTION_RADIUS) {
    const q = 1 - Math.abs((y - (boundingArea.h / 2)) / INTERACTION_RADIUS)
    dy -= .2 * q * q * dt
  }

  particles.set(i, 'x', Math.max(boundingArea.w / -2 + .01, Math.min(boundingArea.w / 2 - .01, x + dx)))
  particles.set(i, 'y', Math.max(boundingArea.h / -2 + .01, Math.min(boundingArea.h / 2 - .01, y + dy)))
}

const calculateVelocity = i => {
  const x = particles.get(i, 'x')
  const y = particles.get(i, 'y')
  const oldX = particles.get(i, 'oldX')
  const oldY = particles.get(i, 'oldY')
  
  const v = subtract([x, y], [oldX, oldY])
  
  particles.set(i, 'vx', v[0])
  particles.set(i, 'vy', v[1])
}

const t0 = performance.now()
const runFor = 10000

const render = auto => {
  const shouldContinue = performance.now() - t0 < runFor
  if (auto && shouldContinue) {
    requestAnimationFrame(render)
  }
  simulate()
  renderer.render(scene, camera)
  // gcc.capture(canvas);

}

render(true)

document.addEventListener('keyup', e => e.which === 32 && render())
document.addEventListener('keyup', e => e.which === 32 && console.log(particles))

window.addEventListener('mousemove', e => {
  const { x, y } = screenToWorldSpace({ x: e.clientX, y: e.clientY })
  mouse[0] = x
  mouse[1] = y
})