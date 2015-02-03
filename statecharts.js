// Statecharts module.

'use strict';

var statecharts = (function() {

  // Utilities.
  function isState(item) {
    return item.type == 'state' || isPseudostate(item);
  }

  function isTrueState(item) {
    return item.type == 'state';
  }

  function isPseudostate(item) {
    return item.type == 'start';
  }

  function isStatechart(item) {
    return item.type == 'statechart';
  }

  function isStateOrStatechart(item) {
    return item.type != 'transition';
  }

  function isTransition(item) {
    return item.type == 'transition';
  }

  function visit(item, filterFn, itemFn) {
    if (filterFn(item))
      itemFn(item);
    var items = item.items;
    if (items) {
      var length = items.length;
      for (var i = 0; i < length; i++) {
        visit(items[i], filterFn, itemFn);
      }
    }
  }

  function reverseVisit(item, filterFn, itemFn) {
    var items = item.items;
    if (items) {
      var length = items.length;
      for (var i = length - 1; i >= 0; i--) {
        reverseVisit(items[i], filterFn, itemFn);
      }
    }
    if (filterFn(item))
      itemFn(item);
  }

//------------------------------------------------------------------------------

  var editingModel = (function() {
    var functions = {
      reduceSelection: function () {
        this.model.hierarchicalModel.reduceSelection();
      },

      getConnectedTransitions: function (states, copying) {
        var model = this.model,
            statesAndChildren = new HashSet(this.model.dataModel.getId);
        states.forEach(function(item) {
          visit(item, isState, function(item) {
            statesAndChildren.add(item);
          });
        });
        var transitions = [];
        visit(this.statechart, isTransition, function(item) {
          var contains1 = statesAndChildren.contains(item._srcId);
          var contains2 = statesAndChildren.contains(item._dstId);
          if (copying) {
            if (contains1 && contains2)
              transitions.push(item);
          } else if (contains1 || contains2) {
            transitions.push(item);
          }
        });
        return transitions;
      },

      deleteItem: function(item) {
        var model = this.model,
            hierarchicalModel = model.hierarchicalModel,
            parent = hierarchicalModel.getParent(item);
        if (parent) {
          var items = parent.items,
              length = items.length;
          for (var i = 0; i < length; i++) {
            var subItem = items[i];
            if (subItem === item) {
              model.observableModel.removeElement(parent, items, i);
              break;
            }
          }
          // If this leaves an empty statechart (except for the root), delete it.
          if (isStatechart(parent) && items.length == 0 &&
              hierarchicalModel.getParent(parent)) {
            this.deleteItem(parent);
          }
        }
      },

      deleteItems: function(items) {
        var self = this;
        this.getConnectedTransitions(items, false).forEach(function(item) {
          self.deleteItem(item);
        });
        items.forEach(function(item) {
          self.deleteItem(item);
        })
      },

      doDelete: function() {
        this.reduceSelection();
        this.prototype.doDelete.call(this);
      },

      copyItems: function(items, map) {
        var model = this.model, transformableModel = model.transformableModel,
            connectedTransitions = this.getConnectedTransitions(items, true),
            copies = this.prototype.copyItems(items.concat(connectedTransitions), map);

        var self = this;
        items.forEach(function(item) {
          var copy = map.find(self.model.dataModel.getId(item));
          if (isState(copy)) {
            var transform = transformableModel.getLocal(item);
            if (transform) {
              copy.x = transform[4];
              copy.y = transform[5];
            }
          }
        });
        return copies;
      },

      doCopy: function() {
        var selectionModel = this.model.selectionModel;
        this.reduceSelection();
        selectionModel.contents().forEach(function(item) {
          if (!isState(item))
            selectionModel.remove(item);
        });
        this.prototype.doCopy.call(this);
      },

      addItems: function(items) {
        var model = this.model, statechart = this.statechart,
            statechartItems = statechart.items;
        items.forEach(function(item) {
          statechart.items.push(item);
          model.selectionModel.add(item);
          model.observableModel.onElementInserted(statechart, statechartItems, statechartItems.length - 1);
        });
      },

      doPaste: function() {
        this.getScrap().forEach(function(item) {
          if (isState(item)) {
            item.x += 16;
            item.y += 16;
          }
        });
        this.prototype.doPaste.call(this);
      },

      addTemporaryItem: function(item) {
        var model = this.model,
            statechart = this.statechart,
            items = statechart.items;
        model.observableModel.insertElement(statechart, items, items.length, item);
      },

      removeTemporaryItem: function() {
        var model = this.model,
            statechart = this.statechart,
            items = statechart.items;
        return model.observableModel.removeElement(statechart, items, items.length - 1);
      },

      // Returns a value indicating if the item can be added to the state
      // without violating statechart constraints.
      canAddItemToStatechart: function(item, statechart) {
        function containsType(type) {
          var items = statechart.items, length = items.length;
          for (var i = 0; i < length; i++)
            if (items[i].type == type)
              return true;
          return false;
        }

        switch (item.type) {
          case 'start':
            return !containsType('start');
        }
        return true;
      },

      // Creates a new statechart to hold the given item.
      createStatechart: function(item) {
        var statechart = {
          type: 'statechart',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          name: '',
          items: [ item ],
        };
        this.model.dataModel.assignId(statechart);
        return statechart;
      },

      addItem: function(item, oldParent, parent) {
        var model = this.model, transformableModel = model.transformableModel;
        if (oldParent !== parent && isState(item)) {
          var transform = transformableModel.getAbsolute(item),
              parentTransform = transformableModel.getAbsolute(parent);
          item.x = transform[4] - parentTransform[4];
          item.y = transform[5] - parentTransform[5];
        }
        var itemToAdd = item;
        if (isState(parent)) {
          if (!parent.items || !parent.items.length) {
            parent.items = [];
            itemToAdd = this.createStatechart(item);
          } else {
            parent = parent.items[0];
            if (!parent.items)
              parent.items = [];
          }
        } else if (isStatechart(parent) &&
                   !this.canAddItemToStatechart(item, parent)) {
          parent = model.hierarchicalModel.getParent(parent);
          itemToAdd = this.createStatechart(item);
          // TODO determine horizontal / vertical layout direction from item
          // position in statechart.
        }
        if (oldParent !== parent) {
          if (oldParent)            // if null, it's a new item.
            this.deleteItem(item);  // notifies observer
          parent.items.push(itemToAdd);
          model.observableModel.onElementInserted(parent, parent.items, parent.items.length - 1);
        }
      },

      prettyPrint: function(renderer) {
        var statechart = this.statechart,
            padding = renderer.padding,
            layoutModel = this.model.layoutModel;
        reverseVisit(statechart, isStateOrStatechart, function(item) {
          var items = item.items;
          if (isTrueState(item)) {
            var minSize = renderer.getStateMinSize(item);
            item.width = Math.max(item.width || 0, minSize.width);
            item.height = Math.max(item.height || 0, minSize.height);
          }

          if (items && items.length) {
            var bounds = layoutModel.sumBounds(items, isStateOrStatechart);
            var xMin = bounds.xMin, yMin = bounds.yMin,
                xMax = bounds.xMax, yMax = bounds.yMax;
            if (isState(item)) {
              if (item.width < xMax)
                item.width = xMax;
              if (item.height < yMax)
                item.height = yMax;
              // Now layout statecharts to fill state.
              var statechartOffsetY = 0, length = items.length;
              for (var i = 0; i < length; i++) {
                var statechart = items[i];
                statechart.y = statechartOffsetY;
                statechart.width = item.width;
                if (i == length - 1)
                  statechart.height = item.height - statechartOffsetY;
                else
                  statechartOffsetY += statechart.height;
                console.log(statechart.y, statechartOffsetY);
              }
            } else if (isStatechart(item)) {
              xMin -= padding;
              yMin -= padding;
              xMax += padding;
              yMax += padding;
              item.width = xMax;
              item.height = yMax;
              if (xMin < 0) {
                item.x += xMin;
                for (var i = 0; i < items.length; i++)
                  items[i].x -= xMin;
              }
              if (yMin < 0) {
                item.y += yMin;
                for (var i = 0; i < items.length; i++)
                  items[i].y -= yMin;
              }
            }
          }
        });
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
      dataModels.layoutModel.extend(model);

      var instance = Object.create(model.editingModel);
      instance.prototype = Object.getPrototypeOf(instance);
      for (var prop in functions)
        instance[prop] = functions[prop];

      instance.model = model;
      instance.statechart = model.root;

      model.editingModel = instance;
      return instance;
    }

    return {
      extend: extend,
    }
  })();

//------------------------------------------------------------------------------

  function Renderer(model, ctx, theme) {
    diagrams.GraphRenderer.call(this, ctx, theme);
    this.model = model;
    this.transformableModel = model.transformableModel;
    this.stateMinWidth = 100;
    this.stateMinHeight = 60;
    this.knobbySize = 4;
  }

  Renderer.prototype = Object.create(diagrams.GraphRenderer.prototype);

  Renderer.prototype.getVertexRect = function(v) {
    var transform = this.transformableModel.getAbsolute(v),
        x = transform[4], y = transform[5];
    if (isStateOrStatechart(v))
      return { x: x, y: y, width: v.width, height: v.height };

    return { x: x, y: y };
  }

  Renderer.prototype.updateTransition = function(transition, endPt) {
    var referencingModel = this.model.referencingModel,
        v1 = referencingModel.resolveReference(transition, 'srcId'),
        v2 = referencingModel.resolveReference(transition, 'dstId'),
        t1 = transition.t1,
        t2 = transition.t2;
    this.updateBezier(transition, v1, t1, v2, t2, endPt);
  }

  Renderer.prototype.drawState = function(state) {
    var ctx = this.ctx, r = this.radius,
        type = state.type,
        rect = this.getVertexRect(state),
        x = rect.x, y = rect.y;
    this.drawVertex(state);
    if (type == 'state') {
      var w = state.width, h = state.height;
      ctx.beginPath();
      var lineBase = y + this.textSize + this.textLeading;
      ctx.moveTo(x, lineBase);
      ctx.lineTo(x + w, lineBase);
      ctx.stroke();

      ctx.fillStyle = this.textColor;
      ctx.fillText(state.name, x + r, y + this.textSize);

      var items = state.items;
      if (items) {
        var separatorY = y, length = items.length;
        for (var i = 0; i < length - 1; i++) {
          var statechart = items[i];
          separatorY += statechart.height;
          ctx.setLineDash([5]);
          ctx.beginPath();
          ctx.moveTo(x, separatorY);
          ctx.lineTo(x + w, separatorY);
          ctx.stroke();
          ctx.setLineDash([0]);
        }
      }
    } else if (type == 'start') {
      ctx.fillStyle = this.strokeColor;
      ctx.fill();
    }
  }

  Renderer.prototype.getStateMinSize = function(state) {
    var ctx = this.ctx, r = this.radius,
        width = this.stateMinWidth, height = this.stateMinHeight,
        metrics;
    if (state.type != 'state')
      return;
    width = Math.max(width, this.measureText(state.name) + 2 * r);
    height = Math.max(height, this.textSize + this.textLeading);
    return { width: width, height: height };
  }

  Renderer.prototype.getKnobbies = function(state) {
    var rect = this.getVertexRect(state),
        x = rect.x, y = rect.y, width = rect.width, height = rect.height,
        r = this.radius, xOffset = 2 * r,
        knobbies = {};
    if (state.type == 'state') {
      knobbies.transition = {
        x: x + width + xOffset,
        y: y + this.textSize + this.textLeading,
        nx: -1,
        ny: 0
      }
    } else {
      knobbies.transition = {
        x: x + r + r + xOffset,
        y: y + r,
        nx: -1,
        ny: 0
      }
    }
    return knobbies;
  }

  Renderer.prototype.drawKnobbies = function(state) {
    var ctx = this.ctx, knobbySize = this.knobbySize,
        knobbies = this.getKnobbies(state),
        transition = knobbies.transition;
    if (transition) {
      ctx.beginPath();
      diagrams.arrowPath(transition, ctx, this.arrowSize);
      ctx.stroke();
    }
  }

  Renderer.prototype.hitTestState = function(state, p) {
    var hitInfo = this.hitTestVertex(state, p);
    if (hitInfo) {
      hitInfo.item = state;
      if (!hitInfo.border) {
        var items = state.items;
        if (!items)
          return hitInfo;
        var rect = this.getVertexRect(state),
            x = rect.x, y = rect.y, w = rect.width, h = rect.height,
            separatorY = y,
            length = items.length;
        for (var i = 0; i < length; i++) {
          var statechart = items[i];
          separatorY += statechart.height;
          if (p.y < separatorY)
            return { item: statechart };
        }
      }
    }
    return hitInfo;
  }

  Renderer.prototype.hitTestTransition = function(transition, p) {
    var hitInfo = this.hitTestBezier(transition, p);
    if (hitInfo)
      hitInfo.item = transition;
    return hitInfo;
  }

  Renderer.prototype.hitKnobby = function(state, p) {
    var tol = this.hitTolerance + this.knobbySize,
        knobbies = this.getKnobbies(state),
        transition = knobbies.transition;
    if (transition && diagrams.hitPoint(transition.x, transition.y, p, tol))
      return 'transition';
  }

//------------------------------------------------------------------------------

  function Editor(model, theme, canvas, updateFn) {
    var self = this;
    this.model = model;
    this.statechart = model.root;
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
            type: 'start',
            x: 64,
            y: 64,
          },
          {
            type: 'state',
            x: 32,
            y: 96,
            width: renderer.stateMinWidth,
            height: renderer.stateMinHeight,
            name: 'New State',
          },
        ]
      }
    }
    dataModels.observableModel.extend(palette);
    dataModels.hierarchicalModel.extend(palette);
    dataModels.transformableModel.extend(palette);

    this.mouseController = new diagrams.MouseController();
    this.mouseController.addHandler('beginDrag', function() {
      self.beginDrag();
    });

  }

  Editor.prototype.prettyPrint = function() {
    this.model.editingModel.prettyPrint(this.renderer);
  }

  Editor.prototype.isPaletteItem = function(item) {
    var hierarchicalModel = this.palette.hierarchicalModel;
    return hierarchicalModel.getParent(item) === this.palette.root;
  }

  Editor.prototype.draw = function() {
    var self = this,
        renderer = this.renderer, statechart = this.statechart,
        model = this.model, palette = this.palette,
        ctx = this.ctx;
    var mousePt = this.mouseController.getMouse();
    mousePt.nx = mousePt.ny = 0;
    visit(statechart, isTransition, function(transition) {
      renderer.updateTransition(transition, mousePt);
    });

    renderer.beginDraw();
    visit(statechart, isState, function(state) {
      renderer.drawState(state, ctx);
    });
    visit(statechart, isTransition, function(transition) {
      renderer.drawEdge(transition, ctx);
    });

    ctx.lineWidth = 2;
    ctx.strokeStyle = renderer.theme.highlightColor;
    model.selectionModel.forEach(function(item) {
      if (isState(item)) {
        renderer.drawKnobbies(item);
        renderer.strokeVertex(item);
      } else {
        renderer.strokeEdge(item);
      }
    });
    if (this.hotTrackInfo) {
      ctx.strokeStyle = renderer.theme.hotTrackColor;
      renderer.strokeVertex(this.hotTrackInfo.item);
    }
    renderer.endDraw();

    renderer.beginDraw();
    palette.root.items.forEach(function(state) {
      renderer.drawState(state);
    });
    renderer.endDraw();
  }

  // filter functions.
  function firstHit(item, model, hitInfo) {
    return !hitInfo;
  }

  function firstStateHit(item, model, hitInfo) {
    return firstHit(item, model, hitInfo) && isState(item);
  }

  function firstUnselectedState(item, model, hitInfo) {
    var hierarchicalModel = model.hierarchicalModel,
        selectionModel = model.selectionModel;
    if (!firstStateHit(item, model, hitInfo))
      return false;
    var state = item;
    while (state) {
      if (selectionModel.contains(state))
        return false;
      state = hierarchicalModel.getParent(state);
    }
    return true;
  }

  Editor.prototype.hitTest = function(p, filterFn) {
    var renderer = this.renderer,
        statechart = this.statechart, model = this.model,
        palette = this.palette;
    var hitInfo = null;
    if (!filterFn)
      filterFn = firstHit;

    reverseVisit(palette.root, isState, function(state) {
      if (!filterFn(state, model, hitInfo))
        return;
      hitInfo = renderer.hitTestState(state, p);
    });
    if (hitInfo)
      return hitInfo;

    reverseVisit(statechart, isTransition, function(transition) {
      if (!filterFn(transition, model, hitInfo))
        return;
      hitInfo = renderer.hitTestTransition(transition, p);
    });
    if (hitInfo)
      return hitInfo;

    reverseVisit(statechart, isState, function(state) {
      if (!filterFn(state, model, hitInfo))
        return;
      if (model.selectionModel.contains(state)) {
        switch (renderer.hitKnobby(state, p)) {
          case 'transition':
            hitInfo = { item: state, transition: true };
            break;
          default:
            hitInfo = renderer.hitTestState(state, p);
            break;
        }
      } else {
        hitInfo = renderer.hitTestState(state, p);
      }
    });
    return hitInfo;
  }

  Editor.prototype.beginDrag = function() {
    if (!this.mouseHitInfo)
      return;
    var mouseHitInfo = this.mouseHitInfo,
        dragItem = mouseHitInfo.item,
        model = this.model,
        drag;
    if (this.isPaletteItem(dragItem)) {
      // Clone palette item and add the clone to the top level statechart. Don't
      // notify observers yet.
      dragItem = model.instancingModel.clone(dragItem);
      model.editingModel.addTemporaryItem(dragItem);
      model.selectionModel.set([ dragItem ]);
      drag = {
        type: 'moveSelection',
        isNewItem: true,
        name: 'Add new ' + dragItem.type,
      }
    } else if (mouseHitInfo.transition) {
      // Start a new transition from the hit state.
      dragItem = {
        type: 'transition',
        srcId: model.dataModel.getId(dragItem),  // dragItem is src state.
        t1: 0,
        dstId: 0,
        t2: 0,
      };
      model.dataModel.assignId(dragItem),
      model.editingModel.addTemporaryItem(dragItem);
      model.selectionModel.set([ dragItem ]);
      drag = {
        type: 'connectingP2',
        isNewItem: true,
        namd: 'Add new transition',
      }
    } else {
      switch (dragItem.type) {
        case 'state':
          if (mouseHitInfo.border)
            drag = { type: 'resizeState', name: 'Resize state' };
          else
            drag = { type: 'moveSelection', name: 'Move selection' };
          break;
        case 'start':
          drag = { type: 'moveSelection', name: 'Move selection' };
          break;
        case 'transition':
          if (mouseHitInfo.p1)
            drag = { type: 'connectingP1', name: 'Edit transition' };
          else
            drag = { type: 'connectingP2', name: 'Edit transition' };
          break;
      }
    }

    if (drag) {
      if (drag.type == 'moveSelection')
        model.editingModel.reduceSelection();
      drag.item = dragItem;
      this.drag = drag;
    }

    this.valueTracker = new dataModels.ValueChangeTracker(model);
  }

  Editor.prototype.doDrag = function(p, offset) {
    var drag = this.drag, dragItem = drag.item,
        model = this.model,
        dataModel = model.dataModel,
        observableModel = model.observableModel,
        referencingModel = model.referencingModel,
        selectionModel = model.selectionModel,
        renderer = this.renderer,
        valueTracker = this.valueTracker,
        mouseHitInfo = this.mouseHitInfo,
        snapshot = valueTracker.getSnapshot(drag.item),
        hitInfo, srcState, dstState, srcStateId, dstStateId, t1, t2;
    switch (drag.type) {
      case 'moveSelection':
        var hitInfo = this.hotTrackInfo = this.hitTest(p, firstUnselectedState);
        selectionModel.forEach(function(item) {
          var snapshot = valueTracker.getSnapshot(item);
          if (snapshot) {
            observableModel.changeValue(item, 'x', snapshot.x + offset.x);
            observableModel.changeValue(item, 'y', snapshot.y + offset.y);
          }
        });
        break;
      case 'resizeState':
        if (mouseHitInfo.left) {
          observableModel.changeValue(dragItem, 'x', snapshot.x + offset.x);
          observableModel.changeValue(dragItem, 'width', snapshot.width - offset.x);
        }
        if (mouseHitInfo.top) {
          observableModel.changeValue(dragItem, 'y', snapshot.y + offset.y);
          observableModel.changeValue(dragItem, 'height', snapshot.height - offset.y);
        }
        if (mouseHitInfo.right)
          observableModel.changeValue(dragItem, 'width', snapshot.width + offset.x);
        if (mouseHitInfo.bottom)
          observableModel.changeValue(dragItem, 'height', snapshot.height + offset.y);
        break;
      case 'connectingP1':
        hitInfo = this.hotTrackInfo = this.hitTest(p, firstStateHit);
        srcStateId = hitInfo && hitInfo.border ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'srcId', srcStateId);
        srcState = referencingModel.getReference(dragItem, 'srcId');
        if (srcState) {
          t1 = renderer.vertexPointToParam(srcState, p);
          observableModel.changeValue(dragItem, 't1', t1);
        }
        break;
      case 'connectingP2':
        if (drag.isNewItem) {
          srcState = referencingModel.getReference(dragItem, 'srcId');
          t1 = renderer.vertexPointToParam(srcState, p);
          observableModel.changeValue(dragItem, 't1', t1);
        }
        hitInfo = this.hotTrackInfo = this.hitTest(p, firstStateHit);
        dstStateId = hitInfo && hitInfo.border ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'dstId', dstStateId);
        dstState = referencingModel.getReference(dragItem, 'dstId');
        if (dstState) {
          t2 = renderer.vertexPointToParam(dstState, p);
          observableModel.changeValue(dragItem, 't2', t2);
        }
        break;
    }
  }

  Editor.prototype.endDrag = function() {
    var drag = this.drag,
        p = this.mouseController.getMouse(),
        model = this.model,
        statechart = this.statechart,
        selectionModel = model.selectionModel;
    // Remove any item that have been temporarily added before starting the
    // transaction.
    var newItem = drag.isNewItem ? model.editingModel.removeTemporaryItem() : null;

    model.transactionModel.beginTransaction(drag.name);

    if (drag.type == 'moveSelection') {
      // Find state beneath mouse.
      var hitInfo = this.hitTest(p, firstUnselectedState);
      var parent = statechart;
      if (hitInfo)
        parent = hitInfo.item;
      // Add new items.
      if (drag.isNewItem) {
        model.editingModel.addItem(newItem, null, parent);
      } else {
        // Reparent existing items.
        model.selectionModel.forEach(function(item) {
          if (isState(item)) {
            var oldParent = model.hierarchicalModel.getParent(item);
            if (oldParent != parent)
              model.editingModel.addItem(item, oldParent, parent);
          }
        });
      }
    } else if (isTransition(drag.item) && drag.isNewItem) {
      model.observableModel.insertElement(
          statechart, statechart.items, statechart.items.length - 1, newItem);
    }

    this.prettyPrint();
    this.valueTracker.end();
    this.valueTracker = null;

    if (isTransition(drag.item)) {
      var transition = drag.item;
      if (!transition.srcId || !transition.dstId) {
        model.editingModel.deleteItem(transition);
        model.selectionModel.remove(transition);
      }
    }

    model.transactionModel.endTransaction();

    this.drag = null;
    this.mouseHitInfo = null;
    this.hotTrackInfo = null;
  }

  Editor.prototype.getDraggableHit = function(hitInfo) {
    if (hitInfo) {
      var item = hitInfo.item;
      // Statecharts can't be dragged, move up to the parent state.
      if (isStatechart(item))
        return { item: this.model.hierarchicalModel.getParent(item) };
    }
    return hitInfo;
  }

  Editor.prototype.onMouseDown = function(e) {
    var model = this.model,
        mouseController = this.mouseController,
        mouseHitInfo = this.mouseHitInfo =
            this.getDraggableHit(this.hitTest(mouseController.getMouse()));
    mouseController.onMouseDown(e);
    if (mouseHitInfo) {
      var item = mouseHitInfo.item;
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
        statechart = this.statechart,
        selectionModel = model.selectionModel,
        editingModel = model.editingModel,
        transactionHistory = model.transactionHistory,
        updateFn = this.updateFn;

    this.shiftKeyDown = e.shiftKey;
    if (e.keyCode == 8) {
      e.preventDefault();
      editingModel.doDelete();
      updateFn(this);
    } else if (e.ctrlKey || e.metaKey) {
      if (e.keyCode == 65) {  // 'a'
        statechart.items.forEach(function(v) {
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
          statechart,
          function(key, value) {
            if (key.toString().charAt(0) == '_')
              return;
            return value;
          },
          2);
        // Writes statechart as JSON to console.
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


var statechart_data = {
  "type": "statechart",
  "id": 1001,
  "x": 0,
  "y": 0,
  "width": 845,
  "height": 422,
  "name": "Example",
  "items": [
    {
      "type": "start",
      "id": 1002,
      "x": 165,
      "y": 83
    },
    {
      "type": "state",
      "id": 1003,
      "x": 207,
      "y": 81,
      "width": 300,
      "height": 200,
      "name": "State_1",
      "items": [
        {
          "type": "statechart",
          "id": 1004,
          "x": 0,
          "y": 0,
          "width": 250,
          "height": 145,
          "items": [
            {
              "type": "state",
              "id": 1005,
              "x": 30,
              "y": 45,
              "width": 100,
              "height": 100,
              "name": "State_3",
              "items": []
            },
            {
              "type": "state",
              "id": 1006,
              "x": 150,
              "y": 30,
              "width": 100,
              "height": 100,
              "name": "State_4"
            }
          ]
        }
      ]
    },
    {
      "type": "state",
      "id": 1007,
      "x": 545,
      "y": 222,
      "width": 300,
      "height": 200,
      "name": "State_2",
      "items": []
    },
    {
      "type": "transition",
      "id": 1008,
      "srcId": 1003,
      "t1": 1.4019607843137254,
      "dstId": 1007,
      "t2": 2.3
    }
  ]
}
