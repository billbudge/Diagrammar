// TODO properly namespace

var next_id = 1000;
var point_radius = 32;
var knobby_item_size = 16;

function clone(obj) {
    if (null == obj || "object" != typeof obj)
      return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr))
        copy[attr] = obj[attr];
    }
    return copy;
}

function ref_equal(obj1, obj2) {
  // NOTE two null refs aren't considered equal.
  return obj1 && obj2 && obj1.id == obj2.id;
}

function HitLine(x1, y1, x2, y2, px, py) {
  var p1_p2_x = x2 - x1, p1_p2_y = y2 - y1;
  var p1_p_x = px - x1, p1_p_y = py - y1;
  var p1_p2_squared = p1_p2_x * p1_p2_x + p1_p2_y * p1_p2_y;
  var p1_p_dot_p1_p2 = p1_p_x * p1_p2_x + p1_p_y * p1_p2_y;
  var t = p1_p_dot_p1_p2 / p1_p2_squared;
  if (t < 0 || t > 1)
    return false;
  var lx = x1 + p1_p2_x * t, ly = y1 + p1_p2_y * t;
  var p_l_x = px - lx, p_l_y = py - ly;
  if (p_l_x * p_l_x + p_l_y * p_l_y > hitTolerance * hitTolerance)
    return false;
  return true;
}


function forms_visit(item, enter_fn, exit_fn, item_fn) {
  enter_fn(item);
  item_fn(item);
  var items = item.items;
  if (items) {
    var num_items = items.length;
    for (var i = 0; i < num_items; i++)
      forms_visit(items[i], enter_fn, exit_fn, item_fn);
  }
  exit_fn(item);
}

function forms_reverse_visit(item, enter_fn, exit_fn, item_fn) {
  enter_fn(item);
  var items = item.items;
  if (items) {
    var num_items = items.length;
    for (var i = num_items - 1; i >= 0; i--)
      forms_reverse_visit(items[i], enter_fn, exit_fn, item_fn);
  }
  item_fn(item);
  exit_fn(item);
}

