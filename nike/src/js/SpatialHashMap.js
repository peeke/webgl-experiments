class SpatialHashMap {

  constructor(rowWidth, cellsInRow) {
    this.rowWidth = rowWidth
    this.cellWidth = rowWidth / cellsInRow
    this.cellsInRow = cellsInRow
    this.grid = {}
  }

  clear() {
    this.grid = {}
  }

  add(x, y, obj) {
    const index = this.index(x, y)
    if (this.grid[index]) {
      this.grid[index].push(obj)
    } else {
      this.grid[index] = [obj]
    }
  }

  query(x, y, offset) {
    const result = []

    for (let i = x - offset; i <= x + offset; i += this.cellWidth) {
      for (let j = y - offset; j <= y + offset; j += this.cellWidth) {
        const index = this.index(i, j)
        if (this.grid[index]) {
          result.push.apply(result, this.grid[index]);
        }
      }
    }

    return result
  }

  index(x, y) {
    return Math.round(x / this.cellWidth) + Math.round(y / this.cellWidth) * this.cellsInRow
  }
}

export default SpatialHashMap