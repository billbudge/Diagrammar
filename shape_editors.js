// Pinball shapes module.

'use strict';

var shapes = (function() {

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
    return item.type === 'disk' || item.type === 'edge' ||
           item.type === 'hull';
  }

  function isHull(item) {
    return item.type === 'hull';
  }

  function isEdgeItem(item) {
    return item.type === 'point';
  }

  function isEdge(item) {
    return item.type === 'edge';
  }

  function isGroupItem(item) {
    return item.type == 'hull' || item.type == 'group';
  }

  function isGroup(item) {
    return item.type == 'group';
  }

  function canAddItem(item, parent) {
    return (isGroup(parent) && isGroupItem(item)) ||
           (isHull(parent) && isHullItem(item)) ||
           (isEdge(parent) && isEdgeItem(item));
  }

  // function indices_adjacent(i1, i2, length, wraps) {
  //   var next = i1 + 1;
  //   if (wraps && next == length)
  //     next = 0;
  //   var prev = i1 - 1;
  //   if (wraps && prev < 0)
  //     prev = length - 1;
  //   return i2 == next || i2 == prev;
  // }

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
              model.observableModel.removeElement(parent, 'items', i);
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
        var model = this.model, dataModel = model.dataModel,
            transformableModel = model.transformableModel,
            copies = this.prototype.copyItems(items, map),
            board = this.board;

        items.forEach(function(item) {
          // TODO detach copy
          var copy = map.find(dataModel.getId(item));
          var toGlobal = transformableModel.getToParent(item, board);
          geometry.matMulPt(copy, toGlobal);
        });
        return copies;
      },

      doCopy: function() {
        this.reduceSelection();
        this.prototype.doCopy.call(this);
      },

      addItems: function(items) {
        var self = this, selectionModel = this.model.selectionModel;
        items.forEach(function(item) {
          self.addItem(item, self.board);
          selectionModel.add(item);
        });
      },

      doPaste: function() {
        this.getScrap().forEach(function(item) {
          item.x += 16;
          item.y += 16;
        });
        this.prototype.doPaste.call(this);
      },

      addItem: function(item, parent) {
        var model = this.model, hierarchicalModel = model.hierarchicalModel,
            oldParent = hierarchicalModel.getParent(item);
        if (oldParent !== parent) {
          var transformableModel = model.transformableModel,
              toParent = transformableModel.getToParent(item, parent);
          // TODO we need to adjust scale and rotation, not just position.
          geometry.matMulPt(item, toParent);
          this.deleteItem(item);  // notifies observer
          model.observableModel.insertElement(parent, 'items', parent.items.length, item);
        }
      },

      addPoint: function(point, edge) {
        var model = this.model, hierarchicalModel = model.hierarchicalModel,
            oldParent = hierarchicalModel.getParent(point);
        if (oldParent !== parent) {
          var transformableModel = model.transformableModel;
          if (oldParent) {
            geometry.matMulPt(item, transformableModel.getAbsolute(oldParent));
          }

          geometry.matMulPt(point, transformableModel.getInverseAbsolute(edge));
        }
        var x = point.x,
            points = edge.items, length = points.length;
        for (var i = 0; i < length; i++) {
          if (x < points[i].x)
            break;
        }
        this.model.observableModel.insertElement(edge, 'items', i, point);
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

  var normalMode = 1,
      highlightMode = 2,
      hotTrackMode = 3;

  function Renderer(theme) {
    this.knobbyRadius = 4;

    this.theme = theme || diagrams.theme.create();
  }

  Renderer.prototype.beginDraw = function(model, ctx) {
    this.model = model;
    this.transformableModel = model.transformableModel;
    this.ctx = ctx;
    ctx.save();
    ctx.font = this.theme.font;
  }

  Renderer.prototype.endDraw = function() {
    this.ctx.restore();
    this.model = null;
    this.ctx = null;
  }

  function drawKnobby(renderer, r, x, y) {
    var d = 2 * r;
    renderer.ctx.strokeRect(x - r, y - r, d, d);
  }

  Renderer.prototype.drawItem = function(item, mode) {
    var ctx = this.ctx, theme = this.theme,
        transformableModel = this.transformableModel,
        ooScale = transformableModel.getOOScale(item),
        knobbyRadius = this.knobbyRadius * ooScale,
        lineDash = 4 * ooScale,
        t = transformableModel.getAbsolute(item);
    ctx.save();
    ctx.transform(t[0], t[1], t[2], t[3], t[4], t[5]); // local to world

    if (mode == normalMode) {
      ctx.fillStyle = theme.bgColor;
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 0.25 * ooScale;
    } else if (mode == highlightMode) {
      ctx.strokeStyle = theme.highlightColor;
      ctx.lineWidth = 2.0 * ooScale;
    } else if (mode == hotTrackMode) {
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2.0 * ooScale;
    }

    switch (item.type) {
      case 'disk':
        ctx.beginPath();
        if (mode == normalMode) {
          ctx.arc(0, 0, 1, 0, 2 * Math.PI, false);
          ctx.setLineDash([lineDash]);
          ctx.stroke();
          ctx.setLineDash([0]);
        }
        drawKnobby(this, knobbyRadius, 0, 0);
        drawKnobby(this, knobbyRadius, 1, 0);
        break;
      case 'point':
        ctx.beginPath();
        ctx.arc(0, 0, knobbyRadius, 0, 2 * Math.PI, false);
        ctx.stroke();
        break;
      case 'edge':
        var points = item.items, length = points.length;
        ctx.lineWidth = 0.25 * ooScale;
        if (mode == normalMode) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(1, 0);
          ctx.setLineDash([lineDash]);
          ctx.stroke();
          ctx.setLineDash([0]);
        }

        if (true) {//!item.attached) {
          ctx.lineWidth = 2 * ooScale;
          ctx.beginPath();
          ctx.moveTo(item._beziers[0][0].x, item._beziers[0][0].y);
          for (var i = 0; i < item._beziers.length; i++) {
            var seg = item._beziers[i];
            ctx.bezierCurveTo(seg[1].x, seg[1].y, seg[2].x, seg[2].y, seg[3].x, seg[3].y);
          }
          ctx.stroke();
        }

        if (mode == normalMode)
          ctx.lineWidth = 0.25 * ooScale;
        drawKnobby(this, knobbyRadius, 0, 0);
        drawKnobby(this, knobbyRadius, 1, 0);
        break;
      case 'group':
        var path = item._path;
        ctx.setLineDash([lineDash]);
        if (!path) {
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, 2 * Math.PI, false);
          ctx.stroke();
        } else {
          diagrams.closedPath(path, ctx);
          ctx.stroke();
          var extents = item._extents;
          if (mode == normalMode) {
            ctx.lineWidth = 0.25 * ooScale;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(extents.xmax, 0);
            ctx.stroke();
          }
          ctx.setLineDash([0]);
          drawKnobby(this, knobbyRadius, 0, 0);
          drawKnobby(this, knobbyRadius, extents.xmax, 0);
        }
        ctx.setLineDash([0]);
        break;
      case 'hull':
        var path = item._path;
        ctx.beginPath();
        var length = path.length, pLast = path[length - 1];
        ctx.moveTo(pLast.x, pLast.y);
        for (var i = 0; i < length; i++) {
          var pi = path[i];
          if (!pi.marked && !pLast.marked)
            ctx.lineTo(pi.x, pi.y);
          else
            ctx.moveTo(pi.x, pi.y);
          pLast = pi;
        }
        ctx.lineWidth = 2;
        if (mode == normalMode)
          ctx.fill();
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  function hitKnobby(x, y, r, p) {
    var d = 2 * r;
    return diagrams.hitTestRect(x - r, y - r, d, d, p, 0);
  }

  Renderer.prototype.hitTest = function(item, p, tol, mode) {
    var transformableModel = this.transformableModel,
        inverseTransform = transformableModel.getInverseAbsolute(item),
        ooScale = transformableModel.getOOScale(item),
        localP = geometry.matMulPtNew(p, inverseTransform),
        knobbyRadius = this.knobbyRadius * ooScale,
        hitInfo, r, distSquared;
    tol *= ooScale;
    knobbyRadius += tol;
    switch (item.type) {
      case 'disk':
        hitInfo = diagrams.hitTestDisk(0, 0, 1, localP, tol);
        if (hitInfo) {
          if (hitKnobby(0, 0, knobbyRadius, localP)) {
            hitInfo.center = true;
          } else if (hitKnobby(1, 0, knobbyRadius, localP)) {
            hitInfo.resizer = true;
          } else {
            return null;
          }
        }
        break;
      case 'point':
        if (diagrams.hitPoint(0, 0, localP, knobbyRadius))
          hitInfo = { position: true };
        break;
      case 'edge':
        var points = item.items, length = points.length;
        // First check the end points.
        if (!hitInfo && hitKnobby(0, 0, knobbyRadius, localP))
          hitInfo = { p1: true };
        if (!hitInfo && hitKnobby(1, 0, knobbyRadius, localP))
          hitInfo = { p2: true };
        // Now check the edge segments.
        if (!hitInfo) {
          var beziers = item._beziers, length = beziers.length;
          for (var i = 0; i < length; i++) {
            var b = beziers[i];
            if (geometry.hitTestCurveSegment(b[0], b[1], b[2], b[3], localP, tol)) {
              hitInfo = { curve: true, index: i };
              break;
            }
          }
        }
        break;
      case 'group':
        var path = item._path;
        if (!path) {
          hitInfo = diagrams.hitTestDisk(0, 0, 16, localP, tol);
        } else {
          var extents = item._extents;
          if (hitKnobby(0, 0, knobbyRadius, localP)) {
            hitInfo = { relocator: true };
          } else if (hitKnobby(extents.xmax, 0, knobbyRadius, localP)) {
            hitInfo = { resizer: true };
          } else if (mode == normalMode) {
            hitInfo = diagrams.hitTestConvexHull(path, localP, tol);
          }
        }
        break;
      case 'hull':
        if (mode == normalMode) {
          var path = item._path;
          hitInfo = diagrams.hitTestConvexHull(path, localP, tol);
        }
        break;
    }
    if (hitInfo)
      hitInfo.item = item;
    return hitInfo;
  }

//------------------------------------------------------------------------------

  function Editor(model, renderer) {
    var self = this;
    this.model = model;
    this.board = model.root;
    this.renderer = renderer;

    this.hitTolerance = 8;

    var palette = this.palette = {
      root: {
        type: 'palette',
        x: 0,
        y: 0,
        items: [
          {
            type: 'disk',
            id: 1,
            x: 40,
            y: 40,
            scale: 16,
            rotation: 0,
          },
          {
            type: 'point',
            id: 2,
            x: 80,
            y: 40,
          },
          {
            type: 'group',
            id: 3,
            x: 40,
            y: 100,
            scale: 1,
            rotation: 0,
            items: [],
          },
        ]
      }
    }

    dataModels.observableModel.extend(palette);
    dataModels.hierarchicalModel.extend(palette);
    dataModels.transformableModel.extend(palette);
    palette.dataModel.initialize();

    editingModel.extend(model);
    model.dataModel.initialize();

    this.updateGeometry(palette.root);
  }

  Editor.prototype.initialize = function(canvasController) {
    this.canvasController = canvasController;
    this.canvas = canvasController.canvas;
    this.ctx = canvasController.ctx;
    if (!this.renderer)
      this.renderer = new Renderer(canvasController.theme);
  }

  Editor.prototype.isPaletteItem = function(item) {
    var hierarchicalModel = this.palette.hierarchicalModel;
    return hierarchicalModel.getParent(item) === this.palette.root;
  }

  Editor.prototype.addTemporaryItem = function(item) {
    this.model.observableModel.changeValue(this.board, 'temporary', item);
  }

  Editor.prototype.removeTemporaryItem = function(item) {
    return this.model.observableModel.changeValue(this.board, 'temporary', null);
  }

  Editor.prototype.getTemporaryItem = function() {
    return this.board.temporary;
  }

  Editor.prototype.draw = function() {
    var renderer = this.renderer, model = this.model, ctx = this.ctx,
        palette = this.palette,
        canvasController = this.canvasController;

    this.updateGeometry();

    renderer.beginDraw(model, ctx);
    canvasController.applyTransform();
    visit(this.board, function(item) {
      renderer.drawItem(item, normalMode);
    });

    this.model.selectionModel.forEach(function(item) {
      renderer.drawItem(item, highlightMode);
    });
    if (this.hotTrackInfo)
      renderer.drawItem(this.hotTrackInfo.item, hotTrackMode);
    renderer.endDraw();

    renderer.beginDraw(palette, ctx);
    ctx.fillStyle = renderer.theme.altBgColor;
    ctx.fillRect(palette.root.x, palette.root.y, 160, 300);
    palette.root.items.forEach(function(item) {
      renderer.drawItem(item, normalMode);
    });
    renderer.endDraw();

    renderer.beginDraw(model, ctx);
    var temporary = this.getTemporaryItem();
    if (temporary) {
      canvasController.applyTransform();
      renderer.drawItem(temporary, normalMode);
    }
    renderer.endDraw();
  }

  Editor.prototype.hitTest = function(p) {
    var renderer = this.renderer,
        canvasController = this.canvasController,
        cp = canvasController.viewToCanvas(p),
        scale = canvasController.scale,
        zoom = Math.max(scale.x, scale.y),
        tol = this.hitTolerance, cTol = tol / zoom,
        hitList = [];
    function pushInfo(info) {
      if (info)
        hitList.push(info);
    }

    reverseVisit(this.palette.root, function(item) {
      pushInfo(renderer.hitTest(item, p, tol, normalMode));
    });

    // TODO figure this out
    // this.model.selectionModel.forEach(function(item) {
    //   pushInfo(renderer.hitTest(item, cp, tol, highlightMode));
    // });

    reverseVisit(this.board, function(item) {
      pushInfo(renderer.hitTest(item, cp, cTol, normalMode));
    });
    return hitList;
  }

  function isDraggable(hitInfo, model) {
    return true;
  }

  function isUnselected(hitInfo, model) {
    var item = hitInfo.item;
    return !model.hierarchicalModel.isItemInSelection(item);
  }

  Editor.prototype.getFirstHit = function(hitList, filterFn) {
    if (hitList) {
      var model = this.model, length = hitList.length;
      for (var i = 0; i < length; i++) {
        var hitInfo = hitList[i];
        if (filterFn(hitInfo, model))
          return hitInfo;
      }
    }
    return null;
  }

  Editor.prototype.getFirstUnselectedContainerHit = function(hitList, item) {
    function filter(hitInfo, model) {
      return canAddItem(item, hitInfo.item) && isUnselected(hitInfo, model);
    }
    return this.getFirstHit(hitList, filter);
  }

  Editor.prototype.onClick = function(p) {
    var model = this.model,
        shiftKeyDown = this.canvasController.shiftKeyDown,
        hitList = this.hitTest(p),
        mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList, isDraggable);
    if (mouseHitInfo) {
      if (!model.selectionModel.contains(mouseHitInfo.item) && !shiftKeyDown)
        model.selectionModel.clear();
      if (!this.isPaletteItem(mouseHitInfo.item))
        model.selectionModel.add(mouseHitInfo.item);
    } else {
      if (!shiftKeyDown) {
        model.selectionModel.clear();
      }
    }
    return mouseHitInfo != null;
  }

  Editor.prototype.onBeginDrag = function(p0) {
    if (!this.mouseHitInfo)
      return;
    var mouseHitInfo = this.mouseHitInfo,
        dragItem = mouseHitInfo.item,
        model = this.model, transformableModel = model.transformableModel,
        transform = transformableModel.getLocal(dragItem),
        newItem, drag;
    if (this.isPaletteItem(dragItem)) {
      newItem = model.instancingModel.clone(dragItem);
      drag = {
        type: 'paletteItem',
        name: 'Add new ' + dragItem.type,
        isNewItem: true,
      }
      var cp = canvasController.viewToCanvas(newItem);
      newItem.x = cp.x;
      newItem.y = cp.y;
    } else {
      switch (dragItem.type) {
        case 'disk':
          // Direction/scale vector, in parent space.
          var vector = geometry.matMulVec({ x: 1, y: 0 }, transform);
          if (mouseHitInfo.resizer)
            drag = { type: 'resizeDisk', name: 'Resize disk', vector: vector };
          else if (mouseHitInfo.center)
            drag = { type: 'moveSelection', name: 'Move items' };
          break;
        case 'point':
          drag = { type: 'moveSelection', name: 'Move items' };
          break;
        case 'edge':
          // Direction/scale vector, in parent space.
          if (mouseHitInfo.p1)
            drag = { type: 'p1', name: 'Edit edge' };
          else if (mouseHitInfo.p2)
            drag = { type: 'p2', name: 'Edit edge' };
          else if (dragItem.attached)
            drag = { type: 'dragEdge', name: 'Edit edge' };
          else
            drag = { type: 'moveSelection', name: 'Move items' };
          break;
        case 'group':
          // Direction/scale vector, in parent space.
          var vector = geometry.matMulVec({ x: dragItem._extents.xmax, y: 0 }, transform);
          if (mouseHitInfo.resizer)
            drag = { type: 'resizeGroup', name: 'Resize group', vector: vector };
          else if (mouseHitInfo.relocator)
            drag = { type: 'relocateGroup', name: 'Relocate group origin', vector: vector };
          else
            drag = { type: 'moveSelection', name: 'Move items' };
          break;
        case 'hull':
          drag = { type: 'moveSelection', name: 'Move items' };
          break;
      }
    }
    this.drag = drag;
    if (drag) {
      if (drag.type === 'moveSelection')
        model.editingModel.reduceSelection();
      model.transactionModel.beginTransaction(drag.name);
      if (newItem) {
        drag.item = newItem;
        model.dataModel.initialize(newItem);
        this.addTemporaryItem(newItem);
      } else {
        drag.item = dragItem;
      }
    }
  }

  Editor.prototype.calcDrags = function(item, model, p, p0) {
    var parent = model.hierarchicalModel.getParent(item),
        transformableModel = model.transformableModel,
        inverseTransform = transformableModel.getInverseAbsolute(item),
        inverseParentTransform = transformableModel.getInverseAbsolute(parent),
        localClick = geometry.matMulPtNew(p0, inverseTransform),
        localMouse = geometry.matMulPtNew(p, inverseTransform),
        parentClick = geometry.matMulPtNew(p0, inverseParentTransform),
        parentMouse = geometry.matMulPtNew(p, inverseParentTransform);
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
    if (parent && parent.type == 'hull') {
      var centroid = parent._centroid, hull = parent._path,
          pProj = geometry.projectPointToConvexHull(hull, p),
          angle = geometry.getAngle(pProj.x - centroid.x, pProj.y - centroid.y);
      return angle;
    }
  }

  Editor.prototype.moveItem = function(item, parentDrag) {
    var model = this.model, observableModel = model.observableModel,
        snapshot = model.transactionModel.getSnapshot(item);
    observableModel.changeValue(item, 'x', snapshot.x + parentDrag.x);
    observableModel.changeValue(item, 'y', snapshot.y + parentDrag.y);
  }

  // Updates edge based on dx and dy.
  Editor.prototype.updateEdge = function(edge) {
    var transformableModel = this.model.transformableModel,
        dx = edge.dx, dy = edge.dy,
        da = edge.a2 - edge.a1;
    edge._rotation = Math.atan2(-dy, dx);
    edge._scale = Math.sqrt(dx * dx + dy * dy);
    edge._flipped = (da > 0 && da < Math.PI) || (da < 0 && da < -Math.PI);
    transformableModel.update(edge);
  }

  function adjustAngle(angle) {
    var twoPi = Math.PI * 2;
    while (angle < 0)
      angle += twoPi;
    while (angle > twoPi)
      angle -= twoPi;
    return angle;
  }

  Editor.prototype.onDrag = function(p0, p) {
    var self = this,
        drag = this.drag,
        dragItem = drag.item,
        model = this.model,
        observableModel = model.observableModel,
        transactionModel = model.transactionModel,
        renderer = this.renderer,
        mouseHitInfo = this.mouseHitInfo,
        canvasController = this.canvasController,
        cp0 = canvasController.viewToCanvas(p0),
        cp = canvasController.viewToCanvas(p),
        dx = cp.x - cp0.x, dy = cp.y - cp0.y,
        drags = this.calcDrags(dragItem, model, cp, cp0),
        hitList = this.hitTest(p), hitInfo,
        newLength;

    switch (drag.type) {
      case 'paletteItem':
        this.moveItem(dragItem, drags.parentDrag);
        // Find container underneath item for hot tracking.
        hitInfo = this.getFirstUnselectedContainerHit(hitList, dragItem);
        break;
      case 'moveSelection':
        model.selectionModel.forEach(function(item) {
          var drags = self.calcDrags(item, model, cp, cp0);
          self.moveItem(item, drags.parentDrag);
        });
        if (dragItem.type !== 'point') {
          // Find container underneath item for hot tracking.
          hitInfo = this.getFirstUnselectedContainerHit(hitList, dragItem);
        }
        break;

      case 'resizeDisk':
        var vector = drag.vector, parentDrag = drags.parentDrag,
            dx = vector.x + parentDrag.x, dy = vector.y + parentDrag.y,
            rotation = Math.atan2(-dy, dx),
            scale = Math.sqrt(dx * dx + dy * dy);
        observableModel.changeValue(dragItem, 'rotation', rotation);
        observableModel.changeValue(dragItem, 'scale', scale);
        break;

      case 'resizeGroup':
        var vector = drag.vector, parentDrag = drags.parentDrag,
            dx = vector.x + parentDrag.x, dy = vector.y + parentDrag.y,
            rotation = Math.atan2(-dy, dx),
            scale = Math.sqrt(dx * dx + dy * dy);
        observableModel.changeValue(dragItem, 'rotation', rotation);
        // model.observableModel.changeValue(dragItem, 'scale', scale);
        break;

      case 'relocateGroup':
        var snapshot = transactionModel.getSnapshot(dragItem);
        this.moveItem(dragItem, drags.parentDrag);
        // Move contents by equal and opposite amount.
        dragItem.items.forEach(function(item) {
          var drags = self.calcDrags(item, model, cp, cp0),
              parentDrag = drags.parentDrag,
              inverse = { x: -parentDrag.x, y: -parentDrag.y };
          self.moveItem(item, inverse);
        });
        break;

      case 'p1':
        if (dragItem.attached) {
          var a1 = self.projectToParentHull(dragItem, drags.parentMouse);
          observableModel.changeValue(dragItem, 'a1', a1);
        } else {
          var snapshot = transactionModel.getSnapshot(dragItem),
              parentDrag = drags.parentDrag,
              dx = snapshot.dx - parentDrag.x, dy = snapshot.dy - parentDrag.y;
          observableModel.changeValue(dragItem, 'dx', dx);
          observableModel.changeValue(dragItem, 'dy', dy);
          observableModel.changeValue(dragItem, 'x', snapshot.x + parentDrag.x);
          observableModel.changeValue(dragItem, 'y', snapshot.y + parentDrag.y);
        }
        break;

      case 'p2':
        if (dragItem.attached) {
          var a2 = self.projectToParentHull(dragItem, drags.parentMouse);
          observableModel.changeValue(dragItem, 'a2', a2);
        } else {
          var snapshot = transactionModel.getSnapshot(dragItem),
              parentDrag = drags.parentDrag,
              dx = snapshot.dx + parentDrag.x, dy = snapshot.dy + parentDrag.y;
          observableModel.changeValue(dragItem, 'dx', dx);
          observableModel.changeValue(dragItem, 'dy', dy);
        }
        break;

      case 'dragEdge':
        var parentClick = drags.parentClick, parentMouse = drags.parentMouse,
            hull = model.hierarchicalModel.getParent(dragItem),
            centroid = hull._centroid,
            angle0 = geometry.getAngle(parentClick.x - centroid.x, parentClick.y - centroid.y),
            angle = geometry.getAngle(parentMouse.x - centroid.x, parentMouse.y - centroid.y),
            da = angle - angle0,
            snapshot = transactionModel.getSnapshot(dragItem),
            a1 = adjustAngle(snapshot.a1 + da),
            a2 = adjustAngle(snapshot.a2 + da);
        observableModel.changeValue(dragItem, 'a1', a1);
        observableModel.changeValue(dragItem, 'a2', a2);
        break;
    }
    this.hotTrackInfo = (hitInfo && hitInfo.item !== this.board) ? hitInfo : null;
  }

  Editor.prototype.onEndDrag = function(p) {
    var drag = this.drag,
        model = this.model,
        board = this.board,
        dataModel = model.dataModel,
        observableModel = model.observableModel,
        transactionModel = model.transactionModel,
        selectionModel = model.selectionModel,
        editingModel = model.editingModel,
        newItem = this.removeTemporaryItem()
        self = this;
    if (newItem) {
      // Clone the new item, since we're about to roll back the transaction. We
      // do this to collapse all of the edits into a single insert operation.
      newItem = model.instancingModel.clone(newItem);
      dataModel.initialize(newItem);
      transactionModel.cancelTransaction();
      transactionModel.beginTransaction(drag.name);
    }

    if (drag.type == 'moveSelection' || newItem) {
      // Find group beneath mouse.
      var dragItem = newItem || drag.item,
          hitList = this.hitTest(p),
          hitInfo = this.getFirstUnselectedContainerHit(hitList, dragItem),
          parent = hitInfo ? hitInfo.item : board;
      if (newItem) {
        var x = newItem.x, y = newItem.y;
        if (isHullItem(newItem) && !isHull(parent)) {
          // Items that can't be added without being wrapped in a hull.
          var hull = {
            type: 'hull',
            x: x,
            y: y,
            items: [ newItem ],
          };
          dataModel.assignId(hull);
          dataModel.initialize(hull);
          newItem.x = 0;
          newItem.y = 0;
          newItem = hull;
        } else if (isEdgeItem(newItem) && !isEdge(parent)) {
          // Items that can't be added without being wrapped in an edge.
          var edge = {
            type: 'edge',
            x: x,
            y: y,
            dx: 64,
            dy: 64,
            items: [
              {
                type: 'point',
                x: 0.25,
                y: 0,
              }
            ],
          }
          dataModel.assignId(edge);
          dataModel.initialize(edge);
          newItem = edge;
        }
        if (newItem.type === 'point') {
          editingModel.addPoint(newItem, parent);
        } else {
          editingModel.addItem(newItem, parent);
        }
        selectionModel.set([newItem]);
      } else {
        // Reparent items if necessary.
        selectionModel.forEach(function(item) {
          if (canAddItem(item, parent)) {
            editingModel.addItem(item, parent);
            if (hitInfo && hitInfo.border && isEdge(item)) {
              // Attach edge and initialize the angular locations of its ends.
              observableModel.changeValue(item, 'attached', true);
              var a1 = self.projectToParentHull(item, item),
                  a2 = self.projectToParentHull(item, { x: item.x + item.dx, y: item.y + item.dy });
              observableModel.changeValue(item, 'a1', a1);
              observableModel.changeValue(item, 'a2', a2);
            }
          }
        });
      }
    }

    transactionModel.endTransaction();

    this.drag = null;
    this.mouseHitInfo = null;
    this.hotTrackInfo = null;
  }

  // // Calculate auto-rotation using parent hull.
  // Editor.prototype.autoRotateBezier = function(item) {
  //   var model = this.model,
  //       parent = model.hierarchicalModel.getParent(item),
  //       p = { x: item.x, y: item.y };
  //   if (parent.type == 'group' && parent.op == 'hull') {
  //     var hull = parent._paths[0];
  //     var i0 = findClosestPathSegment(hull, p);
  //     var i1 = (i0 < hull.length - 1) ? i0 + 1 : 0;
  //     var t = getTurn(hull[i0].x - hull[i1].x, hull[i0].y - hull[i1].y);
  //     model.observableModel.changeValue(item, '_rotation', t * 2 * Math.PI);
  //   }
  // }

  // Paths are computed in the local space of the item, translated when combining.
  Editor.prototype.updateGeometry = function(root) {
    var self = this, model = this.model,
        hierarchicalModel = model.hierarchicalModel,
        transformableModel = model.transformableModel,
        referencingModel = model.referencingModel;
    if (!root)
      root = this.board;

    function sampleBeziers(beziers, error) {
      var points = [];
      beziers.forEach(function(b) {
        var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3],
            approxLength = geometry.pointToPointDist(b0, b1) +
                           geometry.pointToPointDist(b1, b2) +
                           geometry.pointToPointDist(b2, b3),
            subdivisions = approxLength / error;
        points.push({ x: b0.x, y: b0.y });
        if (subdivisions > 1) {
          var dt = 1.0 / subdivisions;
          for (var t = dt / 2; t < 1.0; t += dt) {
            points.push(geometry.evaluateBezier(b, t));
          }
        }
      });
      // Add end point of last bezier.
      var pLast = beziers[beziers.length - 1][3];
      points.push({ x: pLast.x, y: pLast.y });
      return points;
    }

    function getCentroid(item) {
      var subItems = item.items, count = 0,
          centroid;
      // Calculate centroid from items.
      subItems.forEach(function(item) {
        var c = item._centroid;
        if (!c && item.type == 'disk')
          c = item;
        if (c) {
          count++;
          if (centroid) {
            centroid.x += c.x;
            centroid.y += c.y;
          } else {
            centroid = {
              x: c.x,
              y: c.y,
            }
          }
        }
      });
      if (count) {
        centroid.x /= count;
        centroid.y /= count;
      }
      return centroid;
    }

    // Update paths for primitive hull items and form hulls
    function pass1(item) {
      var path;
      switch (item.type) {
        case 'disk':
          var subdivisions = Math.sqrt(item.scale) * 16,
              points = [];
          for (var i = 0; i < subdivisions; i++) {
            points.push({
              x: Math.cos(2 * Math.PI * i / subdivisions),
              y: Math.sin(2 * Math.PI * i / subdivisions),
            });
          }
          path = points;
          break;

        case 'hull':
        case 'group':
          // Transform points from subItems into parent space.
          var points = [], subItems = item.items;
          subItems.forEach(function(subItem) {
            // HACK for now, only disks contribute to hull.
            if (item.type == 'hull' && subItem.type !== 'disk')
              return;
            var path = subItem._path;
            var localTransform = transformableModel.getLocal(subItem);
            path.forEach(function(p) {
              points.push(geometry.matMulPtNew(p, localTransform));
            });
          });
          if (points.length > 0) {
            var hull = geometry.getConvexHull(points),
                centroid = getCentroid(item);
            if (centroid) {
              geometry.annotateConvexHull(hull, centroid);
              if (item.type == 'group')
                geometry.insetConvexHull(hull, -16);
            }
          }
          item._centroid = centroid;
          item._extents = hull ? geometry.getExtents(hull) : null;
          path = hull;
          break;
      }
      // Update local bounds if item has a path.
      if (path) {
        item._path = path;
        item._bounds = geometry.getExtents(path);
      }
    }

    function markHull(hull, i0, t0, i1, t1) {
      var length = hull.length;
      var i = i0;
      while (i != i1) {
        hull[i].marked = true;
        i++;
        if (i == length)
          i = 0;
      }
    }

    // Update paths for primitive edge items, and update hulls.
    function pass2(item) {
      switch (item.type) {
        case 'edge':
          var first, last;
          if (item.attached) {
            // Update x, y, dx, and dy.
            var parent = hierarchicalModel.getParent(item),
                hull = parent._path, center = parent._centroid,
                p1 = geometry.angleToConvexHull(hull, center, item.a1),
                p2 = geometry.angleToConvexHull(hull, center, item.a2);
            item.x = p1.x;
            item.y = p1.y;
            item.dx = p2.x - p1.x;
            item.dy = p2.y - p1.y;
            self.updateEdge(item);
            var inverseLocal = transformableModel.getInverseLocal(item),
                flipped = item._flipped,
                f = flipped ? 1024 : -1024,
                n1 = geometry.matMulPt({ x: p1.x + p1.ny * f, y: p1.y - p1.nx * f }, inverseLocal),
                n2 = geometry.matMulPt({ x: p2.x - p2.ny * f, y: p2.y + p2.nx * f }, inverseLocal);
            first = n1;
            last = n2;
            if (!flipped)
              markHull(hull, p2.i0, p2.t, p1.i0, p1.t);
            else
              markHull(hull, p1.i0, p1.t, p2.i0, p2.t);
          } else {
            self.updateEdge(item);
            first = { x: 0, y: 0 };
            last = { x: 1, y: 0 };
          }
          var items = item.items,
              points = [].concat(item.items);
          // points.sort(function(a, b) { return a.x - b.x });
          points.unshift({ x: 0, y: 0 });
          points.unshift(first);
          points.push({ x: 1, y: 0 });
          points.push(last);
          var beziers = geometry.generateInterpolatingBeziers(points);
          item._beziers =  beziers;
          var path = sampleBeziers(beziers, 4 / item.scale);
          item._path = path;
          item._bounds = geometry.getExtents(item._path);
          break;
      }
    }

    reverseVisit(root, pass1);
    visit(root, pass2);
  }

  Editor.prototype.exportPaths = function(item) {
    var self = this,
        transformableModel = this.model.transformableModel,
        type, path, children, result;
    if (item.type === 'group' || item.type === 'board' || item.type === 'hull') {
      type = 'node';
      if (item._path)
        path = item._path;
      children = [];
      item.items.forEach(function(item) {
        var result = self.exportPaths(item);
        if (result)
          children.push(result);
      });
    } else if (item.type === 'edge') {
      if (item._path) {
        type = 'openPath';
        path = item._path;
      }
    }
    if (type) {
      result = {
        type: type,
        transform: transformableModel.getLocal(item),
      }
      if (path) {
        result.path = path.map(function(p) {
          return { x: p.x, y: p.y };
        });
      }
      if (children && children.length)
        result.children = children;
    }
    return result;
  }

  Editor.prototype.onKeyDown = function(e) {
    var model = this.model, board = this.board,
        selectionModel = model.selectionModel,
        editingModel = model.editingModel,
        transactionHistory = model.transactionHistory,
        keyCode = e.keyCode,
        cmdKey = e.ctrlKey || e.metaKey,
        shiftKey = e.shiftKey;

    if (keyCode == 8) {  // 'delete'
      editingModel.doDelete();
      return true;
    }
    if (cmdKey) {
      switch (keyCode) {
        case 65:  // 'a'
          board.items.forEach(function(v) {
            selectionModel.add(v);
          });
          return true;
        case 90:  // 'z'
          if (transactionHistory.getUndo()) {
            selectionModel.clear();
            transactionHistory.undo();
            return true;
          }
          return false;
        case 89:  // 'y'
          if (transactionHistory.getRedo()) {
            selectionModel.clear();
            transactionHistory.redo();
            return true;
          }
          return false;
        case 88:  // 'x'
          editingModel.doCut();
          return true;
        case 67:  // 'c'
          editingModel.doCopy();
          return true;
        case 86:  // 'v'
          if (editingModel.getScrap()) {
            editingModel.doPaste();
            return true;
          }
          return false;
        case 69:  // 'e'
          var pathData = this.exportPaths(board);
          var text = JSON.stringify(pathData, null, 2);
          // Writes path data as JSON to console.
          console.log(text);
          return true;
        case 83:  // 's'
          var text = JSON.stringify(
            board,
            function(key, value) {
              if (key.toString().charAt(0) === '_')
                return;
              if (value === undefined || value === null)
                return;
              return value;
            },
            2);
          // Writes board as JSON to console.
          console.log(text);
          return true;
      }
    }
  }

  return {
    editingModel: editingModel,
    Renderer: Renderer,
    Editor: Editor,
  };
})();