function forms_delete_selected(board) {
  forms_visit(
      board,
      function(item) {},
      function(item) {},
      function(item) {
        if (item.items) {  // FIXME use _parent
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

function copy_forms(board) {
  var clones = [];
  forms_visit(
      board,
      function(item) {},
      function(item) {},
      function(item) {
        if (item._selected)
          clones.push(clone(item));
      });
  return clones;
}

function point_on_point(x, y, point) {
  var dx = x - point.x, dy = y - point.y;
  if (dx * dx + dy * dy < point_radius * point_radius)
    return true;
  return false;
}

function forms_group(board) {
  var bbox = new Box2d();
  var master = {
    _items: [],
    _points: [],
    _knobbies: [],
    _primitives: [],
  }
  forms_visit(
      board,
      function(item) {},
      function(item) {},
      function(item) {
        if (!item._selected || item.type == "workspace")  // FIXME
          return;
        bbox.extend(item.x, item.y);
        switch (item.type) {
          case "point":
            item._index = master._points.length;
            master._points.push(item);
            break;
          case "knobby":
            master._knobbies.push(item);
            break;
          case "segment":
            bbox.extend(item.x + item.dx, item.y + item.dy);
            master._primitives.push(item);
            break;
        }
        master._items.push(item);
      });

  // Associate knobbies with points.
  for (var i = 0; i < master._knobbies.length; i++) {
    var knobby = master._knobbies[i];
    for (var j = 0; j < master._points.length; j++) {
      var point = master._points[j];
      if (point_on_point(knobby.x, knobby.y, point)) {
        knobby._p1 = point;
      }
    }
  }
  // Associate drawing primitives with points.
  for (var i = 0; i < master._primitives.length; i++) {
    var primitive = master._primitives[i];
    for (var j = 0; j < master._points.length; j++) {
      var point = master._points[j];
      switch (primitive.type) {
        case "segment":
          if (point_on_point(primitive.x, primitive.y, point)) {
            primitive._p1 = point;
          }
          if (point_on_point(primitive.x + primitive.dx, primitive.y + primitive.dy, point)) {
            primitive._p2 = point;
          }
          break;
      }
    }
  }

  var cx = (bbox.left + bbox.right) / 2, cy = (bbox.top + bbox.bottom) / 2;
  var instance = {
    type: "group",
    master: master,
    x: cx,
    y: cy,
  };
  instance._positions = [];
  for (var i = 0; i < master._points.length; i++) {
    var point = master._points[i];
    instance._positions.push(new Vec2d(point.x - cx, point.y - cy));
  }
  return instance;
}

var knobbySize = 3;
var segment_end_size = 8;

function draw_forms(root, ctx) {
  ctx.fillStyle = '#7777cc';
  // Draw base layer.
  forms_visit(
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
          case "point":
            ctx.beginPath();
            ctx.arc(0, 0, point_radius, 0, 2 * Math.PI, false);
            ctx.fill();
            break;
        }
      });
  // Draw second layer.
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#F0F0F0';
  ctx.lineJoin = 'round'
  forms_visit(
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
          case "knobby":
            ctx.fillRect(-knobby_item_size / 2, -knobby_item_size / 2, knobby_item_size, knobby_item_size);
            ctx.strokeRect(-knobby_item_size / 2, -knobby_item_size / 2, knobby_item_size, knobby_item_size);
            break;
          case "segment":
            var dx = item.dx, dy = item.dy;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(dx, dy);
            ctx.stroke();
            ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
            ctx.strokeRect(dx - segment_end_size, dy - segment_end_size, 2 * segment_end_size, 2 * segment_end_size);
            break;
          case "group":
            ctx.beginPath();
            var master = item.master;
            var positions = item._positions;
            var p;
            for (var i = 0; i < master._primitives.length; i++) {
              var primitive = master._primitives[i];
              switch (primitive.type) {
                case "segment":
                  p = positions[primitive._p1._index];
                  ctx.moveTo(p.x, p.y);
                  p = positions[primitive._p2._index];
                  ctx.lineTo(p.x, p.y);
                  break;
              }
            }
            ctx.stroke();
            break;
          // case "curve2":
          //   var dx1 = item.dx1, dy1 = item.dy1, dx2 = item.dx2, dy2 = item.dy2;
          //   ctx.beginPath();
          //   ctx.moveTo(0, 0);
          //   ctx.quadraticCurveTo(dx1, dy1, (dx2 + dx1) / 2, (dy2 + dy1) / 2);
          //   ctx.stroke();
          //   ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
          //   ctx.strokeRect(dx1 - knobbySize, dy1 - knobbySize, 2 * knobbySize, 2 * knobbySize);
          //   ctx.strokeRect(dx2 - knobbySize, dy2 - knobbySize, 2 * knobbySize, 2 * knobbySize);
          //   break;
        }
      });
}

function hilite_forms(root, ctx) {
  ctx.fillStyle = '#40F040';
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#40F040';
  forms_visit(
      root,
      function(item) {
        ctx.save();
        ctx.translate(item.x, item.y);
      },
      function(item) {
        ctx.restore();
      },
      function(item) {
        if (!item._selected)
          return;
        switch (item.type) {
          case "point":
            ctx.beginPath();
            ctx.arc(0, 0, point_radius, 0, 2 * Math.PI, false);
            ctx.stroke();
            break;
          case "knobby":
            ctx.strokeRect(-knobby_item_size / 2, -knobby_item_size / 2, knobby_item_size, knobby_item_size);
            break;
          case "segment":
            var dx = item.dx, dy = item.dy;
            ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
            ctx.strokeRect(dx - segment_end_size, dy - segment_end_size, 2 * segment_end_size, 2 * segment_end_size);
            break;
          case "group":
            var master = item.master;
            var positions = item._positions;
            var p;
            for (var i = 0; i < master._knobbies.length; i++) {
              var knobby = master._knobbies[i];
              p = positions[knobby._p1._index];
              ctx.strokeRect(p.x - knobbySize, p.y - knobbySize, 2 * knobbySize, 2 * knobbySize);
            }
            break;
          // case "curve2":
          //   var dx1 = item.dx1, dy1 = item.dy1, dx2 = item.dx2, dy2 = item.dy2;
          //   ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
          //   ctx.strokeRect(dx1 - knobbySize, dy1 - knobbySize, 2 * knobbySize, 2 * knobbySize);
          //   ctx.strokeRect(dx2 - knobbySize, dy2 - knobbySize, 2 * knobbySize, 2 * knobbySize);
          //   break;
        }
      });
}

