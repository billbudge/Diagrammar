// Pinball shapes module.

'use strict';

var shapeEditors = (function() {

  // Utilities.

  function visit(item, itemFn) {
    itemFn(item);
    var items = item.items;
    if (items) {
      var length = items.length;
      for (var i = 0; i < length; i++)
        visit(items[i], itemFn);
    }
  }

  function reverseVisit(item, itemFn) {
    var items = item.items;
    if (items) {
      var length = items.length;
      for (var i = length - 1; i >= 0; i--)
        reverseVisit(items[i], itemFn);
    }
    itemFn(item);
  }

  function isHullItem(item) {
    return item.type == 'disk';
  }

  function isHullEdgeItem(item) {
    return item.type == 'linear' || item.type == 'bezier';
  }

  function isPaletteItem(item) {
    return item._palette;
  }

//------------------------------------------------------------------------------

  var editingModel = (function() {
    var functions = {
      reduceSelection: function() {
        this.model.hierarchicalModel.reduceSelection();
      },

      deleteItem: function(item) {
        var model = this.model,
            parent = model.hierarchicalModel.getParent(item);
        if (parent) {
          var items = parent.items;
          var length = items.length;
          for (var i = 0; i < length; i++) {
            var subItem = items[i];
            if (subItem === item) {
              model.observableModel.removeElement(parent, items, i);
              break;
            }
          }
        }
      },

      deleteItems: function(items) {
        var self = this;
        items.forEach(function(item) {
          self.deleteItem(item);
        })
      },

      doDelete: function() {
        this.reduceSelection();
        this.prototype.doDelete.call(this);
      },

      copyItems: function(items, map) {
        var self = this,
            copies = this.prototype.copyItems(items, map);

        items.forEach(function(item) {
          var copy = map.find(self.model.dataModel.getId(item));
          // if (isState(copy)) {
          //   var wp = self.renderer.getPosition(item);
          //   copy.x = wp.x;
          //   copy.y = wp.y;
          // }
        });
        return copies;
      },

      doCopy: function() {
        var selectionModel = this.model.selectionModel;
        this.reduceSelection();
        selectionModel.contents().forEach(function(item) {
          // if (!isState(item))
          //   selectionModel.remove(item);
        });
        this.prototype.doCopy.call(this);
      },

      addItems: function(items) {
        var model = this.model, board = this.board,
            boardItems = board.items;
        items.forEach(function(item) {
          boardItems.push(item);
          model.selectionModel.add(item);
          model.observableModel.onElementInserted(board, boardItems, boardItems.length - 1);
        });
      },

      doPaste: function() {
        this.getScrap().forEach(function(item) {
          // if (isState(item)) {
          //   item.x += 16;
          //   item.y += 16;
          // }
        });
        this.prototype.doPaste.call(this);
      },

      addTemporaryItem: function(item) {
        var model = this.model,
            board = model.root,
            items = board.items;
        model.observableModel.insertElement(board, items, items.length, item);
      },

      removeTemporaryItem: function() {
        var model = this.model,
            board = model.root,
            items = board.items;
        return model.observableModel.removeElement(board, items, items.length - 1);
      },


      addItem: function(item, oldParent, parent) {
        var model = this.model;
        if (oldParent === parent)
          return;
        var transformableModel = model.transformableModel;
        if (oldParent) {          // if null, it's a new item.
          geometry.matMulVec(item, transformableModel.getAbsolute(oldParent));
          this.deleteItem(item);  // notifies observer
        }

        geometry.matMulVec(item, transformableModel.getInverseAbsolute(parent));

        // if (item.type == 'bezier') {
        //   autoRotateBezier(item);
        // }
        model.observableModel.insertElement(parent, parent.items, parent.items.length, item);
      },
    }

    function extend(model) {
      dataModels.dataModel.extend(model);
      dataModels.observableModel.extend(model);
      dataModels.selectionModel.extend(model);
      dataModels.referencingModel.extend(model);
      dataModels.hierarchicalModel.extend(model);
      dataModels.transformableModel.extend(model);
      dataModels.transactionModel.extend(model);
      dataModels.transactionHistory.extend(model);
      dataModels.instancingModel.extend(model);
      dataModels.editingModel.extend(model);

      var instance = Object.create(model.editingModel);
      instance.prototype = Object.getPrototypeOf(instance);
      for (var prop in functions)
        instance[prop] = functions[prop];

      instance.model = model;
      instance.board = model.root;

      model.editingModel = instance;
      return instance;
    }

    return {
      extend: extend,
    }
  })();

//------------------------------------------------------------------------------

  function Renderer(model, ctx, theme) {
    this.model = model;
    this.ctx = ctx;

    this.knobbySize = 4;

    if (!theme)
      theme = diagrams.theme.create();
    this.theme = theme;
    this.bgColor = theme.bgColor;
    this.strokeColor = theme.strokeColor;

    this.hitTolerance = 8;
  }

  Renderer.prototype.drawItem = function(item) {
    var ctx = this.ctx, knobbySize = this.knobbySize, t = item._atransform;
    ctx.save();
    ctx.transform(t[0], t[2], t[1], t[3], t[4], t[5]); // local to world
    switch (item.type) {
      case 'disk':
        ctx.beginPath();
        var r = item.radius;
        ctx.arc(0, 0, r, 0, 2 * Math.PI, false);
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
        break;
      case 'linear':
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(item.dx, item.dy);
        ctx.stroke();
        var p1 = item._p1, p2 = item._p2;
        if (p1 && p2) {
          ctx.strokeRect(p1.x - knobbySize, p1.y - knobbySize, 2 * knobbySize, 2 * knobbySize);
          ctx.strokeRect(p2.x - knobbySize, p2.y - knobbySize, 2 * knobbySize, 2 * knobbySize);
        }
        break;
      case 'bezier':
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        // Start at first point of first curve segment.
        ctx.moveTo(item._curves[0][0].x, item._curves[0][0].y);
        for (var i = 0; i < item._curves.length; i++) {
          var seg = item._curves[i];
          ctx.bezierCurveTo(seg[1].x, seg[1].y, seg[2].x, seg[2].y, seg[3].x, seg[3].y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-item.halfLength, 0);
        ctx.lineTo(item.halfLength, 0);
        ctx.setLineDash([5]);
        ctx.stroke();
        ctx.setLineDash([0]);
        break;
      case 'group':
        if (!item.op || !item._paths)
          return;
        for (var i = 0; i < item._paths.length; i++) {
          var path = item._paths[i];
          ctx.beginPath();
          var p = path[path.length - 1];
          ctx.moveTo(p.x, p.y);
          for (var j = 0; j < path.length; j++) {
            p = path[j];
            ctx.lineTo(p.x, p.y);
          }
          ctx.lineWidth = 2;
          if (item.diff) {
            ctx.setLineDash([5]);
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.setLineDash([0]);
          } else {
            ctx.fill();
            ctx.stroke();
          }
        }
        break;
    }
    ctx.restore();
  }

  Renderer.prototype.highlightItem = function(item) {
    var ctx = this.ctx, knobbySize = this.knobbySize, t = item._atransform;
    ctx.save();
    ctx.transform(t[0], t[2], t[1], t[3], t[4], t[5]); // local to world
    switch (item.type) {
      case 'disk':
        ctx.beginPath();
        var r = item.radius;
        ctx.arc(0, 0, r, 0, 2 * Math.PI, false);
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
        break;
      case 'linear':
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(item.dx, item.dy);
        ctx.stroke();
        ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
        ctx.strokeRect(item.dx - knobbySize, item.dy - knobbySize, 2 * knobbySize, 2 * knobbySize);
        break;
      case 'bezier':
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Start at first point of first curve segment.
        ctx.moveTo(item._curves[0][0].x, item._curves[0][0].y);
        for (var i = 0; i < item._curves.length; i++) {
          var seg = item._curves[i];
          ctx.bezierCurveTo(seg[1].x, seg[1].y, seg[2].x, seg[2].y, seg[3].x, seg[3].y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-item.halfLength, 0);
        ctx.lineTo(item.halfLength, 0);
        ctx.setLineDash([5]);
        ctx.stroke();
        ctx.setLineDash([0]);
        for (var i = 0; i < item.points.length; i++) {
          var pi = item.points[i];
          ctx.strokeRect(pi.x - knobbySize, pi.y - knobbySize, 2 * knobbySize, 2 * knobbySize);
        }
        ctx.strokeRect(-item.halfLength - 2*knobbySize, -2*knobbySize, 4 * knobbySize, 4 * knobbySize);
        ctx.strokeRect(-knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
        ctx.strokeRect(item.halfLength - knobbySize, -knobbySize, 2 * knobbySize, 2 * knobbySize);
        break;
      case 'group':
        for (var i = 0; i < item._paths.length; i++) {
          var path = item._paths[i];
          if (!path.length)
            continue;
          ctx.beginPath();
          var p = path[path.length - 1];
          ctx.moveTo(p.x, p.y);
          for (var j = 0; j < path.length; j++) {
            p = path[j];
            ctx.lineTo(p.x, p.y);
          }
          ctx.lineWidth = 2;
          if (item.diff) {
            ctx.setLineDash([5]);
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.setLineDash([0]);
          } else {
            ctx.stroke();
          }
        }
        break;
    }
    ctx.restore();
  }

  // function getSelectionBounds(root) {
  //   var bounds = {};
  //   visit(
  //       root,
  //       function(item) {
  //         if (!isSelected(item))
  //           return;
  //         var itemBounds = item._bounds;
  //         var leftTop = { x: itemBounds.left, y: itemBounds.top };
  //         var rightBtm = { x: itemBounds.right, y: itemBounds.bottom };
  //         geometry.matMulVec(leftTop, item._atransform);
  //         geometry.matMulVec(rightBtm, item._atransform);
  //         Box2d.extend(bounds, leftTop.x, leftTop.y);
  //         Box2d.extend(bounds, rightBtm.x, rightBtm.y);
  //       });
  //   return bounds;
  // }

  function firstHit(item, hitInfo) {
    return hitInfo.item;
  }

  Renderer.prototype.hitTestItem = function(item, p) {
    var knobbySize = this.knobbySize, hitTolerance = this.hitTolerance,
        transformableModel = this.model.transformableModel,
        inverseTransform = transformableModel.getInverseAbsolute(item),
        localP = geometry.matMulVecNew(p, inverseTransform),
        hitInfo, r, distSquared;
    switch (item.type) {
      case 'disk':
        r = item.radius;
        hitInfo = diagrams.hitTestDisk(0, 0, r, localP, hitTolerance);
        if (hitInfo) {
          if (diagrams.hitPoint(0, 0, localP, knobbySize)) {
            hitInfo.center = true;
            return hitInfo;
          } else if (hitInfo.border) {
            return hitInfo;
          }
          return null;
        }
        break;
      case 'linear':
        hitInfo = diagrams.hitTestLine(
            { x:0, y:0 }, { x: item.dx, y: item.dy }, localP, hitTolerance);
        return hitInfo;
        break;
      case 'bezier':
        if (Math.abs(localP.x + item.halfLength) <= knobbySize + hitTolerance &&
            Math.abs(localP.y) <= knobbySize + hitTolerance)
          return { end0: true };
        else if (Math.abs(localP.x) <= knobbySize + hitTolerance &&
                 Math.abs(localP.y) <= knobbySize + hitTolerance)
          return { mid: true };
        else if (Math.abs(localP.x - item.halfLength) <= knobbySize + hitTolerance &&
                 Math.abs(localP.y) <= knobbySize + hitTolerance)
          return { end1: true };

        for (var i = 0; i < item.points.length; i++) {
          var pi = item.points[i];
          if (Math.abs(localP.x - pi.x) <= knobbySize + hitTolerance &&
              Math.abs(localP.y - pi.y) <= knobbySize + hitTolerance)
            return { point: true, index: i };
        }
        for (var i = 0; i < item._curves.length; i++) {
          var curve = item._curves[i];
          if (geometry.hitTestCurveSegment(curve[0], curve[1], curve[2], curve[3], localP, hitTolerance))
            return { curve: true, index: i };
        }
        break;
      case 'group':
        if (!item.op || !item._paths)
          return;
        for (var i = 0; i < item._paths.length; i++) {
          var path = item._paths[i];
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (var j = 1; j < path.length; j++)
            ctx.lineTo(path[j].x, path[j].y);
          ctx.closePath();
          if (ctx.isPointInPath(localP.x, localP.y))
            return { position: true };
        }
        break;
    }
  }

//------------------------------------------------------------------------------
//TODO theme should be last
  function Editor(model, theme, canvas, updateFn) {
    var self = this;
    this.model = model;
    this.board = model.root;
    editingModel.extend(model);

    this.canvas = canvas;
    this.updateFn = updateFn;

    this.ctx = canvas.getContext('2d');

    if (!theme)
      theme = diagrams.theme.create();
    var renderer = this.renderer = new Renderer(model, ctx, theme);

    var palette = this.palette = {
      root: {
        type: 'palette',
        x: 0,
        y: 0,
        items: [
          {
            type: 'disk',
            id : 1,
            x: 40,
            y: 40,
            radius: 16,
          },
          {
            type: 'linear',
            id : 2,
            x: 16,
            y: 72,
            dx: 96,
            dy: 0,
          },
          {
            type: 'bezier',
            id: 3,
            x: 64,
            y: 96,
            halfLength: 48,
            points: [
              { x: -24, y: 15 },
              { x: 0, y: 20 },
              { x: 24, y: 15 }
            ],
          },
        ]
      }
    }
    dataModels.observableModel.extend(palette);
    dataModels.hierarchicalModel.extend(palette);
    dataModels.transformableModel.extend(palette);
    this.updateGeometry(palette.root);

    this.mouseController = new diagrams.MouseController();
    this.mouseController.addHandler('beginDrag', function() {
      self.beginDrag();
    });

    // this.validateLayout();
  }

  Editor.prototype.isPaletteItem = function(item) {
    var hierarchicalModel = this.palette.hierarchicalModel;
    return hierarchicalModel.getParent(item) === this.palette.root;
  }

  Editor.prototype.draw = function() {
    var self = this, renderer = this.renderer, ctx = this.ctx;

    this.updateGeometry();

    ctx.save();
    ctx.fillStyle = '#6666cc';
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineJoin = 'round'

    visit(this.board, function(item) {
      renderer.drawItem(item);
    });

    ctx.strokeStyle = '#40F040';
    this.model.selectionModel.forEach(function(item) {
      renderer.highlightItem(item);
    });

    ctx.fillStyle = '#6666cc';
    ctx.strokeStyle = '#F0F0F0';
    this.palette.root.items.forEach(function(item) {
      renderer.drawItem(item);
    })

    ctx.restore();
  }

  function firstHit(item, hitInfo) {
    return hitInfo;
  }

  // function firstUnselectedStateHit(item, hitInfo) {
  //   return hitInfo.item || isSelected(item);
  // }

  Editor.prototype.hitTest = function(p, filterFn) {
    var renderer = this.renderer,
        board = this.board, model = this.model,
        palette = this.palette;
    var hitInfo = null;
    if (!filterFn)
      filterFn = firstHit;

    reverseVisit(palette.root, function(item) {
      if (filterFn(item, hitInfo))
        return;
      hitInfo = renderer.hitTestItem(item, p);
      if (hitInfo)
        hitInfo.item = item;
    });
    if (hitInfo)
      return hitInfo;

    reverseVisit(board, function(item) {
      if (filterFn(item, hitInfo))
        return;
      hitInfo = renderer.hitTestItem(item, p);
      if (hitInfo)
        hitInfo.item = item;
    });
    return hitInfo;
  }

  Editor.prototype.hitTestUnselectedItems = function(p) {
    var model = this.model,
        hierarchicalModel = model.hierarchicalModel,
        selectionModel = model.selectionModel;
    return this.hitTest(p, function(item, hitInfo) {
      if (firstHit(item, hitInfo))
        return true;
      var ancestor = item;
      while (ancestor) {
        if (selectionModel.contains(ancestor))
          return true;
        ancestor = hierarchicalModel.getParent(ancestor);
      }
      return false;
    });
  }

  Editor.prototype.beginDrag = function() {
    if (!this.mouseHitInfo)
      return;
    var mouseHitInfo = this.mouseHitInfo,
        item = mouseHitInfo.item,
        model = this.model,
        drag;
    if (this.isPaletteItem(item)) {
      // Clone palette item and add the clone to the board. Don't notify
      // observers yet.
      item = model.instancingModel.clone(item);
      model.editingModel.addTemporaryItem(item);
      model.selectionModel.set([ item ]);
      drag = {
        type: 'moveSelection',
        isNewItem: true,
        name: 'Add new ' + item.type,
      }
    } else {
      switch (item.type) {
        case 'disk':
          if (mouseHitInfo.border)
            drag = { type: 'resizeDisk', name: 'Resize disk' };
          else if (mouseHitInfo.center)
            drag = { type: 'moveSelection', name: 'Move selection' };
          break;
        case 'linear':
          if (mouseHitInfo.p1)
            drag = { type: 'p1', name: 'Edit line' };
          else if (mouseHitInfo.p2)
            drag = { type: 'p2', name: 'Edit line' };
          else
            drag = { type: 'moveSelection', name: 'Move selection' };
          break;
        case 'bezier':
          if (mouseHitInfo.end0)
            drag = { type: 'end0', name: 'Stretch curve' };
          else if (mouseHitInfo.mid)
            drag = { type: 'mid', name: 'Attach curve' };
          else if (mouseHitInfo.end1)
            drag = { type: 'end1', name: 'Stretch curve' };
          else if (mouseHitInfo.point)
            drag = { type: 'point', name: 'Move control point' };
          else
            drag = { type: 'moveSelection', name: 'Move selection' };
          break;
        case 'group':
          drag = { type: 'moveSelection', name: 'Move selection' };
          break;
      }
    }
    if (drag) {
      if (drag.type == 'moveSelection')
        model.editingModel.reduceSelection();
      drag.item = item;
      this.drag = drag;
    }

    this.valueTracker = new dataModels.ValueChangeTracker(model);
  }

  Editor.prototype.calcDrags = function(item, model, mouseController) {
    var parent = model.hierarchicalModel.getParent(item),
        transformableModel = model.transformableModel,
        inverseTransform = transformableModel.getInverseAbsolute(item),
        inverseParentTransform = transformableModel.getInverseAbsolute(parent),
        localClick = geometry.matMulVecNew(mouseController.getMouseDown(), inverseTransform),
        localMouse = geometry.matMulVecNew(mouseController.getMouse(), inverseTransform),
        parentClick = geometry.matMulVecNew(mouseController.getMouseDown(), inverseParentTransform),
        parentMouse = geometry.matMulVecNew(mouseController.getMouse(), inverseParentTransform);
    return {
      localClick: localClick,
      localMouse: localMouse,
      localDrag: { x: localMouse.x - localClick.x, y: localMouse.y - localClick.y },
      parentClick: parentClick,
      parentMouse: parentMouse,
      parentDrag: { x: parentMouse.x - parentClick.x, y: parentMouse.y - parentClick.y },
    };
  }

  Editor.prototype.projectToParentHull = function(item, p) {
    var model = this.model,
        parent = model.hierarchicalModel.getParent(item);
    if (parent && parent.type == 'group' && parent.op == 'hull') {
      var centroid = parent._centroid, hull = parent._paths[0],
          transformableModel = model.transformableModel,
          local = transformableModel.getLocal(item),
          pParent = geometry.matMulVecNew(p, local),
          pProj = geometry.projectPointToConvexHull(hull, pParent),
          angle = geometry.getAngle(pProj.x - centroid.x, pProj.y - centroid.y);
      return angle;
    }
  }

  Editor.prototype.doDrag = function(p, offset) {
    var self = this,
        drag = this.drag,
        item = drag.item,
        model = this.model,
        renderer = this.renderer,
        valueTracker = this.valueTracker,
        mouseController = this.mouseController,
        mouseHitInfo = this.mouseHitInfo,
        snapshot = valueTracker.getSnapshot(drag.item),
        drags = this.calcDrags(drag.item, model, mouseController),
        hitInfo, newLength;
    switch (drag.type) {
      case 'moveSelection':
        var hitInfo = this.hotTrackInfo = this.hitTestUnselectedItems(p);
        model.selectionModel.forEach(function(item) {
          var snapshot = valueTracker.getSnapshot(item),
              drags = self.calcDrags(item, model, mouseController),
              parentDrag = drags.parentDrag;
          model.observableModel.changeValue(item, 'x', snapshot.x + parentDrag.x);
          model.observableModel.changeValue(item, 'y', snapshot.y + parentDrag.y);
        });
        break;

      case 'resizeDisk':
        var localClick = drags.localClick,
            localMouse = drags.localMouse,
            dx1 = localClick.x, dy1 = localClick.y,
            dx2 = localMouse.x, dy2 = localMouse.y;
        model.observableModel.changeValue(item, 'radius',
            snapshot.radius * Math.sqrt((dx2 * dx2 + dy2 * dy2) / (dx1 * dx1 + dy1 * dy1)));
        break;

      case 'p1':
        model.observableModel.changeValue(item, 'x', snapshot.x + drags.parentDrag.x);
        model.observableModel.changeValue(item, 'y', snapshot.y + drags.parentDrag.y);
        model.observableModel.changeValue(item, 'dx', snapshot.dx - drags.localDrag.x);
        model.observableModel.changeValue(item, 'dy', snapshot.dy - drags.localDrag.y);
        item._angle1 = this.projectToParentHull(item, { x: 0, y: 0 });
        break;

      case 'p2':
        model.observableModel.changeValue(item, 'dx', snapshot.dx + drags.localDrag.x);
        model.observableModel.changeValue(item, 'dy', snapshot.dy + drags.localDrag.y);
        item._angle2 = this.projectToParentHull(item, { x: item.dx, y: item.dy });
        break;

      case 'end0':
        model.observableModel.changeValue(item, 'x', snapshot.x + drags.parentDrag.x / 2);
        model.observableModel.changeValue(item, 'y', snapshot.y + drags.parentDrag.y / 2);
        newLength = geometry.lineLength(drags.parentMouse.x, drags.parentMouse.y, item.x, item.y);
        model.observableModel.changeValue(item, 'halfLength', newLength);
        this.autoRotateBezier(item);
        break;

      // case 'bezier':
      //   var newLength;
      //   if (mouseHitInfo.part == 'position') {
      //     observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x);
      //     observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y);
      //     autoRotateBezier(item);
      //   } else if (mouseHitInfo.part == 'point') {
      //     var pt = item.points[mouseHitInfo.index];
      //     var oldPt = item._points[mouseHitInfo.index];
      //     observableModel.changeValue(pt, 'x', oldPt.x + local_drag.x);
      //     observableModel.changeValue(pt, 'y', oldPt.y + local_drag.y);
      //   } else if (mouseHitInfo.part == 'end0') {
      //   } else if (mouseHitInfo.part == 'end1') {
      //     observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x / 2);
      //     observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y / 2);
      //     newLength = LineLength(parent_mouse.x, parent_mouse.y, item.x, item.y);
      //     autoRotateBezier(item);
      //   } else if (mouseHitInfo.part == 'mid') {
      //     observableModel.changeValue(item, 'x', snapshot.x + parent_drag.x);
      //     observableModel.changeValue(item, 'y', snapshot.y + parent_drag.y);
      //     autoRotateBezier(item);
      //   }
      //   if (newLength) {
      //     if (newLength > 0.00001) {
      //       item.halfLength = newLength;
      //       var scale = newLength / snapshot.halfLength;
      //       for (var i = 0; i < item.points.length; i++) {
      //         var pi = item.points[i], oldPi = item._points[i];
      //         observableModel.changeValue(pi, 'x', scale * oldPi.x);
      //         observableModel.changeValue(pi, 'y', scale * oldPi.y);
      //       }
      //     }
      //   }
      //   break;
    }
  }

  Editor.prototype.endDrag = function() {
    var drag = this.drag,
        p = this.mouseController.getMouse(),
        model = this.model,
        board = this.board,
        selectionModel = model.selectionModel;
    // Remove any items that have been temporarily added before starting the
    // transaction.
    var newItem = drag.isNewItem ? model.editingModel.removeTemporaryItem() : null;

    model.transactionModel.beginTransaction(drag.name);

    if (drag.type == 'moveSelection') {
      // Find group beneath mouse.
      var hitInfo = this.hitTestUnselectedItems(p);
      var parent = board;
      if (hitInfo) {
        parent = hitInfo.item;
        while (parent.type != 'group')
          parent = model.hierarchicalModel.getParent(parent);
      }
      // Add new items.
      if (newItem) {
        // Items that can't be added to the board without being wrapped in a group.
        if (parent === board && isHullItem(newItem)) {
          var group = {
            type: 'group',
            op: 'hull',
            x: newItem.x,
            y: newItem.y,
            items: [ newItem ],
          };
          model.dataModel.assignId(group);
          newItem.x = 0;
          newItem.y = 0;
          newItem = group;
        }
        model.editingModel.addItem(newItem, null, parent);
      } else {
        // Reparent items if necessary.
        model.selectionModel.forEach(function(item) {
          var oldParent = model.hierarchicalModel.getParent(item);
          if (item.type != 'disk' && oldParent !== parent)
            model.editingModel.addItem(item, oldParent, parent);
        });
      }
    }

    this.valueTracker.end();
    this.valueTracker = null;

    model.transactionModel.endTransaction();

    this.drag = null;
    this.mouseHitInfo = null;
    this.hotTrackInfo = null;
  }

  // Calculate auto-rotation using parent hull.
  Editor.prototype.autoRotateBezier = function(item) {
    var model = this.model,
        parent = model.hierarchicalModel.getParent(item),
        p = { x: item.x, y: item.y };
    if (parent.type == 'group' && parent.op == 'hull') {
      var hull = parent._paths[0];
      var i0 = findClosestPathSegment(hull, p);
      var i1 = (i0 < hull.length - 1) ? i0 + 1 : 0;
      var t = getTurn(hull[i0].x - hull[i1].x, hull[i0].y - hull[i1].y);
      model.observableModel.changeValue(item, '_rotation', t * 2 * Math.PI);
    }
  }

  function indices_adjacent(i1, i2, length, wraps) {
    var next = i1 + 1;
    if (wraps && next == length)
      next = 0;
    var prev = i1 - 1;
    if (wraps && prev < 0)
      prev = length - 1;
    return i2 == next || i2 == prev;
  }

  function makeInterpolatingPoints(bezier) {
    var points = [];
    var length = bezier.points.length;
    var halfLength = bezier.halfLength;
    points.push({ x: -halfLength * 2, y: 0 });
    points.push({ x: -halfLength, y: 0 });
    for (var i = 0; i < length; i++) {
      var pi = bezier.points[i];
      points.push({ x: pi.x, y: pi.y });
    }
    points.push({ x: halfLength, y: 0 });
    points.push({ x: halfLength * 2, y: 0 });
    return points;
  }

  // Paths are computed in the local space of the item, translated when combining.
  Editor.prototype.updateGeometry = function(root) {
    var self = this, model = this.model,
        hierarchicalModel = model.hierarchicalModel,
        transformableModel = model.transformableModel,
        diffPathStack = [];
    if (!root)
      root = this.board;
    function updatePass1(item) {

      if (item.type == 'group')
        diffPathStack.push(new ClipperLib.Paths());

      // Create paths for primitives.
      var path = [];
      var subdivisions, step, x, y;
      var dx, dy, cx, cy;
      switch (item.type) {
        case 'disk':
          var r = item.radius;
          subdivisions = Math.sqrt(r) * 16;
          for (var i = 0; i < subdivisions; i++) {
            x = r * Math.cos(2 * Math.PI * i / subdivisions);
            y = r * Math.sin(2 * Math.PI * i / subdivisions);
            path.push({ x: x, y: y });
          }
          break;
        case 'bezier':
          // Generate local curve for unbound bezier items.
          var parent = hierarchicalModel.getParent(item);
          if (!parent || parent.type != 'group' || parent.op != 'hull') {
            var points = makeInterpolatingPoints(item);
            item._curves = [];
            item._curveLengths = [];
            generateCurveSegments(points, item._curves, item._curveLengths);
          }
          // // Convert curves to points.
          // for (var i = 0; i < length + 1; i++) {
          //   subdivisions = item._curveLengths[i] / 4;
          //   step = 1.0 / subdivisions;
          //   var curve = item._curves[i];
          //   for (var t = 0; t < 1; t += step) {
          //     var t2 = t * t;
          //     var t3 = t2 * t;
          //     var c1 = 1 - 3 * t + 3 * t2 - t3;
          //     var c2 = 3 * t - 6 * t2 + 3 * t3;
          //     var c3 = 3 * t2 - 3 * t3;
          //     var x = c1 * curve[0].x + c2 * curve[1].x + c3 * curve[2].x + t3 * curve[3].x;
          //     var y = c1 * curve[0].y + c2 * curve[1].y + c3 * curve[2].y + t3 * curve[3].y;
          //     path.push({ x: x, y: y });
          //   }
          // }
          // // add the last curve point.
          // path.push({ x: curve[3].x, y: curve[3].y });
          // path.push({ x: 0, y: 0 });
          break;
      }

      item._paths = [ path ];

      // Add diff items to the parent item's clipper.
      if (item.diff) {
        diffPathStack[diffPathStack.length - 1].push(ToClipperPath(path, item));
      }
    }

    function updatePass2(item) {
      var points = [];
      // Now that all child items are updated, build the paths for
      // unions and hulls.
      if (item.type == 'group') {
        var diffPaths = diffPathStack.pop();
        // If there are diff paths, adjust child groups.
        // if (diffPaths.length) {
        //   var clipper = new ClipperLib.Clipper();
        //   clipper.AddPath(diffPaths, ClipperLib.PolyType.ptSubject, true);
        //   clipper.AddPaths(diffPaths, ClipperLib.PolyType.ptClip, true);
        //   var allDiffs = new ClipperLib.Paths();
        //   clipper.Execute(ClipperLib.ClipType.ctXor, allDiffs);

        //   for (var i = 0; i < item.items.length; i++) {
        //     var subItem = item.items[i];
        //     if (subItem.type == 'group') {
        //       clipper.Clear();
        //       for (var j = 0; j < subItem._paths.length; j++) {
        //         var path = subItem._paths[j];
        //         clipper.AddPath(ToClipperPath(path, subItem), ClipperLib.PolyType.ptSubject, true)
        //       }
        //       clipper.AddPaths(allDiffs, ClipperLib.PolyType.ptClip, true);
        //       var solution = new ClipperLib.Path();
        //       clipper.Execute(ClipperLib.ClipType.ctDifference, solution);
        //       if (solution.length) {
        //         subItem._paths = [];
        //         for (var j = 0; j < solution.length; j++) {
        //           var solutionPath = solution[j];
        //           var path = FromClipperPath(solutionPath, subItem);


        //           subItem._paths.push(path);
        //         }
        //       }
        //     }
        //   }
        // }

        if (item.op == 'hull') {
          var itemMap = new HashMap(self.model.dataModel.getId);
          var subItems = item.items;
          for (var i = 0; i < subItems.length; i++) {
            var subItem = subItems[i];
            if (!subItem.diff) {
              var localTransform = transformableModel.getLocal(subItem);
              for (var j = 0; j < subItem._paths.length; j++) {
                var path = subItem._paths[j];
                for (var k = 0; k < path.length; k++) {
                  var p = path[k];
                  p = { x: p.x, y: p.y, path: j, index: k, item: subItem };
                  geometry.matMulVec(p, localTransform);
                  points.push(p);
                }
              }
            }
          }

          var hull = geometry.getConvexHull(points, item),
              centroid = geometry.getCentroid(hull);
          geometry.annotateConvexHull(hull, centroid);

          var subItems = item.items;
          for (var i = 0; i < subItems.length; i++) {
            var subItem = subItems[i];
            if (subItem.type == 'bezier') {
              var localTransform = transformableModel.getLocal(subItem);
              var points = makeInterpolatingPoints(subItem);
              var pointsLength = points.length;
              for (var j = 0; j < pointsLength; j++) {
                var pj = points[j];
                // control point base into parent space.
                var p0 = { x: pj.x, y: 0 };
                geometry.matMulVec(p0, localTransform);
                var seg0 = findClosestPathSegment(hull, p0);
                var seg1 = seg0 + 1;
                if (seg1 == hull.length)
                  seg1 = 0;
                var norm = { x: hull[seg1].y - hull[seg0].y, y: hull[seg0].x - hull[seg1].x };
                geometry.vecNormalize(norm);
                var height = pj.y;
                norm.x *= height;
                norm.y *= height;
                var base = projectToPath(hull, seg0, p0);
                points[j] = { x: base.x + norm.x, y: base.y + norm.y };
                geometry.matMulVec(points[j], subItem._itransform);
              }
              subItem._curves = [];
              subItem._curveLengths = [];
              generateCurveSegments(points, subItem._curves, subItem._curveLengths);
            }
          }
          item._centroid = centroid;
          item._paths = [ hull ];
        }
      }

      // Update local bounds.
      item._bounds = {};
      for (var i = 0; i < item._paths.length; i++)
        Box2d.extendArray(item._bounds, item._paths[i]);
    }

    function updatePass3(item) {
      if (item.type == 'linear') {
        var parent = hierarchicalModel.getParent(item);
        if (parent && parent.type == 'group' && parent.op == 'hull') {
          if (!item._angle1)
            item._angle1 = self.projectToParentHull(item, { x: 0, y: 0 });
          if (!item._angle2)
            item._angle2 = self.projectToParentHull(item, { x: item.dx, y: item.dy });
          item._attached = true;

          var centroid = parent._centroid, hull = parent._paths[0],
              inverseLocal = transformableModel.getInverseLocal(item),
              p1 = geometry.angleToConvexHull(hull, centroid, item._angle1),
              p2 = geometry.angleToConvexHull(hull, centroid, item._angle2);
          item._p1 = geometry.matMulVec(p1, inverseLocal),
          item._p2 = geometry.matMulVec(p2, inverseLocal);
        }
      }

    }

    visit(root, updatePass1);
    visit(root, updatePass2);
    visit(root, updatePass3);
  }

  Editor.prototype.onMouseDown = function(e) {
    var model = this.model,
        mouseController = this.mouseController,
        mouseHitInfo = this.mouseHitInfo = this.hitTest(mouseController.getMouse());
    mouseController.onMouseDown(e);
    if (mouseHitInfo) {
      if (!model.selectionModel.contains(mouseHitInfo.item) && !this.shiftKeyDown)
        model.selectionModel.clear();
      if (!this.isPaletteItem(mouseHitInfo.item))
        model.selectionModel.add(mouseHitInfo.item);
      this.updateFn(this);
    } else {
      if (!this.shiftKeyDown) {
        model.selectionModel.clear();
        this.updateFn(this);
      }
    }
  }

  Editor.prototype.onMouseMove = function(e) {
    var mouseController = this.mouseController,
        mouseHitInfo = this.mouseHitInfo,
        didClickItem = mouseHitInfo && mouseHitInfo.item;
    mouseController.onMouseMove(e);
    var mouse = mouseController.getMouse(),
        dragOffset = mouseController.getDragOffset();
    if (didClickItem && mouseController.isDragging) {
      this.doDrag(mouse, dragOffset);
      this.updateFn(this);
    }
  }

  Editor.prototype.onMouseUp = function(e) {
    var mouseController = this.mouseController,
        mouse = mouseController.getMouse(),
        dragOffset = mouseController.getDragOffset(),
        mouseHitInfo = this.mouseHitInfo;
    if (mouseHitInfo && mouseHitInfo.item && mouseController.isDragging) {
      this.doDrag(mouse, dragOffset);
      this.endDrag();
      this.updateFn(this);
      this.mouseHitInfo = null;
    }
    mouseController.onMouseUp(e);
  }

  Editor.prototype.onKeyDown = function(e) {
    var model = this.model,
        board = this.board,
        selectionModel = model.selectionModel,
        editingModel = model.editingModel,
        transactionHistory = model.transactionHistory,
        updateFn = this.updateFn;

    this.shiftKeyDown = e.shiftKey;
    if (e.keyCode == 8) {
      e.preventDefault();
      editingModel.doDelete();
      updateFn(this);
    } else if (e.ctrlKey) {
      if (e.keyCode == 65) {  // 'a'
        board.items.forEach(function(v) {
          selectionModel.add(v);
        });
        updateFn(this);
      } else if (e.keyCode == 90) {  // 'z'
        if (transactionHistory.getUndo()) {
          selectionModel.clear();
          transactionHistory.undo();
          updateFn(this);
        }
      } else if (e.keyCode == 89) {  // 'y'
        if (transactionHistory.getRedo()) {
          selectionModel.clear();
          transactionHistory.redo();
          updateFn(this);
        }
      } else if (e.keyCode == 88) { // 'x'
        editingModel.doCut();
        updateFn(this);
      } else if (e.keyCode == 67) { // 'c'
        editingModel.doCopy();
        updateFn(this);
      } else if (e.keyCode == 86) { // 'v'
        if (editingModel.getScrap()) {
          editingModel.doPaste();
          updateFn(this);
        }
      } else if (e.keyCode == 71) { // 'g'
        // board_group();
        // renderEditor();
      } else if (e.keyCode == 83) { // 's'
        var text = JSON.stringify(
          this.board,
          function(key, value) {
            if (key.toString().charAt(0) == '_')
              return;
            return value;
          },
          2);
        // Writes board as JSON to console.
        console.log(text);
      }
    }
  }

  Editor.prototype.onKeyUp = function(e) {
    this.shiftKeyDown = e.shiftKey;
  }

  return {
    editingModel: editingModel,
    Renderer: Renderer,
    Editor: Editor,
  };
})();



var shape_data = {
  "type": "group",
  "x": 0,
  "y": 0,
  "id": 153,
  "items": [
    {
      "type": "group",
      "op": "hull",
      "x": 281,
      "y": 373,
      "items": [
        {
          "type": "disk",
          "x": 0,
          "y": 0,
          "radius": 73.89606281239585,
          "id": 154
        },
        {
          "type": "linear",
          "x": -9,
          "y": -59,
          "dx": 17,
          "dy": 113,
          "id": 156
        },
        {
          "type": "disk",
          "x": 148,
          "y": -62,
          "radius": 30.01027146566027,
          "id": 157
        },
        {
          "type": "disk",
          "x": 193,
          "y": 15,
          "radius": 16,
          "id": 158
        }
      ],
      "id": 155
    }
  ]
}