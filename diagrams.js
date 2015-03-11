
// Diagrams module.

var diagrams = (function() {

//------------------------------------------------------------------------------

// Rendering utilities.

function roundRectPath(x, y, w, h, r, ctx) {
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.lineTo(x, y + h - r);
  ctx.quadraticCurveTo(x, y + h, x + r, y + h);
  ctx.lineTo(x + w - r, y + h);
  ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  ctx.lineTo(x + w, y + r);
  ctx.quadraticCurveTo(x + w, y, x + w - r, y);
  ctx.lineTo(x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
}

function rectParamToPoint(left, top, width, height, t) {
  var right = left + width, bottom = top + height,
      x0, y0, nx, ny, dx = 0, dy = 0;
  if (t < 2) {  // + side
    if (t < 1) {  // right
      x0 = right;
      y0 = top;
      dy = height;
      nx = 1;
      ny = 0;
    } else {  // bottom
      y0 = bottom;
      x0 = right;
      dx = -width;
      t -= 1;
      nx = 0;
      ny = 1;
    }
  } else {  // - side
    if (t < 3) {  // left
      x0 = left;
      y0 = bottom;
      dy = -height;
      t -= 2;
      nx = -1;
      ny = 0;
    }
    else {  // top
      y0 = top;
      x0 = left;
      dx = width;
      t -= 3;
      nx = 0;
      ny = -1;
    }
  }
  return { x: x0 + dx * t,
           y: y0 + dy * t,
           nx: nx,
           ny: ny
         };
}

function circleParamToPoint(cx, cy, r, t) {
  var radians = (t - 0.5) / 4 * 2 * Math.PI,
      nx = Math.cos(radians), ny = Math.sin(radians);
  return { x: cx + nx * r,
           y: cy + ny * r,
           nx: nx,
           ny: ny
         };
}

function roundRectParamToPoint(left, top, width, height, r, t) {
  var right = left + width, bottom = top + height,
      wr = r / width, hr = r / height, omwr = 1 - wr, omhr = 1 - hr,
      tc;
  if (t < 2) {  // + side
    if (t < 1) {  // right
      if (t < hr)
        return circleParamToPoint(right - r, top + r, r, t / hr * 0.5);
      else if (t > omhr)
        return circleParamToPoint(right - r, bottom - r, r, (t - omhr) / hr * 0.5 + 0.5);
    } else {  // bottom
      tc = t - 1;
      if (tc < wr)
        return circleParamToPoint(right - r, bottom - r, r, tc / wr * 0.5 + 1.0);
      else if (tc > omwr)
        return circleParamToPoint(left + r, bottom - r, r, (tc - omwr) / wr * 0.5 + 1.5);
    }
  } else {  // - side
    if (t < 3) {  // left
      tc = t - 2;
      if (tc < hr)
        return circleParamToPoint(left + r, bottom - r, r, tc / hr * 0.5 + 2.0);
      else if (tc > omhr)
        return circleParamToPoint(left + r, top + r, r, (tc - omhr) / hr * 0.5 + 2.5);
    }
    else {  // top
      tc = t - 3;
      if (tc < wr)
        return circleParamToPoint(left + r, top + r, r, tc / wr * 0.5 + 3.0);
      else if (tc > omwr)
        return circleParamToPoint(right - r, top + r, r, (tc - omwr) / wr * 0.5 + 3.5);
    }
  }

  return rectParamToPoint(left, top, width, height, t);
}

function rectPointToParam(left, top, width, height, p) {
  // translate problem to one with origin at center of rect
  var dx = width / 2, dy = height / 2,
      cx = left + dx, cy = top + dy,
      px = p.x - cx, py = p.y - cy;

  // rotate problem into quadrant 0
  // use "PerpDot" product to determine relative orientation
  // (Graphics Gems IV, page 138)
  var result, temp;
  if (dy * px + dx * py > 0) {  // quadrant 0 or 1
    if (-dy * px + dx * py < 0) { // quadrant 0
      result = 0;
    } else {  // quadrant 1
      result = 1;
      temp = px; px = -py; py = temp;
      temp = dx; dx = dy; dy = temp;
    }
  }
  else {  // quadrant 2 or 3
    if (dy * px + -dx * py < 0) {  // quadrant 2
      result = 2;
      px = -px; py = -py;
    } else {  // quadrant 3
      result = 3;
      temp = py; py = -px; px = temp;
      temp = dx; dx = dy; dy = temp;
    }
  }

  var y = dx * py / px;
  result += (y + dy) / (dy * 2);

  return result;
}

function diskPath(x, y, r, ctx) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 360, false);
}

function getEdgePoint(x, y, w, h, t) {
  geometry.rectParamToPoint(x, y, w, h, t);
}

// p1, p2 have x, y, nx, ny.
function getEdgeBezier(p1, p2) {
  var dx = p1.x - p2.x, dy = p1.y - p2.y,
      tanLength = Math.sqrt(dx * dx + dy * dy) * 0.5,
      // tanLength = (Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y)) * 0.166,
      c1 = { x: p1.x + tanLength * p1.nx, y: p1.y + tanLength * p1.ny },
      c2 = { x: p2.x + tanLength * p2.nx, y: p2.y + tanLength * p2.ny };
  return [p1, c1, c2, p2];
}

function arrowPath(p, ctx, arrowSize) {
  var cos45 = 0.866, sin45 = 0.500,
      nx = p.nx, ny = p.ny;
  ctx.moveTo(p.x + arrowSize * (nx * cos45 - ny * sin45),
             p.y + arrowSize * (nx * sin45 + ny * cos45));
  ctx.lineTo(p.x, p.y);
  ctx.lineTo(p.x + arrowSize * (nx * cos45 + ny * sin45),
             p.y + arrowSize * (ny * cos45 - nx * sin45));
}

function edgePath(bezier, ctx, arrowSize) {
  var p1 = bezier[0], c1 = bezier[1], c2 = bezier[2], p2 = bezier[3];
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
  if (arrowSize)
    arrowPath(p2, ctx, arrowSize);
}

// Check if p is within tolerance of (x, y). Useful for knobbies.
function hitPoint(x, y, p, tol) {
  return Math.abs(x - p.x) <= tol && Math.abs(y - p.y) <= tol;
}

function hitTestRect(x, y, w, h, p, tol) {
  var right = x + w, bottom = y + h,
      px = p.x, py = p.y;
  if (px > x - tol && px < right + tol &&
      py > y - tol && py < bottom + tol) {
    var hitTop = Math.abs(py - y) < tol,
        hitLeft = Math.abs(px - x) < tol,
        hitBottom = Math.abs(py - bottom) < tol,
        hitRight = Math.abs(px - right) < tol,
        hitBorder = hitTop || hitLeft || hitBottom || hitRight;
    return {
      top: hitTop,
      left: hitLeft,
      bottom: hitBottom,
      right: hitRight,
      border: hitBorder,
      interior: !hitBorder,
    };
  }
}

function hitTestDisk(x, y, r, p, tol) {
  var dx = x - p.x, dy = y - p.y,
      dSquared = dx * dx + dy * dy,
      inner = Math.max(0, r - tol), outer = r + tol;
  if (dSquared < outer * outer) {
    var border = dSquared > inner * inner;
    return { interior: !border, border: border };
  }
}

function hitTestLine(p1, p2, p, tol) {
  if (geometry.pointToPointDist(p1, p) < tol) {
    return { p1: true };
  } else if (geometry.pointToPointDist(p2, p) < tol) {
    return { p2: true };
  } else if (geometry.hitTestLine(p1, p2, p, tol)) {
    return { edge: true };
  }
}

function hitTestBezier(bezier, p, tol) {
  var p1 = bezier[0], p2 = bezier[3];
  if (geometry.pointToPointDist(p1, p) < tol) {
    return { p1: true };
  } else if (geometry.pointToPointDist(p2, p) < tol) {
    return { p2: true };
  } else if (geometry.hitTestCurveSegment(bezier[0], bezier[1], bezier[2], bezier[3], p, tol)) {
    return { edge: true };
  }
}

function resizeCanvas(canvas, ctx, width, height) {
  var ctx = canvas.getContext('2d'),
      devicePixelRatio = window.devicePixelRatio || 1,
      backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                          ctx.mozBackingStorePixelRatio ||
                          ctx.msBackingStorePixelRatio ||
                          ctx.oBackingStorePixelRatio ||
                          ctx.backingStorePixelRatio || 1,

      contextScale = devicePixelRatio / backingStoreRatio;

  canvas.width  = width * contextScale;
  canvas.height = height * contextScale;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.resetTransform();
  ctx.scale(contextScale, contextScale);
}

//------------------------------------------------------------------------------

function CanvasController(canvas, ctx) {
  this.canvas = canvas;
  this.ctx = ctx || canvas.getContext('2d');
  this.dragThreshold = 4;
  this.hoverThreshold = 4;
  this.hoverTimeout = 500;  // milliseconds
  this.mouse = { x: 0, y: 0 };
  this.dragOffset = { x: 0, y: 0 };
  this.transform = [1, 0, 0, 1, 0, 0];
  this.inverseTransform = [1, 0, 0, 1, 0, 0];
}

CanvasController.prototype.configure = function(layers) {
  var controller = this, length = layers.length;
  this.layers = layers.slice(0);
  for (var i = 0; i < length; i++) {
    var layer = layers[i];
    if (layer.initialize)
      layer.initialize(controller, i);
  }
  // Layers are presented in draw order, but most loops are event-order, so
  // reverse the array here.
  this.layers.reverse();
  this.draw();
}

CanvasController.prototype.setTransform = function(translation, scale, rotation) {
  var tx = 0, ty = 0, sx = 1, sy = 1, sin = 0, cos = 1;
  if (translation) {
    tx = translation.x;
    ty = translation.y;
  }
  if (scale) {
    sx = scale.x;
    sy = scale.y;
  }
  if (rotation) {
    sin = Math.sin(rotation);
    cos = Math.cos(rotation);
  }
  this.transform = [1, 0, 0, 1, tx, ty];
  this.inverseTransform = [1, 0, 0, 1, -tx, -ty];
}

CanvasController.prototype.applyTransform = function() {
  var t = this.transform;
  this.ctx.transform(t[0], t[1], t[2], t[3], t[4], t[5]);
}

CanvasController.prototype.viewToCanvas = function(p) {
  return geometry.matMulPtNew(p, this.inverseTransform);
}

CanvasController.prototype.onMouseDown = function(e) {
  var self = this,
      mouse = this.mouse = this.click = { x: e.offsetX, y: e.offsetY };
  if (e.button === 0) {
    this.layers.some(function(layer) {
      if (!layer.onClick || !layer.onClick(mouse))
        return false;
      // Layers that return true from onClick must implement onBeginDrag, etc.
      self.clickOwner = layer;
      return true;
    });
  }
  this.cancelHover_();
  this.draw();
}

CanvasController.prototype.onMouseMove = function(e) {
  var mouse = this.mouse = { x: e.offsetX, y: e.offsetY };
  if (this.clickOwner) {
    var dx = mouse.x - this.click.x,
        dy = mouse.y - this.click.y;
    if (!this.isDragging) {
      this.isDragging = Math.abs(dx) >= this.dragThreshold ||
                        Math.abs(dy) >= this.dragThreshold;
      if (this.isDragging) {
        this.clickOwner.onBeginDrag();
      }
    }
    if (this.isDragging) {
      this.clickOwner.onDrag(this.click, mouse);
      this.draw();
    }
  }
  if (!this.click)
    this.startHover_();
}

CanvasController.prototype.onMouseUp = function(e) {
  var mouse = this.mouse = { x: e.offsetX, y: e.offsetY };
  if (this.isDragging) {
    this.isDragging = false;
    this.clickOwner.onEndDrag(mouse);
    this.draw();
  }
  this.click = null;
  this.clickOwner = null;
}

CanvasController.prototype.onMouseOut = function(e) {
  // TODO
}

CanvasController.prototype.onMouseWheel = function(e) {
}

CanvasController.prototype.onKeyDown = function(e) {
  var self = this;
  this.shiftKeyDown = e.shiftKey;
  this.layers.some(function(layer) {
    if (!layer.onKeyDown || !layer.onKeyDown(e))
      return false;
    // Layers that return true from onClick must implement onBeginDrag, etc.
    self.keyOwner = layer;
    self.draw();
    e.preventDefault();
    return true;
  });
}

CanvasController.prototype.onKeyUp = function(e) {
  this.shiftKeyDown = e.shiftKey;
  var keyOwner = this.keyOwner;
  if (keyOwner) {
    if (keyOwner.onKeyUp)
      keyOwner.onKeyUp(e);
    this.keyOwner = null;
  }
}

CanvasController.prototype.startHover_ = function() {
  var self = this;
  if (this.hovering_)
    this.cancelHover_();
  this.hovering_ = window.setTimeout(function() {
    self.layers.some(function(layer) {
      if (!layer.onBeginHover || !layer.onBeginHover(self.mouse))
        return false;
      // Layers that return true from onBeginHover must implement onEndHover.
      self.hoverOwner = layer;
      self.hovering_ = 0;
      self.draw();
      return true;
    });
  }, this.hoverTimeout);
}

CanvasController.prototype.cancelHover_ = function() {
  if (this.hovering_) {
    window.clearTimeout(this.hovering_);
    this.hovering_ = 0;
    if (this.hoverOwner) {
      this.hoverOwner.onEndHover(this.mouse);
      this.hoverOwner = null;
      this.draw();
    }
  }
}

CanvasController.prototype.draw = function() {
  var canvas = this.canvas, ctx = this.ctx,
      layers = this.layers, length = layers.length,
      t = this.transform_;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = length - 1; i >= 0; i--) {
    var layer = layers[i];
    if (layer.draw)
      layer.draw();
  }
}