function get_forms_selection_bounds(root) {
  var bounds = new Box2d();
  var tx = 0, ty = 0;
  forms_visit(
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
        var x, y;
        if (!item._selected)
          return;
        switch (item.type) {
          case "point":
            bounds.extend(tx - point_radius, ty - point_radius);
            bounds.extend(tx + point_radius, ty + point_radius);
            break;
          case "knobby":
            x = tx - knobby_item_size / 2;
            y = ty - knobby_item_size / 2;
            bounds.extend(x, y);
            bounds.extend(x + knobby_item_size, y + knobby_item_size);
            break;
          case "segment":
            var dx = item.dx, dy = item.dy;
            bounds.extend(tx, ty);
            bounds.extend(tx + dx, ty + dy);
            break;
          case "group":
            for (var i = 0; i < item._positions.length; i++) {
              var p = item._positions[i];
              bounds.extend(tx + p.x, ty + p.y);
            }
            break;
          // case "curve2":
          //   var dx1 = item.dx1, dy1 = item.dy1, dx2 = item.dx2, dy2 = item.dy2;
          //   bounds.extend(tx, ty);
          //   bounds.extend(tx + dx1, ty + dy1);
          //   bounds.extend(tx + dx2, ty + dy2);
          //   break;
        }
      });
  return bounds;
}

function hit_forms(root, ctx, px, py) {
  var hitInfo = {};
  forms_reverse_visit(
      root,
      function(item) {
        px -= item.x;
        py -= item.y;
      },
      function(item) {
        px += item.x;
        py += item.y;
      },
      function(item) {
        if (hitInfo.item)
          return;
        var x, y, dx, dy, dist_squared;
        switch (item.type) {
          case "point":
            dist_squared = px * px + py * py;
            var outer = point_radius + hitTolerance;
            if (dist_squared <= outer * outer) {
              hitInfo.item = item;
              hitInfo.part = "position";
            }
            break;
          case "knobby":
            x = -knobby_item_size / 2;
            y = -knobby_item_size / 2;
            if (px >= x - hitTolerance && px <= x + knobby_item_size + hitTolerance &&
                py >= y - hitTolerance && py <= y + knobby_item_size + hitTolerance) {
              hitInfo.item = item;
              hitInfo.part = "position";
            }
            break;
          case "segment":
            dx = item.dx; dy = item.dy;
            if (Math.abs(px) <= knobbySize + hitTolerance && Math.abs(py) <= knobbySize + hitTolerance) {
              hitInfo.item = item;
              hitInfo.part = "p1";
            } else if (Math.abs(px - dx) <= segment_end_size + hitTolerance && Math.abs(py - dy) <= segment_end_size + hitTolerance) {
              hitInfo.item = item;
              hitInfo.part = "p2";
            } else if (HitLine(0, 0, dx, dy, px, py)) {
              hitInfo.item = item;
              hitInfo.part = "position";
            }
            break;
          case "group":
            var master = item.master;
            var positions = item._positions;
            var p1, p2;
            for (var i = 0; i < master._knobbies.length; i++) {
              var knobby = master._knobbies[i];
              p1 = positions[knobby._p1._index];
              if (Math.abs(px - p1.x) <= knobbySize + hitTolerance && Math.abs(py - p1.y) <= knobbySize + hitTolerance) {
                hitInfo.item = item;
                hitInfo.part = "knobby";
                hitInfo.index = i;
              }
            }
            if (!hitInfo.item) {
              for (var i = 0; i < master._primitives.length; i++) {
                var primitive = master._primitives[i];
                switch (primitive.type) {
                  case "segment":
                    p1 = positions[primitive._p1._index];
                    p2 = positions[primitive._p2._index];
                    if (HitLine(p1.x, p1.y, p2.x, p2.y, px, py)) {
                      hitInfo.item = item;
                      hitInfo.part = "position";
                    }
                    break;
                }
              }
            }
            break;
        }
      });
  return hitInfo;
}

function forms_select_all(root) {
  forms_visit(
      root,
      function(item) {},
      function(item) {},
      function(item) {
        item._selected = true;
      });
}

