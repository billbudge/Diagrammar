
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
  var radians = ((t - 0.5) / 4) * 2 * Math.PI,
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

function circlePointToParam(cx, cy, p) {
  return ((Math.PI - Math.atan2(p.y - cy, cx - p.x)) / (2 * Math.PI) * 4 + 0.5) % 4;
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
      nx1 = p1.nx || 0, ny1 = p1.ny || 0, nx2 = p2.nx || 0, ny2 = p2.ny || 0,
      tanLength = Math.sqrt(dx * dx + dy * dy) * 0.5,
      // tanLength = (Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y)) * 0.166,
      c1 = { x: p1.x + tanLength * nx1, y: p1.y + tanLength * ny1 },
      c2 = { x: p2.x + tanLength * nx2, y: p2.y + tanLength * ny2 };
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

function lineEdgePath(p1, p2, ctx, arrowSize) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  if (arrowSize)
    arrowPath(p2, ctx, arrowSize);
}

function bezierEdgePath(bezier, ctx, arrowSize) {
  var p1 = bezier[0], c1 = bezier[1], c2 = bezier[2], p2 = bezier[3];
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
  if (arrowSize)
    arrowPath(p2, ctx, arrowSize);
}

function closedPath(points, ctx) {
  ctx.beginPath();
  var length = points.length, pLast = points[length - 1];
  ctx.moveTo(pLast.x, pLast.y);
  for (var i = 0; i < length; i++) {
    var pi = points[i];
    ctx.lineTo(pi.x, pi.y);
  }
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
  } else if (geometry.pointOnSegment(p1, p2, p, tol)) {
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

function hitTestConvexHull(hull, p, tol) {
  if (geometry.pointInConvexHull(hull, p, tol)) {
    var interior = geometry.pointInConvexHull(hull, p, -tol);
      return { interior: interior, border: !interior };
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

// Calculates the maximum width of an array of name-value pairs. Names are left
// justified, values are right justified, and gap is the minimum space between
// name and value.
function measureNameValuePairs(pairs, gap, ctx) {
  var maxWidth = 0;
  pairs.forEach(function(pair) {
    var nameWidth = ctx.measureText(pair.name).width,
        valueWidth = ctx.measureText(pair.value).width,
        width = nameWidth + gap + valueWidth;
    maxWidth = Math.max(maxWidth, width);
  });
  return maxWidth;
}

//------------------------------------------------------------------------------

function CanvasController(canvas, ctx, theme) {
  this.canvas = canvas;
  this.ctx = ctx || canvas.getContext('2d');
  this.theme = theme || diagrams.theme.create();

  this.dragThreshold = 4;
  this.hoverThreshold = 4;
  this.hoverTimeout = 500;  // milliseconds
  this.mouse = { x: 0, y: 0 };
  this.dragOffset = { x: 0, y: 0 };
  this.translation = { x: 0, y: 0 };
  this.scale = { x: 1.0, y: 1.0 };
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

CanvasController.prototype.setTransform = function(translation, scale) {
  var tx = 0, ty = 0, sx = 1, sy = 1, sin = 0, cos = 1;
  if (translation) {
    tx = translation.x;
    ty = translation.y;
    this.translation = translation;
  }
  if (scale) {
    sx = scale.x;
    sy = scale.y;
    this.scale = scale;
  }
  this.transform = [sx, 0, 0, sy, tx, ty];
  var ooSx = 1.0 / sx, ooSy = 1.0 / sy;
  this.inverseTransform = [ooSx, 0, 0, ooSy, -tx * ooSx, -ty * ooSy];

  this.cancelHover_();
}

CanvasController.prototype.applyTransform = function() {
  var t = this.transform;
  this.ctx.transform(t[0], t[1], t[2], t[3], t[4], t[5]);
}

CanvasController.prototype.viewToCanvas = function(p) {
  return geometry.matMulPtNew(p, this.inverseTransform);
}

// TODO make controller less mouse-centric.
function getPointerPosition(e, canvas) {
  var rect = canvas.getBoundingClientRect();
  if (e.clientX !== undefined && e.clientY !== undefined) {
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  } else {
    var touches = e.touches;
    if (touches && touches.length) {
      var touch = touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
  }
}

CanvasController.prototype.onMouseDown = function(e) {
  var self = this,
      mouse = this.mouse = this.click = getPointerPosition(e, this.canvas),
      alt = (e.button !== 0);
  this.layers.some(function(layer) {
    if (!layer.onClick || !layer.onClick(mouse, alt))
      return false;
    // Layers that return true from onClick must implement onBeginDrag, etc.
    self.clickOwner = layer;
    return true;
  });
  this.cancelHover_();
  this.draw();
  return this.clickOwner;
}

CanvasController.prototype.onMouseMove = function(e) {
  var mouse = this.mouse = getPointerPosition(e, this.canvas),
      click = this.click;
  if (this.clickOwner) {
    var dx = mouse.x - click.x,
        dy = mouse.y - click.y;
    if (!this.isDragging) {
      this.isDragging = Math.abs(dx) >= this.dragThreshold ||
                        Math.abs(dy) >= this.dragThreshold;
      if (this.isDragging) {
        this.cancelHover_();
        this.clickOwner.onBeginDrag(click);
      }
    }
    if (this.isDragging) {
      this.clickOwner.onDrag(click, mouse);
      this.draw();
    }
  }
  if (!click)
    this.startHover_();
  return this.clickOwner;
}

CanvasController.prototype.onMouseUp = function(e) {
  var mouse = this.mouse = getPointerPosition(e, this.canvas);
  if (this.isDragging) {
    this.isDragging = false;
    this.clickOwner.onEndDrag(mouse);
    this.draw();
  }
  this.click = null;
  this.clickOwner = null;
  return false;
}

CanvasController.prototype.onMouseOut = function(e) {
  // TODO
}

CanvasController.prototype.onKeyDown = function(e) {
  var self = this;
  this.shiftKeyDown = e.shiftKey;
  this.layers.some(function(layer) {
    if (!layer.onKeyDown || !layer.onKeyDown(e))
      return false;
    // Layers that return true from onClick must implement onBeginDrag, onDrag,
    // and onEndDrag.
    self.keyOwner = layer;
    self.draw();
    e.preventDefault();
    return true;
  });
  this.cancelHover_();
  return this.keyOwner;
}

CanvasController.prototype.onKeyUp = function(e) {
  this.shiftKeyDown = e.shiftKey;
  var keyOwner = this.keyOwner;
  if (keyOwner) {
    if (keyOwner.onKeyUp)
      keyOwner.onKeyUp(e);
    this.keyOwner = null;
    return false;
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
  }
  if (this.hoverOwner) {
    this.hoverOwner.onEndHover(this.mouse);
    this.hoverOwner = null;
    this.draw();
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
  this.pan = { x: 0, y: 0 };
  this.zoom = 1.0;
  this.minZoom = 0.50;
  this.maxZoom = 16.0;
}

CanvasPanZoomLayer.prototype.initialize = function(canvasController) {
  var self = this;
  this.canvasController = canvasController;

  canvasController.canvas.addEventListener('mousewheel', function(e) {
    var pan = self.pan, zoom = self.zoom,
        center = { x: e.offsetX, y: e.offsetY },
        dZoom = 1.0 + e.wheelDelta / 8192,
        newZoom = zoom * dZoom;
    newZoom = Math.max(self.minZoom, Math.min(self.maxZoom, newZoom));
    dZoom = newZoom / zoom;

    self.zoom = zoom * dZoom;
    self.pan = {
      x: (pan.x - center.x) * dZoom + center.x,
      y: (pan.y - center.y) * dZoom + center.y,
    }
    self.setTransform_();
    canvasController.draw();
    e.preventDefault();
  });
}

CanvasPanZoomLayer.prototype.setTransform_ = function(p) {
  var pan = this.pan, zoom = this.zoom;
  this.canvasController.setTransform(pan, { x: zoom, y: zoom });
}

CanvasPanZoomLayer.prototype.onClick = function(p) {
  // Always capture the mouse click.
  return true;
}

CanvasPanZoomLayer.prototype.onBeginDrag = function(p0) {
  this.pan0 = this.pan;
}

CanvasPanZoomLayer.prototype.onDrag = function(p0, p) {
  var dx = p.x - p0.x, dy = p.y - p0.y,
      t0 = this.pan0;
  this.pan = { x: t0.x + dx, y: t0.y + dy };
  this.setTransform_();
}

CanvasPanZoomLayer.prototype.onEndDrag = function(p) {
  this.translation0 = null;
}

//------------------------------------------------------------------------------

function CanvasMultiselectLayer(model) {
  this.model = model;
}

CanvasMultiselectLayer.prototype.initialize = function(canvasController) {
  this.ctx = canvasController.ctx;
}

CanvasMultiselectLayer.prototype.draw = function() {
  var ctx = this.ctx;
  ctx.save();
  ctx.strokeStyle = 'red';
  ctx.strokeRect(0, 0, 32, 32);
  ctx.restore();
}

//------------------------------------------------------------------------------

var theme = (function() {
  var themes = {
    normal: {
      bgColor: 'white',
      altBgColor: '#F0F0F0',
      strokeColor: '#505050',
      textColor: '#505050',
      highlightColor: '#40F040',
      hotTrackColor: 'blue',
      dimColor: '#c0c0c0',
      hoverColor: '#FCF0AD',
      hoverTextColor: '#404040',

      font: '14px sans-serif',
      fontSize: 14,
    },
    blueprint: {
      bgColor: '#6666cc',
      altBgColor: '#5656aa',
      strokeColor: '#f0f0f0',
      textColor: '#f0f0f0',
      highlightColor: '#40F040',
      hotTrackColor: '#F0F040',
      dimColor: '#808080',
      hoverColor: '#FCF0AD',
      hoverTextColor: '#404040',

      font: '14px sans-serif',
      fontSize: 14,
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
  circlePointToParam: circlePointToParam,
  rectPointToParam: rectPointToParam,
  diskPath: diskPath,
  getEdgeBezier: getEdgeBezier,
  arrowPath: arrowPath,
  lineEdgePath: lineEdgePath,
  bezierEdgePath: bezierEdgePath,
  closedPath: closedPath,
  hitPoint: hitPoint,
  hitTestRect: hitTestRect,
  hitTestDisk: hitTestDisk,
  hitTestLine: hitTestLine,
  hitTestBezier: hitTestBezier,
  hitTestConvexHull: hitTestConvexHull,
  resizeCanvas: resizeCanvas,
  measureNameValuePairs: measureNameValuePairs,

  CanvasController: CanvasController,
  CanvasPanZoomLayer: CanvasPanZoomLayer,
  CanvasMultiselectLayer: CanvasMultiselectLayer,

  theme: theme,
}

})();

