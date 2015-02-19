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
          var parentItems = parent.items,
              lastStatechart = parentItems[parentItems.length - 1];
          itemToAdd = this.createStatechart(item);
          itemToAdd.y = lastStatechart.y + lastStatechart.height;
          item.y = 16;
          // TODO determine horizontal / vertical flow direction from item
          // position in statechart.
        }
        if (oldParent !== parent) {
          if (oldParent)            // if null, it's a new item.
            this.deleteItem(item);  // notifies observer
          parent.items.push(itemToAdd);
          model.observableModel.onElementInserted(parent, parent.items, parent.items.length - 1);
        }
      },

      // Adjust statechart bounds to contain its child items.
      validateStatechart: function(statechart, renderer) {
        var items = statechart.items;
        if (items && items.length) {
          // Get extents of child states.
          var d = 2 * renderer.radius, padding = renderer.padding;
          var xMin = Number.MAX_VALUE,
              yMin = Number.MAX_VALUE,
              xMax = Number.MIN_VALUE,
              yMax = Number.MIN_VALUE;
          items.forEach(function(state) {
            var x = state.x, y = state.y;
            xMin = Math.min(xMin, x);
            yMin = Math.min(yMin, y);
            xMax = Math.max(xMax, x + (state.width || d));
            yMax = Math.max(yMax, y + (state.height || d));
          });
          // Add padding.
          xMin -= padding;
          yMin -= padding;
          xMax += padding;
          yMax += padding;

          if (xMin < 0) {
            xMax -= xMin;
            for (var i = 0; i < items.length; i++)
              items[i].x -= xMin;
          }
          if (yMin < 0) {
            yMax -= yMin;
            for (var i = 0; i < items.length; i++)
              items[i].y -= yMin;
          }
          statechart.x = 0;
          statechart.y = 0;
          statechart.width = xMax;
          statechart.height = yMax;
        }
      },

      validateState: function(state, renderer) {
        if (!isTrueState(state))
          return;
        var minSize = renderer.getStateMinSize(state);
        state.width = Math.max(state.width || 0, minSize.width);
        state.height = Math.max(state.height || 0, minSize.height);

        var items = state.items;
        if (items && items.length) {
          // Position the statecharts within the parent state.
          // TODO handle horizontal flow.
          var width = 0;
          items.forEach(function(item) {
            width = Math.max(width, item.width);
          });
          if (state.width < width)
            state.width = width;

          var length = items.length, statechartOffsetY = 0;
          for (var i = 0; i < length; i++) {
            var statechart = items[i];
            statechart.y = statechartOffsetY;
            statechart.width = state.width;
            statechartOffsetY += statechart.height;
          }

          if (state.height < statechartOffsetY)
            state.height = statechartOffsetY;
          // Expand the last statechart to fill its parent state.
          items[length - 1].height += state.height - statechartOffsetY;
        }
      },

      validateLayout: function(renderer) {
        var statechart = this.statechart,
            padding = renderer.padding,
            self = this;
        reverseVisit(statechart, isStateOrStatechart, function(item) {
          if (isState(item))
            self.validateState(item, renderer);
          else if (isStatechart(item))
            self.validateStatechart(item, renderer);
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
    this.model = model;
    this.transformableModel = this.model.transformableModel;
    this.ctx = ctx;
    this.theme = theme || diagrams.theme.create();

    this.radius = 8;
    this.textSize = 16;
    this.textIndent = 8;
    this.textLeading = 6;
    this.arrowSize = 8;
    this.padding = 8;
    this.stateMinWidth = 100;
    this.stateMinHeight = 60;
    this.knobbySize = 4;

    this.hitTolerance = 8;

    this.bgColor = theme.bgColor;
    this.strokeColor = theme.strokeColor;
    this.textColor = theme.textColor;
  }

  Renderer.prototype.getStateRect = function(state) {
    var transform = this.transformableModel.getAbsolute(state),
        x = transform[4], y = transform[5], w = state.width, h = state.height;
    if (w && h)
      return { x: x, y: y, width: w, height: h };

    return { x: x, y: y };
  }

  Renderer.prototype.measureText = function(text) {
    return this.ctx.measureText(text).width;
  }

  Renderer.prototype.statePointToParam = function(state, p) {
    var r = this.radius, rect = this.getStateRect(state);
    if (rect.width && rect.height)
      return diagrams.rectPointToParam(rect.x, rect.y, rect.width, rect.height, p);

    return diagrams.rectPointToParam(rect.x, rect.y, 2 * r, 2 * r, p);
    //TODO circlePointToParam
  }

  Renderer.prototype.stateParamToPoint = function(state, t) {
    var r = this.radius, rect = this.getStateRect(state);
    if (rect.width && rect.height)
      return diagrams.roundRectParamToPoint(
          rect.x, rect.y, rect.width, rect.height, r, t);

    return diagrams.circleParamToPoint(rect.x + r, rect.y + r, r, t);
  }

  Renderer.prototype.makeStatePath = function(rect) {
    var ctx = this.ctx, r = this.radius,
        x = rect.x, y = rect.y, w = rect.width, h = rect.height;
    if (w && h)
      diagrams.roundRectPath(x, y, w, h, r, ctx);
    else
      diagrams.diskPath(x + r, y + r, r, ctx);
  }

  Renderer.prototype.strokeState = function(state) {
    var ctx = this.ctx, r = this.radius,
        rect = this.getStateRect(state);
    this.makeStatePath(rect);
    ctx.stroke();
  }

  Renderer.prototype.beginDraw = function() {
    var ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = 1;
    ctx.font = '16px sans-serif';
  }

  Renderer.prototype.endDraw = function() {
    this.ctx.restore();
  }

  Renderer.prototype.drawState = function(state) {
    var ctx = this.ctx, r = this.radius, rect = this.getStateRect(state),
        type = state.type,
        x = rect.x, y = rect.y, w = rect.width, h = rect.height;
    this.makeStatePath(rect);
    ctx.fillStyle = this.bgColor;
    ctx.fill();
    ctx.stroke();

    if (type == 'state') {
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

  Renderer.prototype.updateTransition = function(transition, endPt) {
    var referencingModel = this.model.referencingModel,
        v1 = referencingModel.resolveReference(transition, 'srcId'),
        v2 = referencingModel.resolveReference(transition, 'dstId'),
        t1 = transition.t1,
        t2 = transition.t2,
        p1, p2;
    if (v1)
      transition._p1 = p1 = this.stateParamToPoint(v1, t1);
    else
      transition._p1 = endPt;
    if (v2)
      transition._p2 = p2 = this.stateParamToPoint(v2, t2);
    else
      transition._p2 = endPt;
    if (v1 || v2)
      transition._bezier = diagrams.getEdgeBezier(p1, p2, endPt);

    // Measure label text and calculate text position.
    var labelWidth = this.measureText(transition.event),
        textSize = this.textSize;
    transition._labelWidth = labelWidth;

    if (v1 && v2) {
      var mid = EvaluateCurveSegment(transition._bezier, 0.5);
      transition.x = mid.x - labelWidth / 2;
      transition.y = mid.y - textSize / 2;
    } else if (v1) {
      var p = transition._p1;
      transition.x = p.x;
      transition.y = p.y - textSize / 2;
    } else if (v2) {
      var p = transition._p2;
      transition.x = p.x - labelWidth;
      transition.y = p.y - textSize / 2;
    }
  }

  Renderer.prototype.makeTransitionPath = function(transition) {
    diagrams.edgePath(transition._bezier, this.ctx, this.arrowSize);
  }

  Renderer.prototype.drawTransition = function(transition) {
    var ctx = this.ctx, textSize = this.textSize, textColor = this.textColor,
        srcId = transition.srcId, dstId = transition.dstId,
        x = transition.x, y = transition.y, labelWidth = transition._labelWidth,
        p1 = transition._p1, p2 = transition._p2,
        bgColor = this.bgColor;
    function drawText(text, x, y) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, labelWidth, textSize);
      ctx.fillStyle = textColor;
      ctx.fillText(text, x, y + textSize);
    }
    ctx.save();
    if (p1 && p2) {
      this.makeTransitionPath(transition);
      ctx.stroke();
      drawText(transition.event, x, y);
    } else if (p1) {
      ctx.translate(p1.x, p1.y);
      ctx.rotate(geometry.getAngle(p1.nx, -p1.ny));
      drawText(transition.event, 0, 0);
    } else if (p2) {

    }
    ctx.restore();
  }

  Renderer.prototype.strokeTransition = function(transition) {
    var ctx = this.ctx;
    this.makeTransitionPath(transition);
    ctx.stroke();
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
    var rect = this.getStateRect(state),
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

  Renderer.prototype.hitTestStateOrStatechart = function(state, p) {
    var tol = this.hitTolerance, r = this.radius,
        rect = this.getStateRect(state),
        x = rect.x, y = rect.y, w = rect.width, h = rect.height,
        hitInfo;
    if (w && h)
      hitInfo = diagrams.hitTestRect(x, y, w, h, r, p, tol);
    else
      hitInfo = diagrams.hitTestDisk(x + r, y + r, r, p, tol);

    if (hitInfo)
      hitInfo.item = state;
    return hitInfo;
  }

  Renderer.prototype.hitTestTransition = function(transition, p) {
    var hitInfo = diagrams.hitTestBezier(transition._bezier, p, this.hitTolerance);
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
          // {
          //   type: 'transition',
          //   x: 32,
          //   y: 200,
          //   event: 'Event',
          //   srcId: 0,
          //   t1: 0,
          //   dstId: 0,
          //   t2: 0,
          // },
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

  Editor.prototype.validateLayout = function() {
    this.model.editingModel.validateLayout(this.renderer);
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
      renderer.drawState(state);
    });
    visit(statechart, isTransition, function(transition) {
      renderer.drawTransition(transition);
    });

    ctx.lineWidth = 2;
    ctx.strokeStyle = renderer.theme.highlightColor;
    model.selectionModel.forEach(function(item) {
      if (isState(item)) {
        renderer.drawKnobbies(item);
        renderer.strokeState(item);
      } else {
        renderer.strokeTransition(item);
      }
    });
    if (this.hotTrackInfo) {
      ctx.strokeStyle = renderer.theme.hotTrackColor;
      renderer.strokeState(this.hotTrackInfo.item);
    }
    renderer.endDraw();

    renderer.beginDraw();
    palette.root.items.forEach(function(item) {
      if (isState(item))
        renderer.drawState(item);
      else if (isTransition(item))
        renderer.drawTransition(item);
    });
    renderer.endDraw();
  }

  Editor.prototype.hitTest = function(p) {
    var renderer = this.renderer,
        statechart = this.statechart, model = this.model,
        palette = this.palette,
        hitList = [];
    function pushInfo(info) {
      if (info)
        hitList.push(info);
    }
    reverseVisit(palette.root, isState, function(state) {
      pushInfo(renderer.hitTestStateOrStatechart(state, p));
    });
    reverseVisit(statechart, isTransition, function(transition) {
      pushInfo(renderer.hitTestTransition(transition, p));
    });
    reverseVisit(statechart, isStateOrStatechart, function(item) {
      pushInfo(renderer.hitTestStateOrStatechart(item, p));
      // if (model.selectionModel.contains(state)) {
      //   switch (renderer.hitKnobby(state, p)) {
      //     case 'transition':
      //       hitInfo = { item: state, transition: true };
      //       break;
      //     default:
      //       hitInfo = renderer.hitTestState(state, p);
      //       break;
      //   }
      // } else {
      //   hitInfo = renderer.hitTestState(state, p);
      // }
    });
    return hitList;
  }

  Editor.prototype.getFirstHit = function(hitList, filterFn) {
    var model = this.model, length = hitList.length;
    for (var i = 0; i < length; i++) {
      var hitInfo = hitList[i];
      if (filterFn(hitInfo.item, model))
        return hitInfo;
    }
    return null;
  }

  function isDraggable(item, model) {
    return !isStatechart(item);
  }

  function isUnselectedDropTarget(item, model) {
    return isStateOrStatechart(item) &&
           !model.hierarchicalModel.isItemInSelection(item);
  }

  function isHotTrackDropTarget(item, model) {
    // We don't want to hot track the root statechart.
    return model.root != item &&
           isUnselectedDropTarget(item, model);
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
        hitList = this.hitTest(p),
        srcState, dstState, srcStateId, dstStateId, t1, t2;
    switch (drag.type) {
      case 'moveSelection':
        var hitInfo = this.hotTrackInfo = this.getFirstHit(hitList, isHotTrackDropTarget);
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
        hitInfo = this.hotTrackInfo = this.getFirstHit(hitList, isState);
        srcStateId = hitInfo && hitInfo.border ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'srcId', srcStateId);
        srcState = referencingModel.getReference(dragItem, 'srcId');
        if (srcState) {
          t1 = renderer.statePointToParam(srcState, p);
          observableModel.changeValue(dragItem, 't1', t1);
        }
        break;
      case 'connectingP2':
        if (drag.isNewItem) {
          srcState = referencingModel.getReference(dragItem, 'srcId');
          t1 = renderer.statePointToParam(srcState, p);
          observableModel.changeValue(dragItem, 't1', t1);
        }
        hitInfo = this.hotTrackInfo = this.getFirstHit(hitList, isState);
        dstStateId = hitInfo && hitInfo.border ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'dstId', dstStateId);
        dstState = referencingModel.getReference(dragItem, 'dstId');
        if (dstState) {
          t2 = renderer.statePointToParam(dstState, p);
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
        selectionModel = model.selectionModel,
        hitList = this.hitTest(p);
    // Remove any item that have been temporarily added before starting the
    // transaction.
    var newItem = drag.isNewItem ? model.editingModel.removeTemporaryItem() : null;

    model.transactionModel.beginTransaction(drag.name);

    if (drag.type == 'moveSelection') {
      // Find state beneath mouse.
      var hitInfo = this.getFirstHit(hitList, isUnselectedDropTarget);
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

    this.validateLayout();
    this.valueTracker.end();
    this.valueTracker = null;

    // if (isTransition(drag.item)) {
    //   var transition = drag.item;
    //   if (!transition.srcId || !transition.dstId) {
    //     model.editingModel.deleteItem(transition);
    //     model.selectionModel.remove(transition);
    //   }
    // }

    model.transactionModel.endTransaction();

    this.drag = null;
    this.mouseHitInfo = null;
    this.hotTrackInfo = null;
  }

  Editor.prototype.onMouseDown = function(e) {
    var model = this.model,
        mouseController = this.mouseController,
        hitList = this.hitTest(mouseController.getMouse()),
        mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList, isDraggable);
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
  "width": 853,
  "height": 430,
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
          "width": 300,
          "height": 200,
          "items": [
            {
              "type": "state",
              "id": 1005,
              "x": 30,
              "y": 45,
              "width": 100,
              "height": 60,
              "name": "State_3",
              "items": []
            },
            {
              "type": "state",
              "id": 1006,
              "x": 150,
              "y": 30,
              "width": 100,
              "height": 60,
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
      "event": "Event 1",
      "srcId": 1003,
      "t1": 1.4019607843137254,
      "dstId": 1007,
      "t2": 2.3
    }
  ]
}
