
import clampNumber from './clampNumber'

const mapNumber = (input, inFrom, inTo, outFrom, outTo) => {
  const clampedInput =
    inFrom < inTo
      ? clampNumber(input, inFrom, inTo)
      : clampNumber(input, inTo, inFrom)
  const inDiff = inTo - inFrom
  const outDiff = outTo - outFrom
  return (clampedInput - inFrom) / inDiff * outDiff + outFrom
}

export default mapNumber