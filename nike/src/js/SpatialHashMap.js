class SpatialHashMap {

  constructor(rowWidth, cellSize) {
    this.rowWidth = rowWidth
    this.cellWidth = cellSize
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

    result.push.apply(result, this.grid[index - 1 + this.cellsInRow] || []);
    result.push.apply(result, this.grid[index + this.cellsInRow] || []);
    result.push.apply(result, this.grid[index + 1 + this.cellsInRow] || []);

    result.push.apply(result, this.grid[index - 1] || []);
    result.push.apply(result, this.grid[index] || []);
    result.push.apply(result, this.grid[index + 1] || []);

    result.push.apply(result, this.grid[index - 1 - this.cellsInRow] || []);
    result.push.apply(result, this.grid[index - this.cellsInRow] || []);
    result.push.apply(result, this.grid[index + 1 - this.cellsInRow] || []);

    this.cache[index] = result
    return result
  }

  index(x, y) {
    return Math.round(x * this.cellWidthInv) + Math.round(y * this.cellWidthInv) * this.cellsInRow
  }
}

export default SpatialHashMap