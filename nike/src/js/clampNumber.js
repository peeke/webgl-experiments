const clampNumber = (input, min, max) =>
  input <= min ? min : input >= max ? max : input

export default clampNumber