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

const REST_DENSITY = 20
const INTERACTION_RADIUS = 4
const GRAVITY = new Vector2(0, 0)
const VISCOSITY = .01

console.log({
  REST_DENSITY,
  INTERACTION_RADIUS,
  GRAVITY,
  VISCOSITY
})

import SpatialHashMap from '../../js/SpatialHashMap'

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

const light = new PointLight(0xffffff, 1, 100)
light.position.set(20, 10, 30)
scene.add(light)

const mouse = new Vector2(-1000, -1000);

const particles = new Array(1200)
  .fill(0)
  .map((_, i) => ({
    position: new Vector2(
      Math.sign(-.5 + Math.random()) * (.5 + Math.random() / 2) * viewportHeight * .33, 
      viewportHeight * -.33 + Math.random() * viewportHeight * .66
    ),
    velocity: new Vector2(0, 0),
    color: Math.random() * 0xffffff,
    density: 1,
    i
  }))

const hashMap = new SpatialHashMap(INTERACTION_RADIUS / 10)

particles.forEach(particle => {
  const { position, color } = particle
  const geometry = new SphereGeometry(viewportHeight / height * 3, 2, 2)
  const material = new MeshBasicMaterial({ color })
  const sphere = new Mesh(geometry, material)
  particle.mesh = sphere
  sphere.position.x = position.x
  sphere.position.y = position.y
  scene.add(sphere)
})

const boundingArea = {
  w: viewportHeight * .66,
  h: viewportHeight * .66
}

const simulate = () => {
  const dt = 60 / 1000
  
  hashMap.clear()

  particles.forEach(particle => {

    hashMap.add(
      particle.position.x, 
      particle.position.y, 
      particle
    )

    applyGlobalForces(particle, dt)
    
    particle.oldPosition = particle.position.clone()
    particle.position.addScaledVector(particle.velocity, dt)

  })

  particles.forEach(particle => {

    particle.neighbors = hashMap.query(
      particle.position.x, 
      particle.position.y, 
      INTERACTION_RADIUS
    )

    applyViscosity(particle, dt)

    updateDensities(particle)

    // perform double density relaxation
    if (particle.neighbors.length) {
      relax(particle, dt)
    }

  })

  particles.forEach(particle => {

    // Calculate new velocities
    calculateVelocity(particle)

    // Update
    particle.mesh.position.x = particle.position.x
    particle.mesh.position.y = particle.position.y
    particle.mesh.verticesNeedUpdate = true

  })

}

const applyGlobalForces = (particle, dt) => {
  particle.velocity.addScaledVector(GRAVITY, dt)
  const fromMouse = particle.position.clone().sub(mouse)
  const mouseForce = fromMouse.normalize().multiplyScalar(10 / fromMouse.lengthSq())
  particle.velocity.add(mouseForce)
}

const applyViscosity = (particle, dt) => {
  particle.neighbors.forEach(neighbor => {
    if (particle.i >= neighbor.i) return
    const g = gradient(particle, neighbor)
    if (!g) return
    const unit = neighbor.position.clone().sub(particle.position).normalize()
    const u = particle.velocity.clone().sub(neighbor.velocity).dot(unit)
    if (u > 0) {
      const impulse = unit.multiplyScalar(dt * g * VISCOSITY * u * u)
      particle.velocity.addScaledVector(impulse, -.5)
      neighbor.velocity.addScaledVector(impulse, .5)
    }
  })  
}

const updateDensities = particle => {
  let density = 0
  let nearDensity = 0

  particle.neighbors.forEach(neighbor => {
    const g = gradient(particle, neighbor)
    if (!g) return
    density += g ** 2
    nearDensity += g ** 3
  })

  // particle.walls.forEach(neighbor => {
  //   const g = gradient(particle, neighbor)
  //   if (!g) return
  //   density += WALL_DENSITY * g ** 2
  //   nearDensity += WALL_DENSITY * g ** 3
  // })

  particle.pressure = (density - REST_DENSITY)
  particle.nearPressure = nearDensity
}

const relax = (particle, dt) => {
  particle.neighbors.forEach(neighbor => {
    const g = gradient(particle, neighbor)
    if (!g) return
    const magnitude = particle.pressure * g + particle.nearPressure * g ** 2
    const unit = neighbor.position.clone().sub(particle.position).normalize()
    const d = unit.multiplyScalar(dt * dt).multiplyScalar(magnitude)
    particle.position.addScaledVector(d, -.5)
    neighbor.position.addScaledVector(d, .5)
    contain(neighbor, dt)
  })
  contain(particle, dt)
}

const gradient = (particle, neighbor) => {
  const difference = neighbor.position.clone().sub(particle.position)
  return Math.max(0, 1 - (difference.length() / INTERACTION_RADIUS))
}

const contain = (particle, dt) => {

  let dx = 0
  let dy = 0

  if (particle.position.x < boundingArea.w / -2 + INTERACTION_RADIUS) {
    const q = 1 - Math.abs((particle.position.x - (boundingArea.w / -2)) / INTERACTION_RADIUS)
    dx += .1 * q * q * dt
  } else if (particle.position.x > boundingArea.w / 2 - INTERACTION_RADIUS) {
    const q = 1 - Math.abs((particle.position.x - (boundingArea.w / 2)) / INTERACTION_RADIUS)
    dx -= .1 * q * q * dt
  }

  if (particle.position.y < boundingArea.h / -2 + INTERACTION_RADIUS) {
    const q = 1 - Math.abs((particle.position.y - (boundingArea.h / -2)) / INTERACTION_RADIUS)
    dy += .1 * q * q * dt
  } else if (particle.position.y > boundingArea.h / 2 - INTERACTION_RADIUS) {
    const q = 1 - Math.abs((particle.position.y - (boundingArea.h / 2)) / INTERACTION_RADIUS)
    dy -= .1 * q * q * dt
  }

  particle.position.set(
    Math.max(boundingArea.w / -2 + .01, Math.min(boundingArea.w / 2 - .01, particle.position.x + dx)),
    Math.max(boundingArea.h / -2 + .01, Math.min(boundingArea.h / 2 - .01, particle.position.y + dy))
  )
}

const calculateVelocity = particle => {
  particle.velocity = particle.position.clone().sub(particle.oldPosition)
}

const t0 = performance.now()
const runFor = 15000

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
  const x = (-.5 + e.clientX / window.innerWidth) * boundingArea.w
  const y = -(-.5 + e.clientY / window.innerHeight) * boundingArea.h
  mouse.set(x, y)
})