CanvasController.prototype.resize = function(width, height) {
  diagrams.resizeCanvas(this.canvas, this.ctx, width, height);
  this.draw();
}

//------------------------------------------------------------------------------

function CanvasPanZoomLayer() {
  this.translation = { x: 0, y: 0 };
  this.scale = 1.0;
}

CanvasPanZoomLayer.prototype.initialize = function(canvasController) {
  this.canvasController = canvasController;
}

CanvasPanZoomLayer.prototype.onClick = function(p) {
  // Always capture the mouse click.
  return true;
}

CanvasPanZoomLayer.prototype.onBeginDrag = function() {
  this.translation0 = this.translation;
}

CanvasPanZoomLayer.prototype.onDrag = function(p0, p) {
  var dx = p.x - p0.x, dy = p.y - p0.y,
      t0 = this.translation0;
  this.translation = trans = { x: t0.x + dx, y: t0.y + dy };
  canvasController.setTransform(trans);
}

CanvasPanZoomLayer.prototype.onEndDrag = function(p) {
  this.translation0 = null;
}

//------------------------------------------------------------------------------

var theme = (function() {
  var themes = {
    normal: {
      bgColor: 'white',
      strokeColor: '#808080',
      textColor: '#404040',
      highlightColor: '#40F040',
      hotTrackColor: '#F0F040',
      dimColor: '#c0c0c0',
      hoverColor: '#FCF0AD',
      hoverTextColor: '#404040',
    },
    blueprint: {
      bgColor: '#6666cc',
      strokeColor: '#f0f0f0',
      textColor: '#f0f0f0',
      highlightColor: '#40F040',
      hotTrackColor: '#F0F040',
      dimColor: '#808080',
      hoverColor: '#FCF0AD',
      hoverTextColor: '#404040',
    },
  };

  function create() {
    return Object.create(themes.normal);
  }
  function createBlueprint() {
    return Object.create(themes.blueprint);
  }
  return {
    create: create,
    createBlueprint: createBlueprint,
  }
})();

//------------------------------------------------------------------------------

return {
  roundRectPath: roundRectPath,
  rectParamToPoint: rectParamToPoint,
  circleParamToPoint: circleParamToPoint,
  roundRectParamToPoint: roundRectParamToPoint,
  rectPointToParam: rectPointToParam,
  diskPath: diskPath,
  getEdgeBezier: getEdgeBezier,
  arrowPath: arrowPath,
  edgePath: edgePath,
  hitPoint: hitPoint,
  hitTestRect: hitTestRect,
  hitTestDisk: hitTestDisk,
  hitTestLine: hitTestLine,
  hitTestBezier: hitTestBezier,
  resizeCanvas: resizeCanvas,

  CanvasController: CanvasController,
  CanvasPanZoomLayer: CanvasPanZoomLayer,

  theme: theme,
}

})();

