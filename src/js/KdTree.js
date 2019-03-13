// const { performance } = require('perf_hooks');

class KdTree {

  constructor(points, axes = ['x', 'y']) {
    this._axes = axes
    this._tree = KdTree.build([...points], axes)
  }

  static build(points, axes, depth = 0) {
    if (!points.length) return null
    
    const median = Math.floor((points.length - 1) / 2)
    const axis = axes[depth % axes.length]

    // Sort and divide based on axis
    points.sort((a, b) => a[axis] - b[axis])

    return {
      location: points[median],
      left: KdTree.build(points.slice(0, median), axes, depth + 1),
      right: KdTree.build(points.slice(median + 1), axes, depth + 1)
    }
  }

  static nodeIsLeaf(node) {
    return !node.left && !node.right
  }

  static nearestNeighbor(node, axes, point) {

    const recurse = (node, depth = 0, best = { location: null, distanceSq: Infinity }) => {
      
      if (!node) return best

      const axis = axes[depth % axes.length]
      const plane = node.location[axis]
      const nextBranch = point[axis] < plane ? 'left' : 'right'

      best = recurse(node[nextBranch], depth + 1, best)

      // Check if points on the other side of the hyperplane might qualify as new best
      // If they do, traverse
      const distanceSqToPlane = (point[axis] - plane) ** 2
      if (distanceSqToPlane < best.distanceSq) {
        const oppositeBranch = nextBranch === 'left' ? 'right' : 'left'
        best = recurse(node[oppositeBranch], depth + 1, best)
      }

      const distanceSq = (node.location.x - point.x) ** 2 + (node.location.y - point.y) ** 2
      const isNewBest = distanceSq < best.distanceSq
      
      return isNewBest
        ? { location: node.location, distanceSq }
        : best

    }

    return recurse(node)

  }

  nearestNeighbor(point) {
    return KdTree.nearestNeighbor(this._tree, this._axes, point).location
  }
}

// {
//   const c1 = 30000
//   const c2 = 10000
//   const points = new Array(c2).fill(0).map(() => ({ x: Math.random() * 100, y: Math.random() * 100 }))

//   // Float32Array for performance
//   const particlesX = new Float32Array(c1).fill(0).map(() => Math.random() * 100)
//   const particlesY = new Float32Array(c1).fill(0).map(() => Math.random() * 100)

//   const p1 = performance.now()
//   const tree = new KdTree(points)
//   console.log(`Tree constructed in ${ performance.now() - p1 }ms`)

//   const p2 = performance.now()
//   for(let i = 0; i<c1; i++) {
//     tree.nearestNeighbor({ x: particlesX[i], y: particlesY[i] })
//   }
//   console.log(`${c1} Nearest neighbors found in ${c2} points in ${ performance.now() - p2 }ms`)
// }

// {
//   const points = [
//     { x: 1, y: 10 },
//     { x: 2, y: 10 },
//     { x: 3, y: 1 }
//   ]
//   const tree = new KdTree(points)
//   console.log(tree.nearestNeighbor({ x: 1, y: 8 }))
// }

export default KdTree