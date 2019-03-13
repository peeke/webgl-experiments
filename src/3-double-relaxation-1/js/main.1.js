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

const REST_DENSITY = 5
const STIFFNESS = .04
const STIFFNESS_NEAR = .1
const INTERACTION_RADIUS = 5
const PARTICLE_RADIUS = 4
const GRAVITY = new Vector2(0, -40)
const VISCOSITY = 0

console.log({
  REST_DENSITY,
  STIFFNESS,
  INTERACTION_RADIUS,
  GRAVITY,
  VISCOSITY
})

import { quadtree } from 'd3-quadtree'
import findAll from '../../js/findAll'
quadtree.prototype.findAll = findAll;

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
console.log({ viewportHeight: viewportHeight * .33 })

const light = new PointLight(0xffffff, 1, 100)
light.position.set(20, 10, 30)
scene.add(light)

const particles = new Array(500)
  .fill(0)
  .map((_, i) => ({
    position: new Vector2(
      viewportHeight * -.33 + Math.random() * viewportHeight * .45, 
      viewportHeight * -.33 + Math.random() * viewportHeight * .66
    ),
    velocity: new Vector2(0, 0),
    color: Math.random() * 0xffffff,
    i
  }))

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

  const points = particles.map((particle, i) => ([
    particle.position.x,
    particle.position.y,
    i
  ]))

  const tree = quadtree(points)
  const dt = 60 / 1000

  particles.forEach(particle => {

    const neighbors = tree
      .findAll(particle.position.x, particle.position.y, INTERACTION_RADIUS)
      .map(point => particles[point[2]])
      .filter(neighbor => neighbor !== particle)

    // applyGlobalForces(particle, dt)
    // applyViscosity(particle, neighbors, dt)
    
    particle.oldPosition = particle.position.clone()
    particle.position.addScaledVector(particle.velocity, dt)

    // perform double density relaxation
    if (neighbors) {
      doubleDensityRelaxation(particle, neighbors, dt)
    }

    // resolve collisions
    contain(particle, boundingArea)

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
}

const applyViscosity = (particle, neighbors, dt) => {
  neighbors.forEach(neighbor => {
    if (particle.i > neighbor.i) return
    const g = gradient(particle, neighbor)
    if (g < 0) return
    const unit = neighbor.position.clone().sub(particle.position).normalize()
    const u = particle.velocity.clone().sub(neighbor.velocity).dot(unit)
    if (u > 0) {
      const impulse = unit.multiplyScalar(dt * g * VISCOSITY * u * u)
      particle.velocity.addScaledVector(impulse, -.5)
      neighbor.velocity.addScaledVector(impulse, .5)
    }
  })  
}

const doubleDensityRelaxation = (particle, neighbors, dt) => {

  let density = 0
  let nearDensity = 0

  neighbors.forEach(neighbor => {
    const g = gradient(particle, neighbor)
    if (g < 0) return
    density += g ** 2
    nearDensity += g ** 3
  })

  // contain(particle, boundingArea)

  const pressure = STIFFNESS * (density - REST_DENSITY)
  const nearPressure = STIFFNESS_NEAR * nearDensity

  neighbors.forEach(neighbor => {
    const g = gradient(particle, neighbor)
    if (g < 0) return
    const magnitude = pressure * g + nearPressure * g ** 2
    const unit = neighbor.position.clone().sub(particle.position).normalize()
    const d = unit.multiplyScalar(dt * dt).multiplyScalar(magnitude)
    particle.position.addScaledVector(d, -.5)
    neighbor.position.addScaledVector(d, .5)
  })
}

const gradient = (particle, neighbor) => {
  const difference = neighbor.position.clone().sub(particle.position)
  return 1 - difference.length() / INTERACTION_RADIUS
}

const contain = (particle, boundingArea) => {
  const w = boundingArea.w / 2
  const h = boundingArea.h / 2

  if (particle.position.x < PARTICLE_RADIUS - w) {
    const q = 1 - Math.abs((particle.position.x + w) / PARTICLE_RADIUS);
    const x = particle.position.x + q * q * 0.5
    particle.position.x = Math.max(x, PARTICLE_RADIUS - w);
  } else if (particle.position.x > w - PARTICLE_RADIUS){
    const q = 1 - Math.abs((w - particle.position.x) / PARTICLE_RADIUS);
    const x = particle.position.x - q * q * 0.5;
    particle.position.x = Math.min(x, w - PARTICLE_RADIUS);
  }

  if (particle.position.y < PARTICLE_RADIUS - h) {
    const q = 1 - Math.abs((particle.position.y + h) / PARTICLE_RADIUS);
    const y = particle.position.y + q * q * 0.5
    particle.position.y = Math.max(y, PARTICLE_RADIUS - h);
  } else if (particle.position.y > h - PARTICLE_RADIUS){
    const q = 1 - Math.abs((h - particle.position.y) / PARTICLE_RADIUS);
    const y = particle.position.y - q * q * 0.5;
    particle.position.y = Math.min(y, h - PARTICLE_RADIUS);
  }
}

const calculateVelocity = particle => {
  particle.velocity = particle.position.clone().sub(particle.oldPosition)
}

const t0 = performance.now()
const runFor = 5000

const render = auto => {
  const shouldContinue = performance.now() - t0 < runFor
  auto && shouldContinue && requestAnimationFrame(render)
  simulate()
  renderer.render(scene, camera)
}

render(true)

document.addEventListener('keyup', e => e.which === 32 && render())
document.addEventListener('keyup', e => e.which === 32 && console.log(particles))
