
// Diagrams module.

var diagrams = (function() {

//------------------------------------------------------------------------------

function MouseController() {
  this.dragThreshold = 4;
  this.hoverThreshold = 4;
  this.hoverTimeout = 250;  // milliseconds
  this.mouse = this.dragOffset = { x: 0, y: 0 };
  dataModels.eventMixin.extend(this);
}

MouseController.prototype.onMouseDown = function(e) {
  this.mouse = this.mouseDown = { x: e.offsetX, y: e.offsetY };
}

MouseController.prototype.onMouseMove = function(e) {
  this.mouse = { x: e.offsetX, y: e.offsetY };
  if (this.mouseDown) {
    var dx = this.mouse.x - this.mouseDown.x,
        dy = this.mouse.y - this.mouseDown.y;
    if (!this.isDragging) {
      this.isDragging = Math.abs(dx) >= this.dragThreshold ||
                        Math.abs(dy) >= this.dragThreshold;
      if (this.isDragging)
        this.onBeginDrag();
    }
    if (this.isDragging)
      this.dragOffset = { x: dx, y: dy };
  }
}

MouseController.prototype.onMouseUp = function(e) {
  this.mouse = { x: e.offsetX, y: e.offsetY };
  this.mouseDown = null;
  this.isDragging = false;
}

MouseController.prototype.onMouseOut = function(e) {
  this.isDragging = false;
}

MouseController.prototype.onBeginDrag = function(e) {
  this.onEvent('beginDrag', function(handler) {
    handler();
  });
}

MouseController.prototype.onBeginHover = function(e) {
  this.onEvent('beginHover', function(handler) {
    handler();
  });
}

MouseController.prototype.getMouse = function(e) {
  return { x: this.mouse.x, y: this.mouse.y };
}

MouseController.prototype.getMouseDown = function(e) {
  return { x: this.mouseDown.x, y: this.mouseDown.y };
}

MouseController.prototype.getDragOffset = function(e) {
  return { x: this.dragOffset.x, y: this.dragOffset.y };
}

//------------------------------------------------------------------------------

var canvasLayers = (function() {

  var myModel = (function () {
    var proto = {
      getParent: function (item) {
        return item._parent;
      },
    }

    function extend(model) {
      if (model.myModel)
        return model.myModel;

      var instance = Object.create(proto);
      instance.model = model;

      model.myModel = instance;
      return instance;
    }

    return {
      extend: extend,
    };
  })();

  return {
  }

})();

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
    },
    blueprint: {
      bgColor: '#6666cc',
      strokeColor: '#f0f0f0',
      textColor: '#f0f0f0',
      highlightColor: '#40F040',
      hotTrackColor: '#F0F040',
      dimColor: '#808080',
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
function getEdgeBezier(p1, p2, altPt) {
  if (!p1)
    p1 = altPt;
  else if (!p2)
    p2 = altPt;
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

function hitTestRect(x, y, w, h, r, p, tol) {
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

function resizeCanvas(canvas, width, height) {
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

return {
  MouseController: MouseController,

  theme: theme,

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
}

})();

