const Quad = function(node, x0, y0, x1, y1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
}

const radiusSearchInit = function(t, params) {
	t.result = [];
  const [radius] = params;
  t.x0 = t.x - radius, t.y0 = t.y - radius;
  t.x3 = t.x + radius, t.y3 = t.y + radius;
  t.radius = radius * radius;
}

const radiusSearchVisit = function(t, d2) {
  t.node.data.scanned = true;
  if (d2 < t.radius) {
    do {t.result.push(t.node.data); t.node.data.selected = true;} while (t.node = t.node.next);
  }
}

const search = {init: radiusSearchInit, visit:radiusSearchVisit}

export default function(x, y, ...params) {
  var node = this._root
  var t = {x:x, y:y,
    x0: this._x0,
    y0: this._y0,
    x3: this._x1,
    y3: this._y1,
    quads: [],
    node: node}
    
    //   search.init(t, params)
    if (t.node) {t.quads.push(new Quad(t.node, t.x0, t.y0, t.x3, t.y3))};
    search.init(t, params)
    
    var i = 0;
    while (t.q = t.quads.pop()) {
      i++;
      // 		console.log("q", t.q)
      // Stop searching if this quadrant can’t contain a closer node.
      if (!(t.node = t.q.node)
      || (t.x1 = t.q.x0) > t.x3
      || (t.y1 = t.q.y0) > t.y3
      || (t.x2 = t.q.x1) < t.x0
      || (t.y2 = t.q.y1) < t.y0) continue;
      
      // Bisect the current quadrant.
      if (t.node.length) {
        t.node.explored = true;
        var xm = (t.x1 + t.x2) / 2,
        ym = (t.y1 + t.y2) / 2;
        
        t.quads.push(
          new Quad(t.node[3], xm, ym, t.x2, t.y2),
          new Quad(t.node[2], t.x1, ym, xm, t.y2),
          new Quad(t.node[1], xm, t.y1, t.x2, ym),
          new Quad(t.node[0], t.x1, t.y1, xm, ym)
        );
        
        // Visit the closest quadrant first.
        if (t.i = (y >= ym) << 1 | (x >= xm)) {
          t.q = t.quads[t.quads.length - 1];
          t.quads[t.quads.length - 1] = t.quads[t.quads.length - 1 - t.i];
          t.quads[t.quads.length - 1 - t.i] = t.q;
        }
      }
      
      // Visit this point. (Visiting coincident points isn’t necessary!)
      else {
        var dx = x - +this._x.call(null, t.node.data),
        dy = y - +this._y.call(null, t.node.data),
        d2 = dx * dx + dy * dy;
        search.visit(t, d2);
      }
    }
    // 	console.log("i", i);
    return t.result;
  }