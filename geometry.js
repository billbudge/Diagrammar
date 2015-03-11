
var geometry = (function() {
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

  function hitTestLine(p1, p2, p, tolerance) {
    return pointToSegmentDist(p1, p2, p) < tolerance;
  }

  function lineIntersection(p0, p1, p2, p3)
  {
    var s1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    var s2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    var d = (-s2.x * s1.y + s1.x * s2.y);
    if (Math.abs(d) > 0.00001) {
      var s = (-s1.y * (p0.x - p2.x) + s1.x * (p0.y - p2.y)) / d,
          t = ( s2.x * (p0.y - p2.y) - s2.y * (p0.x - p2.x)) / d;
      return { s: s, t: t, x: p0.x + t * s1.x, y: p0.y + t * s1.y };
    }
    // Parallel or collinear, return nothing.
  }

  function hitTestCurveSegment(p1, p2, p3, p4, p, tolerance) {
    var curves = new LinkedList();
    curves.pushFront([p1, p2, p3, p4]);
    var dMin = Number.MAX_VALUE;
    var closestX, closestY;
    while (curves.length > 0) {
      var curve = curves.popBack().value;
      // Get control point distances from the segment defined by the curve endpoints.
      var d1 = pointToLineDist(curve[0], curve[3], curve[1]);
      var d2 = pointToLineDist(curve[0], curve[3], curve[2]);
      var curvature = Math.max(d1, d2);
      // Get p distance from the segment.
      var t = projectPointToLine(curve[0], curve[3], p);
      t = Math.min(1, Math.max(0, t));
      var projX = curve[0].x + t * (curve[3].x - curve[0].x),
          projY = curve[0].y + t * (curve[3].y - curve[0].y);
      var dx = p.x - projX, dy = p.y - projY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d - curvature > tolerance)
        continue;
      if (curvature <= tolerance) {
        if (d < dMin) {
          dMin = d;
          closestX = projX;
          closestY = projY;
        }
      } else {
        // Subdivide into two curves at t = 0.5.
        var s11 = { x: (curve[0].x + curve[1].x) * 0.5, y: (curve[0].y + curve[1].y) * 0.5 };
        var s12 = { x: (curve[1].x + curve[2].x) * 0.5, y: (curve[1].y + curve[2].y) * 0.5 };
        var s13 = { x: (curve[2].x + curve[3].x) * 0.5, y: (curve[2].y + curve[3].y) * 0.5 };

        var s21 = { x: (s11.x + s12.x) * 0.5, y: (s11.y + s12.y) * 0.5 };
        var s22 = { x: (s12.x + s13.x) * 0.5, y: (s12.y + s13.y) * 0.5 };

        var s31 = { x: (s21.x + s22.x) * 0.5, y: (s21.y + s22.y) * 0.5 };

        curves.pushFront([ curve[0], s11, s21, s31 ]);
        curves.pushFront([ s31, s22, s13, curve[3] ]);
      }
    }
    if (dMin < tolerance)
      return { x: closestX, y: closestY };
    // Otherwise, return nothing.
  }

  function matMulNew(m1, m2) {
    var m11 = m1[0] * m2[0] + m1[1] * m2[2];
    var m12 = m1[0] * m2[1] + m1[1] * m2[3];
    var m21 = m1[2] * m2[0] + m1[3] * m2[2];
    var m22 = m1[2] * m2[1] + m1[3] * m2[3];
    var m31 = m1[4] * m2[0] + m1[5] * m2[2] + m2[4];
    var m32 = m1[4] * m2[1] + m1[5] * m2[3] + m2[5];
    return [ m11, m12, m21, m22, m31, m32 ];
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

  // Cosine of angle between x-axis (1, 0) and (dx, dy).
  function getCos(dx, dy) {
    var cos;
    if (dx == 0 && dy == 0)
      cos = 1;  // Point is p0 or identical to p0.
    else
      cos = dx / Math.sqrt(dx * dx + dy * dy);
    return cos;
  }

  // Compares cosines, works for 0 - pi radians.
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
    var p0 = points[0],
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
    if (a.angle < b.angle)
      return -1;
    else if (a.angle > b.angle)
      return 1;
    return 0;
  }

  function annotateConvexHull(hull, centroid) {
    if (!centroid)
      centroid = getCentroid(hull);
    var cx = centroid.x, cy = centroid.y,
        length = hull.length;
    for (var i = 0; i < length; i++) {
      var pi = hull[i], dx = pi.x - cx, dy = pi.y - cy;
      pi.angle = getAngle(dx, dy);
    }
    hull.sort(compareAngles);
  }

  // Project a point onto the hull.
  function projectPointToConvexHull(hull, p) {
    var length = hull.length, lastP = hull[length - 1],
        minP0, minP1, minDist = Number.MAX_VALUE;
    for (var i = 0; i < length; i++) {
      var pi = hull[i],
          dist = geometry.pointToSegmentDist(lastP, pi, p);
      if (dist < minDist) {
        minP0 = lastP;
        minP1 = pi;
        minDist = dist;
      }
      lastP = pi;
    }
    var t = geometry.projectPointToSegment(minP0, minP1, p);
    return { x: minP0.x + t * (minP1.x - minP0.x),
             y: minP0.y + t * (minP1.y - minP0.y) };
  }

  function angleToConvexHull(hull, centroid, angle) {
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
        intersection = geometry.lineIntersection(p0, p1, centroid,
            { x: centroid.x + dx, y: centroid.y - dy });
    var nx = p1.y - p0.y,
        ny = p0.x - p1.x,
        ooNLen = 1.0 / Math.sqrt(nx * nx + ny * ny);
    intersection.nx = nx * ooNLen;
    intersection.ny = ny * ooNLen;

    return intersection;
  }

  return {
    lineLength: lineLength,
    vecLength: vecLength,
    vecNormalize: vecNormalize,
    pointToPointDist: pointToPointDist,
    projectPointToLine: projectPointToLine,
    projectPointToSegment: projectPointToSegment,
    pointToLineDist: pointToLineDist,
    pointToSegmentDist: pointToSegmentDist,
    hitTestLine: hitTestLine,
    lineIntersection: lineIntersection,
    hitTestCurveSegment: hitTestCurveSegment,
    matMulNew: matMulNew,
    matMulVec: matMulVec,
    matMulVecNew: matMulVecNew,
    matMulPt: matMulPt,
    matMulPtNew: matMulPtNew,
    getCos: getCos,
    compareCosines: compareCosines,
    binarySearch: binarySearch,
    getConvexHull: getConvexHull,
    getExtents: getExtents,
    getCentroid: getCentroid,
    getAngle: getAngle,
    compareAngles: compareAngles,
    annotateConvexHull: annotateConvexHull,
    projectPointToConvexHull: projectPointToConvexHull,
    angleToConvexHull: angleToConvexHull,
  };
})();

