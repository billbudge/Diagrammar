// Statecharts module.

const statecharts = (function() {
'use strict';

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
  return item.type != 'transition';
}

function isTransition(item) {
  return item.type == 'transition';
}

function isPaletted(item) {
  return item.state == 'palette';
}

const _p1 = Symbol('p1'),
      _p2 = Symbol('p2'),
      _master = Symbol('master');

function visit(item, filterFn, itemFn) {
  if (!filterFn || filterFn(item))
    itemFn(item);
  const items = item.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      visit(items[i], filterFn, itemFn);
    }
  }
}

function reverseVisit(item, filterFn, itemFn) {
  const items = item.items;
  if (items) {
    for (let i = items.length - 1; i >= 0; i--) {
      reverseVisit(items[i], filterFn, itemFn);
    }
  }
  if (!filterFn || filterFn(item))
    itemFn(item);
}

// Initialized by editor.
let getTransitionSrc,
    getTransitionDst;

//------------------------------------------------------------------------------

const editingModel = (function() {
  const proto = {
    reduceSelection: function () {
      const model = this.model;
      model.selectionModel.set(model.hierarchicalModel.reduceSelection());
    },

    getConnectedConnections: function (items, copying) {
      const self = this,
            model = this.model,
            itemsAndChildren = new Set();
      items.forEach(function(item) {
        visit(item, isContainable, function(item) {
          itemsAndChildren.add(item);
        });
      });
      const connections = [];
      visit(this.statechart, isTransition, function(item) {
        const contains1 = itemsAndChildren.has(getTransitionSrc(item)),
              contains2 = itemsAndChildren.has(getTransitionDst(item));
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
      const model = this.model,
            hierarchicalModel = model.hierarchicalModel,
            parent = hierarchicalModel.getParent(item);
      if (parent) {
        const items = parent.items;
        for (let i = 0; i < items.length; i++) {
          const subItem = items[i];
          if (subItem == item) {
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
      const self = this;
      this.getConnectedConnections(items, false).forEach(function(item) {
        this.deleteItem(item);
      }, this);
      items.forEach(function(item) {
        this.deleteItem(item);
      }, this);
    },

    doDelete: function() {
      this.reduceSelection();
      this.model.copyPasteModel.doDelete(this.deleteItems.bind(this));
    },

    copyItems: function(items, map) {
      const model = this.model,
            dataModel = model.dataModel,
            translatableModel = model.translatableModel,
            statechart = this.statechart,
            connected = this.getConnectedConnections(items, true),
            copies = model.copyPasteModel.cloneItems(items.concat(connected), map);

      items.forEach(function(item) {
        const copy = map.get(dataModel.getId(item));
        if (isContainable(copy)) {
          if (isState(copy)) {
            // De-palettize clone.
            copy.state = 'normal';
          }
          const translation = translatableModel.getToParent(item, statechart);
          copy.x += translation.x;
          copy.y += translation.y;
        }
      });
      return copies;
    },

    doCopy: function() {
      const selectionModel = this.model.selectionModel;
      this.reduceSelection();
      selectionModel.contents().forEach(function(item) {
        if (!isState(item))
          selectionModel.remove(item);
      });
      this.model.copyPasteModel.doCopy(this.copyItems.bind(this));
    },

    doCut: function() {
      this.doCopy();
      this.doDelete();
    },

    doPaste: function() {
      const copyPasteModel = this.model.copyPasteModel;
      copyPasteModel.getScrap().forEach(function(item) {
        // Offset pastes so the user can see them.
        if (isState(item)) {
          item.x += 16;
          item.y += 16;
        }
      });
      copyPasteModel.doPaste(this.copyItems.bind(this),
                             this.addItems.bind(this));
    },

    // Returns a value indicating if the item can be added to the state
    // without violating statechart constraints.
    canAddItemToStatechart: function(item, statechart) {
      function containsType(type) {
        const items = statechart.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type == type)
            return true;
        }
        return false;
      }

      // TODO enable constraints with palette items excluded.
      // switch (item.type) {
      //   case 'start':
      //     return !containsType('start');
      // }
      return true;
    },

    // Creates a new statechart to hold the given item.
    createStatechart: function(item) {
      const statechart = {
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

    newItem: function(item) {
      const dataModel = this.model.dataModel;
      dataModel.assignId(item);
      dataModel.initialize(item);
    },

    newItems: function(items) {
      const self = this;
      items.forEach(item => self.newItem(item));
    },

    addItem: function(item, parent) {
      const model = this.model,
            hierarchicalModel = model.hierarchicalModel,
            oldParent = hierarchicalModel.getParent(item);
      if (oldParent == parent)
        return;
      let itemToAdd = item;
      if (isContainable(item)) {
        const translatableModel = model.translatableModel,
              translation = translatableModel.getToParent(item, parent);
        item.x += translation.x;
        item.y += translation.y;
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
          parent = hierarchicalModel.getParent(parent);
          const parentItems = parent.items,
                lastStatechart = parentItems[parentItems.length - 1];
          itemToAdd = this.createStatechart(item);
          this.setAttr(itemToAdd, 'y', lastStatechart.y + lastStatechart.height);
          this.setAttr(item, 'y', 16);
          // TODO determine horizontal / vertical flow direction from item
          // position in statechart.
        }
      }
      if (oldParent != parent) {
        if (oldParent)            // if null, it's a new item.
          this.deleteItem(item);  // notifies observers
        parent.items.push(itemToAdd);
        model.observableModel.onElementInserted(parent, 'items', parent.items.length - 1);
      }
      return itemToAdd;
    },

    addItems: function(items) {
      const model = this.model,
            statechart = this.statechart,
            statechartItems = statechart.items;
      items.forEach(function(item) {
        statechartItems.push(item);
        model.selectionModel.add(item);
        model.observableModel.onElementInserted(statechart, 'items', statechartItems.length - 1);
      });
    },

    doTogglePalette: function() {
      const model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('toggle master state');
      model.selectionModel.contents().forEach(function(item) {
        if (!isState(item))
          return;
        model.observableModel.changeValue(item, 'state',
          (item.state == 'palette') ? 'normal' : 'palette');
      })
      model.transactionModel.endTransaction();
    },

    // Adjust statechart bounds to contain its child items.
    layoutStatechart: function(statechart, renderer) {
      const items = statechart.items;
      if (items && items.length) {
        // Get extents of child states.
        const pseudoStateWidth = 2 * renderer.radius;
        let xMin = Number.MAX_VALUE,
            yMin = Number.MAX_VALUE,
            xMax = Number.MIN_VALUE,
            yMax = Number.MIN_VALUE;
        items.forEach(function(item) {
          if (!isContainable(item))
            return;
          const x = item.x, y = item.y, rect = renderer.getItemRect(item);
          xMin = Math.min(xMin, x);
          yMin = Math.min(yMin, y);
          xMax = Math.max(xMax, x + rect.w);
          yMax = Math.max(yMax, y + rect.h);
        });
        const padding = renderer.padding;
        // Add padding.
        xMin -= padding;
        yMin -= padding;
        xMax += padding;
        yMax += padding;

        if (xMin < 0) {
          xMax -= xMin;
          for (let i = 0; i < items.length; i++)
            this.setAttr(items[i], 'x', items[i].x - xMin);
        }
        if (yMin < 0) {
          yMax -= yMin;
          for (let i = 0; i < items.length; i++)
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
      const minSize = renderer.getStateMinSize(state);
      this.setAttr(state, 'width', Math.max(state.width || 0, minSize.width));
      this.setAttr(state, 'height', Math.max(state.height || 0, minSize.height));

      const items = state.items;
      let statechartOffsetY = 0;
      if (items && items.length) {
        // Position the statecharts within the parent state.
        // TODO handle horizontal flow.
        let width = 0;
        items.forEach(function(item) {
          width = Math.max(width, item.width);
        });
        if (state.width < width)
          this.setAttr(state, 'width', width);

        for (let i = 0; i < items.length; i++) {
          const statechart = items[i];
          this.setAttr(statechart, 'y', statechartOffsetY);
          this.setAttr(statechart, 'width', state.width);
          statechartOffsetY += statechart.height;
        }

        if (state.height < statechartOffsetY)
          this.setAttr(state, 'height', statechartOffsetY);
        // Expand the last statechart to fill its parent state.
        const lastItem = items[items.length - 1];
        this.setAttr(lastItem, 'height', lastItem.height + state.height - statechartOffsetY);
      }
    },

    layout: function(statechart, renderer) {
      const self = this;
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
    dataModels.translatableModel.extend(model);
    dataModels.transactionModel.extend(model);
    dataModels.transactionHistory.extend(model);
    dataModels.instancingModel.extend(model);
    dataModels.copyPasteModel.extend(model);

    const instance = Object.create(model.copyPasteModel);
    instance.prototype = Object.getPrototypeOf(instance);
    for (let prop in proto)
      instance[prop] = proto[prop];

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

const normalMode = 1,
      highlightMode = 2,
      hotTrackMode = 3;

const stateMinWidth = 100,
      stateMinHeight = 60;

const _mid = Symbol('mid'), _bezier = Symbol('bezier');

function Renderer(theme) {
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

Renderer.prototype.beginDraw = function(model, ctx) {
  this.model = model;
  this.translatableModel = model.translatableModel;
  this.ctx = ctx;
  ctx.save();
  ctx.font = this.theme.font;
}

Renderer.prototype.endDraw = function() {
  this.ctx.restore();
  this.model = null;
  this.ctx = null;
}

Renderer.prototype.getItemRect = function(item) {
  const translatableModel = this.translatableModel,
        x = translatableModel.globalX(item),
        y = translatableModel.globalY(item);
  let w, h;
  switch (item.type) {
    case 'state':
    case 'statechart':
      w = item.width;
      h = item.height;
      break;
    case 'start':
      w = h = 2 * this.radius;
      break;
  }
  return { x: x, y: y, w: w, h: h };
}

Renderer.prototype.statePointToParam = function(state, p) {
  const r = this.radius,
        rect = this.getItemRect(state);
  if (isTrueState(state))
    return diagrams.rectPointToParam(rect.x, rect.y, rect.w, rect.h, p);

  return diagrams.circlePointToParam(rect.x + r, rect.y + r, p);
}

Renderer.prototype.stateParamToPoint = function(state, t) {
  const r = this.radius,
        rect = this.getItemRect(state);
  if (isTrueState(state))
    return diagrams.roundRectParamToPoint(rect.x, rect.y, rect.w, rect.h, r, t);

  return diagrams.circleParamToPoint(rect.x + r, rect.y + r, r, t);
}

Renderer.prototype.getStateMinSize = function(state) {
  const ctx = this.ctx, theme = this.theme, r = this.radius;
  let width = this.stateMinWidth, height = this.stateMinHeight;
  if (state.type != 'state')
    return;
  width = Math.max(width, ctx.measureText(state.name).width + 2 * r);
  height = Math.max(height, theme.fontSize + this.textLeading);
  return { width: width, height: height };
}

function drawArrow(renderer, x, y) {
  const ctx = renderer.ctx;
  ctx.beginPath();
  diagrams.arrowPath({ x: x, y: y, nx: -1, ny: 0 }, ctx, renderer.arrowSize);
  ctx.stroke();
}

function hitArrow(renderer, x, y, p, tol) {
  const d = renderer.arrowSize, r = d * 0.5;
  return diagrams.hitTestRect(x - r, y - r, d, d, p, tol);
}

Renderer.prototype.drawState = function(state, mode) {
  const ctx = this.ctx, theme = this.theme, r = this.radius,
        rect = this.getItemRect(state),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h,
        knobbyRadius = this.knobbyRadius, textSize = theme.fontSize,
        lineBase = y + textSize + this.textLeading;
  diagrams.roundRectPath(x, y, w, h, r, ctx);
  switch (mode) {
    case normalMode:
      ctx.fillStyle = state.state == 'palette' ? theme.altBgColor : theme.bgColor;
      ctx.fill();
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, lineBase);
      ctx.lineTo(x + w, lineBase);
      ctx.stroke();

      ctx.fillStyle = theme.textColor;
      ctx.fillText(state.name, x + r, y + textSize);

      const items = state.items;
      if (items) {
        let separatorY = y;
        for (var i = 0; i < items.length - 1; i++) {
          const statechart = items[i];
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
  drawArrow(this, x + w + this.arrowSize, lineBase);
}

Renderer.prototype.hitTestState = function(state, p, tol, mode) {
  const theme = this.theme, r = this.radius,
        rect = this.getItemRect(state),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h;
  const lineBase = y + theme.fontSize + this.textLeading,
        knobbyRadius = this.knobbyRadius;
  if (hitArrow(this, x + w + this.arrowSize, lineBase, p, tol))
    return { arrow: true };
  return diagrams.hitTestRect(x, y, w, h, p, tol); // TODO hitTestRoundRect
}

Renderer.prototype.drawPseudoState = function(state, mode) {
  const ctx = this.ctx, theme = this.theme, r = this.radius,
        rect = this.getItemRect(state),
        x = rect.x, y = rect.y;
  // TODO handle other psuedo state types.
  diagrams.diskPath(x + r, y + r, r, ctx);
  switch (mode) {
    case normalMode:
      ctx.fillStyle = state.state == 'palette' ? theme.altBgColor : theme.strokeColor;
      ctx.fill();
      // Render knobbies, faintly.
      ctx.lineWidth = 0.25;
      ctx.stroke()
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

Renderer.prototype.hitTestPseudoState = function(state, p, tol, mode) {
  const r = this.radius,
        rect = this.getItemRect(state),
        x = rect.x, y = rect.y;
  if (hitArrow(this, x + 2 * r + this.arrowSize, y + r, p, tol))
    return { arrow: true };

  return diagrams.hitTestDisk(x + r, y + r, r, p, tol);
}

Renderer.prototype.drawStatechart = function(statechart, mode) {
  switch (mode) {
    case normalMode:
      break;
    case highlightMode:
      break;
    case hotTrackMode:
      const ctx = this.ctx, theme = this.theme, r = this.radius,
            rect = this.getItemRect(statechart),
            x = rect.x, y = rect.y, w = rect.w, h = rect.h;
      diagrams.roundRectPath(x, y, w, h, r, ctx);
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }
}

Renderer.prototype.hitTestStatechart = function(statechart, p, tol, mode) {
  const r = this.radius,
        rect = this.getItemRect(statechart),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h;
  return diagrams.hitTestRect(x, y, w, h, p, tol); // TODO hitTestRoundRect
}

Renderer.prototype.layoutTransition = function(transition) {
  const referencingModel = this.model.referencingModel,
        src = getTransitionSrc(transition),
        dst = getTransitionDst(transition);
  let p1 = transition[_p1], p2 = transition[_p2];

  if (src)
    p1 = this.stateParamToPoint(src, transition.t1);
  if (dst)
    p2 = this.stateParamToPoint(dst, transition.t2);

  const bezier = transition[_bezier] = diagrams.getEdgeBezier(p1, p2);
  // transition[_mid] = geometry.evaluateBezier(bezier, 0.5);
}

Renderer.prototype.drawTransition = function(transition, mode) {
  const ctx = this.ctx,
        r = this.knobbyRadius,
        bezier = transition[_bezier];
  diagrams.bezierEdgePath(bezier, ctx, this.arrowSize);
  switch (mode) {
    case normalMode:
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      let src = getTransitionSrc(transition);
      if (src && !isPseudostate(src)) {
        diagrams.roundRectPath(bezier[0].x - this.radius,
                               bezier[0].y - this.radius,
                               16, 16, this.radius, ctx);
        ctx.fillStyle = theme.bgColor;
        ctx.fill();
        ctx.lineWidth = 0.25;
        ctx.stroke();
      }
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

Renderer.prototype.hitTestTransition = function(transition, p, tol, mode) {
  return diagrams.hitTestBezier(transition[_bezier], p, tol);
}

Renderer.prototype.layout = function(item) {
  switch (item.type) {
    case 'transition':
      this.layoutTransition(item);
      break;
  }
}

Renderer.prototype.draw = function(item, mode) {
  switch (item.type) {
    case 'state':
      this.drawState(item, mode);
      break;
    case 'start':
      this.drawPseudoState(item, mode);
      break;
    case 'transition':
      this.drawTransition(item, mode);
      break;
    case 'statechart':
      this.drawStatechart(item, mode);
      break;
  }
}

Renderer.prototype.hitTest = function(item, p, tol, mode) {
  let hitInfo;
  switch (item.type) {
    case 'state':
      hitInfo = this.hitTestState(item, p, tol, mode);
      break;
    case 'start':
      hitInfo = this.hitTestPseudoState(item, p, tol, mode);
      break;
    case 'transition':
      hitInfo = this.hitTestTransition(item, p, tol, mode);
      break;
    case 'statechart':
      hitInfo = this.hitTestStatechart(item, p, tol, mode);
      break;
  }
  if (hitInfo)
    hitInfo.item = item;
  return hitInfo;
}

Renderer.prototype.drawHoverText = function(item, p) {
  const self = this, theme = this.theme,
        props = [];
  this.model.dataModel.visitProperties(item, function(item, attr) {
    const value = item[attr];
    if (Array.isArray(value))
      return;
    props.push({ name: attr, value: value });
  });
  const textSize = theme.fontSize, gap = 16, border = 4,
        height = textSize * props.length + 2 * border,
        maxWidth = diagrams.measureNameValuePairs(props, gap, ctx) + 2 * border;
  let x = p.x, y = p.y;
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
  const self = this;
  this.model = model;
  this.statechart = model.root;
  this.renderer = renderer;

  this.hitTolerance = 8;

  this.items = [
    {
      type: 'start',
      state: 'palette',
      x: 48,
      y: 8,
    },
    {
      type: 'state',
      state: 'palette',
      x: 8,
      y: 30,
      width: 100,
      height: 60,
      name: 'New State',
    },
  ]


  function initialize(item) {
    // if (item.type == 'circuit') {
    //   item[_master] = circuitMasters[item.master];
    // }
  }

  editingModel.extend(model);

  getTransitionSrc = model.referencingModel.getReferenceFn('srcId');
  getTransitionDst = model.referencingModel.getReferenceFn('dstId');

  model.dataModel.addInitializer(initialize);
  model.dataModel.initialize();
}

Editor.prototype.initialize = function(canvasController) {
  this.canvasController = canvasController;
  this.canvas = canvasController.canvas;
  this.ctx = canvasController.ctx;

  if (!this.renderer)
    this.renderer = new Renderer(canvasController.theme);

  const statechart = this.statechart,
        model = this.model,
        editingModel = model.editingModel;
  this.items.forEach(function(item) {
    editingModel.addItem(item, statechart);
  });
}

Editor.prototype.draw = function() {
  const renderer = this.renderer, statechart = this.statechart,
        model = this.model,
        ctx = this.ctx, canvasController = this.canvasController;
  renderer.beginDraw(model, ctx);
  canvasController.applyTransform();
  visit(statechart, isTransition, function(item) {
    renderer.layout(item);
  });

  visit(statechart, isContainable, function(item) {
    renderer.draw(item, normalMode);
  });
  visit(statechart, isTransition, function(transition) {
    renderer.draw(transition, normalMode);
  });

  model.selectionModel.forEach(function(item) {
    renderer.draw(item, highlightMode);
  });
  if (this.hotTrackInfo)
    renderer.draw(this.hotTrackInfo.item, hotTrackMode);
  renderer.endDraw();

  const hoverHitInfo = this.hoverHitInfo;
  if (hoverHitInfo) {
    renderer.beginDraw(model, ctx);
    renderer.drawHoverText(hoverHitInfo.item, hoverHitInfo.p);
    renderer.endDraw();
  }
}

Editor.prototype.hitTest = function(p) {
  const renderer = this.renderer,
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
  // TODO hit test selection first, in highlight, first.
  reverseVisit(statechart, isTransition, function(transition) {
    pushInfo(renderer.hitTest(transition, cp, cTol, normalMode));
  });
  reverseVisit(statechart, isContainable, function(item) {
    pushInfo(renderer.hitTest(item, cp, cTol, normalMode));
  });
  return hitList;
}

Editor.prototype.getFirstHit = function(hitList, filterFn) {
  if (hitList) {
    const model = this.model;
    for (let i = 0; i < hitList.length; i++) {
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

function isContainerTarget(hitInfo, model) {
  const item = hitInfo.item;
  return isContainer(item) &&
         !model.hierarchicalModel.isItemInSelection(item);
}

Editor.prototype.onClick = function(p) {
  const model = this.model,
        selectionModel = model.selectionModel,
        shiftKeyDown = this.canvasController.shiftKeyDown,
        cmdKeyDown = this.canvasController.cmdKeyDown,
        hitList = this.hitTest(p),
        mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList, isDraggable);
  if (mouseHitInfo) {
    const item = mouseHitInfo.item;
    if (isPaletted(item) || cmdKeyDown) {
      mouseHitInfo.moveCopy = true;
      // No transition dragging or state resizing in this mode.
      mouseHitInfo.arrow = mouseHitInfo.border = undefined;
    }
    selectionModel.select(item, shiftKeyDown);
  } else {
    if (!shiftKeyDown) {
      selectionModel.clear();
    }
  }
  return mouseHitInfo != null;
}

const connectTransitionSrc = 1,
      connectTransitionDst = 2,
      moveSelection = 3,
      moveCopySelection = 4,
      resizeState = 5;

Editor.prototype.onBeginDrag = function(p0) {
  const mouseHitInfo = this.mouseHitInfo,
        canvasController = this.canvasController;
  if (!mouseHitInfo)
    return false;
  const model = this.model,
        editingModel = model.editingModel,
        selectionModel = model.selectionModel,
        dragItem = mouseHitInfo.item;
  let drag, newTransition;
  if (mouseHitInfo.arrow) {
    const stateId = model.dataModel.getId(dragItem),
          cp0 = canvasController.viewToCanvas(p0);
    // Start the new transition as connecting the src state to itself.
    newTransition = {
      type: 'transition',
      srcId: stateId,
      t1: 0,
      [_p2]: cp0,
    };
    drag = {
      type: connectTransitionDst,
      name: 'Add new transition',
      newItem: true,
    };
  } else {
    switch (dragItem.type) {
      case 'state':
      case 'start':
        if (mouseHitInfo.moveCopy) {
          drag = { type: moveCopySelection, name: 'Move copy of selection', newItem: true };
        } else {
          if (dragItem.type == 'state' && mouseHitInfo.border) {
            drag = { type: resizeState, name: 'Resize state' };
          } else {
            drag = { type: moveSelection, name: 'Move selection' };
          }
        }
        break;
      case 'transition':
        if (mouseHitInfo.p1)
          drag = { type: connectTransitionSrc, name: 'Edit transition' };
        else if (mouseHitInfo.p2)
          drag = { type: connectTransitionDst, name: 'Edit transition' };
        break;
    }
  }

  this.drag = drag;
  if (drag) {
    if (drag.type == moveSelection || drag.type == moveCopySelection) {
      editingModel.reduceSelection();
      // let items = selectionModel.contents();
      // drag.isSingleElement = items.length == 1 && isState(items[0]);
    }
    model.transactionModel.beginTransaction(drag.name);
    if (newTransition) {
      drag.item = newTransition;
      editingModel.newItem(newTransition);
      editingModel.addItem(newTransition, this.statechart);
      selectionModel.set(newTransition);
    } else {
      drag.item = dragItem;
      if (mouseHitInfo.moveCopy) {
        const map = new Map(),
              copies = editingModel.copyItems(selectionModel.contents(), map);
        editingModel.addItems(copies);
        selectionModel.set(copies);
      }
    }
  }
}

Editor.prototype.onDrag = function(p0, p) {
  const drag = this.drag;
  if (!drag)
    return;
  const dragItem = drag.item,
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
        snapshot = transactionModel.getSnapshot(dragItem),
        hitList = this.hitTest(p);
  let hitInfo;
  switch (drag.type) {
    case moveCopySelection:
    case moveSelection:
      hitInfo = this.getFirstHit(hitList, isStateBorder);
      selectionModel.forEach(function(item) {
        const snapshot = transactionModel.getSnapshot(item);
        if (snapshot) {
          observableModel.changeValue(item, 'x', snapshot.x + dx);
          observableModel.changeValue(item, 'y', snapshot.y + dy);
        }
      });
      break;
    case resizeState:
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
    case connectTransitionSrc:
      hitInfo = this.getFirstHit(hitList, isStateBorder);
      const srcId = hitInfo ? dataModel.getId(hitInfo.item) : 0;  // 0 is invalid id
      observableModel.changeValue(dragItem, 'srcId', srcId);
      const src = getTransitionSrc(dragItem);
      if (src) {
        const t1 = renderer.statePointToParam(src, cp);
        observableModel.changeValue(dragItem, 't1', t1);
      } else {
        dragItem[_p1] = cp;
      }
      break;
    case connectTransitionDst:
      // Adjust position on src state to track the new transition.
      if (drag.newItem) {
        const src = referencingModel.getReference(dragItem, 'srcId');
        observableModel.changeValue(dragItem, 't1', renderer.statePointToParam(src, cp));
      }
      hitInfo = this.getFirstHit(hitList, isStateBorder);
      const dstId = hitInfo ? dataModel.getId(hitInfo.item) : 0;  // 0 is invalid id
      observableModel.changeValue(dragItem, 'dstId', dstId);
      const dst = getTransitionDst(dragItem);
      if (dst) {
        const t2 = renderer.statePointToParam(dst, cp);
        observableModel.changeValue(dragItem, 't2', t2);
      } else {
        dragItem[_p2] = cp;
      }
      break;
  }

  this.hotTrackInfo = (hitInfo && hitInfo.item != this.statechart) ? hitInfo : null;
}

Editor.prototype.onEndDrag = function(p) {
  const drag = this.drag;
  if (!drag)
    return;
  let dragItem = drag.item;
  const model = this.model,
        statechart = this.statechart,
        observableModel = model.observableModel,
        hierarchicalModel = model.hierarchicalModel,
        selectionModel = model.selectionModel,
        transactionModel = model.transactionModel,
        editingModel = model.editingModel;
  if (isTransition(dragItem)) {
    dragItem[_p1] = dragItem[_p2] = undefined;
  } else if (drag.type == moveSelection || drag.type == moveCopySelection) {
    // Find state beneath mouse.
    const hitList = this.hitTest(p),
          hitInfo = this.getFirstHit(hitList, isContainerTarget),
          parent = hitInfo ? hitInfo.item : statechart;
    // Reparent items.
    selectionModel.forEach(function(item) {
      if (isContainable(item)) {
        editingModel.addItem(item, parent);
      }
    });
  }

  const renderer = this.renderer;
  renderer.beginDraw(model, this.ctx);
  // TODO viewModel to perform layout automatically.
  editingModel.layout(this.statechart, renderer);
  renderer.endDraw();

  // If dragItem is a disconnected transition, delete it.
  // TODO consistency checking done by editingModel.
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
  const model = this.model,
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
  const model = this.model,
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
        if (model.copyPasteModel.getScrap()) {
          editingModel.doPaste();
          return true;
        }
        return false;
      case 72:  // 'h'
        editingModel.doTogglePalette();
        return true;
      case 83:  // 's'
        var text = JSON.stringify(
          statechart,
          function(key, value) {
            if (key.toString().charAt(0) == '_')
              return;
            if (value == undefined || value == null)
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

  // normalMode: normalMode,
  // highlightMode: highlightMode,
  // hotTrackMode: hotTrackMode,

  Renderer: Renderer,

  Editor: Editor,
};
})();


const statechart_data = {
  "type": "statechart",
  "id": 1001,
  "x": 0,
  "y": 0,
  "width": 853,
  "height": 430.60454734008107,
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
  ]
}
