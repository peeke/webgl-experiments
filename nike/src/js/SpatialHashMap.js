class SpatialHashMap {

  constructor(cellSize) {
    this._cellSize = cellSize
    this._buckets = new Map()
  }

  clear() {
    this._buckets.clear()
  }

  add(x, y, obj) {
    const id = this.id(this.x(x), this.y(y))
    const bucketExists = this._buckets.has(id)
    const bucketValue = bucketExists ? this._buckets.get(id) : []
    bucketValue.push(obj)
    this._buckets.set(id, bucketValue)
  }

  query(x, y, offset) {
    offset = Math.ceil(offset / this._cellSize)
    x = this.x(x)
    y = this.y(y)
    const result = []

    for (let i = x - offset; i <= x + offset; i++) {
      for (let j = y - offset; j <= y + offset; j++) {
        const id = this.id(i, j)
        if (this._buckets.has(id)) {
          result.push(...this._buckets.get(id))
        }
      }
    }

    return result
  }

  x(x) {
    return Math.floor(x / this._cellSize)
  }

  y(y) {
    return Math.floor(y / this._cellSize)
  }

  id(x, y) {
    return (x + .0001) + 1 / (y + .0001)
  }
}

export default SpatialHashMap