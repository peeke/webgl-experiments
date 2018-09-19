const add = (vec1, vec2) => {
  return [vec1[0] + vec2[0], vec1[1] + vec2[1]]
}

const subtract = (vec1, vec2) => {
  return [vec1[0] - vec2[0], vec1[1] - vec2[1]]
}

const lengthSq = vec => {
  return vec[0] * vec[0] + vec[1] * vec[1]
}

const length = vec => {
  return Math.sqrt(lengthSq(vec))
}

const multiplyScalar = (vec, scalar) => {
  return [vec[0] * scalar, vec[1] * scalar]
}

const unit = vec => {
  const l = length(vec)
  if (l === 0) return [0, 0]
  return multiplyScalar(vec, 1 / l)
}

const dot = (vec1, vec2) => {
  return [vec1[0] * vec2[0], vec1[1] * vec2[1]]
}

export { add, subtract, lengthSq, length, unit, multiplyScalar, dot }