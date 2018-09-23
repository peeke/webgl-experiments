class SpatialHashMap {

  constructor(rowWidth, cellsInRow, queryOffset) {
    this.rowWidth = rowWidth
    this.cellWidth = rowWidth / cellsInRow
    this.cellWidthInv = 1 / this.cellWidth
    this.cellsInRow = cellsInRow
    this.queryOffset = queryOffset
    this.grid = {}
    this.cache = {}
  }

  clear() {
    this.grid = {}
    this.cache = {}
  }

  add(x, y, obj) {
    const index = this.index(x, y)
    if (this.grid[index]) {
      this.grid[index].push(obj)
    } else {
      this.grid[index] = [obj]
    }
  }

  query(x, y) {
    const cacheIndex = this.index(x, y)
    if (this.cache[cacheIndex]) {
      return this.cache[cacheIndex]
    }

    const result = []

    for (let i = x - this.queryOffset; i <= x + this.queryOffset; i += this.cellWidth) {
      for (let j = y - this.queryOffset; j <= y + this.queryOffset; j += this.cellWidth) {
        const index = this.index(i, j)
        if (this.grid[index]) {
          result.push.apply(result, this.grid[index]);
        }
      }
    }

    this.cache[this.index] = result
    return result
  }

  index(x, y) {
    return Math.round(x * this.cellWidthInv) + Math.round(y * this.cellWidthInv) * this.cellsInRow
  }
}

export default SpatialHashMap