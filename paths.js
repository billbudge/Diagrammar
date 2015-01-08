
// TODOs
// +/- shapes, weld (+ union, - diff)
// Shaping tools
// properly namespace


function get_id(obj) {
  return obj.id;
}

function ref_equal(obj1, obj2) {
  // NOTE two null refs aren't considered equal.
  return obj1 && obj2 && obj1.id == obj2.id;
}

function binary_search(items, value, cmp_fn) {
  var left = 0, right = items.length;
  while (left < right - 1) {
    var mid = Math.floor((right - left) / 2 + left);
    if (cmp_fn(value, items[mid]) < 0) {
      right = mid;
    } else {
      left = mid;
    }
  }
  return left;
}

function PointToPointDist(p1, p2) {
  var dx = p2.x - p1.x, dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function ProjectPointToLine(p1, p2, p) {
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

// Distance to infinite line through p1, p2.
function PointToLineDist(p1, p2, p) {
  var t = ProjectPointToLine(p1, p2, p);
  var lx = p1.x + t * (p2.x - p1.x), ly = p1.y + t * (p2.y - p1.y);
  var dx = p.x - lx, dy = p.y - ly;
  return Math.sqrt(dx * dx + dy * dy);
}

// Distance to line segment between p1, p2.
function PointToSegmentDist(p1, p2, p) {
  var t = ProjectPointToLine(p1, p2, p);
  if (t < 0)
    t = 0;
  else if (t > 1)
    t = 1;
  var lx = p1.x + t * (p2.x - p1.x), ly = p1.y + t * (p2.y - p1.y);
  var dx = p.x - lx, dy = p.y - ly;
  return Math.sqrt(dx * dx + dy * dy);
}

function HitCurveSegment(p1, p2, p3, p4, p) {
  var curves = new LinkedList();
  curves.pushFront([p1, p2, p3, p4]);
  var dMin = Number.MAX_VALUE;
  var closestX, closestY;
  while (curves.length > 0) {
    var curve = curves.popBack().value;
    // Get control point distances from the segment defined by the curve endpoints.
    var d1 = PointToLineDist(curve[0], curve[3], curve[1]);
    var d2 = PointToLineDist(curve[0], curve[3], curve[2]);
    var curvature = Math.max(d1, d2);
    // Get p distance from the segment.
    var t = ProjectPointToLine(curve[0], curve[3], p);
    var projX = curve[0].x + t * (curve[3].x - curve[0].x),
        projY = curve[0].y + t * (curve[3].y - curve[0].y);
    var dx = p.x - projX, dy = p.y - projY;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d - curvature > hitTolerance)
      continue;
    if (curvature <= hitTolerance) {
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
  if (dMin < hitTolerance)
    return { x: closestX, y: closestY };
  // Otherwise, return nothing.
}

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

  return [p1, newC1, newC2, p2];
}

function boardVisit(item, enter_fn, exit_fn, item_fn) {
  enter_fn(item);
  item_fn(item);
  var items = item.items;
  if (items) {
    var num_items = items.length;
    for (var i = 0; i < num_items; i++)
      boardVisit(items[i], enter_fn, exit_fn, item_fn);
  }
  exit_fn(item);
}

function boardReverseVisit(item, enter_fn, exit_fn, item_fn) {
  enter_fn(item);
  var items = item.items;
  if (items) {
    var num_items = items.length;
    for (var i = num_items - 1; i >= 0; i--)
      boardReverseVisit(items[i], enter_fn, exit_fn, item_fn);
  }
  item_fn(item);
  exit_fn(item);
}

function board_delete(root) {
  boardVisit(
    root,
    function(item) {},
    function(item) {},
    function(item) {
      if (item.items) {
        var i = 0;
        while (i < item.items.length) {
          if (item.items[i]._selected) {
            item.items.splice(i, 1);
          } else {
            i++;
          }
        }
      }
    });
}

function board_open(root) {
  boardVisit(
    root,
    function(item) {},
    function(item) {},
    function(item) {
      item._open = item._selected;
    });
}

function clear_selection(root) {
  boardVisit(
      root,
      function(item) {},
      function(item) {},
      function(item) {
        item._selected = false;
        item._contentSelected = false;
        item._open = false;
      });
}

function boardSelectAll(root) {
  boardVisit(
      root,
      function(item) {},
      function(item) {},
      function(item) {
        item._selected = true;
      });
}

var next_id = 1000;

function clone(obj) {
  if (null == obj || "object" != typeof obj)
    return obj;

  var copy = obj.constructor();
  copy.id = next_id++;

  for (var attr in obj) {
    // Skip internal attributes.
    if (attr.toString().charAt(0) == "_")
      continue;
    if (obj.hasOwnProperty(attr))
      copy[attr] = clone(obj[attr]);
  }
  return copy;
}

var boardScrap = [];

function board_copy(root) {
  boardVisit(
      root,
      function(item) {},
      function(item) {},
      function(item) {
        if (item._selected)
          scrap.push(clone(item));
      });
}

function board_cut(root) {
  board_copy(root);
  board_delete(root);
}

function board_paste() {
  for (var i = 0; i < boardScrap.length; i++) {
    boardScrap[i].x += 32;
    boardScrap[i].y += 32;
    shape_data.items.push(clone(boardScrap[i]));
  }
  update_links(shape_data);
}

var knobbySize = 5;

function draw_board(root, ctx) {
  ctx.fillStyle = '#6666cc';
  ctx.strokeStyle = '#F0F0F0';
  ctx.lineJoin = 'round'

  boardVisit(
      root,
      function(item) {
        ctx.save();
        ctx.translate(item.x, item.y);
      },
      function(item) {
        ctx.restore();
      },
      function(item) {
        switch (item.type) {
          case "path":
            ctx.beginPath();
            // Start at first point of first curve segment.
            ctx.moveTo(item._curves[0][0].x, item._curves[0][0].y);
            for (var i = 0; i < item._curves.length; i++) {
              var seg = item._curves[i];
              ctx.bezierCurveTo(seg[1].x, seg[1].y, seg[2].x, seg[2].y, seg[3].x, seg[3].y);
            }
            ctx.lineWidth = 2;
            ctx.stroke();
            if (item._open) {
              for (var i = 0; i < item.points.length; i++) {
                var pi = item.points[i];
                ctx.strokeRect(pi.x - knobbySize, pi.y - knobbySize, 2 * knobbySize, 2 * knobbySize);
              }
            }
            break;
        }
      });

  var bounds = get_selection_bounds(root);
  ctx.strokeStyle = '#40F040';
  var x1 = bounds.left - 8, y1 = bounds.top - 8, x2 = bounds.right + 8, y2 = bounds.bottom + 8;
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  // ctx.strokeRect(x2 - knobbySize, y2 - knobbySize, 2 * knobbySize, 2 * knobbySize);
  // ctx.strokeRect(x2 - knobbySize, (y1 + y2) / 2 - knobbySize, 2 * knobbySize, 2 * knobbySize);
}

function get_selection_bounds(root) {
  var bounds = {};
  var tx = 0, ty = 0;
  boardVisit(
      root,
      function(item) {
        tx += item.x;
        ty += item.y;
      },
      function(item) {
        tx -= item.x;
        ty -= item.y;
      },
      function(item) {
        if (!item._selected)
          return;
        switch (item.type) {
          case "path":
            for (var i = 0; i < item._curves.length; i++) {
              var ci = item._curves[i];
              Box2d.extend(bounds, tx + ci[0].x, ty + ci[0].y);
              Box2d.extend(bounds, tx + ci[1].x, ty + ci[1].y);
              Box2d.extend(bounds, tx + ci[2].x, ty + ci[2].y);
            }
            break;
        }
      });
  return bounds;
}

function hit_board(root, ctx, px, py) {
  p = { x: px, y: py };
  var hitInfo = {};
  boardReverseVisit(
      root,
      function(item) {
        p.x -= item.x;
        p.y -= item.y;
      },
      function(item) {
        p.x += item.x;
        p.y += item.y;
      },
      function(item) {
        if (hitInfo.item)
          return;
        switch (item.type) {
          case "path":
            for (var i = 0; i < item._curves.length; i++) {
              var curve = item._curves[i];
              if (HitCurveSegment(curve[0], curve[1], curve[2], curve[3], p)) {
                hitInfo.item = item;
                hitInfo.part = "position";
              }
            }
            if (item._open) {
              for (var i = 0; i < item.points.length; i++) {
                var pi = item.points[i];
                if (Math.abs(p.x - pi.x) <= knobbySize + hitTolerance && Math.abs(p.y - pi.y) <= knobbySize + hitTolerance) {
                  hitInfo.item = item;
                  hitInfo.part = "point";
                  hitInfo.index = i;
                }
              }
            }
            break;
        }
      });
  return hitInfo;
}

var click_x;
var click_y;

var palette_item;

function begin_drag_board(root, hitInfo, mouse_x, mouse_y) {
  click_x = mouse_x;
  click_y = mouse_y;

  boardVisit(
      root,
      function(item) {},
      function(item) {},
      function(item) {
        item._x = item.x;
        item._y = item.y;
        switch (item.type) {
          case "path":
            item._points = [];
            for (var i = 0; i < item.points.length; i++) {
              var pi = item.points[i];
              item._points.push({ x: pi.x, y: pi.y });
            }
            break;
        }
        if (item.palette && item._selected) {
          item._selected = false;
          item = clone(item);
          item.palette = false;
          item._selected = true;
          item.id = next_id++;
          shape_data.items.push(item);
          palette_item = item;
        }
      });
}

function end_drag_board(root, ctx, mouse_x, mouse_y) {
  if (palette_item) {
    shape_data.items.pop();
    var item = palette_item;
    var parent = shape_data;
    var hitInfo = hit_board(root, ctx, mouse_x, mouse_y);
    if (hitInfo.item) {
      var ancestor = hitInfo.item;
      while (ancestor) {
        console.log(ancestor);
        if (ancestor.type == "board" || ancestor.type == "group") {
          item.x -= ancestor.x;
          item.y -= ancestor.y;
          parent = ancestor;
          break;
        }
        ancestor = ancestor._parent;
      }
    }

    // if (parent.type == "board") {
    //   var shape = {
    //     type: "hull_shape",
    //     id: next_id++,
    //     x: item.x,
    //     y: item.y,
    //     items: [],
    //   };
    //   shape.items.push(item);
    //   item.x = 0;
    //   item.y = 0;
    //   item = shape;
    // }

    parent.items.push(item);
    update_geometry(shape_data);
    palette_item = null;
  }
}

function drag_board(root, hitInfo, mouse_x, mouse_y) {
  boardVisit(
      root,
      function(item) {
        click_x -= item._x;
        click_y -= item._y;
        mouse_x -= item._x;
        mouse_y -= item._y;
      },
      function(item) {
        click_x += item._x;
        click_y += item._y;
        mouse_x += item._x;
        mouse_y += item._y;
      },
      function(item) {
        if (!item._selected)
          return;
        var mouse_dx = mouse_x - click_x, mouse_dy = mouse_y - click_y;
        switch (item.type) {
          case "path":
            if (hitInfo.part == "position") {
              item.x = item._x + mouse_dx;
              item.y = item._y + mouse_dy;
            } else if (hitInfo.part == "point") {
              var pt = item.points[hitInfo.index];
              var oldPt = item._points[hitInfo.index];
              pt.x = oldPt.x + mouse_dx;
              pt.y = oldPt.y + mouse_dy;
            }
            break;
        }
      });
}

function board_group(root) {
  var items = [];
  var paths = [];
  var tx = 0, ty = 0;
  boardVisit(
      root,
      function(item) {
        tx += item.x;
        ty += item.y;
      },
      function(item) {
        tx -= item.x;
        ty -= item.y;
      },
      function(item) {
        if (!item._selected)
          return;
        switch (item.type) {
          case "path":
            items.push(item);
            // translate points
            var path = [];
            for (var i = 0; i < item.points.length; i++) {
              var pi = item.points[i];
              path.push({ X: pi.x + tx, Y: pi.y + ty });
            }
            paths.push(path);
            break;
        }
      });
  if (items.length < 2)
    return;
  console.log(items);
  console.log(paths);

  var clipper = new ClipperLib.Clipper(), solution = new ClipperLib.Path();
  var item = items[0];
  var path = paths[0];
  for (var i = 0; i < item.points.length; i++)
    solution.push(path[i]);
  ClipperLib.JS.ScaleUpPath(solution, 1000);
  clipper.AddPath(solution, ClipperLib.PolyType.ptSubject, true);

  for (var i = 1; i < items.length; i++) {
    var item = items[i];
    var path = paths[i];
    solution = new ClipperLib.Path();
    for (var j = 0; j < item.points.length; j++)
      solution.push(path[j]);
    ClipperLib.JS.ScaleUpPath(solution, 1000);
    clipper.AddPath(solution, ClipperLib.PolyType.ptClip, true);

    clipper.Execute(ClipperLib.ClipType.ctUnion, solution);
    ClipperLib.JS.ScaleDownPaths(solution, 1000);

    if (solution) {
      var new_item = {
        type: "path",
        id: next_id++,
        x: 192,
        y: 192,
        points: [],
      }
      for (var i = 0; i < solution.length; i++) {
        var path = solution[i];
        for (var j = 0; j < path.length; j++) {
          var pi = path[j];
          new_item.points.push({ x: pi.X, y: pi.Y });
        }
      }
      board_delete(root);
      new_item._selected = true;
      new_item._open = true;
      root.items.push(new_item);
    }
  }
}

function update_links(root) {
  var path = new Array();
  boardVisit(
    root,
    function(item) {
      path.push(item);
    },
    function(item) {
      path.pop(item);
    },
    function(item) {
      item._parent = path.length > 1 ? path[path.length - 2] : null;
    });
}

function update_geometry(root) {
  boardVisit(
      root,
      function(item) {},
      function(item) {},
      function(item) {
        switch (item.type) {
          case "path":
            // Convert points to curves.
            item._curves = [];
            var length = item.points.length;
            var i0 = length - 1;
            for (var i = 0; i < length; i++) {
              var p0 = item.points[i0];
              var p1 = item.points[i];
              var p2 = item.points[(i + 1) % length];
              var p3 = item.points[(i + 2) % length];
              item._curves.push(GetCurveSegment(p0, p1, p2, p3));
              i0 = i;
            }
            break;
        }
      });
}


var shape_data = {
  type: "board",
  id: 0,
  x: 0,
  y: 0,
  items: [
    {
      type: "path",
      id: 1,
      x: 56,
      y: 56,
      points: [
        { x: 32, y: 0 },
        { x: 64, y: 32 },
        { x: 32, y: 64 },
        { x: 0, y: 32 },
      ],
      palette: true,
    },
    {
      type: "path",
      id: 2,
      x: 200,
      y: 32,
      points: [
        { x: 32, y: 0 },
        { x: 64, y: 32 },
        { x: 32, y: 64 },
        { x: 0, y: 32 },
      ],
    },
  ]
};



