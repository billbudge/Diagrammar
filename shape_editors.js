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

function isBoard(item) {
  return item.type === 'board';
}

function isGroup(item) {
  return item.type === 'group';
}

function isGroupItem(item) {
  return item.type === 'disk' || item.type === 'edge' ||
         item.type === 'group';
}

function isEdge(item) {
  return item.type === 'edge';
}

function isEdgeItem(item) {
  return item.type === 'point';
}

function canAddItem(item, parent) {
  return (isGroupItem(item) && (isGroup(parent) || isBoard(parent))) ||
         (isEdge(parent) && isEdgeItem(item));
}

function isHullItem(item) {
  return item.type === 'disk';
}

let _beziers = Symbol('beziers'), _path = Symbol('path'),
    _extents = Symbol('extents'), _merged = Symbol('merged'),
    _center = Symbol('center'), _flipped = Symbol('flipped'),
    _a1 = Symbol('a1'), _a2 = Symbol('a2');

//------------------------------------------------------------------------------

var editingModel = (function() {
  var functions = {
    reduceSelection: function() {
      this.model.selectionModel.set(
        this.model.hierarchicalModel.reduceSelection());
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
        var copy = map.get(dataModel.getId(item));
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

    addPoint: function(point, edge, index) {
      var model = this.model, hierarchicalModel = model.hierarchicalModel,
          oldParent = hierarchicalModel.getParent(point);
      // Move 'point' into 'edge' local space.
      if (oldParent !== parent) {
        var transformableModel = model.transformableModel;
        if (oldParent) {
          geometry.matMulPt(item, transformableModel.getAbsolute(oldParent));
        }

        geometry.matMulPt(point, transformableModel.getInverseAbsolute(edge));
      }
      this.model.observableModel.insertElement(edge, 'items', index, point);
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

let invalidatingModel = (function () {
  let proto = {
    isInvalid: function(item) {
      return this.invalid_.has(item);
    },

    invalidate: function (item) {
      let model = this.model,
          hierarchicalModel = model.hierarchicalModel,
          invalid = this.invalid_,
          ancestor = item;
      while (ancestor) {
        invalid.add(ancestor);
        ancestor = hierarchicalModel.getParent(ancestor);
      }
    },

    invalidateAll: function(valid) {
      let self = this,
          dataModel = this.model.dataModel,
          invalid = this.invalid_;
      dataModel.visitSubtree(dataModel.getRoot(), function(item) {
        invalid.add(item);
      });
    },

    reset: function (item) {
      this.invalid_.delete(item);
    },

    resetAll: function() {
      this.invalid_.clear();
    },

    onChanged_: function (change) {
      let self = this,
          item = change.item,
          model = this.model,
          dataModel = model.dataModel,
          hierarchicalModel = model.hierarchicalModel;
      switch (change.type) {
        case 'change': {
          let newValue = item[change.attr];
          if (dataModel.isItem(newValue))
            this.invalidate(newValue);
          else
            this.invalidate(item);
          break;
        }
        case 'insert': {
          let newValue = item[change.attr][change.index];
          if (dataModel.isItem(newValue))
            this.invalidate(newValue);
          else
            this.invalidate(item);
          // Invalidate the item's subtree.
          dataModel.visitSubtree(item, function(subItem) {
            self.invalid_.add(subItem);
          });
          break;
        }
        case 'remove':
          this.invalidate(item);
          break;
      }
    },
  }

  function extend(model) {
    if (model.invalidatingModel)
      return model.invalidatingModel;

    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);
    dataModels.hierarchicalModel.extend(model);

    var instance = Object.create(proto);
    instance.model = model;
    model.observableModel.addHandler('changed', function (change) {
      instance.onChanged_(change);
    });

    instance.invalid_ = new Set();

    model.invalidatingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
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
        ctx.setLineDash([]);
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
      // ctx.lineWidth = 0.25 * ooScale;  // Draw baseline.
      // if (mode == normalMode) {
      //   ctx.beginPath();
      //   ctx.moveTo(0, 0);
      //   ctx.lineTo(1, 0);
      //   ctx.setLineDash([lineDash]);
      //   ctx.stroke();
      //   ctx.setLineDash([]);
      // }

      ctx.lineWidth = 2 * ooScale;
      ctx.beginPath();
      ctx.moveTo(item[_beziers][0][0].x, item[_beziers][0][0].y);
      for (var i = 0; i < item[_beziers].length; i++) {
        var seg = item[_beziers][i];
        ctx.bezierCurveTo(seg[1].x, seg[1].y, seg[2].x, seg[2].y, seg[3].x, seg[3].y);
      }
      ctx.stroke();

      if (mode == normalMode)
        ctx.lineWidth = 0.25 * ooScale;

      drawKnobby(this, knobbyRadius, 0, 0);
      drawKnobby(this, knobbyRadius, 1, 0);
      break;
    // case 'group':
    //   var path = item[_path];
    //   ctx.setLineDash([lineDash]);
    //   if (!path) {
    //     ctx.beginPath();
    //     ctx.arc(0, 0, 16, 0, 2 * Math.PI, false);
    //     ctx.stroke();
    //   } else {
    //     diagrams.closedPath(path, ctx);
    //     ctx.stroke();
    //     var extents = item[_extents];
    //     if (mode == normalMode) {
    //       ctx.lineWidth = 0.25 * ooScale;
    //       ctx.beginPath();
    //       ctx.moveTo(0, 0);
    //       ctx.lineTo(extents.xmax, 0);
    //       ctx.stroke();
    //     }
    //     ctx.setLineDash([]);
    //     drawKnobby(this, knobbyRadius, 0, 0);
    //     drawKnobby(this, knobbyRadius, extents.xmax, 0);
    //   }
    //   ctx.setLineDash([]);
    //   break;
    case 'group':
      var path = item[_path], length = path.length, pLast = path[length - 1];
      if (item[_merged]) {
        // Draw the baseline hull first.
        ctx.lineWidth = 0.25 * ooScale;
        ctx.setLineDash([lineDash]);
        ctx.beginPath();
        ctx.moveTo(pLast.x, pLast.y);
        for (var i = 0; i < length; i++) {
          var pi = path[i];
          ctx.lineTo(pi.x, pi.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.lineWidth = 2 * ooScale;
        path = item[_merged];
        length = path.length;
        pLast = path[length - 1];
      }
      ctx.beginPath();
      ctx.moveTo(pLast.x, pLast.y);
      for (var i = 0; i < length; i++) {
        var pi = path[i];
        ctx.lineTo(pi.x, pi.y);
      }
      ctx.lineWidth = 2;
      // if (mode == normalMode)
      //   ctx.fill();
      ctx.stroke();
      drawKnobby(this, knobbyRadius, item[_center]);
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
          hitInfo = null;
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
        var beziers = item[_beziers], length = beziers.length,
            dMin = Number.MAX_VALUE, iMin = -1;
        var d = [];
        for (var i = 0; i < length; i++) {
          var b = beziers[i];
          var result = geometry.hitTestCurveSegment(b[0], b[1], b[2], b[3], localP, tol);
          if (result && result.d < dMin) {
            d.push(result.d);
            iMin = i;
            dMin = result.d;
          }
        }
        if (iMin >= 0) {
          hitInfo = { curve: true, index: iMin };
        }
      }
      break;
    // case 'group':
    //   var path = item[_path];
    //   if (!path) {
    //     hitInfo = diagrams.hitTestDisk(0, 0, 16, localP, tol);
    //   } else {
    //     var extents = item[_extents];
    //     if (hitKnobby(0, 0, knobbyRadius, localP)) {
    //       hitInfo = { relocator: true };
    //     } else if (hitKnobby(extents.xmax, 0, knobbyRadius, localP)) {
    //       hitInfo = { resizer: true };
    //     } else if (mode == normalMode) {
    //       hitInfo = diagrams.hitTestConvexHull(path, localP, tol);
    //     }
    //   }
    //   break;
    case 'group':
      if (mode == normalMode) {
        var path = item[_path];
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
}

Editor.prototype.initialize = function(canvasController) {
  var self = this,
      model = this.model;

  this.canvasController = canvasController;
  this.canvas = canvasController.canvas;
  this.ctx = canvasController.ctx;
  if (!this.renderer)
    this.renderer = new Renderer(canvasController.theme);

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
        // {
        //   type: 'group',
        //   id: 3,
        //   x: 40,
        //   y: 100,
        //   scale: 1,
        //   rotation: 0,
        //   items: [],
        // },
      ]
    }
  }

  function initialize(item) {
    if (item.type == 'edge') {
      self.updateAttachedEdgeAngles(item);
    } else if (item.type == 'group') {
      item[_center] = self.getStableCenter(item);
    }
  }

  dataModels.observableModel.extend(palette);
  dataModels.hierarchicalModel.extend(palette);
  dataModels.transformableModel.extend(palette);
  invalidatingModel.extend(palette);
  palette.dataModel.addInitializer(initialize);
  palette.dataModel.initialize();
  palette.invalidatingModel.invalidateAll();

  dataModels.openingModel.extend(model);
  model.openingModel.open(this.board.items[0]);

  editingModel.extend(model);
  invalidatingModel.extend(model);

  model.dataModel.addInitializer(initialize);
  model.dataModel.initialize();
  model.invalidatingModel.invalidateAll();

  this.visible_ = new Set();
}

Editor.prototype.isPaletteItem = function(item) {
  var hierarchicalModel = this.palette.hierarchicalModel;
  return hierarchicalModel.getParent(item) === this.palette.root;
}

Editor.prototype.addTemporaryItem = function(item) {
  this.model.observableModel.changeValue(this.board, 'temporary', item);
}

Editor.prototype.removeTemporaryItem = function(item) {
  if (this.getTemporaryItem())
    return this.model.observableModel.changeValue(this.board, 'temporary', null);
}

Editor.prototype.getTemporaryItem = function() {
  return this.board.temporary;
}

Editor.prototype.draw = function() {
  var visible = this.visible_,
      renderer = this.renderer, ctx = this.ctx,
      canvasController = this.canvasController,
      model = this.model,
      hierarchicalModel = model.hierarchicalModel,
      editingModel = model.editingModel,
      palette = this.palette;

  this.updateGeometry(model);
  this.updateVisibility(model);
  renderer.beginDraw(model, ctx);
  canvasController.applyTransform();
  visit(this.board, function(item) {
    if (visible.has(item))
      renderer.drawItem(item, normalMode);
  });

  this.model.selectionModel.forEach(function(item) {
    renderer.drawItem(item, highlightMode);
  });
  if (this.hotTrackInfo)
    renderer.drawItem(this.hotTrackInfo.item, hotTrackMode);
  renderer.endDraw();

  this.updateGeometry(palette);
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
  var visible = this.visible_,
      renderer = this.renderer,
      canvasController = this.canvasController,
      cp = canvasController.viewToCanvas(p),
      scale = canvasController.scale,
      zoom = Math.max(scale.x, scale.y),
      tol = this.hitTolerance, cTol = tol / zoom,
      model = this.model,
      editingModel = model.editingModel,
      hitList = [];
  function pushInfo(info) {
    if (info)
      hitList.push(info);
  }

  reverseVisit(this.palette.root, function(item) {
    pushInfo(renderer.hitTest(item, p, tol, normalMode));
  });

  reverseVisit(this.board, function(item) {
    if (visible.has(item))
      pushInfo(renderer.hitTest(item, cp, cTol, normalMode));
  });
  return hitList;
}

function isUnselected(hitInfo, model) {
  var item = hitInfo.item;
  return !model.hierarchicalModel.isItemInSelection(item);
}

Editor.prototype.getFirstHit = function(hitList, filterFn) {
  // TODO items which are selected should have preference.
  if (hitList) {
    var model = this.model, length = hitList.length;
    for (var i = 0; i < length; i++) {
      var hitInfo = hitList[i];
      if (!filterFn || filterFn(hitInfo, model))
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
      mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList);
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

Editor.prototype.onDoubleClick = function(p) {
  var model = this.model,
      shiftKeyDown = this.canvasController.shiftKeyDown,
      hitList = this.hitTest(p),
      mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList);
  if (mouseHitInfo) {
    if (!model.selectionModel.contains(mouseHitInfo.item) && !shiftKeyDown)
      model.selectionModel.clear();
    if (!this.isPaletteItem(mouseHitInfo.item))
      model.selectionModel.add(mouseHitInfo.item);

    model.openingModel.open(mouseHitInfo.item);
  }
  return mouseHitInfo != null;
}

Editor.prototype.onBeginDrag = function(p0) {
  if (!this.mouseHitInfo)
    return;
  var self = this,
      mouseHitInfo = this.mouseHitInfo,
      dragItem = mouseHitInfo.item,
      model = this.model,
      observableModel = model.observableModel,
      transformableModel = model.transformableModel,
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
        if (mouseHitInfo.resizer) {
          drag = { type: 'resizeDisk', name: 'Resize disk', vector: vector };
        } else if (mouseHitInfo.center) {
          drag = { type: 'moveSelection', name: 'Move items' };
        }
        break;
      case 'point':
        drag = { type: 'moveSelection', name: 'Move items' };
        break;
      case 'edge':
        // Direction/scale vector, in parent space.
        if (mouseHitInfo.p1) {
          drag = { type: 'p1', name: 'Edit edge' };
        } else if (mouseHitInfo.p2) {
          drag = { type: 'p2', name: 'Edit edge' };
        } else if (dragItem.attached) {
          drag = { type: 'dragAttachedEdge', name: 'Edit edge' };
        } else {
          drag = { type: 'moveSelection', name: 'Move items' };
        }
        break;
      // case 'group':
      //   // Direction/scale vector, in parent space.
      //   var vector = geometry.matMulVec({ x: dragItem[_extents].xmax, y: 0 }, transform);
      //   if (mouseHitInfo.resizer) {
      //     drag = { type: 'resizeGroup', name: 'Resize group', vector: vector };
      //   } else if (mouseHitInfo.relocator) {
      //     drag = { type: 'relocateGroup', name: 'Relocate group origin', vector: vector };
      //   } else {
      //     drag = { type: 'moveSelection', name: 'Move items' };
      //   }
      //   break;
      case 'group':
        drag = { type: 'moveSelection', name: 'Move items' };
        break;
    }
  }

  // Update centers of any affected groups.
  function updateCenters(item) {
    if (isGroup(item)) {
      item[_center] = self.getStableCenter(item);
      // Attached edges should update their angles to the new group center.
      item.items.forEach(function(subItem) {
        if (isEdge(subItem) && subItem.attached) {
          self.updateAttachedEdgeAngles(subItem);
        }
      });
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

    if (drag.type == 'moveSelection') {
      visit(model.root, updateCenters);
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

Editor.prototype.moveItem = function(item, parentDrag) {
  var model = this.model, observableModel = model.observableModel,
      snapshot = model.transactionModel.getSnapshot(item);
  observableModel.changeValue(item, 'x', snapshot.x + parentDrag.x);
  observableModel.changeValue(item, 'y', snapshot.y + parentDrag.y);
}

Editor.prototype.getStableCenter = function(item) {
  var model = this.model, selectionModel = model.selectionModel,
      subItems = item.items, count = 0,
      cx = 0, cy = 0;
  // Calculate center from contained disks that are not selected.
  subItems.forEach(function(subItem) {
    if (subItem.type != 'disk' || selectionModel.contains(subItem))
      return;
    count++;
    cx += subItem.x;
    cy += subItem.y;
  });
  if (count) {
    cx /= count;
    cy /= count;
  }
  return { x: cx, y: cy };
}

function adjustAngle(angle) {
  var twoPi = Math.PI * 2;
  while (angle < 0)
    angle += twoPi;
  while (angle > twoPi)
    angle -= twoPi;
  return angle;
}

Editor.prototype.updateAttachedEdgePositions = function(edge) {
  var model = this.model,
      observableModel = model.observableModel,
      hierarchicalModel = model.hierarchicalModel,
      parent = hierarchicalModel.getParent(edge),
      hull = parent[_path],
      center = parent[_center],
      p1 = geometry.angleToConvexHull(hull, center, edge[_a1]),
      p2 = geometry.angleToConvexHull(hull, center, edge[_a2]),
      dx = p2.x - p1.x,
      dy = p2.y - p1.y;
  if (Math.abs(edge.x - p1.x) > 0.000001)
    observableModel.changeValue(edge, 'x', p1.x);
  if (Math.abs(edge.y - p1.y) > 0.000001)
    observableModel.changeValue(edge, 'y', p1.y);
  if (Math.abs(edge.dx - dx) > 0.000001)
    observableModel.changeValue(edge, 'dx', dx);
  if (Math.abs(edge.dy - dy) > 0.000001)
    observableModel.changeValue(edge, 'dy', dy);
}

Editor.prototype.getAngleWRTParent = function(item, p) {
  var model = this.model,
      parent = model.hierarchicalModel.getParent(item);
  if (parent && parent.type == 'group') {
    var center = parent[_center],
        angle = geometry.getAngle(p.x - center.x, p.y - center.y);
    return angle;
  }
}

Editor.prototype.updateAttachedEdgeAngles = function(edge) {
  var a1 = this.getAngleWRTParent(edge, edge),
      a2 = this.getAngleWRTParent(edge, { x: edge.x + edge.dx, y: edge.y + edge.dy }),
      da = a2 - a1,
      flipped = (da > 0 && da < Math.PI) || (da < 0 && da < -Math.PI);
  edge[_a1] = a1;
  edge[_a2] = a2;
  edge[_flipped] = flipped;
}

Editor.prototype.onDrag = function(p0, p) {
  var self = this,
      drag = this.drag,
      dragItem = drag.item,
      model = this.model,
      observableModel = model.observableModel,
      transactionModel = model.transactionModel,
      hierarchicalModel = model.hierarchicalModel,
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

    // case 'resizeGroup':
    //   var vector = drag.vector, parentDrag = drags.parentDrag,
    //       dx = vector.x + parentDrag.x, dy = vector.y + parentDrag.y,
    //       rotation = Math.atan2(-dy, dx),
    //       scale = Math.sqrt(dx * dx + dy * dy);
    //   observableModel.changeValue(dragItem, 'rotation', rotation);
    //   // model.observableModel.changeValue(dragItem, 'scale', scale);
    //   break;

    // case 'relocateGroup':
    //   var snapshot = transactionModel.getSnapshot(dragItem);
    //   this.moveItem(dragItem, drags.parentDrag);
    //   // Move contents by equal and opposite amount.
    //   dragItem.items.forEach(function(item) {
    //     var drags = self.calcDrags(item, model, cp, cp0),
    //         parentDrag = drags.parentDrag,
    //         inverse = { x: -parentDrag.x, y: -parentDrag.y };
    //     self.moveItem(item, inverse);
    //   });
    //   break;

    case 'p1':
      if (dragItem.attached) {
        dragItem[_a1] = self.getAngleWRTParent(dragItem, drags.parentMouse);
        self.updateAttachedEdgePositions(dragItem);
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
        dragItem[_a2] = self.getAngleWRTParent(dragItem, drags.parentMouse);
        self.updateAttachedEdgePositions(dragItem);
      } else {
        var snapshot = transactionModel.getSnapshot(dragItem),
            parentDrag = drags.parentDrag,
            dx = snapshot.dx + parentDrag.x, dy = snapshot.dy + parentDrag.y;
        observableModel.changeValue(dragItem, 'dx', dx);
        observableModel.changeValue(dragItem, 'dy', dy);
      }
      break;

    case 'dragAttachedEdge':
      var parentClick = drags.parentClick, parentMouse = drags.parentMouse,
          group = hierarchicalModel.getParent(dragItem),
          center = group[_center], cx = center.x, cy = center.y,
          angle0 = geometry.getAngle(parentClick.x - cx, parentClick.y - cy),
          angle = geometry.getAngle(parentMouse.x - cx, parentMouse.y - cy),
          da = angle - angle0,
          snapshot = transactionModel.getSnapshot(dragItem),
          a1 = geometry.getAngle(snapshot.x - cx, snapshot.y - cy),
          a2 = geometry.getAngle((snapshot.x + snapshot.dx) - cx,
                                 (snapshot.y + snapshot.dy) - cy);

      dragItem[_a1] = adjustAngle(a1 + da),
      dragItem[_a2] = adjustAngle(a2 + da);
      self.updateAttachedEdgePositions(dragItem);
      break;
  }
  this.hotTrackInfo = (hitInfo && hitInfo.item !== this.board) ? hitInfo : null;
}

Editor.prototype.onEndDrag = function(p) {
  var self = this,
      drag = this.drag,
      model = this.model,
      board = this.board,
      dataModel = model.dataModel,
      observableModel = model.observableModel,
      transactionModel = model.transactionModel,
      selectionModel = model.selectionModel,
      editingModel = model.editingModel,
      newItem = this.removeTemporaryItem();
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
      if (isGroupItem(newItem) && !isGroup(parent)) {
        // Items that can't be added without being wrapped in a group.
        var group = {
          type: 'group',
          x: x,
          y: y,
          items: [ newItem ],
        };
        dataModel.assignId(group);
        dataModel.initialize(group);
        newItem.x = 0;
        newItem.y = 0;
        newItem = group;
        model.openingModel.open(newItem);
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
              x: 0.5,
              y: 0,
            }
          ],
        }
        dataModel.assignId(edge);
        dataModel.initialize(edge);
        newItem = edge;
        model.openingModel.open(newItem);
      }

      if (newItem.type === 'point') {
        var index = hitInfo.p1 ? 0 : hitInfo.p2 ? parent.items.length : hitInfo.index;
        editingModel.addPoint(newItem, parent, index);
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
            self.updateAttachedEdgeAngles(dragItem);
            self.updateAttachedEdgePositions(dragItem);
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

// Update item visibility.
Editor.prototype.updateVisibility = function(model) {
  var root = model.root,
      hierarchicalModel = model.hierarchicalModel,
      openItem = model.openingModel.openItem(),
      visible = this.visible_;

  // Update paths for primitive hull items and form hulls
  function update(item) {
    // Update visibility of internal items based on the open item.
    if (item.type === 'disk') {
      if (hierarchicalModel.getParent(item) === openItem)
        visible.add(item);
    } else if (item.type == 'edge') {
      if (!item.attached || hierarchicalModel.getParent(item) === openItem)
        visible.add(item);
    } else if (item.type === 'point') {
      var edge = hierarchicalModel.getParent(item);
      if (edge === openItem || hierarchicalModel.getParent(edge) === openItem)
        visible.add(item);
    } else {
      visible.add(item);
    }
  }

  visible.clear();
  visit(root, update);
}

// Updates edge based on dx and dy.
Editor.prototype.updateEdge = function(edge) {
  var transformableModel = this.model.transformableModel,
      dx = edge.dx, dy = edge.dy;
  edge.rotation = Math.atan2(-dy, dx);
  edge.scale = Math.sqrt(dx * dx + dy * dy);
  transformableModel.update(edge);
}

Editor.prototype.updateFreeEdge = function(edge) {
  this.updateEdge(edge);
  // Make the control point array for the curve.
  var cps = edge.items,
      points = [{ x: 0, y: 0 }, { x: 0, y: 0 }].concat(cps);
  points.push({ x: 1, y: 0 });
  points.push({ x: 1, y: 0 });
  var pLength = points.length,
      first = points[0], last = points[pLength - 1];

  // Create quadratics at each end that we use to extrapolate first and
  // last control points so that the curve appears most natural.
  var q0 = geometry.makeInterpolatingQuadratic(points[3], points[2], points[1]),
      q1 = geometry.makeInterpolatingQuadratic(
               points[pLength - 4], points[pLength - 3], points[pLength - 2]),
      c0 = geometry.evaluateQuadratic(q0, 2),
      c1 = geometry.evaluateQuadratic(q1, 2);
  first.x = c0.x;
  first.y = c0.y;
  last.x = c1.x;
  last.y = c1.y;
  var beziers = geometry.generateInterpolatingBeziers(points);
  edge[_beziers] =  beziers;
}

// Compute length of hull segment (i0, t0, i1, t1)
// Compute bezier samples
// length of segment per sample
// for bezier samples, get hull pt, normal
// offset

// function offsetPointsFromHull(points, hull, i0, t0, i1, t1) {
//   var hLength = hull.length,
//       l0 = hull[i0].length, accum = l0 * t0, d = -accum;
//   // Get the length of the hull segment.
//   for (var i = i0; i != i1; ) {
//     d += hull[i].length;
//     i++;
//     if (i == hLength)
//       i = 0;
//   }
//   d += hull[i1].length * t1;

//   var pLength = points.length,
//       j = i0, hj = hull[i0], lastX = 0;
//   for (var i = 0; i < pLength; i++) {
//     var pi = points[i],
//         dx = pi.x - lastX,
//         nx = hj.nx, ny = hj.ny,
//         offset = pi.y,
//         t = accum / hj.length;
//     lastX = pi.x;
//     pi.x = hj.x + t * -ny * hj.length - offset * nx;
//     pi.y = hj.y + t * nx * hj.length - offset * ny;

//     accum += d * dx;
//     while (accum > hj.length) {
//       accum -= hj.length;
//       j++;
//       if (j == hLength)
//         j = 0;
//       hj = hull[j];
//     }
//   }
// }

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

Editor.prototype.updateAttachedEdge = function(edge, parent, attachments) {
  // Make the control point array for the curve.
  var cps = edge.items,
      points = [{ x: 0, y: 0 }, { x: 0, y: 0 }].concat(cps);
  points.push({ x: 1, y: 0 });
  points.push({ x: 1, y: 0 });
  var pLength = points.length,
      first = points[0], last = points[pLength - 1];

  // Update x, y, dx, and dy for attachment.
  this.updateAttachedEdgeAngles(edge);
  var a1 = edge[_a1], a2 = edge[_a2];
  this.updateAttachedEdgePositions(edge);
  this.updateEdge(edge);
  var hull = parent[_path],
      center = parent[_center],
      a1 = edge[_a1],
      a2 = edge[_a2],
      p1 = geometry.angleToConvexHull(hull, center, a1),
      p2 = geometry.angleToConvexHull(hull, center, a2);

  var transformableModel = this.model.transformableModel,
      inverseLocal = transformableModel.getInverseLocal(edge),
      flipped = edge[_flipped],
      f = flipped ? 1024 : -1024,  // TODO fix magic number
      n1 = geometry.matMulPt({ x: p1.x + p1.ny * f, y: p1.y - p1.nx * f }, inverseLocal),
      n2 = geometry.matMulPt({ x: p2.x - p2.ny * f, y: p2.y + p2.nx * f }, inverseLocal);
  first.x = n1.x;
  first.y = n1.y;
  last.x = n2.x;
  last.y = n2.y;
  if (!flipped) {
    var temp = p1; p1 = p2; p2 = temp;
  }
  attachments.push({ item: edge, start: p1.i1, startT: p1.t, end: p2.i1, endT: p2.t });

  var beziers = geometry.generateInterpolatingBeziers(points);
  edge[_beziers] =  beziers;
  var path = sampleBeziers(beziers, 0.01);  // TODO fix magic number
  var local = transformableModel.getLocal(edge);
  for (var i = 0; i < path.length; i++)
    path[i] = geometry.matMulPt(path[i], local);
  edge[_path] = path;
  // edge[_extents] = geometry.getExtents(edge[_path]);
}

// function visitHullSegments(hull, segments, segFn) {
//   var length = segments.length;
//   if (!length) {
//     segFn(0, hull.length - 1, false);
//   } else {
//     var startI = segments[length - 1].i1;
//     for (var i = 0; i < length; i++) {
//       var segI = segments[i];
//       segFn(startI, segI.i0, false);
//       segFn(segI.i0, segI.i1, true);
//       startI = segI.i1;
//     }
//   }
// }

// Paths are computed in the local space of the item, translated when combining.
Editor.prototype.updateGeometry = function(model) {
  var self = this, root = model.root,
      hierarchicalModel = model.hierarchicalModel,
      transformableModel = model.transformableModel,
      referencingModel = model.referencingModel,
      invalidatingModel = model.invalidatingModel;

  // Update paths for primitive hull items and form hulls
  function update(item) {
    if (!invalidatingModel.isInvalid(item))
      return;

    invalidatingModel.reset(item);

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
        item[_path] = points;
        item[_extents] = geometry.getExtents(points);
        break;

      case 'edge':
        // Update unattached edges. Attached edges must be updated after their
        // containing group's hull.
        if (!item.attached)
          self.updateFreeEdge(item);
        break;

      case 'group':
        // Transform points from subItems into parent space.
        var points = [], subItems = item.items;
        subItems.forEach(function(subItem) {
          // HACK for now, only disks contribute to hull.
          if (item.type == 'group' && (subItem.type !== 'disk' && subItem.type !== 'group'))
            return;
          var path = subItem[_path];
          var localTransform = transformableModel.getLocal(subItem);
          path.forEach(function(p) {
            var localP = geometry.matMulPtNew(p, localTransform);
            localP.item = subItem;
            points.push(localP);
          });
        });
        if (points.length > 0) {
          var hull = geometry.getConvexHull(points),
              center = item[_center],
              segments = [],
              extents = geometry.getExtents(hull);
          geometry.annotateConvexHull(hull, center);
          // geometry.visitHullEdges(hull, function(p0, p1, i0, i1) {
          //   if (p0.item != p1.item)
          //     segments.push({ i0: i0, i1: i1 });
          // });

          // if (item.type == 'group')
          //   geometry.insetConvexHull(hull, -16);
        } else {
          // Empty group.
          return;
        }

        item[_path] = hull;
        // item[_segments] = segments;
        // visitHullSegments(hull, segments, function(i0, i1, breaks) {
        //   console.log(i0, i1, breaks);
        // });
        item[_extents] = extents;

        var attachments = [];
        subItems.forEach(function(subItem) {
          if (subItem.type == 'edge' && subItem.attached) {
            self.updateAttachedEdge(subItem, item, attachments);
          }
        });

        item[_merged] = null;

        var path = item[_path], pLength = path.length;
        if (attachments.length === 0)
          break;

        attachments.sort(function(a, b) {
          var d = a.start - b.start;
          if (d)
            return d;
          return a.startT - b.startT;
        });
        var aLength = attachments.length, aLast = attachments[aLength - 1],
            wrapped = false,
            merged = [];
        for (var i = 0; i < attachments.length; i++) {
          var ai = attachments[i];
          // First, add edges between this start and the previous end.
          for (var j = aLast.end; j != ai.start; ) {
            merged.push(path[j]);
            j++;
            if (j === pLength) {
              wrapped = true;
              j = 0;
            }
          }
          // Now add the attachment's path.
          var aiPath = ai.item[_path], aipLength = aiPath.length;
          if (ai.item[_flipped]) {
            for (var j = 0; j < aipLength; j++)
              merged.push(aiPath[j]);
          } else {
            for (var j = aipLength - 1; j >= 0; j--)
              merged.push(aiPath[j]);
          }
          if (ai.end < ai.start)
            wrapped = true;
          aLast = ai;
        }
        if (!wrapped) {
          var last = aLast.start - 1;
          if (last < 0) last = pLength - 1;
          for (var j = attachments[0].end; j != last; ) {
            merged.push(path[j]);
            j++;
            if (j === pLength) j = 0;
          }
        }
        item[_merged] = merged;
        break;
    }
  }

  reverseVisit(root, update);
}

Editor.prototype.exportPaths = function(item) {
  var self = this,
      transformableModel = this.model.transformableModel,
      type, path, children, result;
  if (item.type === 'board' || item.type === 'group') {
    type = 'node';
    if (item[_path])
      path = item[_path];
    children = [];
    item.items.forEach(function(item) {
      var result = self.exportPaths(item);
      if (result)
        children.push(result);
    });
  } else if (item.type === 'edge') {
    if (item[_path]) {
      type = 'openPath';
      path = item[_path];
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
      shiftKey = e.shiftKey,
      handled = false;

  if (keyCode == 8) {  // 'delete'
    editingModel.doDelete();
    handled = true;
  } else if (cmdKey) {
    switch (keyCode) {
      case 65:  // 'a'
        board.items.forEach(function(v) {
          selectionModel.add(v);
        });
        handled = true;
        break;
      case 90:  // 'z'
        if (transactionHistory.getUndo()) {
          selectionModel.clear();
          transactionHistory.undo();
        }
        handled = true;
        break;
      case 89:  // 'y'
        if (transactionHistory.getRedo()) {
          selectionModel.clear();
          transactionHistory.redo();
        }
        handled = true;
        break;
      case 88:  // 'x'
        editingModel.doCut();
        handled = true;
        break;
      case 67:  // 'c'
        editingModel.doCopy();
        handled = true;
        break;
      case 86:  // 'v'
        if (editingModel.getScrap()) {
          editingModel.doPaste();
        }
        handled = true;
        break;
      case 69:  // 'e'
        var pathData = this.exportPaths(board);
        var text = JSON.stringify(pathData, null, 2);
        // Writes path data as JSON to console.
        console.log(text);
        handled = true;
        break;
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
        handled = true;
        break;
    }
  }

  return handled;
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
      "type": "group",
      "x": 349.9001125051177,
      "y": 168.11528218818455,
      "items": [
        {
          "type": "disk",
          "x": 6.986624825670276,
          "y": 7.010254300319438,
          "scale": 143.04708471058007,
          "rotation": -0.020979888118177793,
          "id": 155
        },
        {
          "type": "disk",
          "x": -2.0102543003194455,
          "y": 351.0053500697319,
          "scale": 100.97263113715321,
          "rotation": -0.13919765280920743,
          "id": 158
        },
        {
          "type": "disk",
          "x": -26,
          "y": 722,
          "scale": 16,
          "rotation": 0,
          "id": 160
        },
        {
          "type": "disk",
          "x": 353,
          "y": -18,
          "scale": 98.2496819333274,
          "rotation": -0.07130746478529032,
          "id": 162
        },
        {
          "type": "disk",
          "x": 424,
          "y": 723,
          "scale": 16,
          "rotation": 0,
          "id": 164
        },
        {
          "type": "edge",
          "x": -112.30198218681394,
          "y": 259.45929501126784,
          "dx": 36.7421296339452,
          "dy": 263.5322981854388,
          "items": [
            {
              "type": "point",
              "x": 0.8586541248238833,
              "y": -0.10125092364212429
            }
          ],
          "id": 170,
          "attached": true
        },
        {
          "type": "edge",
          "x": 352.2860668794466,
          "y": -116.43960686799036,
          "dx": -335.62438377561693,
          "dy": -19.265666747150107,
          "items": [
            {
              "type": "point",
              "x": 0.6768783835077514,
              "y": -0.08863759325418824
            }
          ],
          "id": 173,
          "attached": true
        },
        {
          "type": "edge",
          "x": 375.98573035787376,
          "y": -18.000000000000114,
          "dx": 25,
          "dy": 756,
          "items": [
            {
              "type": "point",
              "x": 0.045094884081776365,
              "y": -0.043669294632918465,
              "id": 181
            },
            {
              "type": "point",
              "x": 0.14451439367590585,
              "y": -0.05214616165729591
            }
          ],
          "id": 179
        },
        {
          "type": "group",
          "x": 196.43483957083708,
          "y": 42.472023241335705,
          "items": [
            {
              "type": "disk",
              "x": 0,
              "y": 0,
              "scale": 32.2442705585308,
              "rotation": 0.031460999539714665,
              "id": 166
            }
          ],
          "id": 167
        },
        {
          "type": "group",
          "x": 323.5478716566695,
          "y": 143.21404463189072,
          "items": [
            {
              "type": "disk",
              "x": 0,
              "y": 0,
              "scale": 32.2442705585308,
              "rotation": 0.031460999539714665,
              "id": 190
            }
          ],
          "id": 191
        },
        {
          "type": "group",
          "x": 303.7191073621823,
          "y": 41.22943932519274,
          "items": [
            {
              "type": "disk",
              "x": 0,
              "y": 0,
              "scale": 32.2442705585308,
              "rotation": 0.031460999539714665,
              "id": 186
            }
          ],
          "id": 187
        },
        {
          "type": "group",
          "x": 218.29214314957653,
          "y": 140.39954997952947,
          "items": [
            {
              "type": "disk",
              "x": 0,
              "y": 0,
              "scale": 32.2442705585308,
              "rotation": 0.031460999539714665,
              "id": 188
            }
          ],
          "id": 189
        },
        {
          "type": "group",
          "x": 80.58926509491909,
          "y": 602.7767150748746,
          "items": [
            {
              "type": "disk",
              "x": 0,
              "y": 0,
              "scale": 12.828789023078684,
              "rotation": 0,
              "id": 193
            },
            {
              "type": "disk",
              "x": 52,
              "y": 16,
              "scale": 6.03758756324316,
              "rotation": -0.03752628679378855,
              "id": 196
            }
          ],
          "id": 194
        },
        {
          "type": "group",
          "x": 161.64497749225598,
          "y": 601.0452615546664,
          "items": [
            {
              "type": "disk",
              "x": 101.70526633126246,
              "y": -1.8121205582408493,
              "scale": 12.828789023078684,
              "rotation": 0,
              "id": 200
            },
            {
              "type": "disk",
              "x": 52,
              "y": 16,
              "scale": 6.03758756324316,
              "rotation": -0.03752628679378855,
              "id": 201
            }
          ],
          "id": 202
        },
        {
          "type": "edge",
          "x": -16.749644232489516,
          "y": 434.1340507990395,
          "dx": 98.64359721338347,
          "dy": 153.11742538573264,
          "items": [
            {
              "type": "point",
              "x": 0.41667036412677283,
              "y": 0.26622735155418703,
              "id": 214
            },
            {
              "type": "point",
              "x": 0.5176963243631012,
              "y": 0.3219534794382075,
              "id": 215
            },
            {
              "type": "point",
              "x": 0.6307780353251482,
              "y": 0.2801409390026643,
              "id": 216
            }
          ],
          "id": 217
        },
        {
          "type": "group",
          "x": 30.27191858861653,
          "y": 422.6134836496286,
          "items": [
            {
              "type": "disk",
              "x": 0,
              "y": 0,
              "scale": 16,
              "rotation": 0,
              "id": 219
            },
            {
              "type": "disk",
              "x": 1.1368683772161603e-13,
              "y": 101.04502975357673,
              "scale": 16,
              "rotation": 0,
              "id": 222
            },
            {
              "type": "disk",
              "x": 53.26309041879426,
              "y": 120.29296164146393,
              "scale": 16,
              "rotation": 0,
              "id": 224
            }
          ],
          "id": 220
        }
      ],
      "id": 156
    }
  ]
}
