
const geometry = (function() {
'use strict';

  function lineLength(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function vecLength(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  function vecNormalize(v) {
    var length = vecLength(v);
    if (length) {
      var ooLength = 1.0 / length;
      v.x *= ooLength;
      v.y *= ooLength;
    }
  }

  function matMulNew(m1, m2) {
    return [ m1[0] * m2[0] + m1[1] * m2[2],
             m1[0] * m2[1] + m1[1] * m2[3],
             m1[2] * m2[0] + m1[3] * m2[2],
             m1[2] * m2[1] + m1[3] * m2[3],
             m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
             m1[4] * m2[1] + m1[5] * m2[3] + m2[5]
           ];
  }

  function matMulVec(v, m) {
    var x = v.x, y = v.y;
    v.x = x * m[0] + y * m[2];
    v.y = x * m[1] + y * m[3];
    return v;
  }

  function matMulVecNew(v, m) {
    return matMulVec({ x: v.x, y: v.y }, m);
  }

  function matMulPt(v, m) {
    var x = v.x, y = v.y;
    v.x = x * m[0] + y * m[2] + m[4];
    v.y = x * m[1] + y * m[3] + m[5];
    return v;
  }

  function matMulPtNew(v, m) {
    return matMulPt({ x: v.x, y: v.y }, m);
  }

  function pointToPointDist(p1, p2) {
    var dx = p2.x - p1.x, dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function projectPointToLine(p1, p2, p) {
    var p1p2x = p2.x - p1.x;
    var p1p2y = p2.y - p1.y;
    var p1px = p.x - p1.x;
    var p1py = p.y - p1.y;
    var p1p2Squared = p1p2x * p1p2x + p1p2y * p1p2y;
    // For a degenerate line, t = 0.
    if (p1p2Squared == 0)
      return 0;
    var p1pDotp1p2 = p1px * p1p2x + p1py * p1p2y;
    var t = p1pDotp1p2 / p1p2Squared;
    return t;
  }

  function projectPointToSegment(p1, p2, p) {
    var t = projectPointToLine(p1, p2, p);
    t = Math.min(1, Math.max(0, t));
    return t;
  }

  // Distance to infinite line through p1, p2.
  function pointToLineDist(p1, p2, p) {
    var t = projectPointToLine(p1, p2, p);
    var lx = p1.x + t * (p2.x - p1.x), ly = p1.y + t * (p2.y - p1.y);
    var dx = p.x - lx, dy = p.y - ly;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Distance to line segment between p1, p2.
  function pointToSegmentDist(p1, p2, p) {
    var t = projectPointToSegment(p1, p2, p);
    var lx = p1.x + t * (p2.x - p1.x), ly = p1.y + t * (p2.y - p1.y);
    var dx = p.x - lx, dy = p.y - ly;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pointOnSegment(p1, p2, p, tolerance) {
    return pointToSegmentDist(p1, p2, p) < tolerance;
  }

  function lineIntersection(p0, p1, p2, p3)
  {
    var p0x = p0.x, p0y = p0.y, p1x = p1.x, p1y = p1.y,
        p2x = p2.x, p2y = p2.y, p3x = p3.x, p3y = p3.y,
        s1x = p1x - p0x, s1y = p1y - p0y, s2x = p3x - p2x, s2y = p3y - p2y,
        d = (-s2x * s1y + s1x * s2y);
    if (Math.abs(d) > 0.000001) {
      var s = (-s1y * (p0x - p2x) + s1x * (p0y - p2y)) / d,
          t = (s2x * (p0y - p2y) - s2y * (p0x - p2x)) / d;
      return { s: s, t: t, x: p0x + t * s1x, y: p0y + t * s1y };
    }
    // Parallel or coincident.
  }

  function makeInterpolatingQuadratic(p0, p1, p2) {
    var smoothValue = 0.5;
    var c1 = { x: (p0.x + p1.x) * 0.5, y: (p0.y + p1.y) * 0.5 };
    var c2 = { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };

    var d1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    var d2 = { x: p2.x - p1.x, y: p2.y - p1.y };

    var len1 = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
    var len2 = Math.sqrt(d2.x * d2.x + d2.y * d2.y);

    var k = len1 / (len1 + len2);

    var m = { x: c1.x + (c2.x - c1.x) * k, y: c1.y + (c2.y - c1.y) * k };

    var newC = { x: m.x + (c2.x - m.x) * smoothValue + p1.x - m.x,
                 y: m.y + (c2.y - m.y) * smoothValue + p1.y - m.y };

    return [{ x: p1.x, y: p1.y }, newC, { x: p2.x, y: p2.y }];
  }

  // Evaluate quadratic segment by deCastlejau algorithm.
  function evaluateQuadratic(q, t) {
    var tp = 1.0 - t;
    var s11 = { x: q[0].x * tp + q[1].x * t, y: q[0].y * tp + q[1].y * t },
        s12 = { x: q[1].x * tp + q[2].x * t, y: q[1].y * tp + q[2].y * t },
        s21 = { x: s11.x * tp + s12.x * t, y: s11.y * tp + s12.y * t};
    return s21;
  }

  function makeInterpolatingBezier(p0, p1, p2, p3) {
    var smoothValue = 0.75;
    var c1 = { x: (p0.x + p1.x) * 0.5, y: (p0.y + p1.y) * 0.5 };
    var c2 = { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };
    var c3 = { x: (p2.x + p3.x) * 0.5, y: (p2.y + p3.y) * 0.5 };

    var d1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    var d2 = { x: p2.x - p1.x, y: p2.y - p1.y };
    var d3 = { x: p3.x - p2.x, y: p3.y - p2.y };

    var len1 = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
    var len2 = Math.sqrt(d2.x * d2.x + d2.y * d2.y);
    var len3 = Math.sqrt(d3.x * d3.x + d3.y * d3.y);

    var k1 = len1 / (len1 + len2);
    var k2 = len2 / (len2 + len3);

    var m1 = { x: c1.x + (c2.x - c1.x) * k1, y: c1.y + (c2.y - c1.y) * k1 };
    var m2 = { x: c2.x + (c3.x - c2.x) * k2, y: c2.y + (c3.y - c2.y) * k2 };

    var newC1 = { x: m1.x + (c2.x - m1.x) * smoothValue + p1.x - m1.x,
                  y: m1.y + (c2.y - m1.y) * smoothValue + p1.y - m1.y };
    var newC2 = { x: m2.x + (c2.x - m2.x) * smoothValue + p2.x - m2.x,
                  y: m2.y + (c2.y - m2.y) * smoothValue + p2.y - m2.y };

    return [{ x: p1.x, y: p1.y }, newC1, newC2, { x: p2.x, y: p2.y }];
  }

  // Evaluate bezier segment by deCastlejau algorithm.
  function evaluateBezier(b, t) {
    var tp = 1.0 - t;
    var s11 = { x: b[0].x * tp + b[1].x * t, y: b[0].y * tp + b[1].y * t },
        s12 = { x: b[1].x * tp + b[2].x * t, y: b[1].y * tp + b[2].y * t },
        s13 = { x: b[2].x * tp + b[3].x * t, y: b[2].y * tp + b[3].y * t },
        s21 = { x: s11.x * tp + s12.x * t, y: s11.y * tp + s12.y * t},
        s22 = { x: s12.x * tp + s13.x * t, y: s12.y * tp + s13.y * t},
        s31 = { x: s21.x * tp + s22.x * t, y: s21.y * tp + s22.y * t};
    return s31;
  }

  function generateInterpolatingBeziers(points) {
    var length = points.length,
        p0 = points[0], p1 = points[1], p2 = points[2],
        curves = [];
    for (var i = 3; i < length; i++) {
      var p3 = points[i];
      curves.push(makeInterpolatingBezier(p0, p1, p2, p3));
      p0 = p1;
      p1 = p2;
      p2 = p3;
    }
    return curves;
  }

  function hitTestCurveSegment(p1, p2, p3, p4, p, tolerance) {
    const beziers = new diagrammar.collections.LinkedList();
    beziers.pushFront([p1, p2, p3, p4, 0, 1]);
    let dMin = Number.MAX_VALUE,
        closestX, closestY, tMin;
    while (beziers.length > 0) {
      var b = beziers.popBack().value,
          b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], t0 = b[4], t1 = b[5];
      // Get control point distances from the segment defined by the curve endpoints.
      var d1 = pointToLineDist(b0, b3, b1);
      var d2 = pointToLineDist(b0, b3, b2);
      var curvature = Math.max(d1, d2);
      // Get p distance from the segment.
      var t = projectPointToLine(b0, b3, p);
      t = Math.min(1, Math.max(0, t));
      var projX = b0.x + t * (b3.x - b0.x),
          projY = b0.y + t * (b3.y - b0.y);
      var dx = p.x - projX, dy = p.y - projY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d - curvature > tolerance)
        continue;
      if (curvature <= tolerance) {
        if (d < dMin) {
          dMin = d;
          tMin = t0 + t * (t1 - t0);
          closestX = projX;
          closestY = projY;
        }
      } else {
        // Subdivide into two curves at t = 0.5.
        const s11 = { x: (b0.x + b1.x) * 0.5, y: (b0.y + b1.y) * 0.5 },
              s12 = { x: (b1.x + b2.x) * 0.5, y: (b1.y + b2.y) * 0.5 },
              s13 = { x: (b2.x + b3.x) * 0.5, y: (b2.y + b3.y) * 0.5 },

              s21 = { x: (s11.x + s12.x) * 0.5, y: (s11.y + s12.y) * 0.5 },
              s22 = { x: (s12.x + s13.x) * 0.5, y: (s12.y + s13.y) * 0.5 },

              s31 = { x: (s21.x + s22.x) * 0.5, y: (s21.y + s22.y) * 0.5 },

              tMid = t0 + 0.5 * (t1 - t0);

        beziers.pushFront([ b0, s11, s21, s31, t0, tMid ]);
        beziers.pushFront([ s31, s22, s13, b3, tMid, t1 ]);
      }
    }
    if (dMin < tolerance)
      return { x: closestX, y: closestY, d: dMin, t: tMin };
  }

  // Cosine of angle between x-axis (1, 0) and (dx, dy).
  function getCos(dx, dy) {
    var cos;
    if (dx == 0 && dy == 0)
      cos = 1;  // Point is p0 or identical to p0.
    else
      cos = dx / Math.sqrt(dx * dx + dy * dy);
    return cos;
  }

  // Compares cosines, works over [0, pi].
  function compareCosines(a, b) {
    if (a.cos > b.cos)
      return -1;
    else if (a.cos < b.cos)
      return 1;
    return 0;
  }

  // Returns index of array containing value if found, otherwise, index of
  // position where value would be if added.
  function binarySearch(items, value, cmpFn) {
    var left = 0, right = items.length;
    while (left < right - 1) {
      var mid = (right - left) / 2 + left | 0;
      if (cmpFn(value, items[mid]) < 0) {
        right = mid;
      } else {
        left = mid;
      }
    }
    return left;
  }

  // Calculate turn direction of p1-p2 to p2-p3.
  // -1 == left, 1 = right, 0 = collinear.
  function turnDirection(p1, p2, p3) {
    var crossZ = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    return crossZ;
  }

  // Gets the convex hull using Graham scan.
  function getConvexHull(points) {
    var p0 = points[0],
        maxY = p0.y,
        length = points.length,
        i, pi;
    for (i = 0; i < length; i++) {
      pi = points[i];
      if (pi.y > maxY) {
        maxY = pi.y;
        p0 = pi;
      }
    }
    for (i = 0; i < length; i++) {
      pi = points[i];
      // Cos of angle between x-axis (1, 0) and pi - p0.
      pi.cos = getCos(pi.x - p0.x, pi.y - p0.y);
    }
    points.sort(compareCosines);
    var startIndex = binarySearch(points, p0, compareCosines),
        hull = [],
        i = 2;
    hull.push(points[0]);
    hull.push(points[1]);
    while (i < length) {
      var p3 = points[i];
      while (hull.length > 1) {
        var p1 = hull[hull.length - 2];
        var p2 = hull[hull.length - 1];
        if (turnDirection(p1, p2, p3) < -0.000001)  // TODO define EPS
          break;
        // right turn or collinear
        hull.pop();
      }
      hull.push(p3);
      i++;
    }
    return hull;
  }

  function getExtents(points) {
    var length = points.length,
        p0 = points[0],
        xmin = p0.x, ymin = p0.y, xmax = p0.x, ymax = p0.y;
    for (var i = 0; i < length; i++) {
      var pi = points[i];
      xmin = Math.min(xmin, pi.x);
      ymin = Math.min(ymin, pi.y);
      xmax = Math.max(xmax, pi.x);
      ymax = Math.max(ymax, pi.y);
    }
    return { xmin: xmin, ymin: ymin, xmax: xmax, ymax: ymax };
  }

  function getCentroid(points) {
    var cx = 0, cy = 0, length = points.length;
    for (var i = 0; i < length; i++) {
      var pi = points[i];
      cx += pi.x; cy += pi.y;
    }
    return { x: cx / length, y: cy / length };
  }

  function getAngle(dx, dy) {
    var cos = 1;
    if (dx != 0 || dy != 0)
      cos = dx / Math.sqrt(dx * dx + dy * dy);
    var angle = Math.acos(cos);
    if (dy > 0)
      angle = 2 * Math.PI - angle;
    return angle;
  }

  function compareAngles(a, b) {
    return a.angle - b.angle;
  }

  function visitHullEdges(hull, edgeFn) {
    var length = hull.length, i0 = length - 1, p0 = hull[i0];
    for (var i1 = 0; i1 < length; i1++) {
      var p1 = hull[i1];
      edgeFn(p0, p1, i0, i1);
      i0 = i1;
      p0 = p1;
    }
  }

  // Rotates an array right so that the k-th element becomes the first.
  function rotateArray(a, k) {
    function reverse(a, i0, i1) {
      while (i0 < i1) {
        var temp = a[i0];
        a[i0] = a[i1];
        a[i1] = temp;
        i0++;
        i1--;
      }
    }
    var length = a.length;
    reverse(a, 0, k - 1);
    reverse(a, k, length - 1);
    reverse(a, 0, length - 1);
  }

  // Annotates the convex hull points with the following useful infomation:
  // 1) angle: the angle between p[i] and center. 0 is the positive x-axis.
  // 2) length: the length of the edge starting at p[i].
  // 3) nx, ny: the unit length normal vector to the edge starting at p[i].
  // Sorts the hull by angle to speed up angle-to-hull calculations.
  function annotateConvexHull(hull, c) {
    var cx = c.x, cy = c.y, minAngle = Number.MAX_VALUE, minI;
    hull.forEach(function(p, i) {
      var angle = getAngle(p.x - cx, p.y - cy);
      p.angle = angle;
      if (angle < minAngle) {
        minAngle = angle;
        minI = i;
      }
    });
    visitHullEdges(hull, function(p0, p1, i0, i1) {
      var dx = p1.x - p0.x, dy = p1.y - p0.y,
          length = Math.sqrt(dx * dx + dy * dy),
          ooLength = 1.0 / length;
      p0.length = length;
      p0.nx = dy * ooLength;
      p0.ny = -dx * ooLength;
    });
    // The hull points only need rotation to be sorted by angle.
    rotateArray(hull, minI);
  }

  // Determines if point is within tolerance of being inside the convex hull.
  // Requires normals calculated by annotateConvexHull.
  function pointInConvexHull(hull, p, tolerance) {
    return !hull.find(function(pi) {
      var dx = p.x - pi.x, dy = p.y - pi.y,
          offset = dx * pi.nx + dy * pi.ny;
      if (offset < -tolerance)
        return true;
    });
  }

  // Project a point onto the hull.
  function projectPointToConvexHull(hull, p) {
    var minDist = Number.MAX_VALUE, minI0, minI1;
    visitHullEdges(hull, function(p0, p1, i0, i1) {
      var dist = geometry.pointToSegmentDist(p0, p1, p);
      if (dist < minDist) {
        minI0 = i0;
        minI1 = i1;
        minDist = dist;
      }
    });
    var minP0 = hull[minI0], minP1 = hull[minI1],
        t = geometry.projectPointToSegment(minP0, minP1, p);
    return {
      x: minP0.x + t * (minP1.x - minP0.x),
      y: minP0.y + t * (minP1.y - minP0.y),
      i0: minI0,
      i1: minI1,
      p0: minP0,
      p1: minP1,
      t: t,
      dist: minDist,
    };
  }

  function angleToConvexHull(hull, center, angle) {
    var length = hull.length,
        value = { angle: angle },
        i0 = binarySearch(hull, value, compareAngles),
        p0 = hull[i0], i1;
    if (compareAngles(value, p0) < 0) {
      i1 = 0;
      p0 = hull[length - 1];
    } else {
      i1 = i0 + 1;
      if (i1 == length)
        i1 = 0;
    }
    var p1 = hull[i1],
        dx = Math.cos(angle),
        dy = Math.sin(angle),
        intersection = geometry.lineIntersection(p0, p1, center,
            { x: center.x + dx, y: center.y - dy });
    var nx = p1.y - p0.y,
        ny = p0.x - p1.x,
        ooLength = 1.0 / Math.sqrt(nx * nx + ny * ny);
    intersection.nx = nx * ooLength;
    intersection.ny = ny * ooLength;
    intersection.i0 = i0;
    intersection.i1 = i1;

    // intersection.t is the parameter along the hull edge, while intersection.s
    // is the parameter along the ray from the center.
    return intersection;
  }

  // Moves the convex hull points in the normal direction by amount.
  // Requires normals calculated by annotateConvexHull.
  function insetConvexHull(hull, amount) {
    visitHullEdges(hull, function(p0, p1, i0, i1) {
      // average the normals of the edges adjacent to each point.
      var bx = (p0.nx + p1.nx) / 2, by = (p0.ny + p1.ny) / 2;
      p1.x += bx * amount;
      p1.y += by * amount;
    });
  }

  return {
    lineLength: lineLength,
    vecLength: vecLength,
    vecNormalize: vecNormalize,
    matMulNew: matMulNew,
    matMulVec: matMulVec,
    matMulVecNew: matMulVecNew,
    matMulPt: matMulPt,
    matMulPtNew: matMulPtNew,
    pointToPointDist: pointToPointDist,
    projectPointToLine: projectPointToLine,
    projectPointToSegment: projectPointToSegment,
    pointToLineDist: pointToLineDist,
    pointToSegmentDist: pointToSegmentDist,
    pointOnSegment: pointOnSegment,
    lineIntersection: lineIntersection,
    makeInterpolatingQuadratic: makeInterpolatingQuadratic,
    evaluateQuadratic: evaluateQuadratic,
    makeInterpolatingBezier: makeInterpolatingBezier,
    evaluateBezier: evaluateBezier,
    generateInterpolatingBeziers: generateInterpolatingBeziers,
    hitTestCurveSegment: hitTestCurveSegment,
    getCos: getCos,
    compareCosines: compareCosines,
    binarySearch: binarySearch,
    getConvexHull: getConvexHull,
    getExtents: getExtents,
    getCentroid: getCentroid,
    getAngle: getAngle,
    compareAngles: compareAngles,
    visitHullEdges: visitHullEdges,
    annotateConvexHull: annotateConvexHull,
    pointInConvexHull: pointInConvexHull,
    projectPointToConvexHull: projectPointToConvexHull,
    angleToConvexHull: angleToConvexHull,
    insetConvexHull: insetConvexHull,
  };
})();


function parameterizePath(path) {
  var length = path.length;
  var i0 = length - 1;
  var p0 = path[i0];
  // Calculate length of all segments and total path length.
  var total = 0;
  for (var i1 = 0; i1 < length; i1++) {
    var p1 = path[i1];
    var d = geometry.lineLength(p0.x, p0.y, p1.x, p1.y);
    total += d;
    hull[i0].t = d;
    i0 = i1;
    p0 = p1;
  }
  for (var i = 0; i < length; i++)
    hull[i].t /= total;
}

function findClosestPathSegment(path, p) {
  var length = path.length;
  var end = length - 1;
  var i0 = end;
  var p0 = path[i0];
  var dMin = Number.MAX_VALUE;
  var iMin = i0;
  var t = 0;
  for (var i1 = 0; i1 != end; i1++) {
    var p1 = path[i1];
    var d = geometry.pointToSegmentDist(p0, p1, p);
    if (d < dMin) {
      dMin = d;
      iMin = i0;
    }
    p0 = p1;
    i0 = i1;
  }
  return iMin;
}

function projectToPath(path, segment, p) {
  var p0 = path[segment];
  var p1 = path[segment != path.length - 1 ? segment + 1 : 0];
  var t = geometry.projectPointToSegment(p0, p1, p);
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}


// // Gets the convex hull using Graham scan, modified to sort by angle about
// // the centroid.
// function convexHull(points, item) {
//   var p0 = points[0];
//   var maxY = p0.y;
//   for (var i = 0; i < points.length; i++) {
//     var pi = points[i];
//     if (pi.y > maxY) {
//       maxY = pi.y;
//       p0 = pi;
//     }
//   }
//   var centroid = getCentroid(points);
//   item._cx = centroid.x; item._cy = centroid.y;

//   for (var i = 0; i < points.length; i++) {
//     var pi = points[i];
//     var dx = pi.x - centroid.x, dy = pi.y - centroid.y;
//     // Cos of angle between x-axis (1, 0) and (dx, dy).
//     pi.t = getTurn(dx, dy);
//   }
//   points.sort(compareTurn);
//   var startIndex = binarySearch(points, p0, compareTurn);

//   var hull = [];
//   var length = points.length;
//   var i = startIndex;
//   hull.push(points[i]);
//   i = (i + 1) % length;
//   hull.push(points[i]);
//   i = (i + 1) % length;
//   while (true) {
//     var p3 = points[i];
//     while (hull.length > 1) {
//       var p1 = hull[hull.length - 2];
//       var p2 = hull[hull.length - 1];
//       if (turn_direction(p1, p2, p3) < -0.000001)  // TODO define EPS
//         break;
//       // right turn or collinear
//       hull.pop();
//     }
//     if (i == startIndex)
//       break;
//     hull.push(p3);
//     i = (i + 1) % length;
//   }

//   hull.sort(compareTurn);

//   return hull;
// }

function turnToSlope(t) {
  var rotation = Math.PI * 2 * t;
  return { x: Math.cos(rotation), y: -Math.sin(rotation) };
}

function turnToHull(hull, center, item) {
  var i0, i1;
  i0 = binarySearch(hull, item, compareTurn);
  if (item.t < hull[i0].t) {
    i1 = i0;
    i0 = i0 != 0 ? i0 - 1 : hull.length - 1;
  } else {
    i1 = (i0 != hull.length - 1) ? i0 + 1 : 0;
  }
  var p0 = hull[i0], p1 = hull[i1];
  var dx = p1.x - p0.x, dy = p1.y - p0.y;
  var ns = 1 / Math.sqrt(dx * dx + dy * dy);

  var slope = turnToSlope(item.t);
  var intersection = LineIntersection(p0, p1, center, { x: center.x + slope.x, y: center.y + slope.y });
  return { i0: i0, i1: i1, p0: p0, p1: p1, t: intersection.s, x: intersection.x, y: intersection.y };
}

var minRadius = 6;

function getVecCos(left, leftNext, right, rightNext) {
  var dx1 = left.x - leftNext.x, dy1 = left.y - leftNext.y;
  var dx2 = rightNext.x - right.x, dy2 = rightNext.y - right.y;
  return (dx1 * dx2 + dy1 * dy2) / Math.sqrt((dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2));
}

function AddEndCap(list, leftNode, rightNode) {
  // var p0 = leftNode.value, p1 = rightNode.value;
  // var dx = p1.x - p0.x, dy = p1.y - p0.y;
  // list.insertBefore({ x: p0.x + dx / 2 + dy / 8, y: p0.y + dy / 2 - dx / 8}, rightNode);
}

function smoothPaths(clipperPath) {
  var list = new diagrammar.collections.LinkedList();
  // Circular next, prev.
  function cnext(node) {
    return node.next || list.front;
  }
  function cprev(node) {
    return node.prev || list.back;
  }
  for (var i = 0; i < clipperPath.length; i++) {
    var pi = clipperPath[i];
    list.pushBack({ x: pi.x, y: pi.y });
  }

  var queue = new diagrammar.collections.PriorityQueue(compare_angles);
  list.map(function(node) {
    var cos = getCos(node.value, cprev(node).value, node.value, cnext(node).value);
    if (cos < .9)
      queue.push({ node: node, cos: cos });
  });

  while (!queue.empty()) {
    var rough = queue.pop();
    var leftNode = rough.node;
    // Node could be stale if it has been deleted as part of another rough node.
    if (!leftNode.next && !leftNode.prev)
      continue;
    var rightNode = list.insertAfter({ x: leftNode.value.x, y: leftNode.value.y }, leftNode);
    while (list.length > 3) {
      var leftNext = cprev(leftNode), rightNext = cnext(rightNode);

      var cos = getVecCos(leftNode.value, leftNext.value, rightNode.value, rightNext.value);
      var h = minRadius * cos;  // TODO should be cos theta/2.
      var gap = Math.sqrt(minRadius * minRadius + h * h);
      var dx = leftNode.value.x - rightNode.value.x, dy = leftNode.value.y - rightNode.value.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > gap) {
        AddEndCap(list, leftNode, rightNode);
        break;
      }

      // If prev and next are closer than gap, eliminate leftNode and rightNode.
      dx = leftNext.value.x - rightNext.value.x;
      dy = leftNext.value.y - rightNext.value.y;
      d = Math.sqrt(dx * dx + dy * dy);
      if (d < gap) {
        list.remove(leftNode);
        leftNode = leftNext;
        list.remove(rightNode);
        rightNode = rightNext;
        continue;
      }
      var dx1 = leftNext.value.x - leftNode.value.x, dy1 = leftNext.value.y - leftNode.value.y;
      var dx2 = rightNext.value.x - rightNode.value.x, dy2 = rightNext.value.y - rightNode.value.y;
      var len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1), len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      var minLen = len1, min1 = true;
      if (len2 < len1) {
        minLen = len2;
        min1 = false;
      }
      var scale1 = minLen / len1, scale2 = minLen / len2;
      var ex1 = dx1 * scale1, ey1 = dy1 * scale1, ex2 = dx2 * scale2, ey2 = dy2 * scale2;
      dx = ex1 - ex2; dy = ey1 - ey2;
      d = Math.sqrt(dx * dx + dy * dy);
      if (d < gap) {
        if (min1) {
          list.remove(leftNode);
          leftNode = leftNext;
          rightNode.value.x = rightNode.value.x + ex2;
          rightNode.value.y = rightNode.value.y + ey2;
        } else {
          list.remove(rightNode);
          rightNode = rightNext;
          leftNode.value.x = leftNode.value.x + ex1;
          leftNode.value.y = leftNode.value.y + ey1;
        }
      } else {
        var scale = gap / d;
        leftNode.value.x = leftNode.value.x + scale * ex1;
        leftNode.value.y = leftNode.value.y + scale * ey1;
        rightNode.value.x = rightNode.value.x + scale * ex2;
        rightNode.value.y = rightNode.value.y + scale * ey2;
        AddEndCap(list, leftNode, rightNode);
        break;
      }
    }
  }

  var path = [];
  if (list.length > 3) {
    list.map(function(node) {
      path.push({ x: node.value.x, y: node.value.y });
    });
  }
  return path;
}

function ToClipperPath(array, offset) {
  var path = new ClipperLib.Path();
  for (var i = 0; i < array.length; i++) {
    var pi = array[i];
    path.push({X: pi.x + offset.x, Y: pi.y + offset.y});
  }
  return path;
}

function FromClipperPath(path, offset) {
  var array = [];
  for (var i = 0; i < path.length; i++) {
    var pi = path[i];
    array.push({x: pi.X - offset.x, y: pi.Y - offset.y});
  }
  return array;
}


  // var cx = 0, cy = 0;
  // var xmin, ymin, xmax, ymax;
  // for (var i = 0; i < points.length; i++) {
  //   var pi = points[i];
  //   cx += pi.x; cy += pi.y;
  // }
  // return { x: cx / points.length, y: cy / points.length };