var smoothValue = 0.75;

function GetCurveSegment(p0, p1, p2, p3) {
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

function EvaluateCurveSegment(segment, t) {
  var tp = 1.0 - t;
  var s11 = { x: segment[0].x * tp + segment[1].x * t,
              y: segment[0].y * tp + segment[1].y * t },
      s12 = { x: segment[1].x * tp + segment[2].x * t,
              y: segment[1].y * tp + segment[2].y * t },
      s13 = { x: segment[2].x * tp + segment[3].x * t,
              y: segment[2].y * tp + segment[3].y * t },
      s21 = { x: s11.x * tp + s12.x * t,
              y: s11.y * tp + s12.y * t},
      s22 = { x: s12.x * tp + s13.x * t,
              y: s12.y * tp + s13.y * t},
      s31 = { x: s21.x * tp + s22.x * t,
              y: s21.y * tp + s22.y * t};
  return s31;
}

// Generate Bezier curve segments interpolating points.
function generateCurveSegments(points, curves, curveLengths) {
  var length = points.length;
  var p0 = points[0], p1 = points[1], p2 = points[2];
  for (var i = 3; i < length; i++) {
    var p3 = points[i];
    curves.push(GetCurveSegment(p0, p1, p2, p3));
    curveLengths.push((geometry.pointToPointDist(p0, p1) +
                       geometry.pointToPointDist(p1, p2) +
                       geometry.pointToPointDist(p2, p3)) / 3);
    p0 = p1;
    p1 = p2;
    p2 = p3;
  }
}


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

function deformHull(hull, item) {
  // Compute normals along hull edges.
  var pLast = hull[hull.length - 1];
  for (var i = 0; i < hull.length; i++) {
    var pi = hull[i];
    var dx = pi.x - pLast.x, dy = pi.y - pLast.y;
    var ns = 1 / Math.sqrt(dx * dx + dy * dy);
    pi.nx = dy * ns;
    pi.ny = -dx * ns;
    pLast = pi;
  }

  // Update knots based on hull and centroid.
  var knots = item.knots;
  knots.sort(compareTurn);

  // Position knots.
  var center = { x: item._cx, y: item._cy };
  for (var i = 0; i < knots.length; i++) {
    var knot = knots[i];
    var edge = turnToHull(hull, center, knot);
    knot._edge = edge;
    // Interpolate along edge by t and offset in normal direction by d to get knot position.
    knot._position = { x: edge.x + knot.d * edge.p0.nx, y: edge.y + knot.d * edge.p0.ny };
  }

  // Deform the hull.
  // We must have at least 3 knots.
  var path = [];
  var k0 = knots[0], k1 = knots[0], k2 = knots[1], k3 = knots[2];
  var nextKnotT = k0.t;
  var i = 0, j = 0;
  while (i < hull.length) {// || j < knots.length - 2) {
    while (i < hull.length && hull[i].t < nextKnotT)
      path.push(hull[i++]);
    if (i >= hull.length)
      break;
    while (j < knots.length - 1) {
      deforming = true;
      // x is knot.t, y id knot.d.
      // var segment = GetCurveSegment({ x: k0.t, y: k0.d },
                                       // { x: k1.t, y: k1.d },
                                       // { x: k2.t, y: k2.d },
                                       // { x: k3.t, y: k3.d });
      var segment = GetCurveSegment(k0._position, k1._position, k2._position, k3._position);
      var steps = 16;
      for (var k = 0; k < steps; k++) {
        var segPt = EvaluateCurveSegment(segment, k / steps);
        // var t = segPt.x, d = segPt.y;
        // var edge = turnToHull(hull, center, { t: t });
        // i = edge.i1;
        // path.push({ x: edge.x + edge.p0.nx * d, y: edge.y + edge.p0.ny * d});
        path.push(segPt);
      }
      k0 = k1; k1 = k2; k2 = k3; k3 = knots[Math.min(j + 4, knots.length - 1)];
      j++;
    }

    i = binarySearch(hull, k3, compareTurn) + 1;
    nextKnotT = 2;
  }

  return path;
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
  var list = new LinkedList();
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

  var queue = new PriorityQueue(compare_angles);
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