var shape_data = {
  "type": "board",
  "x": 0,
  "y": 0,
  "id": 153,
  "items": [
    {
      "type": "hull",
      "x": 480.2124748491592,
      "y": 441.31822494301855,
      "items": [
        {
          "type": "disk",
          "x": -156.31478543097683,
          "y": -286.3908062031094,
          "scale": 139.92260819176386,
          "id": 181
        },
        {
          "type": "disk",
          "x": -253.64863947626174,
          "y": 429.32557059934396,
          "scale": 16,
          "id": 183
        },
        {
          "type": "disk",
          "x": 247.5219337773098,
          "y": 432.79392975105844,
          "scale": 16,
          "id": 184
        },
        {
          "type": "disk",
          "x": 203.64283211451658,
          "y": -313.1867376213238,
          "scale": 66.90411048657579,
          "id": 185
        },
        {
          "type": "hull",
          "x": -58.01131188742505,
          "y": 13.825032454571897,
          "rotation": 0.5053386521302267,
          "items": [
            {
              "type": "disk",
              "x": 6,
              "y": -7,
              "scale": 16,
              "id": 210
            },
            {
              "type": "disk",
              "x": -48,
              "y": -36,
              "scale": 34.04715277226595,
              "id": 211
            },
            {
              "type": "disk",
              "x": 22.27723102448806,
              "y": -80.38363918347522,
              "scale": 16,
              "id": 212
            }
          ],
          "id": 213
        },
        {
          "type": "hull",
          "x": 30.522957811180788,
          "y": -274.38208002274524,
          "items": [
            {
              "type": "disk",
              "x": 1.0591567279294054,
              "y": 9.714062075191123,
              "scale": 39.505914005112075,
              "id": 224
            }
          ],
          "id": 225
        },
        {
          "type": "hull",
          "x": 145.35038687458473,
          "y": -225.04769653162586,
          "items": [
            {
              "type": "disk",
              "x": -2.6864846531382227,
              "y": -3.6858898297738847,
              "scale": 40.23684148848271,
              "id": 222
            }
          ],
          "id": 223
        },
        {
          "type": "hull",
          "x": 36.75786752824001,
          "y": -126.59047899094017,
          "items": [
            {
              "type": "disk",
              "x": 6.209026467187698,
              "y": -12.464737708126393,
              "scale": 40.23684148848271,
              "id": 220
            }
          ],
          "id": 221,
          "rotation": -0.2890831021546629
        },
        {
          "type": "hull",
          "x": 147.78896984980156,
          "y": -100.57958647152671,
          "items": [
            {
              "type": "disk",
              "x": 1.4390396526332552,
              "y": -12.710848007366963,
              "scale": 40.23684148848271,
              "id": 218
            }
          ],
          "id": 219
        },
        {
          "type": "hull",
          "x": -67.28823528551425,
          "y": 212.3011032135555,
          "items": [
            {
              "type": "disk",
              "x": -64.55052450536971,
              "y": 0.7278211520033437,
              "scale": 18.161224791664853,
              "id": 214
            },
            {
              "type": "disk",
              "x": 1.0590049742303904,
              "y": -18.671576008170803,
              "scale": 25.475244635370935,
              "id": 215
            },
            {
              "type": "disk",
              "x": 46.44947549463029,
              "y": 26.727821152003344,
              "scale": 16,
              "id": 216
            }
          ],
          "id": 217
        },
        {
          "type": "hull",
          "x": 163.70496685814476,
          "y": 169.16088137219577,
          "items": [
            {
              "type": "disk",
              "x": -112,
              "y": 0,
              "scale": 16,
              "id": 206
            },
            {
              "type": "disk",
              "x": -48,
              "y": -36,
              "scale": 34.04715277226595,
              "id": 207
            },
            {
              "type": "disk",
              "x": -29.750868624734267,
              "y": -140.5005790831562,
              "scale": 16,
              "id": 208
            }
          ],
          "id": 209
        },
        {
          "type": "hull",
          "x": -182.95132747621312,
          "y": -300.83375183392,
          "items": [
            {
              "type": "disk",
              "x": 2.4499156637059514,
              "y": 0.9799662654823464,
              "scale": 9.929778600166998,
              "id": 226
            },
            {
              "type": "disk",
              "x": 2.407409674665587,
              "y": 81.85192893863245,
              "scale": 10.333627809386586,
              "id": 228
            }
          ],
          "id": 227
        },
        {
          "type": "hull",
          "x": -123.66336841453142,
          "y": -321.4130434090492,
          "items": [
            {
              "type": "disk",
              "x": 2.4499156637059514,
              "y": 0.9799662654823464,
              "scale": 9.929778600166998,
              "id": 232
            },
            {
              "type": "disk",
              "x": 2.407409674665587,
              "y": 81.85192893863245,
              "scale": 10.333627809386586,
              "id": 233
            }
          ],
          "id": 234
        },
        {
          "type": "hull",
          "x": -65.84535875107315,
          "y": -338.07246992224907,
          "items": [
            {
              "type": "disk",
              "x": 2.4499156637059514,
              "y": 0.9799662654823464,
              "scale": 9.929778600166998,
              "id": 235
            },
            {
              "type": "disk",
              "x": 2.407409674665587,
              "y": 81.85192893863245,
              "scale": 10.333627809386586,
              "id": 236
            }
          ],
          "id": 237
        },
        {
          "type": "disk",
          "x": -228.7961837282378,
          "y": -144.14306449748278,
          "scale": 85.98177053809061,
          "id": 239
        },
        {
          "type": "hull",
          "x": -97.98277525938909,
          "y": 374.481135107979,
          "items": [
            {
              "type": "disk",
              "x": 40.76144937840979,
              "y": 16.902619979964015,
              "scale": 7.317260635772668,
              "id": 247
            },
            {
              "type": "disk",
              "x": -14.686604372139072,
              "y": -7.215555194286196,
              "scale": 16.638179481930923,
              "id": 250
            }
          ],
          "id": 248
        },
        {
          "type": "hull",
          "x": 104.21134325766923,
          "y": 365.71638066903546,
          "items": [
            {
              "type": "disk",
              "x": -55.209515158474346,
              "y": 28.298840462272892,
              "scale": 7.317260635772668,
              "id": 254
            },
            {
              "type": "disk",
              "x": -0.20760179262651945,
              "y": 0.02394609547008031,
              "scale": 16.638179481930923,
              "id": 255
            }
          ],
          "id": 256
        },
        {
          "type": "disk",
          "x": -190.2059411651818,
          "y": 468.9282907628569,
          "scale": 16,
          "id": 257
        },
        {
          "type": "edge",
          "x": -265.61852241251705,
          "y": -373.739584676665,
          "dx": -44.13540775678291,
          "dy": 296.43224823320054,
          "items": [
            {
              "type": "point",
              "x": 0.7360075600735081,
              "y": -0.19009103337667266
            }
          ],
          "attached": true,
          "a1": 2.1033102491779037,
          "a2": 2.7682492410764343
        },
        {
          "type": "edge",
          "x": -308.1496203241887,
          "y": -57.01702337199282,
          "dx": 29.224085113227318,
          "dy": 369.6080517000016,
          "items": [
            {
              "type": "point",
              "x": 0.2153189624859957,
              "y": -0.11924854388815925
            }
          ],
          "id": 265,
          "attached": true,
          "a1": 2.829885403585282,
          "a2": 3.9735472003644925
        },
        {
          "type": "edge",
          "x": 177.6893456922686,
          "y": 14.25402101185773,
          "dx": -117,
          "dy": 210,
          "items": [
            {
              "type": "point",
              "x": 0.6258185336548361,
              "y": -0.2993705141268176
            }
          ],
          "id": 268
        },
        {
          "type": "edge",
          "x": 187.77126595249013,
          "y": -298.2086279348582,
          "dx": 28,
          "dy": 750,
          "items": [
            {
              "type": "point",
              "x": 0.03608149637667418,
              "y": -0.02439579618317711,
              "id": 262
            },
            {
              "type": "point",
              "x": 0.10719113215820592,
              "y": -0.04351068776204081
            }
          ],
          "id": 260
        }
      ],
      "id": 182
    }
  ]
}