function clear_forms_selection(root) {
  forms_visit(
      root,
      function(item) {},
      function(item) {},
      function(item) {
        item._selected = false;
      });
}

var click_x;
var click_y;

function begin_drag_forms(root, hitInfo, mouse_x, mouse_y) {
  click_x = mouse_x;
  click_y = mouse_y;

  forms_visit(
      root,
      function(item) {},
      function(item) {},
      function(item) {
        if (item.palette && item._selected) {
          item._selected = false;
          item = clone(item);
          item.palette = false;
          item._selected = true;
          item.id = next_id++;
          shape_data.items.push(item);
        }
        item._x = item.x;
        item._y = item.y;
        switch (item.type) {
          case "segment":
            item._dx = item.dx;
            item._dy = item.dy;
            break;
          case "group":
            item._old_positions = [];
            for (var i = 0; i < item._positions.length; i++) {
              var p = item._positions[i];
              item._old_positions.push(new Vec2d(p.x, p.y));
            }
        }
      });
}

function drag_forms(root, hitInfo, mouse_x, mouse_y) {
  forms_visit(
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
        var r, dist_squared;
        var mouse_dx = mouse_x - click_x, mouse_dy = mouse_y - click_y;
        switch (item.type) {
          case "point":
          case "knobby":
            item.x = item._x + mouse_dx;
            item.y = item._y + mouse_dy;
            break;
          case "segment":
            if (hitInfo.part === "p1") {
              item.x = item._x + mouse_dx;
              item.y = item._y + mouse_dy;
              item.dx = item._dx - mouse_dx;
              item.dy = item._dy - mouse_dy;
            } else if (hitInfo.part === "p2") {
              item.dx = item._dx + mouse_dx;
              item.dy = item._dy + mouse_dy;
            } else if (hitInfo.part == "position") {
              item.x = item._x + mouse_dx;
              item.y = item._y + mouse_dy;
            }
            break;
          case "group":
            if (hitInfo.part == "position") {
              item.x = item._x + mouse_dx;
              item.y = item._y + mouse_dy;
            } else if (hitInfo.part == "knobby") {
              var i = hitInfo.index;
              item._positions[i].x = item._old_positions[i].x + mouse_dx;
              item._positions[i].y = item._old_positions[i].y + mouse_dy;
            }
            break;
          // // Shapes can be dragged, but not boards.
          // case "hull_shape":
          // case "diff_shape":
          //   item.x = item._x + mouse_dx;
          //   item.y = item._y + mouse_dy;
          //   break;
        }
      });
}

