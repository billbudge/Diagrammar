// Statecharts module.

'use strict';

var statecharts = (function() {

  // Utilities.
  function isPseudostate(item) {
    return item.type == 'start';
  }

  function isState(item) {
    return item.type == 'state' || isPseudostate(item);
  }

  function isTrueState(item) {
    return item.type == 'state';
  }

  function isStatechart(item) {
    return item.type == 'statechart';
  }

  function isContainer(item) {
    return item.type == 'state' || item.type == 'statechart';
  }

  function isContainable(item) {
    return item.type != 'transition' && item.type != 'wire';
  }

  function isTransition(item) {
    return item.type == 'transition';
  }

  function isWire(item) {
    return item.type == 'wire';
  }

  function isConnection(item) {
    return item.type == 'transition' || item.type == 'wire';
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

      getConnectedConnections: function (items, copying) {
        var model = this.model,
            itemsAndChildren = new HashSet(this.model.dataModel.getId);
        items.forEach(function(item) {
          visit(item, isContainable, function(item) {
            itemsAndChildren.add(item);
          });
        });
        var connections = [];
        visit(this.statechart, isConnection, function(item) {
          var contains1 = itemsAndChildren.contains(item._srcId);
          var contains2 = itemsAndChildren.contains(item._dstId);
          if (copying) {
            if (contains1 && contains2)
              connections.push(item);
          } else if (contains1 || contains2) {
            connections.push(item);
          }
        });
        return connections;
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
              model.observableModel.removeElement(parent, 'items', i);
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
        this.getConnectedConnections(items, false).forEach(function(item) {
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
            connected = this.getConnectedConnections(items, true),
            copies = this.prototype.copyItems(items.concat(connected), map);

        items.forEach(function(item) {
          var copy = map.find(dataModel.getId(item));
          if (isContainable(copy)) {
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
          statechartItems.push(item);
          model.selectionModel.add(item);
          model.observableModel.onElementInserted(statechart, 'items', statechartItems.length - 1);
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
        this.model.dataModel.initialize(statechart);
        return statechart;
      },

      setAttr: function(item, attr, value) {
        this.model.observableModel.changeValue(item, attr, value);
      },

      addItem: function(item, oldParent, parent) {
        var model = this.model, transformableModel = model.transformableModel;
        if (oldParent !== parent && isContainable(item)) {
          var transform = transformableModel.getAbsolute(item),
              parentTransform = transformableModel.getAbsolute(parent),
              x = transform[4] - parentTransform[4],
              y = transform[5] - parentTransform[5];
          this.setAttr(item, 'x', x);
          this.setAttr(item, 'y', y);
        }
        var itemToAdd = item;
        if (isTrueState(parent)) {
          if (!Array.isArray(parent.items))
            model.observableModel.changeValue(parent, 'items', []);
          if (parent.items.length == 0) {
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
          this.setAttr(itemToAdd, 'y', lastStatechart.y + lastStatechart.height);
          this.setAttr(item, 'y', 16);
          // TODO determine horizontal / vertical flow direction from item
          // position in statechart.
        }
        if (oldParent !== parent) {
          if (oldParent)            // if null, it's a new item.
            this.deleteItem(item);  // notifies observer
          parent.items.push(itemToAdd);
          model.observableModel.onElementInserted(parent, 'items', parent.items.length - 1);
        }
        return itemToAdd;
      },

      // Adjust statechart bounds to contain its child items.
      layoutStatechart: function(statechart, renderer) {
        var items = statechart.items;
        if (items && items.length) {
          // Get extents of child states.
          var pseudoStateWidth = 2 * renderer.radius,
              xMin = Number.MAX_VALUE,
              yMin = Number.MAX_VALUE,
              xMax = Number.MIN_VALUE,
              yMax = Number.MIN_VALUE;
          items.forEach(function(item) {
            if (!isContainable(item))
              return;
            var x = item.x, y = item.y, rect = renderer.getItemRect(item);
            xMin = Math.min(xMin, x);
            yMin = Math.min(yMin, y);
            xMax = Math.max(xMax, x + rect.w);
            yMax = Math.max(yMax, y + rect.h);
          });
          var padding = renderer.padding;
          // Add padding.
          xMin -= padding;
          yMin -= padding;
          xMax += padding;
          yMax += padding;

          if (xMin < 0) {
            xMax -= xMin;
            for (var i = 0; i < items.length; i++)
              this.setAttr(items[i], 'x', items[i].x - xMin);
          }
          if (yMin < 0) {
            yMax -= yMin;
            for (var i = 0; i < items.length; i++)
              this.setAttr(items[i], 'y', items[i].y - yMin);
          }
          this.setAttr(statechart, 'x', 0);
          this.setAttr(statechart, 'y', 0);
          this.setAttr(statechart, 'width', xMax);
          this.setAttr(statechart, 'height', yMax);
        }
      },

      layoutState: function(state, renderer) {
          if (!isTrueState(state))
          return;
        // TODO circuits should participate in layout.
        if (state.type == 'circuit')
          return;
        var minSize = renderer.getStateMinSize(state);
        this.setAttr(state, 'width', Math.max(state.width || 0, minSize.width));
        this.setAttr(state, 'height', Math.max(state.height || 0, minSize.height));

        var items = state.items;
        if (items && items.length) {
          // Position the statecharts within the parent state.
          // TODO handle horizontal flow.
          var width = 0;
          items.forEach(function(item) {
            width = Math.max(width, item.width);
          });
          if (state.width < width)
            this.setAttr(state, 'width', width);

          var length = items.length, statechartOffsetY = 0;
          for (var i = 0; i < length; i++) {
            var statechart = items[i];
            this.setAttr(statechart, 'y', statechartOffsetY);
            this.setAttr(statechart, 'width', state.width);
            statechartOffsetY += statechart.height;
          }

          if (state.height < statechartOffsetY)
            this.setAttr(state, 'height', statechartOffsetY);
          // Expand the last statechart to fill its parent state.
          var lastItem = items[length - 1];
          this.setAttr(lastItem, 'height', lastItem.height + state.height - statechartOffsetY);
        }
      },

      layout: function(statechart, renderer) {
        var self = this;
        reverseVisit(statechart, isContainer, function(item) {
          if (isState(item))
            self.layoutState(item, renderer);
          else if (isStatechart(item))
            self.layoutStatechart(item, renderer);
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

  function StatechartRenderer(model, ctx, theme) {
    this.model = model;
    this.transformableModel = this.model.transformableModel;
    this.ctx = ctx;
    this.theme = theme || diagrams.theme.create();

    this.radius = 8;
    this.textIndent = 8;
    this.textLeading = 6;
    this.arrowSize = 8;
    this.knobbyRadius = 4;
    this.padding = 8;
    this.stateMinWidth = stateMinWidth;
    this.stateMinHeight = stateMinHeight;
  }

  StatechartRenderer.prototype.beginDraw = function() {
    var ctx = this.ctx;
    ctx.save();
    ctx.font = this.theme.font;
  }

  StatechartRenderer.prototype.endDraw = function() {
    this.ctx.restore();
  }

  StatechartRenderer.prototype.getItemRect = function(item) {
    var transform = this.transformableModel.getAbsolute(item),
        x = transform[4], y = transform[5], w, h;
    switch (item.type) {
      case 'state':
      case 'statechart':
        w = item.width;
        h = item.height;
        break;
      case 'start':
        w = h = 2 * this.radius;
        break;
      case 'circuit':
        w = item._master.width;
        h = item._master.height;
        break;
    }
    return { x: x, y: y, w: w, h: h };
  }

  StatechartRenderer.prototype.statePointToParam = function(state, p) {
    var r = this.radius, rect = this.getItemRect(state);
    if (isTrueState(state))
      return diagrams.rectPointToParam(rect.x, rect.y, rect.w, rect.h, p);

    return diagrams.circlePointToParam(rect.x + r, rect.y + r, p);
  }

  StatechartRenderer.prototype.stateParamToPoint = function(state, t) {
    var r = this.radius, rect = this.getItemRect(state);
    if (isTrueState(state))
      return diagrams.roundRectParamToPoint(rect.x, rect.y, rect.w, rect.h, r, t);

    return diagrams.circleParamToPoint(rect.x + r, rect.y + r, r, t);
  }

  StatechartRenderer.prototype.pinToPoint = function(item, pin, input) {
    if (isTransition(item)) {
      // pin === 0, input === true.
      var mid = item._mid;
      return { x: mid.x, y: mid.y };
    }
    // Otherwise, it's a state or circuit element.
    var rect = this.getItemRect(item),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h,
        textSize = this.theme.fontSize,
        knobbyRadius = this.knobbyRadius;
    if (isTrueState(item)) {
      y += this.radius + knobbyRadius;
    } else {
      // Circuit.
      y += textSize / 2;
      if (item._master.name)
        y += textSize;
    }

    return {
      x: input ? x + knobbyRadius : x + w - knobbyRadius,
      y: y + pin * textSize,
      nx: input ? -1 : 1,
      ny: 0,
    }
  }

  StatechartRenderer.prototype.getStateMinSize = function(state) {
    var ctx = this.ctx, theme = this.theme, r = this.radius,
        width = this.stateMinWidth, height = this.stateMinHeight,
        metrics;
    if (state.type != 'state')
      return;
    width = Math.max(width, ctx.measureText(state.name).width + 2 * r);
    height = Math.max(height, theme.fontSize + this.textLeading);
    return { width: width, height: height };
  }

  function drawPin(renderer, x, y) {
    var r = renderer.knobbyRadius, d = 2 * r;
    renderer.ctx.strokeRect(x - r, y - r, d, d);
  }

  function hitPin(renderer, x, y, p, tol) {
    var r = renderer.knobbyRadius, d = 2 * r;
    return diagrams.hitTestRect(x - r, y - r, d, d, p, tol);
  }

  function drawJunction(renderer, x, y) {
    var ctx = renderer.ctx, r = renderer.knobbyRadius, d = 2 * r;
    // ctx.beginPath();
    // ctx.arc(x, y, r, 0, 2 * Math.PI);
    // ctx.fillStyle = renderer.theme.bgColor;
    // ctx.fill();
    // ctx.stroke();
    ctx.fillStyle = renderer.theme.bgColor;
    ctx.fillRect(x - r, y - r, d, d);
    ctx.strokeRect(x - r, y - r, d, d);
  }

  function drawArrow(renderer, x, y) {
    var ctx = renderer.ctx;
    ctx.beginPath();
    diagrams.arrowPath({ x: x, y: y, nx: -1, ny: 0 }, ctx, renderer.arrowSize);
    ctx.stroke();
  }

  function hitArrow(renderer, x, y, p, tol) {
    var d = renderer.arrowSize, r = d * 0.5;
    return diagrams.hitTestRect(x - r, y - r, d, d, p, tol);
  }

  StatechartRenderer.prototype.drawState = function(state, mode) {
    var ctx = this.ctx, theme = this.theme, r = this.radius,
        rect = this.getItemRect(state),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h,
        knobbyRadius = this.knobbyRadius, textSize = theme.fontSize,
        lineBase = y + textSize + this.textLeading;
    diagrams.roundRectPath(x, y, w, h, r, ctx);
    switch (mode) {
      case normalMode:
        ctx.fillStyle = theme.bgColor;
        ctx.fill();
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, lineBase);
        ctx.lineTo(x + w, lineBase);
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
        break;
      case highlightMode:
        ctx.strokeStyle = theme.highlightColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case hotTrackMode:
        ctx.strokeStyle = theme.hotTrackColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
    drawPin(this, x + w - knobbyRadius, y + r + knobbyRadius);
    drawArrow(this, x + w + this.arrowSize, lineBase);
  }

  StatechartRenderer.prototype.hitTestState = function(state, p, tol, mode) {
    var theme = this.theme, r = this.radius,
        rect = this.getItemRect(state),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var lineBase = y + theme.fontSize + this.textLeading,
        knobbyRadius = this.knobbyRadius;
    if (hitArrow(this, x + w + this.arrowSize, lineBase, p, tol))
      return { arrow: true };
    if (hitPin(this, x + w - knobbyRadius, y + r + knobbyRadius, p, tol))
      return { output: 0 };
    return diagrams.hitTestRect(x, y, w, h, p, tol); // TODO hitTestRoundRect
  }

  StatechartRenderer.prototype.drawPseudoState = function(state, mode) {
    var ctx = this.ctx, theme = this.theme, r = this.radius,
        rect = this.getItemRect(state),
        x = rect.x, y = rect.y;
    // TODO handle other psuedo state types.
    diagrams.diskPath(x + r, y + r, r, ctx);
    switch (mode) {
      case normalMode:
        ctx.fillStyle = theme.strokeColor;
        ctx.fill();
        // Render knobbies, faintly.
        ctx.lineWidth = 0.25;
        break;
      case highlightMode:
        ctx.strokeStyle = theme.highlightColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case hotTrackMode:
        ctx.strokeStyle = theme.hotTrackColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
    drawArrow(this, x + 2 * r + this.arrowSize, y + r);
  }

  StatechartRenderer.prototype.hitTestPseudoState = function(state, p, tol, mode) {
    var r = this.radius,
        rect = this.getItemRect(state),
        x = rect.x, y = rect.y;
    if (hitArrow(this, x + 2 * r + this.arrowSize, y + r, p, tol))
      return { arrow: true };

    return diagrams.hitTestDisk(x + r, y + r, r, p, tol);
  }

  StatechartRenderer.prototype.drawStatechart = function(statechart, mode) {
    switch (mode) {
      case normalMode:
        break;
      case highlightMode:
        break;
      case hotTrackMode:
        var ctx = this.ctx, theme = this.theme, r = this.radius,
            rect = this.getItemRect(statechart),
            x = rect.x, y = rect.y, w = rect.w, h = rect.h;
        diagrams.roundRectPath(x, y, w, h, r, ctx);
        ctx.strokeStyle = theme.hotTrackColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
  }

  StatechartRenderer.prototype.hitTestStatechart = function(statechart, p, tol, mode) {
    var r = this.radius,
        rect = this.getItemRect(statechart),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    return diagrams.hitTestRect(x, y, w, h, p, tol); // TODO hitTestRoundRect
  }

  StatechartRenderer.prototype.layoutCircuitMaster = function(master) {
    var ctx = this.ctx, theme = this.theme,
        textSize = theme.fontSize, knobbyRadius = this.knobbyRadius,
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
          width = inWidth + 4 + outWidth;
      maxWidth = Math.max(maxWidth, width);
    }
    master.width = gutter + maxWidth + gutter;
    master.height = 4 + height;
  }

  StatechartRenderer.prototype.drawCircuit = function(circuit, mode) {
    var self = this, ctx = this.ctx, theme = this.theme, r = this.radius,
        master = circuit._master,
        rect = this.getItemRect(circuit),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    switch (mode) {
      case normalMode:
        var textSize = theme.fontSize, knobbyRadius = this.knobbyRadius,
            name = master.name,
            inputs = master.inputs, outputs = master.outputs,
            gutter = 2 * knobbyRadius + 4;
        ctx.fillStyle = theme.bgColor;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = theme.textColor;
        var baseLine = y + textSize;
        if (name) {
          ctx.textAlign = 'center';
          ctx.fillText(name, x + w / 2, baseLine);
          baseLine += textSize;
        }
        ctx.textAlign = 'left';
        inputs.forEach(function(input, i) {
          var name = input.name, top = baseLine + i * textSize;
          drawPin(self, x + knobbyRadius, top - textSize / 2);
          if (name)
            ctx.fillText(name, x + gutter, top);
        });
        ctx.textAlign = 'right';
        outputs.forEach(function(output, i) {
          var name = output.name, top = baseLine + i * textSize;;
          drawPin(self, x + w - knobbyRadius, top - textSize / 2);
          if (name)
            ctx.fillText(name, x + w - gutter, top);
        });
        ctx.textAlign = 'left';
        break;
      case highlightMode:
        ctx.strokeStyle = theme.highlightColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        break;
      case hotTrackMode:
        ctx.strokeStyle = theme.hotTrackColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        break;
    }
  }

  StatechartRenderer.prototype.hitTestCircuit = function(circuit, p, tol, mode) {
    var rect = this.getItemRect(circuit),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h,
        hitInfo = diagrams.hitTestRect(x, y, w, h, p, tol);
    if (hitInfo) {
      var textSize = this.theme.fontSize,
          knobbyRadius = this.knobbyRadius,
          master = circuit._master,
          inputs = master.inputs, outputs = master.outputs,
          self = this;
      var baseLine = y + textSize;
      if (master.name)
        baseLine += textSize;
      inputs.forEach(function(input, i) {
        var top = baseLine + i * textSize;
        if (hitPin(self, x + knobbyRadius, top - textSize / 2, p, tol))
          hitInfo.input = i;
        //TODO should return here.
      });
      outputs.forEach(function(output, i) {
        var top = baseLine + i * textSize;;
        if (hitPin(self, x + w - knobbyRadius, top - textSize / 2, p, tol))
          hitInfo.output = i;
      });
    }
    return hitInfo;
  }

  StatechartRenderer.prototype.layoutTransition = function(transition) {
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

  StatechartRenderer.prototype.drawTransition = function(transition, mode) {
    var ctx = this.ctx;
    diagrams.bezierEdgePath(transition._bezier, ctx, this.arrowSize);
    switch (mode) {
      case normalMode:
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.lineWidth = 0.25;
        var mid = transition._mid;
        drawJunction(this, mid.x, mid.y);
        break;
      case highlightMode:
        ctx.strokeStyle = theme.highlightColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case hotTrackMode:
        ctx.strokeStyle = theme.hotTrackColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
  }

  StatechartRenderer.prototype.hitTestTransition = function(transition, p, tol, mode) {
    var mid = transition._mid;
    if (hitPin(this, mid.x, mid.y, p, tol))
      return { input: 0 };
    return diagrams.hitTestBezier(transition._bezier, p, tol);
  }

  StatechartRenderer.prototype.layoutWire = function(wire) {
    var referencingModel = this.model.referencingModel,
        c1 = referencingModel.resolveReference(wire, 'srcId'),
        c2 = referencingModel.resolveReference(wire, 'dstId'),
        p1 = wire._p1, p2 = wire._p2;

    if (c1)
      p1 = this.pinToPoint(c1, wire.srcPin, false);
    if (c2)
      p2 = this.pinToPoint(c2, wire.dstPin, true);
    wire._bezier = diagrams.getEdgeBezier(p1, p2);
  }

  StatechartRenderer.prototype.drawWire = function(wire, mode) {
    var ctx = this.ctx;
    diagrams.bezierEdgePath(wire._bezier, ctx, 0);
    switch (mode) {
      case normalMode:
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 1;
        break;
      case highlightMode:
        ctx.strokeStyle = theme.highlightColor;
        ctx.lineWidth = 2;
        break;
      case hotTrackMode:
        ctx.strokeStyle = theme.hotTrackColor;
        ctx.lineWidth = 2;
        break;
    }
    ctx.stroke();
  }

  StatechartRenderer.prototype.hitTestWire = function(wire, p, tol, mode) {
    return diagrams.hitTestBezier(wire._bezier, p, tol);
  }

  StatechartRenderer.prototype.layout = function(item) {
    switch (item.type) {
      case 'transition':
        this.layoutTransition(item);
        break;
      case 'wire':
        this.layoutWire(item);
        break;
    }
  }

  StatechartRenderer.prototype.draw = function(item, mode) {
    switch (item.type) {
      case 'state':
        this.drawState(item, mode);
        break;
      case 'start':
        this.drawPseudoState(item, mode);
        break;
      case 'circuit':
        this.drawCircuit(item, mode);
        break;
      case 'transition':
        this.drawTransition(item, mode);
        break;
      case 'wire':
        this.drawWire(item, mode);
        break;
      case 'statechart':
        this.drawStatechart(item, mode);
        break;
    }
  }

  StatechartRenderer.prototype.hitTest = function(item, p, tol, mode) {
    var hitInfo;
    switch (item.type) {
      case 'state':
        hitInfo = this.hitTestState(item, p, tol, mode);
        break;
      case 'start':
        hitInfo = this.hitTestPseudoState(item, p, tol, mode);
        break;
      case 'circuit':
        hitInfo = this.hitTestCircuit(item, p, tol, mode);
        break;
      case 'transition':
        hitInfo = this.hitTestTransition(item, p, tol, mode);
        break;
      case 'wire':
        hitInfo = this.hitTestWire(item, p, tol, mode);
        break;
      case 'statechart':
        hitInfo = this.hitTestStatechart(item, p, tol, mode);
        break;
    }
    if (hitInfo)
      hitInfo.item = item;
    return hitInfo;
  }

  StatechartRenderer.prototype.drawHoverText = function(item, p) {
    var self = this, theme = this.theme,
        props = [];
    this.model.dataModel.visitProperties(item, function(item, attr) {
      var value = item[attr];
      if (Array.isArray(value))
        return;
      props.push({ name: attr, value: value });
    });
    var x = p.x, y = p.y,
        textSize = theme.fontSize, gap = 16, border = 4,
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

    this.hitTolerance = 8;

    var circuitMasters = this.circuitMasters = {
      // Each event has an un-named guard input and the event name. Make the
      // event name the input name, since that's how we want to lay it out.
      event1: {
        name: 'Item 1',
        inputs: [
          { name: 'show', type: 'bool' },
          { name: 'hide', type: 'bool' },
          { name: 'anim', type: 'bool' },
        ],
        outputs: [
          { name: 'hit', type: 'bool' },
        ],
      },
      or: {
        inputs: [
          { name: '', type: 'bool' },
          { name: '', type: 'bool' },
          { name: '', type: 'bool' },
          { name: '', type: 'bool' },
        ],
        outputs: [
          { name: 'and', type: 'bool' },
          { name: 'or', type: 'bool' },
          { name: 'nand', type: 'bool' },
          { name: 'nor', type: 'bool' },
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
            x: 48,
            y: 8,
          },
          {
            type: 'state',
            x: 8,
            y: 30,
            width: 100,
            height: 60,
            name: 'New State',
          },
          {
            type: 'circuit',
            x: 32,
            y: 104,
            master: 'event1',
          },
          {
            type: 'circuit',
            x: 32,
            y: 160,
            master: 'or',
          },
        ],
      }
    }

    function initialize(item) {
      if (item.type == 'circuit') {
        item._master = circuitMasters[item.master];
      }
    }

    editingModel.extend(model);

    dataModels.observableModel.extend(palette);
    dataModels.hierarchicalModel.extend(palette);
    dataModels.transformableModel.extend(palette);
    palette.dataModel.addInitializer(initialize);
    palette.dataModel.initialize();

    model.dataModel.addInitializer(initialize);
    model.dataModel.initialize();
  }

  Editor.prototype.initialize = function(canvasController) {
    this.canvasController = canvasController;
    this.canvas = canvasController.canvas;
    this.ctx = canvasController.ctx;

    if (!this.renderer)
      this.renderer = new StatechartRenderer(this.model, ctx, canvasController.theme);
    var renderer = this.renderer;
    renderer.beginDraw();
    for (var master in this.circuitMasters)
      renderer.layoutCircuitMaster(this.circuitMasters[master]);
    renderer.endDraw();
  }

  Editor.prototype.isPaletteItem = function(item) {
    var hierarchicalModel = this.palette.hierarchicalModel;
    return hierarchicalModel.getParent(item) === this.palette.root;
  }

  Editor.prototype.addTemporaryItem = function(item) {
    this.model.observableModel.changeValue(this.statechart, 'temporary', item);
  }

  Editor.prototype.removeTemporaryItem = function(item) {
    return this.model.observableModel.changeValue(this.statechart, 'temporary', null);
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
    visit(statechart, isConnection, function(item) {
      renderer.layout(item);
    });

    visit(statechart, isContainable, function(item) {
      renderer.draw(item, normalMode);
    });
    visit(statechart, isConnection, function(transition) {
      renderer.draw(transition, normalMode);
    });

    model.selectionModel.forEach(function(item) {
      renderer.draw(item, highlightMode);
    });
    if (this.hotTrackInfo)
      renderer.draw(this.hotTrackInfo.item, hotTrackMode);
    renderer.endDraw();

    renderer.beginDraw();
    ctx.fillStyle = renderer.theme.altBgColor;
    ctx.fillRect(palette.root.x, palette.root.y, 128, 300);
    palette.root.items.forEach(function(item) {
      renderer.draw(item, normalMode);
    });
    renderer.endDraw();

    var temporary = this.getTemporaryItem();
    if (temporary) {
      renderer.beginDraw();
      canvasController.applyTransform();
      if (isConnection(temporary))
        renderer.layout(temporary);
      renderer.draw(temporary, normalMode);
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
        canvasController = this.canvasController,
        cp = canvasController.viewToCanvas(p),
        scale = canvasController.scale,
        zoom = Math.max(scale.x, scale.y),
        tol = this.hitTolerance, cTol = tol / zoom,
        statechart = this.statechart,
        hitList = [];
    function pushInfo(info) {
      if (info)
        hitList.push(info);
    }
    reverseVisit(this.palette.root, null, function(item) {
      pushInfo(renderer.hitTest(item, p, tol, normalMode));
    });
    // TODO hit test selection first, in selectionMode, first.
    reverseVisit(statechart, isConnection, function(transition) {
      pushInfo(renderer.hitTest(transition, cp, cTol, normalMode));
    });
    reverseVisit(statechart, isContainable, function(item) {
      pushInfo(renderer.hitTest(item, cp, cTol, normalMode));
    });
    return hitList;
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

  function isStateBorder(hitInfo, model) {
    return isState(hitInfo.item) && hitInfo.border && !hitInfo.arrow;
  }

  function isDraggable(hitInfo, model) {
    return !isStatechart(hitInfo.item);
  }

  function isInputPin(hitInfo, model) {
    return hitInfo.input !== undefined;
  }

  function isOutputPin(hitInfo, model) {
    return hitInfo.output !== undefined;
  }

  function isContainerTarget(hitInfo, model) {
    var item = hitInfo.item;
    return isContainer(item) &&
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

  Editor.prototype.onBeginDrag = function(p0) {
    var mouseHitInfo = this.mouseHitInfo,
        canvasController = this.canvasController;
    if (!mouseHitInfo)
      return false;
    var dragItem = mouseHitInfo.item, type = dragItem.type,
        model = this.model,
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
    } else if (mouseHitInfo.arrow) {
      var stateId = model.dataModel.getId(dragItem),
          cp0 = canvasController.viewToCanvas(p0);
      // Start the new transition as connecting the src state to itself.
      newItem = {
        type: 'transition',
        srcId: stateId,
        t1: 0,
        _p2: cp0,
      };
      drag = {
        type: 'connectingP2',
        name: 'Add new transition',
        isNewItem: true,
      };
    } else if (mouseHitInfo.output !== undefined) {
      // We can only create a wire from an output pin for now.
      var circuitId = model.dataModel.getId(dragItem),
          cp0 = canvasController.viewToCanvas(p0);
      // Start the new transition as connecting the src state to itself.
      newItem = {
        type: 'wire',
        srcId: circuitId,
        srcPin: mouseHitInfo.output,
        _p2: cp0,
      };
      drag = {
        type: 'connectingW2',
        name: 'Add new wire',
        isNewItem: true,
      };
    } else {
      switch (type) {
        case 'state':
        case 'start':
          if (type == 'state' && mouseHitInfo.border) {
            drag = { type: 'resizeState', name: 'Resize state' };
          } else {
            drag = { type: 'moveSelection', name: 'Move selection' };
          }
          break;
        case 'circuit':
          drag = { type: 'moveSelection', name: 'Move selection' };
          break;
        case 'transition':
          if (mouseHitInfo.p1)
            drag = { type: 'connectingP1', name: 'Edit transition' };
          else if (mouseHitInfo.p2)
            drag = { type: 'connectingP2', name: 'Edit transition' };
          break;
        case 'wire':
          if (mouseHitInfo.p1)
            drag = { type: 'connectingW1', name: 'Edit wire' };
          else if (mouseHitInfo.p2)
            drag = { type: 'connectingW2', name: 'Edit wire' };
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

  Editor.prototype.onDrag = function(p0, p) {
    var drag = this.drag;
    if (!drag)
      return;
    var dragItem = drag.item,
        model = this.model,
        dataModel = model.dataModel,
        observableModel = model.observableModel,
        transactionModel = model.transactionModel,
        referencingModel = model.referencingModel,
        selectionModel = model.selectionModel,
        renderer = this.renderer,
        canvasController = this.canvasController,
        cp0 = canvasController.viewToCanvas(p0),
        cp = canvasController.viewToCanvas(p),
        dx = cp.x - cp0.x, dy = cp.y - cp0.y,
        mouseHitInfo = this.mouseHitInfo,
        snapshot = transactionModel.getSnapshot(drag.item),
        hitList = this.hitTest(p), hitInfo,
        src, dst, srcId, dstId, t1, t2;
    switch (drag.type) {
      case 'paletteItem':
        if (isContainable(dragItem))
          hitInfo = this.getFirstHit(hitList, isContainerTarget);
        var snapshot = transactionModel.getSnapshot(dragItem);
        if (snapshot) {
          observableModel.changeValue(dragItem, 'x', snapshot.x + dx);
          observableModel.changeValue(dragItem, 'y', snapshot.y + dy);
        }
        break;
      case 'moveSelection':
        if (isContainable(dragItem))
          hitInfo = this.getFirstHit(hitList, isContainerTarget);
        selectionModel.forEach(function(item) {
          var snapshot = transactionModel.getSnapshot(item);
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
        srcId = hitInfo ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'srcId', srcId);
        src = referencingModel.getReference(dragItem, 'srcId');
        if (src) {
          t1 = renderer.statePointToParam(src, cp);
          observableModel.changeValue(dragItem, 't1', t1);
        } else {
          dragItem._p1 = cp;
        }
        break;
      case 'connectingP2':
        if (drag.isNewItem) {
          src = referencingModel.getReference(dragItem, 'srcId');
          observableModel.changeValue(dragItem, 't1', renderer.statePointToParam(src, cp));
        }
        hitInfo = this.getFirstHit(hitList, isStateBorder);
        dstId = hitInfo ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'dstId', dstId);
        dst = referencingModel.getReference(dragItem, 'dstId');
        if (dst) {
          t2 = renderer.statePointToParam(dst, cp);
          observableModel.changeValue(dragItem, 't2', t2);
        } else {
          dragItem._p2 = cp;
        }
        break;
      case 'connectingW1':
        hitInfo = this.getFirstHit(hitList, isOutputPin);
        srcId = hitInfo ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'srcId', srcId);
        src = referencingModel.getReference(dragItem, 'srcId');
        if (src) {
          observableModel.changeValue(dragItem, 'srcPin', hitInfo.output);
        } else {
          dragItem._p1 = cp;
        }
        break;
      case 'connectingW2':
        if (drag.isNewItem) {
          src = referencingModel.getReference(dragItem, 'srcId');
        }
        hitInfo = this.getFirstHit(hitList, isInputPin);
        dstId = hitInfo ? dataModel.getId(hitInfo.item) : 0;
        observableModel.changeValue(dragItem, 'dstId', dstId);
        dst = referencingModel.getReference(dragItem, 'dstId');
        if (dst) {
          observableModel.changeValue(dragItem, 'dstPin', hitInfo.input);
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
    if (newItem) {
      // Clone the new item, since we're about to roll back the transaction. We
      // do this to collapse all of the edits into a single insert operation.
      newItem = dragItem = model.instancingModel.clone(newItem);
      model.dataModel.initialize(newItem);
      transactionModel.cancelTransaction();
      transactionModel.beginTransaction(drag.name);
    }
    if (isTransition(dragItem)) {
      dragItem._p1 = dragItem._p2 = null;
      if (newItem) {
        observableModel.insertElement(
            statechart, 'items', statechart.items.length - 1, newItem);
      }
    } else if (drag.type == 'moveSelection' || newItem) {
      // Find state beneath mouse.
      var hitList = this.hitTest(p),
          hitInfo = this.getFirstHit(hitList, isContainerTarget),
          parent = hitInfo ? hitInfo.item : statechart;
      // Add new items.
      if (newItem) {
        editingModel.addItem(newItem, null, parent);
        selectionModel.set([newItem]);
      } else {
        // Reparent existing items.
        selectionModel.forEach(function(item) {
          if (isContainable(item)) {
            var oldParent = hierarchicalModel.getParent(item);
            if (oldParent != parent)
              editingModel.addItem(item, oldParent, parent);
          }
        });
      }
    }

    editingModel.layout(this.statechart, this.renderer);

    // If dragItem is a disconnected transition, delete it.
    if (isTransition(dragItem)) {
      if (!dragItem.srcId || !dragItem.dstId) {
        editingModel.deleteItem(dragItem);
        selectionModel.remove(dragItem);
      }
    } else if (isWire(dragItem)) {
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
              if (key.toString().charAt(0) === '_')
                return;
              if (value === undefined || value === null)
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

    normalMode: normalMode,
    highlightMode: highlightMode,
    hotTrackMode: hotTrackMode,
    StatechartRenderer: StatechartRenderer,

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
      "x": 181,
      "y": 40
    },
    {
      "type": "state",
      "id": 1003,
      "x": 207,
      "y": 81,
      "width": 326.52224878096933,
      "height": 200,
      "name": "State_1",
      "items": [
        {
          "type": "statechart",
          "id": 1004,
          "x": 0,
          "y": 0,
          "width": 326.52224878096933,
          "height": 200,
          "items": [
            {
              "type": "state",
              "id": 1005,
              "x": 29,
              "y": 53,
              "width": 100,
              "height": 60,
              "name": "State_3",
              "items": []
            },
            {
              "type": "state",
              "id": 1006,
              "x": 218.52224878096933,
              "y": 30.539545265991876,
              "width": 100,
              "height": 60,
              "name": "State_4"
            },
            {
              "type": "start",
              "x": 9,
              "y": 23,
              "id": 1012
            },
            {
              "type": "circuit",
              "x": 225.6317484169972,
              "y": 119.02496888866085,
              "master": "or",
              "id": 1015
            },
            {
              "type": "circuit",
              "x": 92.36406771700172,
              "y": 24.604547340081055,
              "master": "event1",
              "id": 1017
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
      "srcId": 1003,
      "t1": 0.5975,
      "id": 1009,
      "dstId": 1007,
      "t2": 3.3758169934640523
    },
    {
      "type": "transition",
      "srcId": 1002,
      "t1": 0.431442498944115,
      "id": 1010,
      "dstId": 1003,
      "t2": 3.1258503401360542
    },
    {
      "type": "transition",
      "srcId": 1012,
      "t1": 0.42955342504544625,
      "id": 1013,
      "dstId": 1005,
      "t2": 3.2636363636363637
    },
    {
      "type": "transition",
      "srcId": 1005,
      "t1": 0.584127478385535,
      "id": 1018,
      "dstId": 1006,
      "t2": 2.4502947345221404
    },
    {
      "type": "transition",
      "id": 1008,
      "srcId": 1003,
      "t1": 1.4019607843137254,
      "dstId": 1007,
      "t2": 2.3
    },
    {
      "type": "wire",
      "srcId": 1017,
      "srcPin": 0,
      "id": 1019,
      "dstId": 1008,
      "dstPin": 0
    }
  ]
}
/*
{
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
*/