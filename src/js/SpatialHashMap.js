class SpatialHashMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.grid = new Array(width * height).fill(null).map(() => []);
  }

  clear() {
    this.grid.forEach(cell => {
      cell.splice(0);
    });
  }

  add(x, y, data) {
    x = Math.round(x);
    y = Math.round(y);

    if (x < 0) {
      x = 0;
    } else if (x >= this.width) {
      x = this.width - 1;
    }

    if (y < 0) {
      y = 0;
    } else if (y >= this.height) {
      y = this.height - 1;
    }

    const index = x + y * this.width;
    this.grid[index].push(data);
  }

  query(x, y, radius) {
    if (radius) {
      return this.queryWithRadius(x, y, radius);
    }

    x = Math.round(x);
    y = Math.round(y);

    if (x < 0) {
      x = 0;
    } else if (x >= this.width) {
      x = this.width - 1;
    }

    if (y < 0) {
      y = 0;
    } else if (y >= this.height) {
      y = this.height - 1;
    }

    const index = x + y * this.width;
    return this.grid[index];
  }

  queryWithRadius(x, y, radius) {
    const left = Math.max(Math.round(x - radius), 0);
    const right = Math.min(Math.round(x + radius), this.width - 1);
    const bottom = Math.max(Math.round(y - radius), 0);
    const top = Math.min(Math.round(y + radius), this.height - 1);

    const result = [];

    for (let i = left; i <= right; i++) {
      for (let j = bottom; j <= top; j++) {
        const query = this.query(i, j);
        for (let k = 0; k < query.length; k++) {
          result.push(query[k]);
        }
      }
    }

    return result;
  }
}

export default SpatialHashMap;

window.SpatialHashMap = SpatialHashMap;