function update_links(root) {
  var path = new Array();
  forms_visit(
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

// Paths are computed in the local space of the item, translated when combining.
function update_geometry(root) {
  forms_visit(
      root,
      function(item) {},
      function(item) {
        var points = new Array();
        var dx, dy, dist_squared, dist;
        switch (item.type) {
          // case "hull_shape":
          // case "diff_shape":
          //   for (var i = 0; i < item.items.length; i++) {
          //     var sub_item = item.items[i];
          //     if (sub_item.type !== "diff_shape") {
          //       for (var j = 0; j < sub_item._paths.length; j++) {
          //         var path = sub_item._paths[j];
          //         for (var k = 0; k < path.length; k++)
          //           points.push(new Vec2d(sub_item.x + path[k].x, sub_item.y + path[k].y));
          //       }
          //     }
          //   }
          //   var hull = getConvexHull(points);
          //   var path = new Array();
          //   for (var i = 0; i < hull.length; i++)
          //     path.push(hull[i].p1);
          //   item._paths = new Array();
          //   item._paths.push(path);

          //   var clipper, solution;
          //   for (var i = 0; i < item.items.length; i++) {
          //     var sub_item = item.items[i];
          //     if (sub_item.type === "diff_shape") {
          //       if (!clipper)
          //         clipper = new ClipperLib.Clipper();

          //       for (var j = 0; j < item._paths.length; j++) {
          //         var path = item._paths[j];
          //         solution = new ClipperLib.Path();
          //         for (var k = 0; k < path.length; k++) {
          //           var p = path[k];
          //           solution.push({X: p.x, Y: p.y});
          //         }
          //       ClipperLib.JS.ScaleUpPath(solution, 1000);
          //         clipper.AddPath(solution, ClipperLib.PolyType.ptSubject, true);
          //       }
          //       for (var j = 0; j < sub_item._paths.length; j++) {
          //         var path = sub_item._paths[j];
          //         var diff = new ClipperLib.Path();
          //         for (var k = 0; k < path.length; k++) {
          //           var p = path[k];
          //           diff.push({X: p.x + sub_item.x, Y: p.y + sub_item.y});
          //         }
          //         ClipperLib.JS.ScaleUpPath(diff, 1000);
          //         clipper.AddPath(diff, ClipperLib.PolyType.ptClip, true);
          //       }
          //       clipper.Execute(ClipperLib.ClipType.ctDifference, solution);
          //       ClipperLib.JS.ScaleDownPaths(solution, 1000);
          //     }
          //   }
          //     // for (var j = 0; j < path.length; j++) {
          //     //   var p1 = path[j];
          //     //   var p2 = path[(j + 1) % path.length];
          //     //   var dx1 = p0.x - p1.x, dy1 = p0.y - p1.y;
          //     //   var dx2 = p2.x - p1.x, dy2 = p2.y - p1.y;
          //     //   var dot = dx1 * dx2 + dy1 * dy2;
          //     //   var cos = dot / (Math.sqrt((dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2)));
          //     //   // ctx.lineTo(p1.x + dx1 / 2, p1.y + dy1 / 2);
          //     //   // ctx.moveTo(p1.x, p1.y);
          //     //   ctx.lineTo(p1.x, p1.y);
          //     //   p0 = p1;
          //     //   // if (cos > -.9) {
          //     //   //   var scale = 16 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
          //     //   //   ctx.lineTo(p1.x + dy1 * scale, p1.y - dx1 * scale);
          //     //   //   ctx.moveTo(p1.x, p1.y);
          //     //   // }
          //     // }

          //   if (solution) {
          //     item._paths = new Array();
          //     for (var i = 0; i < solution.length; i++) {
          //       var solution_path = solution[i];
          //       var path = new Array();
          //       var new_p, last_p;
          //       for (var j = 0; j < solution_path.length; j++) {
          //         var p = solution_path[j];
          //         new_p = new Vec2d(p.X, p.Y);
          //         // if (j > 0) {
          //         //   var dx = last_p.x - new_p.x, dy = last_p.y - new_p.y;
          //         //   if (dx * dx + dy * dy < 2)
          //         //     continue;
          //         // }
          //         path.push(new_p);
          //         last_p = new_p;
          //       }
          //       item._paths.push(path);
          //     }
          //   }
          //   break;
        }
      },
      function(item) {
        // var path = new Array();
        // switch (item.type) {
        //   case "point":
        //     var subdivide = 64;//Math.sqrt(r) * 16;
        //     for (var i = 0; i < subdivide; i++) {
        //       var xi = r * Math.cos(2 * Math.PI * i / subdivide);
        //       var yi = r * Math.sin(2 * Math.PI * i / subdivide);
        //       path.push(new Vec2d(xi, yi));
        //     }
        //     break;
        //   case "segment":
        //     path.push(new Vec2d(0, 0));
        //     path.push(new Vec2d(item.dx, item.dy));
        //     break;
        // }
        // item._paths = new Array();
        // item._paths.push(path);
      });
}


var shape_data = {
  type: "workspace",
  x: 0,
  y: 0,
  items: [
    {
      type: "point",
      x: 40,
      y: 40,
      palette: true,
    },
    {
      type: "knobby",
      x: 36,
      y: 90,
      palette: true,
    },
    {
      type: "segment",
      x: 8,
      y: 110,
      dx: 56,
      dy: 0,
      palette: true,
    },
    {
      type: "construct",
      x: 8,
      y: 130,  // TODO
    }
    {
      type: "point",
      id: 1,
      x: 216,
      y: 96,
    },
    {
      type: "point",
      id: 2,
      x: 364,
      y: 96,
    },
    {
      type: "point",
      id: 3,
      x: 292,
      y: 200,
    },

    // {
    //   type: "segment",
    //   id: 15,
    //   x: 140,
    //   y: 130,
    //   dx: 32,
    //   dy: 96,
    // },
  ]
};



