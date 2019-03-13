const clone = vec => [...vec]

const add = (vec1, vec2) => {
  vec1[0] += vec2[0]
  vec1[1] += vec2[1]
  return vec1
}

const subtract = (vec1, vec2) => {
  vec1[0] -= vec2[0]
  vec1[1] -= vec2[1]
  return vec1
}

const dot = (vec1, vec2) => {
  vec1[0] *= vec2[0]
  vec1[1] *= vec2[1]
  return vec1
}

const lengthSq = vec => {
  return vec[0] * vec[0] + vec[1] * vec[1]
}

const length = vec => {
  return Math.sqrt(lengthSq(vec))
}

const multiplyScalar = (vec, scalar) => {
  vec[0] *= scalar
  vec[1] *= scalar
  return vec
}

const unit = vec => {
  const l = length(vec)
  if (l === 0) return [0, 0]
  return multiplyScalar(vec, 1 / l)
}

const unitApprox = vec => {
  if (vec[0] === 0 && vec[1] === 0) return [0, 0]
  const ax = Math.abs(vec[0]);
  const ay = Math.abs(vec[1]);
  let ratio = 1 / Math.max(ax, ay)
  ratio = ratio * (1.29289 - (ax + ay) * ratio * 0.29289)
  return multiplyScalar(vec, ratio)
}

const lerp = (vec1, vec2, f) => {
  return add(multiplyScalar(subtract(vec2, vec1), f), vec1)
}

export { clone, add, subtract, lengthSq, length, unit, unitApprox, multiplyScalar, dot, lerp }