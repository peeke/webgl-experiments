class Lens {

  constructor(properties, size) {
    this.size = size
    this.blockSize = properties.length
    this.data = new Float32Array(this.blockSize * size)
    this.propIndexes = properties.reduce((result, prop, index) => {
      result[prop] = index
      return result
    }, {})
  }

  forEach(fn) {
    for (let i = 0; i < this.size; i++) {
      fn(i)
    }
  }

  get(i, prop){
    return this.data[i * this.blockSize + this.propIndexes[prop]]
  }

  set(i, prop, value) {
    this.data[i * this.blockSize + this.propIndexes[prop]] = value
  }

}

export default Lens