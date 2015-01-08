// Vector Math

'use strict';

var Vec2d = Vec2d || {};

// function Vec2d(x, y) {
//   this.x = x || 0;
//   this.y = y || 0;
// }

// Vec2d.prototype.constructor = Vec2d;

// Vec2d.prototype.set = function(x, y) {
//   this.x = x;
//   this.y = y;
// }

// Vec2d.prototype.copy = function(other) {
//   this.x = other.x;
//   this.y = other.y;
// }

// Vec2d.prototype.clone = function() {
//   return new Vec2d(this.x, this.y);
// }

// Vec2d.prototype.negate = function() {
//   this.x = -this.x;
//   this.y = -this.y;
// }

// Vec2d.prototype.perp = function() {
//   var x = -this.y;
//   var y = this.x;
//   this.x = x;
//   this.y = y;
// }

// Vec2d.prototype.dot = function(v1, v2) {
//   return v1.x * v2.x + v1.y * v2.y;
// }

// Vec2d.prototype.distSquared = function(v1, v2) {
//   var dx = v2.x - v1.x, dy = v2.y - v1.y;
//   return dx * dx + dy * dy;
// }

// Vec2d.prototype.dist = function(v1, v2) {
//   return Math.sqrt(distSquared(v1, v2));
// }

// Vec2d.prototype.length = function() {
//   var x = this.x;
//   var y = this.y;
//   return Math.sqrt(x * x + y * y);
// }

// Vec2d.prototype.add = function(v) {
//   this.x += v.x;
//   this.y += v.y;
// }

// Vec2d.prototype.subtract = function(v) {
//   this.x -= v.x;
//   this.y -= v.y;
// }

var Box2d = Box2d || {};

Box2d.extend = function(box, x, y) {
  if (box.left == undefined) {
    box.left = x;
    box.top = y;
    box.right = x;
    box.bottom = y;
  } else {
    box.left = Math.min(box.left, x);
    box.top = Math.min(box.top, y);
    box.right = Math.max(box.right, x);
    box.bottom = Math.max(box.bottom, y);
  }
}

Box2d.extendArray = function(box, array) {
  for (var i = 0; i < array.length; i++) {
    var pi = array[i];
    Box2d.extend(box, pi.x, pi.y);
  }
}

// function Affine2d(m11, m12, m21, m22, tx, ty) {
//   this.m11 = m11 || 1;
//   this.m12 = m12 || 0;
//   this.m21 = m21 || 0;
//   this.m22 = m22 || 1;
//   this.tx = tx || 0;
//   this.ty = ty || 0;
// }

// Affine2d.prototype.Identity = new Affine2d();

// Affine2d.prototype.transform = function(p) {
//   return new Vec2d(p.x * m11 + p.y * m21 + tx, p.x * m12 + p.y * m22 + ty);
// }

// Affine2d.prototype.scale = function(sx, sy) {
//   this.m11 = sx;
//   this.m12 = 0;
//   this.m21 = 0;
//   this.m22 = sy;
//   this.tx = 0;
//   this.ty = 0;
// }

// Affine2d.prototype.rotate = function(theta) {
//   var cos = Math.cos(theta);
//   var sin = Math.sin(theta);
//   this.m11 = cos;
//   this.m12 = -sin;
//   this.m21 = sin;
//   this.m22 = cos;
//   this.tx = 0;
//   this.ty = 0;
// }

// Affine2d.prototype.translate = function(tx, ty) {
//   this.tx = tx;
//   this.ty = ty;
// }

// Affine2d.prototype.compose = function(other) {
//   var m11 = this.m11, m12 = this.m12, m21 = this.m21, m22 = this.m22, tx = this.tx, ty = this.ty;
//   this.m11 = m11 * other.m11 + m12 * other.m21;
//   this.m12 = m11 * other.m12 + m12 * other.m22;
//   this.m21 = m21 * other.m11 + m22 * other.m21;
//   this.m22 = m21 * other.m12 + m22 * other.m22;
//   this.tx = tx * other.m11 + ty * other.m21 + other.tx;
//   this.ty = tx * other.m12 + ty * other.m22 + other.ty;
// }

// Affine2d.prototype.compose_affine = function(sx, sy, theta, tx, ty) {
//   var m11 = this.m11, m12 = this.m12, m21 = this.m21, m22 = this.m22, tx = this.tx, ty = this.ty;
//   var cos = Math.cos(theta);
//   var sin = Math.sin(theta);
//   this.m11 = m11 * other.m11 + m12 * other.m21;
//   this.m12 = m11 * other.m12 + m12 * other.m22;
//   this.m21 = m21 * other.m11 + m22 * other.m21;
//   this.m22 = m21 * other.m12 + m22 * other.m22;
//   this.tx = tx * other.m11 + ty * other.m21 + other.tx;
//   this.ty = tx * other.m12 + ty * other.m22 + other.ty;
// }

// function Segment2d(p1, p2) {
//   this.p1 = p1 || new Vec2d();
//   this.p2 = p2 || new Vec2d();
// }

// function Circle2d(c, r) {
//   this.c = c || new Vec2d();
//   this.r = r || 0;
// }

// function CubicBezier2d(p1, p2, p3, p4) {
//   this.p1 = p1 || new Vec2d();
//   this.p2 = p2 || new Vec2d();
//   this.p3 = p3 || new Vec2d();
//   this.p4 = p4 || new Vec2d();
// }

// CubicBezier2d.prototype.pick = function(p, tolerance, hitPoint) {
//   var segments = new LinkedList();
//   segments.push_front(this);
//   while (segments.length) {
//     var segment = segments.pop_back();
//   }
// }


function GetCos(dx, dy) {
  var cos;
  if (dx == 0 && dy == 0)
    cos = 1;  // Point is p0 or identical to p0.
  else
    cos = dx / Math.sqrt(dx * dx + dy * dy);
  return cos;
}

// Compares cosines, works for 0 - pi radians.
function CompareAngles(a, b) {
  if (a.cos > b.cos)
    return -1;
  else if (a.cos < b.cos)
    return 1;
  return 0;
}

// Calculate turn direction of p1-p2 to p2-p3.
// -1 == left, 1 = right, 0 = collinear.
function TurnDirection(p1, p2, p3) {
  var crossZ = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  return crossZ;
}
// Gets the convex hull using Graham scan.
function ConvexHull(points) {
  var p0 = points[0];
  var maxY = p0.y;
  for (var i = 0; i < points.length; i++) {
    var pi = points[i];
    if (pi.y > maxY) {
      maxY = pi.y;
      p0 = pi;
    }
  }
  for (var i = 0; i < points.length; i++) {
    var pi = points[i];
    var dx = pi.x - p0.x, dy = pi.y - p0.y;
    // Cos of angle between x-axis (1, 0) and (dx, dy).
    pi.cos = GetCos(dx, dy);
  }
  points.sort(CompareAngles);

  var hull = [];
  hull.push(points[0]);
  hull.push(points[1])
  var i = 2;
  while (i < points.length) {
    var p3 = points[i];
    while (hull.length > 1) {
      var p1 = hull[hull.length - 2];
      var p2 = hull[hull.length - 1];
      if (TurnDirection(p1, p2, p3) < 0)
        break;
      // right turn or colinear
      hull.pop();
    }
    hull.push(points[i]);
    i++;
  }
  return hull;
}

