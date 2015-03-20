// Statecharts module.

'use strict';

var statecharts = (function() {

  // Utilities.
  function isPseudostate(item) {
    return item.type == 'start';
  }

  function isState(item) {
    return item.type == 'state' || item.type == 'circuit' || isPseudostate(item);
  }

  function isTrueState(item) {
    return item.type == 'state' || item.type == 'circuit';
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
    if (!filterFn || filterFn(item))
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
    if (!filterFn || filterFn(item))
      itemFn(item);
  }

//------------------------------------------------------------------------------

  var editingModel = (function() {
    var functions = {
      reduceSelection: function () {
        var model = this.model;
        model.selectionModel.set(model.hierarchicalModel.reduceSelection());
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
        this.getConnectedTransitions(items, false).forEach(function(item) {
          this.deleteItem(item);
        }, this);
        items.forEach(function(item) {
          this.deleteItem(item);
        }, this);
      },

      doDelete: function() {
        this.reduceSelection();
        this.prototype.doDelete.call(this);
      },

      copyItems: function(items, map) {
        var model = this.model, dataModel = model.dataModel,
            transformableModel = model.transformableModel,
            connectedTransitions = this.getConnectedTransitions(items, true),
            copies = this.prototype.copyItems(items.concat(connectedTransitions), map);

        items.forEach(function(item) {
          var copy = map.find(dataModel.getId(item));
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
        // TODO circuits should participate in layout.
        if (state.type == 'circuit')
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

  var normalMode = 1,
      highlightMode = 2,
      hotTrackMode = 4;

  var stateMinWidth = 100,
      stateMinHeight = 60;

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
    this.knobbyRadius = 4;
    this.padding = 8;
    this.stateMinWidth = stateMinWidth;
    this.stateMinHeight = stateMinHeight;

    this.hitTolerance = 8;
  }

  Renderer.prototype.getStateRect = function(state) {
    var transform = this.transformableModel.getAbsolute(state),
        x = transform[4], y = transform[5], master = state.master,
        w, h;
    if (master) {
      w = master.width;
      h = master.height;
    } else {
      w = state.width;
      h = state.height;
    }
    if (w && h)
      return { x: x, y: y, width: w, height: h };

    return { x: x, y: y };
  }

  Renderer.prototype.statePointToParam = function(state, p) {
    var r = this.radius, rect = this.getStateRect(state);
    if (rect.width && rect.height)
      return diagrams.rectPointToParam(rect.x, rect.y, rect.width, rect.height, p);

    return diagrams.circlePointToParam(rect.x + r, rect.y + r, p);
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

  Renderer.prototype.beginDraw = function() {
    var ctx = this.ctx;
    ctx.save();
    ctx.font = '14px sans-serif';
  }

  Renderer.prototype.endDraw = function() {
    this.ctx.restore();
  }

  Renderer.prototype.updateCircuitMaster = function(master) {
    var ctx = this.ctx,
        textSize = this.textSize, knobbyRadius = this.knobbyRadius,
        name = master.name, inputs = master.inputs, outputs = master.outputs,
        inputsLength = inputs.length, outputsLength = outputs.length,
        rows = Math.max(inputsLength, outputsLength),
        height = rows * textSize,
        gutter = 2 * knobbyRadius + 4,
        maxWidth = 0;
    if (name) {
      maxWidth = ctx.measureText(name).width;
      height += textSize;
    }
    for (var i = 0; i < rows; i++) {
      var inWidth = (i < inputsLength) ? ctx.measureText(inputs[i].name).width : 0,
          outWidth = (i < outputsLength) ? ctx.measureText(outputs[i].name).width : 0,
          width = inWidth + 16 + outWidth,
          maxWidth = Math.max(maxWidth, width);
    }
    master.width = gutter + maxWidth + gutter;
    master.height = height;
  }

  Renderer.prototype.drawItem = function(item) {
    if (isState(item))
      this.drawState(item);
    else if (isTransition(item))
      this.drawTransition(item);
  }

  function drawKnobby(renderer, x, y) {
    var r = renderer.knobbyRadius, d = 2 * r;
    renderer.ctx.strokeRect(x - r, y - r, d, d);
  }

  function drawArrow(renderer, x, y) {
    ctx.beginPath();
    diagrams.arrowPath({ x: x, y: y, nx: -1, ny: 0 }, ctx, renderer.arrowSize);
    ctx.stroke();
  }

  function drawState(renderer, state, mode) {
    var ctx = renderer.ctx, theme = renderer.theme,
        r = renderer.radius, rect = renderer.getStateRect(state),
        type = state.type,
        x = rect.x, y = rect.y, w = rect.width, h = rect.height;
    renderer.makeStatePath(rect);
    if (mode & normalMode) {
      ctx.fillStyle = theme.bgColor;
      ctx.fill();
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 1;
    } else if (mode & highlightMode) {
      ctx.strokeStyle = theme.highlightColor;
      ctx.lineWidth = 2;
    } else if (mode & hotTrackMode) {
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2;
    }
    ctx.stroke();

    if (type == 'state') {
      var textSize = renderer.textSize,
          lineBase = y + textSize + renderer.textLeading,
          knobbyRadius = renderer.knobbyRadius;
      if (mode & normalMode) {
        ctx.beginPath();
        ctx.moveTo(x, lineBase);
        ctx.lineTo(x + w, lineBase);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = theme.textColor;
        ctx.fillText(state.name, x + r, y + textSize);

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
        // Render knobbies, faintly.
        ctx.lineWidth = 0.25;
      }
      drawKnobby(renderer, x + w - knobbyRadius, y + r + knobbyRadius);
      drawArrow(renderer, x + w + renderer.arrowSize, lineBase);
    } else if (type == 'circuit') {
    } else if (type == 'start') {
      if (mode & normalMode) {
        ctx.fillStyle = theme.strokeColor;
        ctx.fill();
        // Render knobbies, faintly.
        ctx.lineWidth = 0.25;
      }
      drawArrow(renderer, x + 2 * r + renderer.arrowSize, y + r);
    }
  }

  Renderer.prototype.drawState = function(state) {
    drawState(this, state, normalMode);
  }

  Renderer.prototype.drawStateHighlight = function(state) {
    drawState(this, state, highlightMode);
  }

  Renderer.prototype.drawStateHotTrack = function(state) {
    drawState(this, state, hotTrackMode);
  }

  Renderer.prototype.updateTransition = function(transition) {
    var referencingModel = this.model.referencingModel,
        v1 = referencingModel.resolveReference(transition, 'srcId'),
        v2 = referencingModel.resolveReference(transition, 'dstId'),
        p1 = transition._p1, p2 = transition._p2;

    if (v1)
      p1 = this.stateParamToPoint(v1, transition.t1);
    if (v2)
      p2 = this.stateParamToPoint(v2, transition.t2);

    transition._bezier = diagrams.getEdgeBezier(p1, p2);
    transition._mid = EvaluateCurveSegment(transition._bezier, 0.5);
  }

  function drawTransition(renderer, transition, mode) {
    var ctx = renderer.ctx, theme = renderer.theme,
        textSize = renderer.textSize,
        mid = transition._mid;
    if (mode & normalMode) {
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 1;
    }
    if (mode & highlightMode) {
      ctx.strokeStyle = theme.highlightColor;
      ctx.lineWidth = 2;
    }
    if (mode & hotTrackMode) {
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2;
    }
    diagrams.bezierEdgePath(transition._bezier, ctx, renderer.arrowSize);
    ctx.stroke();
  }

  Renderer.prototype.drawTransition = function(transition) {
    drawTransition(this, transition, normalMode);
  }

  Renderer.prototype.drawTransitionHighlight = function(transition) {
    drawTransition(this, transition, normalMode | highlightMode);
  }

  Renderer.prototype.drawTransitionHotTrack = function(transition) {
    drawTransition(this, transition, hotTrackMode);
  }

  Renderer.prototype.getStateMinSize = function(state) {
    var ctx = this.ctx, r = this.radius,
        width = this.stateMinWidth, height = this.stateMinHeight,
        metrics;
    if (state.type != 'state')
      return;
    width = Math.max(width, ctx.measureText(state.name).width + 2 * r);
    height = Math.max(height, this.textSize + this.textLeading);
    return { width: width, height: height };
  }

  Renderer.prototype.hitTestItem = function(item, p) {
    if (isStateOrStatechart(item))
      return this.hitTestStateOrStatechart(item, p);
    if (isTransition(item))
      return this.hitTestTransition(item, p);
  }

  Renderer.prototype.hitTestStateOrStatechart = function(state, p) {
    var tol = this.hitTolerance, r = this.radius,
        rect = this.getStateRect(state),
        x = rect.x, y = rect.y, w = rect.width, h = rect.height,
        hitInfo;
    if (w && h) {
      var lineBase = y + this.textSize + this.textLeading,
          knobbyRadius = this.knobbyRadius;
      if (diagrams.hitPoint(x + w + this.arrowSize, lineBase, p, tol))
        hitInfo = { arrow: true };
      else
        hitInfo = diagrams.hitTestRect(x, y, w, h, p, tol); // TODO hitTestRoundRect
    } else {
      if (diagrams.hitPoint(x + 2 * r + this.arrowSize, y + r, p, tol))
        hitInfo = { arrow: true };
      else
        hitInfo = diagrams.hitTestDisk(x + r, y + r, r, p, tol);
    }

    if (hitInfo) {
      hitInfo.item = state;
    }
    return hitInfo;
  }

  Renderer.prototype.hitTestTransition = function(transition, p) {
    var hitInfo = diagrams.hitTestBezier(transition._bezier, p, this.hitTolerance);
    if (hitInfo)
      hitInfo.item = transition;
    return hitInfo;
  }

  Renderer.prototype.drawHoverText = function(item, p) {
    var self = this, theme = this.theme,
        props = [];
    this.model.dataModel.visitProperties(item, function(item, attr) {
      var value = item[attr];
      if (Array.isArray(value))
        return;
      props.push({ name: attr, value: value });
    });
    var x = p.x, y = p.y,
        textSize = this.textSize, gap = 16, border = 4,
        height = textSize * props.length + 2 * border,
        maxWidth = diagrams.measureNameValuePairs(props, gap, ctx) + 2 * border;
    ctx.fillStyle = theme.hoverColor;
    ctx.fillRect(x, y, maxWidth, height);
    ctx.fillStyle = theme.hoverTextColor;
    props.forEach(function(prop) {
      ctx.textAlign = 'left';
      ctx.fillText(prop.name, x + border, y + textSize);
      ctx.textAlign = 'right';
      ctx.fillText(prop.value, x + maxWidth - border, y + textSize);
      y += textSize;
    });
  }

//------------------------------------------------------------------------------

  function Editor(model, renderer) {
    var self = this;
    this.model = model;
    this.statechart = model.root;
    this.renderer = renderer;

    editingModel.extend(model);

    var circuitTypes = {
      event: {
        name: 'Event',
        inputs: [
          { /* name: '' */ type: 'bool' },
        ],
        outputs: [],
      },
      or: {
        name: 'or',
        inputs: [
          { /* name: '', */ type: 'bool' },
          { /* name: '', */ type: 'bool' },
          { /* name: '', */ type: 'bool' },
        ],
        outputs: [
          { /* name: '', */ type: 'bool' },
        ],
      },
    };

    var palette = this.palette = {
      root: {
        type: 'palette',
        x: 0,
        y: 0,
        items: [
          {
            type: 'start',
            x: 72,
            y: 8,
          },
          {
            type: 'state',
            x: 32,
            y: 30,
            width: 100,
            height: 60,
            name: 'New State',
          },
          {
            type: 'circuit',
            x: 32,
            y: 104,
            master: circuitTypes.event,
          },
          {
            type: 'circuit',
            x: 16,
            y: 160,
            master: circuitTypes.or,
          },
        ]
      }
    }

    dataModels.observableModel.extend(palette);
    dataModels.hierarchicalModel.extend(palette);
    dataModels.transformableModel.extend(palette);
  }

  Editor.prototype.initialize = function(canvasController) {
    this.canvasController = canvasController;
    this.canvas = canvasController.canvas;
    this.ctx = canvasController.ctx;

    if (!this.renderer)
      this.renderer = new Renderer(this.model, ctx, canvasController.theme);
    var renderer = this.renderer;
    this.palette.root.items.forEach(function(item) {
      if (item.type == 'circuit') {
        renderer.updateCircuitMaster(item.master);
      }
    })
  }

  Editor.prototype.validateLayout = function() {
    this.model.editingModel.validateLayout(this.renderer);
  }

  Editor.prototype.isPaletteItem = function(item) {
    var hierarchicalModel = this.palette.hierarchicalModel;
    return hierarchicalModel.getParent(item) === this.palette.root;
  }

  Editor.prototype.addTemporaryItem = function(item) {
    if (isTransition(item))
      this.renderer.updateTransition(item);
    this.model.observableModel.changeValue(this.statechart, 'temporary', item);
  }

  Editor.prototype.removeTemporaryItem = function(item) {
    var statechart = this.statechart;
    return this.model.observableModel.changeValue(statechart, 'temporary', null);
  }

  Editor.prototype.getTemporaryItem = function() {
    return this.statechart.temporary;
  }

  Editor.prototype.draw = function() {
    var renderer = this.renderer, statechart = this.statechart,
        model = this.model, palette = this.palette,
        ctx = this.ctx, canvasController = this.canvasController;
    renderer.beginDraw();
    canvasController.applyTransform();
    visit(palette.root, isTransition, function(transition) {
      renderer.updateTransition(transition);
    });
    visit(statechart, isTransition, function(transition) {
      renderer.updateTransition(transition);
    });

    visit(statechart, isState, function(state) {
      renderer.drawState(state);
    });
    visit(statechart, isTransition, function(transition) {
      renderer.drawTransition(transition);
    });

    model.selectionModel.forEach(function(item) {
      if (isState(item))
        renderer.drawStateHighlight(item);
      else
        renderer.drawTransitionHighlight(item);
    });
    if (this.hotTrackInfo)
      renderer.drawStateHotTrack(this.hotTrackInfo.item);
    renderer.endDraw();

    renderer.beginDraw();
    ctx.fillStyle = renderer.theme.altBgColor;
    ctx.fillRect(palette.root.x, palette.root.y, 160, 300);
    palette.root.items.forEach(function(item) {
      renderer.drawItem(item);
    });
    renderer.endDraw();

    var temporary = this.getTemporaryItem();
    if (temporary) {
      renderer.beginDraw();
      canvasController.applyTransform();
      if (isTransition(temporary))
        renderer.updateTransition(temporary);
      renderer.drawItem(temporary);
      renderer.endDraw();
    }

    var hoverHitInfo = this.hoverHitInfo;
    if (hoverHitInfo) {
      renderer.beginDraw();
      renderer.drawHoverText(hoverHitInfo.item, hoverHitInfo.p);
      renderer.endDraw();
    }
  }

  Editor.prototype.hitTest = function(p) {
    var renderer = this.renderer,
        cp = this.canvasController.viewToCanvas(p),
        statechart = this.statechart, model = this.model,
        palette = this.palette,
        hitList = [];
    function pushInfo(info) {
      if (info)
        hitList.push(info);
    }
    reverseVisit(palette.root, null, function(item) {
      pushInfo(renderer.hitTestItem(item, p));
    });
    reverseVisit(statechart, isTransition, function(transition) {
      pushInfo(renderer.hitTestTransition(transition, cp));
    });
    reverseVisit(statechart, isStateOrStatechart, function(item) {
      pushInfo(renderer.hitTestStateOrStatechart(item, cp));
    });
    return hitList;
  }

  Editor.prototype.getFirstHit = function(hitList, filterFn) {
    var model = this.model, length = hitList.length;
    for (var i = 0; i < length; i++) {
      var hitInfo = hitList[i];
      if (filterFn(hitInfo, model))
        return hitInfo;
    }
    return null;
  }

  function isStateBorder(hitInfo, model) {
    return isState(hitInfo.item) && hitInfo.border || hitInfo.arrow;
  }

  function isDraggable(hitInfo, model) {
    return !isStatechart(hitInfo.item);
  }

  function isDropTarget(hitInfo, model) {
    var item = hitInfo.item;
    return isStateOrStatechart(item) &&
           !model.hierarchicalModel.isItemInSelection(item);
  }

  Editor.prototype.onClick = function(p) {
    var model = this.model,
        selectionModel = model.selectionModel,
        shiftKeyDown = this.canvasController.shiftKeyDown,
        hitList = this.hitTest(p),
        mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList, isDraggable);
    if (mouseHitInfo) {
      var item = mouseHitInfo.item;
      if (this.isPaletteItem(item)) {
        selectionModel.clear();
      } else if (!selectionModel.contains(item)) {
        if (!shiftKeyDown)
          selectionModel.clear();
        selectionModel.add(item);
      }
    } else {
      if (!shiftKeyDown) {
        selectionModel.clear();
      }
    }
    return mouseHitInfo != null;
  }

  Editor.prototype.onBeginDrag = function() {
    var mouseHitInfo = this.mouseHitInfo;
    if (!mouseHitInfo)
      return false;
    var dragItem = mouseHitInfo.item, type = dragItem.type,
        model = this.model,
        drag = null;
    if (this.isPaletteItem(dragItem)) {
      // Clone palette item and add the clone to the top level statechart. Don't
      // notify observers yet.
      dragItem = model.instancingModel.clone(dragItem);
      this.addTemporaryItem(dragItem);
      drag = {
        type: 'paletteItem',
        name: 'Add new ' + dragItem.type,
        isNewItem: true,
      }
      var cp = this.canvasController.viewToCanvas({ x: dragItem.x, y: dragItem.y });
      dragItem.x = cp.x;
      dragItem.y = cp.y;
    } else {
      switch (type) {
        case 'state':
        case 'start':
        case 'circuit':
          if (mouseHitInfo.arrow) {
            var stateId = model.dataModel.getId(dragItem);
            // Start the new transition as connecting the src state to itself.
            dragItem = {
              type: 'transition',
              srcId: stateId,
              t1: 0,
              dstId: stateId,
              t2: 0,
            };
            model.dataModel.assignId(dragItem),
            this.addTemporaryItem(dragItem);
            drag = {
              type: 'connectingP2',
              name: 'Add new transition',
              isNewItem: true,
            };
          } else if (type == 'state' && mouseHitInfo.border) {
            drag = { type: 'resizeState', name: 'Resize state' };
          } else {
            drag = { type: 'moveSelection', name: 'Move selection' };
          }
          break;
        case 'transition':
          if (mouseHitInfo.p1)
            drag = { type: 'connectingP1', name: 'Edit transition' };
          else if (mouseHitInfo.p2)
            drag = { type: 'connectingP2', name: 'Edit transition' };
          break;
      }
    }
    this.drag = drag;
    if (drag) {
      if (drag.type == 'moveSelection')
        this.model.editingModel.reduceSelection();
      drag.item = dragItem;
      this.valueTracker = new dataModels.ValueChangeTracker(model);
    }
  }

  Editor.prototype.onDrag = function(p0, p) {
    var drag = this.drag;
    if (!drag)
      return;
    var dragItem = drag.item,
        model = this.model,
        dataModel = model.dataModel,
        observableModel = model.observableModel,
        referencingModel = model.referencingModel,
        selectionModel = model.selectionModel,
        renderer = this.renderer,
        canvasController = this.canvasController,
        cp0 = canvasController.viewToCanvas(p0),
        cp = canvasController.viewToCanvas(p),
        dx = cp.x - cp0.x, dy = cp.y - cp0.y,
        valueTracker = this.valueTracker,
        mouseHitInfo = this.mouseHitInfo,
        snapshot = valueTracker.getSnapshot(drag.item),
        hitList = this.hitTest(p), hitInfo,
        srcState, dstState, srcStateId, dstStateId, t1, t2;
    switch (drag.type) {
      case 'paletteItem':
        if (isState(dragItem))
          hitInfo = this.getFirstHit(hitList, isDropTarget);
        var snapshot = valueTracker.getSnapshot(dragItem);
        if (snapshot) {
          observableModel.changeValue(dragItem, 'x', snapshot.x + dx);
          observableModel.changeValue(dragItem, 'y', snapshot.y + dy);
        }
        break;
      case 'moveSelection':
        if (isState(dragItem))
          hitInfo = this.getFirstHit(hitList, isDropTarget);
        selectionModel.forEach(function(item) {
          var snapshot = valueTracker.getSnapshot(item);
          if (snapshot) {
            observableModel.changeValue(item, 'x', snapshot.x + dx);
            observableModel.changeValue(item, 'y', snapshot.y + dy);
          }
        });
        break;
      case 'resizeState':
        if (mouseHitInfo.left) {
          observableModel.changeValue(dragItem, 'x', snapshot.x + dx);
          observableModel.changeValue(dragItem, 'width', snapshot.width - dx);
        }
        if (mouseHitInfo.top) {
          observableModel.changeValue(dragItem, 'y', snapshot.y + dy);
          observableModel.changeValue(dragItem, 'height', snapshot.height - dy);
        }
        if (mouseHitInfo.right)
          observableModel.changeValue(dragItem, 'width', snapshot.width + dx);
        if (mouseHitInfo.bottom)
          observableModel.changeValue(dragItem, 'height', snapshot.height + dy);
        break;
      case 'connectingP1':
        hitInfo = this.getFirstHit(hitList, isStateBorder);
        srcStateId = hitInfo ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'srcId', srcStateId);
        srcState = referencingModel.getReference(dragItem, 'srcId');
        if (srcState) {
          t1 = renderer.statePointToParam(srcState, cp);
          observableModel.changeValue(dragItem, 't1', t1);
        } else {
          dragItem._p1 = cp;
        }
        break;
      case 'connectingP2':
        if (drag.isNewItem) {
          srcState = referencingModel.getReference(dragItem, 'srcId');
          observableModel.changeValue(dragItem, 't1', renderer.statePointToParam(srcState, cp));
        }
        hitInfo = this.getFirstHit(hitList, isStateBorder);
        dstStateId = hitInfo ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'dstId', dstStateId);
        dstState = referencingModel.getReference(dragItem, 'dstId');
        if (dstState) {
          t2 = renderer.statePointToParam(dstState, cp);
          observableModel.changeValue(dragItem, 't2', t2);
        } else {
          dragItem._p2 = cp;
        }
        break;
    }

    this.hotTrackInfo = (hitInfo && hitInfo.item !== this.statechart) ? hitInfo : null;
  }

  Editor.prototype.onEndDrag = function(p) {
    var drag = this.drag;
    if (!drag)
      return;
    var dragItem = drag.item,
        model = this.model,
        statechart = this.statechart,
        observableModel = model.observableModel,
        hierarchicalModel = model.hierarchicalModel,
        selectionModel = model.selectionModel,
        transactionModel = model.transactionModel,
        editingModel = model.editingModel,
        newItem = this.removeTemporaryItem();
    // Any temporary item has been removed before starting the transaction.
    transactionModel.beginTransaction(drag.name);

    if (isTransition(dragItem)) {
      dragItem._p1 = dragItem._p2 = null;
      if (newItem) {
        observableModel.insertElement(
            statechart, statechart.items, statechart.items.length - 1, newItem);
      }
    } else if (newItem || drag.type == 'moveSelection') {
      // Find state beneath mouse.
      var hitList = this.hitTest(p),
          hitInfo = this.getFirstHit(hitList, isDropTarget),
          parent = statechart;
      if (hitInfo)
        parent = hitInfo.item;
      // Add new items.
      if (newItem) {
        editingModel.addItem(newItem, null, parent);
        selectionModel.set([newItem]);
      } else {
        // Reparent existing items.
        selectionModel.forEach(function(item) {
          if (isState(item)) {
            var oldParent = hierarchicalModel.getParent(item);
            if (oldParent != parent)
              editingModel.addItem(item, oldParent, parent);
          }
        });
      }
    }

    this.validateLayout();
    this.valueTracker.end();
    this.valueTracker = null;

    // If dragItem is a disconnected transition, delete it.
    if (isTransition(dragItem)) {
      if (!dragItem.srcId || !dragItem.dstId) {
        editingModel.deleteItem(dragItem);
        selectionModel.remove(dragItem);
      }
    }

    model.transactionModel.endTransaction();

    this.drag = null;
    this.mouseHitInfo = null;
    this.hotTrackInfo = null;
    this.mouseHitInfo = null;
  }

  Editor.prototype.onBeginHover = function(p) {
    var model = this.model,
        hitList = this.hitTest(p),
        hoverHitInfo = this.getFirstHit(hitList, isDraggable);
    if (!hoverHitInfo)
      return false;
    hoverHitInfo.p = p;
    this.hoverHitInfo = hoverHitInfo;
    return true;
  }

  Editor.prototype.onEndHover = function(p) {
    if (this.hoverHitInfo)
      this.hoverHitInfo = null;
  }

  Editor.prototype.onKeyDown = function(e) {
    var model = this.model,
        statechart = this.statechart,
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
          statechart.items.forEach(function(v) {
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
        case 83:  // 's'
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
      "srcId": 1003,
      "t1": 1.4019607843137254,
      "dstId": 1007,
      "t2": 2.3
    }
  ]
}
