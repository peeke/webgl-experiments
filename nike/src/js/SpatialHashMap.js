class SpatialHashMap {

  constructor(rowWidth, cellSize, resolution) {
    this.rowWidth = rowWidth
    this.cellWidth = cellSize
    this.resolution = resolution
    this.cellWidthInv = 1 / this.cellWidth
    this.cellsInRow = Math.ceil(rowWidth / cellSize)
    this.grid = {}
    this.cache = {}
  }

  clear() {
    this.grid = {}
    this.cache = {}
  }

  add(x, y, obj) {
    const index = this.index(x, y)
    if (!this.grid[index]) {
      this.grid[index] = []
    }
    this.grid[index].push(obj)
  }

  query(x, y) {
    const index = this.index(x, y)
    if (this.cache[index]) {
      return this.cache[index]
    }

    const result = []

    for (let i = x - this.resolution; i <= x + this.resolution; i += this.cellWidth) {
      for (let j = y - this.resolution; j <= y + this.resolution; j += this.cellWidth) {
        const index = this.index(i, j)
        if (this.grid[index]) {
          result.push.apply(result, this.grid[index]);
        }
      }
    }

    this.cache[index] = result
    return result
  }

  index(x, y) {
    return Math.round(x * this.cellWidthInv) + 2 * Math.round(y * this.cellWidthInv) * this.cellsInRow
  }
}

export default SpatialHashMap