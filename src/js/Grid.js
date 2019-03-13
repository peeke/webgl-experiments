// const { performance } = require('perf_hooks');
let uid = 0

class Grid {
  constructor(cellSize) {
    this._cellSize = cellSize
    this._grid = []
    this._data = new Map()
    this._cellById = new Map()
  }

  getCell(x, y) {
    return {
      x: Math.floor(x / this._cellSize),
      y: Math.floor(y / this._cellSize)
    }
  }

  insert(x, y, data) {
    const id = uid++
    this.update(id, x, y)
    data && this._data.set(id, data)
  }

  update(id, x, y) {
    if (this._cellById.has(id)) {
      const cell = this._cellById.get(id)
      this._grid[cell.x][cell.y].splice(this._grid[cell.x][cell.y].findIndex(cell => cell.id === id), 1)
    }

    const cell = this.getCell(x, y)
    this._grid[cell.x] = this._grid[cell.x] || []
    this._grid[cell.x][cell.y] = this._grid[cell.x][cell.y] || []
    this._grid[cell.x][cell.y].push({ x, y, id })

    this._cellById.set(id, cell)
  }

  delete(id) {
    const { x, y } = this._cellById.get(id)
    this._cellById.delete(id)
    this._grid[x][y].splice(this._grid[x][y].findIndex(id), 1)
    this._data.delete(id)
  }

  query(x, y) {
    const cell = this.getCell(x, y)
    this._grid[cell.x] = this._grid[cell.x] || []
    const result = this._grid[cell.x][cell.y] || []
    return result.map(({ x, y, id }) => ({
      x, y, data: this._data.get(id)
    }))
  }

  possiblyWithinRadius(x, y, radius) {
    const range = {
      x1: x - radius,
      x2: x + radius,
      y1: y - radius,
      y2: y + radius
    }

    const result = []
    for(let x = range.x1; x <= range.x2; x += this._cellSize) {
      for(let y = range.y1; y <= range.y2; y += this._cellSize) {
        result.push(...this.query(x, y))
      }
    }

    return result
  }
}

// {
//   const c1 = 10000
//   const points = new Array(c1).fill(0).map(() => ({ x: Math.random() * 100, y: Math.random() * 100 }))

//   const p1 = performance.now()
//   const grid = new Grid(4)
//   for(let i = 0; i<c1; i++) {
//     grid.insert(points[i].x, points[i].y, {})
//   }
//   console.log(`Grid constructed in ${ performance.now() - p1 }ms`)

//   const p2 = performance.now()
//   console.log(grid.query(50, 50, 2))
//   console.log(`Possible neighbors found in ${ performance.now() - p2 }ms`)
// }