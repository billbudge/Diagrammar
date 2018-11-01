// Circuits module.

'use strict';

var circuits = (function() {

function isContainer(item) {
  return item.type == 'diagram';
}

function isConnectable(item) {
  return item.type == 'element';
}

function isConnection(item) {
  return item.type == 'wire';
}

function isImmediate(item) {
  return item.type == 'element' && item.master == '$';
}

function isJunction(item) {
  return item.type == 'element' && item.junction;
}

function isInputJunction(item) {
  return item.type == 'element' && item.junction == 'input';
}

function isOutputJunction(item) {
  return item.type == 'element' && item.junction == 'output';
}

function needsLayout(item) {
  return isConnection(item) || isImmediate(item);
}

function isDiagram(item) {
  return item.type == 'diagram';
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
      let model = this.model;
      model.selectionModel.set(model.hierarchicalModel.reduceSelection());
    },

    getConnectedConnections: function (items, copying) {
      let model = this.model,
          itemsAndChildren = new Set();
      items.forEach(function(item) {
        visit(item, isConnectable, function(item) {
          itemsAndChildren.add(item);
        });
      });
      let connections = [];
      visit(this.diagram, isConnection, function(item) {
        let contains1 = itemsAndChildren.has(item._srcId),
            contains2 = itemsAndChildren.has(item._dstId);
        if (copying) {
          if (contains1 && contains2)
            connections.push(item);
        } else if (contains1 || contains2) {
          connections.push(item);
        }
      });
      return connections;
    },

    newItem: function(item) {
      let dataModel = this.model.dataModel;
      dataModel.assignId(item);
      dataModel.initialize(item);
    },

    deleteItem: function(item) {
      let model = this.model,
          hierarchicalModel = model.hierarchicalModel,
          parent = hierarchicalModel.getParent(item);
      if (parent) {
        let items = parent.items,
            index = items.indexOf(item);
        if (index >= 0)
          model.observableModel.removeElement(parent, 'items', index);
      }
    },

    deleteItems: function(items) {
      let self = this,
          connections = this.getConnectedConnections(items, false);
      connections.forEach(function(connection) {
        self.deleteItem(connection);
      });
      items.forEach(function(item) {
        self.deleteItem(item);
      });
    },

    doDelete: function() {
      this.reduceSelection();
      this.prototype.doDelete.call(this);
    },

    copyItems: function(items, map) {
      let model = this.model, dataModel = model.dataModel,
          transformableModel = model.transformableModel,
          connected = this.getConnectedConnections(items, true),
          copies = this.prototype.copyItems(items.concat(connected), map),
          diagram = this.diagram;

      items.forEach(function(item) {
        let copy = map.get(dataModel.getId(item));
        if (isConnectable(copy)) {
          let toGlobal = transformableModel.getToParent(item, diagram);
          geometry.matMulPt(copy, toGlobal);
        }
      });
      return copies;
    },

    doCopy: function() {
      let selectionModel = this.model.selectionModel;
      this.reduceSelection();
      selectionModel.contents().forEach(function(item) {
        if (!isConnectable(item))
          selectionModel.remove(item);
      });
      this.prototype.doCopy.call(this);
    },

    addItems: function(items) {
      var model = this.model, diagram = this.diagram,
          diagramItems = diagram.items;
      items.forEach(function(item) {
        diagramItems.push(item);
        model.selectionModel.add(item);
        model.observableModel.onElementInserted(diagram, 'items', diagramItems.length - 1);
      });
    },

    doPaste: function() {
      this.getScrap().forEach(function(item) {
        // Offset pastes so the user can see them.
        if (isConnectable(item)) {
          item.x += 16;
          item.y += 16;
        }
      });
      this.prototype.doPaste.call(this);
    },

    setAttr: function(item, attr, value) {
      this.model.observableModel.changeValue(item, attr, value);
    },

    addItem: function(item, parent) {
      let model = this.model, hierarchicalModel = model.hierarchicalModel,
          oldParent = hierarchicalModel.getParent(item);
      if (oldParent === parent)
        return;
      let transformableModel = model.transformableModel,
          toParent = transformableModel.getToParent(item, parent);
      geometry.matMulPt(item, toParent);
      var itemToAdd = item;
      if (isDiagram(parent)) {
        if (!Array.isArray(parent.items))
          model.observableModel.changeValue(parent, 'items', []);
      }
      if (oldParent !== parent) {
        if (oldParent)            // if null, it's a new item.
          this.deleteItem(item);  // notifies observer
        parent.items.push(itemToAdd);
        model.observableModel.onElementInserted(parent, 'items', parent.items.length - 1);
      }
      return itemToAdd;
    },

    setInputJunction: function(junction, input) {
      let model = this.model, observableModel = model.observableModel;
      // Replace the first input with a pin to match output.
      observableModel.removeElement(junction, 'outputs', 0);
      observableModel.insertElement(junction, 'outputs', 0, Object.assign({}, input));
    },

    setOutputJunction: function(junction, output, expand) {
      let model = this.model, observableModel = model.observableModel;
      // Replace the first input with a pin to match output.
      observableModel.removeElement(junction, 'inputs', 0);
      observableModel.insertElement(junction, 'inputs', 0, Object.assign({}, output));

      if (expand) {
        // Add the expanded pin's inputs and outputs.
        let master = output._master;
        if (master) {
          master.inputs.forEach(function(input) {
            observableModel.insertElement(
              junction, 'inputs', junction.inputs.length, Object.assign({}, input));
          });
          master.outputs.forEach(function(output) {
            observableModel.insertElement(
              junction, 'outputs', junction.outputs.length, Object.assign({}, output));
          });
        } else {
          // Single output value.
          observableModel.insertElement(
            junction, 'outputs', junction.outputs.length, Object.assign({}, output));
        }
      }
    },

    makeClosure: function(element) {
      let master = element._master;
      let connections = this.getConnectedConnections([element], false);
      // Get indices of element's disconnected inputs.
      let connectedPins = new Set();
      connections.forEach(function(wire) {
        if (wire._dstId === element) {
          connectedPins.add(wire.dstPin);
        }
      });
      // The element's disconnected inputs become the new function's inputs.
      // The connected inputs remain on the element.
      let fnType = '[', inputs = [];
      // Create a map from old input to new input.
      let inputMap = new Map();
      master.inputs.forEach(function(input, i) {
        if (!connectedPins.has(i)) {
          fnType += input.type;
        } else {
          inputMap.set(i, inputs.length);
          inputs.push({ type: input.type });
        }
      });
      fnType += ',';
      // The element's outputs become the new function's outputs.
      master.outputs.forEach(function(output) {
        fnType += output.type;
      });
      fnType += ']';
      console.log('closure', fnType);
      // Add the closure fn to outputs.
      let outputs = [{ type: fnType }];

      // Now make changes to the data model.
      let model = this.model, observableModel = model.observableModel;
      // Remap connected wires to the new input pins.
      connections.forEach(function(wire) {
        if (wire._dstId === element) {
          observableModel.changeValue(wire, 'dstPin', inputMap.get(wire.dstPin));
        }
      });
      // Remaster element.
      this.setAttr(element, 'inputs', inputs);
      this.setAttr(element, 'outputs', outputs);
      this.setAttr(element, 'master', '$');
      this.model.dataModel.initialize(element);
    },

    doClosure: function() {
      let self = this, selectionModel = this.model.selectionModel,
          transactionModel = this.model.transactionModel;
      this.reduceSelection();
      transactionModel.beginTransaction('closure');
      selectionModel.contents().forEach(function(item) {
        if (isConnectable(item))
          self.makeClosure(item);
      });
      transactionModel.endTransaction();
    },

    makeAbstract: function(element) {
      let master = element._master;
      let connections = this.getConnectedConnections([element], false);

      // The abstract function type is just the type of the element.
      let fnType = '[';
      // Create a map from old input to new input.
      master.inputs.forEach(function(input, i) {
        fnType += input.type;
      });
      fnType += ',';
      master.outputs.forEach(function(output) {
        fnType += output.type;
      });
      fnType += ']';
      console.log('abstract', fnType);
      // Add the closure fn as the first input.
      let inputs = Array.from(master.inputs), outputs = Array.from(master.outputs);
      inputs.unshift({ type: fnType });
      console.log(inputs, master.inputs);

      // Now make changes to the data model.
      let model = this.model, observableModel = model.observableModel;
      // Remap connected wires to the new input pins.
      connections.forEach(function(wire) {
        if (wire._dstId === element) {
          observableModel.changeValue(wire, 'dstPin', wire.dstPin + 1);
        }
      });
      // Remaster element.
      this.setAttr(element, 'inputs', inputs);
      this.setAttr(element, 'outputs', outputs);
      this.setAttr(element, 'master', '$');
      this.model.dataModel.initialize(element);
    },

    doAbstract: function() {
      let self = this, selectionModel = this.model.selectionModel,
          transactionModel = this.model.transactionModel;
      this.reduceSelection();
      transactionModel.beginTransaction('abstract');
      selectionModel.contents().forEach(function(item) {
        if (isConnectable(item))
          self.makeAbstract(item);
      });
      transactionModel.endTransaction();
    },

    doGroup: function() {
      let self = this, diagram = this.diagram, model = this.model,
          dataModel = model.dataModel,
          selectionModel = model.selectionModel,
          observableModel = model.observableModel,
          transactionModel = model.transactionModel;
      this.reduceSelection();
      transactionModel.beginTransaction('group');

      let connections = this.getConnectedConnections(selectionModel.contents(), false);
      let incoming = [], outgoing = [];
      // Separate connections into incoming, outgoing, and internal. Adjust
      // selection to contain only elements and internal connections.
      connections.forEach(function(connection) {
        let src = connection._srcId, dst = connection._dstId;
        if (!selectionModel.contains(src)) {
          selectionModel.remove(connection);
          incoming.push(connection);
        } else if (!selectionModel.contains(dst)) {
          selectionModel.remove(connection);
          outgoing.push(connection);
        } else {
          selectionModel.add(connection);
        }
      });
      let groupItems = selectionModel.contents();
      // Input pins are all input junctions, plus any input pins connecting to
      // outside |elements|. Likewise, output pins are all output junctions plus
      // any output pins connecting to outside |elements|.
      let inputs = [], outputs = [];
      groupItems.forEach(function(item) {
        if (isInputJunction(item)) {
          inputs.push({ type: item.outputs[0].type });
        } else if (isOutputJunction(item)) {
          outputs.push({ type: item.inputs[0].type });
        }
        self.deleteItem(item);
      });
      incoming.forEach(function(item) {
        observableModel.changeValue(item, 'dstPin', inputs.length);
        inputs.push({ type: item._srcId.outputs[item.srcPin].type });
      });
      outgoing.forEach(function(item) {
        observableModel.changeValue(item, 'srcPin', outputs.length);
        inputs.push({ type: item._dstId.inputs[item.dstPin].type });
      });
      // Create the new group element.
      let groupElement = {
        type: 'element',
        master: '$',
        x: 160,
        y: 160,
        inputs: inputs,
        outputs: outputs,
        // 'groupItems' is part of data model but not traversed in editor.
        groupItems: groupItems,
      };
      // Delete the group items.
      this.newItem(groupElement);
      this.addItem(groupElement, diagram);
      selectionModel.set(groupElement);

      // Remap the external connections.
      let id = dataModel.getId(groupElement);
      incoming.forEach(function(item) {
        observableModel.changeValue(item, 'dstId', id);
      });
      outgoing.forEach(function(item) {
        observableModel.changeValue(item, 'srcId', id);
      });

      transactionModel.endTransaction();
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
    instance.diagram = model.root;

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
  this.theme = theme || diagrams.theme.create();

  this.knobbyRadius = 4;
  this.padding = 8;
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

Renderer.prototype.getItemRect = function(item) {
  var transform = this.transformableModel.getAbsolute(item),
      x = transform[4], y = transform[5], w, h;
  // TODO update
  switch (item.type) {
    case 'element':
      w = item._master._width;
      h = item._master._height;
      break;
  }
  return { x: x, y: y, w: w, h: h };
}

Renderer.prototype.pinToPoint = function(item, pin, input) {
  let rect = this.getItemRect(item),
      x = rect.x, y = rect.y, w = rect.w, h = rect.h,
      textSize = this.theme.fontSize,
      offset = pin._height / 2;
  // Element.
  if (input) {
    pin = item._master.inputs[pin];
  } else {
    pin = item._master.outputs[pin];
    x += w;
  }
  y += pin._y + pin._height / 2;

  return {
    x: x,
    y: y,
    nx: input ? -1 : 1,
    ny: 0,
  }
}

function drawValue(renderer, x, y) {
  var ctx = renderer.ctx, r = renderer.knobbyRadius, d = 2 * r;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, d, d);
}

const spacing = 6;
const shrink = 0.8, inv_shrink = 1 / shrink;
const minMasterWidth = 16;
const minMasterHeight = 16;

// Compute sizes for an element master.
Renderer.prototype.layoutMaster = function(master) {
  let ctx = this.ctx, theme = this.theme,
      textSize = theme.fontSize, name = master.name,
      inputs = master.inputs, outputs = master.outputs,
      height = 0, width = 0;
  if (name) {
    width = spacing + ctx.measureText(name).width;
    height += textSize + spacing / 2;
  } else {
    height += spacing;
  }
  let yIn = height, wIn = 0;
  for (let i = 0; i < inputs.length; i++) {
    let pin = inputs[i];
    this.layoutPin(pin);
    pin._y = yIn + spacing / 2;
    let name = pin.name, w = pin._width, h = pin._height + spacing / 2;
    if (name) {
      let offset = Math.abs(h - textSize) / 2;
      pin._baseline = yIn + textSize;
      if (textSize > h) {
        pin._y += offset;
        h = textSize;
      } else {
        pin._baseline += offset;
      }
      w += spacing + ctx.measureText(name).width;
    }
    yIn += h;
    wIn = Math.max(wIn, w);
  }
  let yOut = height, wOut = 0;
  for (let i = 0; i < outputs.length; i++) {
    let pin = outputs[i];
    this.layoutPin(pin);
    pin._y = yOut + spacing / 2;
    let name = pin.name, w = pin._width, h = pin._height + spacing / 2;
    if (name) {
      let offset = Math.abs(h - textSize) / 2;
      pin._baseline = yOut + textSize;
      if (textSize > h) {
        pin._y += offset;
        h = textSize;
      } else {
        pin._baseline += offset;
      }
      w += spacing + ctx.measureText(name).width;
    }
    yOut += h;
    wOut = Math.max(wOut, w);
  }

  master._width = Math.max(width, wIn + 2 * spacing + wOut, minMasterWidth);
  master._height = Math.max(yIn, yOut, minMasterHeight) + spacing / 2;
  return master;
}

Renderer.prototype.layoutPin = function(pin) {
  if (pin.type == 'v') {
    pin._width = pin._height = 2 * this.knobbyRadius;
  } else {
    this.layoutMaster(pin._master);
    pin._width = pin._master._width * shrink;
    pin._height = pin._master._height * shrink;
  }
}

Renderer.prototype.drawMaster = function(master, x, y, mode) {
  var self = this, ctx = this.ctx, theme = this.theme,
      width = master._width, height = master._height;
  switch (mode) {
    case normalMode:
      let textSize = theme.fontSize, name = master.name,
          inputs = master.inputs, outputs = master.outputs;
      ctx.fillStyle = theme.bgColor;
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = theme.textColor;
      ctx.textBaseline = 'bottom';
      if (name) {
        ctx.textAlign = 'center';
        ctx.fillText(name, x + width / 2, y + textSize);
      }
      inputs.forEach(function(pin, i) {
        let name = pin.name;
        self.drawPin(pin, x, y + pin._y, mode);
        if (name) {
          ctx.textAlign = 'left';
          ctx.fillText(name, x + pin._width + spacing, y + pin._baseline);
        }
      });
      outputs.forEach(function(pin) {
        let name = pin.name, left = x + width - pin._width;
        self.drawPin(pin, left, y + pin._y, mode);
        if (name) {
          ctx.textAlign = 'right';
          ctx.fillText(name, left - spacing, y + pin._baseline);
        }
      });
      break;
    case highlightMode:
      ctx.strokeStyle = theme.highlightColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      break;
    case hotTrackMode:
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      break;
  }
}

Renderer.prototype.drawPin = function(pin, x, y, mode) {
  if (pin.type == 'v') {
    drawValue(this, x, y);
  } else {
    let master = pin._master;
    this.ctx.scale(shrink, shrink);
    this.drawMaster(master, inv_shrink * x, inv_shrink * y, mode);
    this.ctx.scale(inv_shrink, inv_shrink);
  }
}

Renderer.prototype.hitTestElement = function(element, p, tol, mode) {
  var rect = this.getItemRect(element),
      x = rect.x, y = rect.y, width = rect.w, height = rect.h,
      hitInfo = diagrams.hitTestRect(x, y, width, height, p, tol);
  if (hitInfo) {
    var master = element._master,
        inputs = master.inputs, outputs = master.outputs,
        self = this;
    inputs.forEach(function(input, i) {
      if (diagrams.hitTestRect(x, y + input._y, input._width, input._height, p, 0))
        hitInfo.input = i;
    });
    outputs.forEach(function(output, i) {
      if (diagrams.hitTestRect(x + width - output._width,
          y + output._y, output._width, output._height, p, 0))
        hitInfo.output = i;
    });
  }
  return hitInfo;
}

Renderer.prototype.layoutWire = function(wire) {
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

Renderer.prototype.drawWire = function(wire, mode) {
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

Renderer.prototype.hitTestWire = function(wire, p, tol, mode) {
  return diagrams.hitTestBezier(wire._bezier, p, tol);
}

Renderer.prototype.layout = function(item) {
  switch (item.type) {
    case 'wire':
      this.layoutWire(item);
      break;
    case 'element':
      if (item.master == '$') {
        this.layoutMaster(item);
      }
      break;
  }
}

Renderer.prototype.draw = function(item, mode) {
  let rect;
  switch (item.type) {
    case 'element':
      rect = this.getItemRect(item);
      this.drawMaster(item._master, rect.x, rect.y, mode);
      break;
    case 'wire':
      this.drawWire(item, mode);
      break;
  }
}

Renderer.prototype.hitTest = function(item, p, tol, mode) {
  let hitInfo, rect;
  switch (item.type) {
    case 'element':
      hitInfo = this.hitTestElement(item, p, tol, mode);
      break;
    case 'wire':
      hitInfo = this.hitTestWire(item, p, tol, mode);
      break;
  }
  if (hitInfo && !hitInfo.item)
    hitInfo.item = item;
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
  this.diagram = model.root;
  this.renderer = renderer;

  this.hitTolerance = 8;

  let masterMap = new Map();
  this.masterMap = masterMap;

  let unaryOps = ['!', '~', '-' ];
  let binaryOps = ['+', '-', '*', '/', '%', '==', '!=', '<', '<=', '>', '>=',
                   '|', '&', '||', '&&'];
  let ternaryOps = ['?'];

  unaryOps.forEach(function(op) {
    masterMap.set(op, {
      name: op,
      type: 'element',
      inputs: [
        { type: 'v' },
      ],
      outputs: [
        { type: 'v' },
      ]
    });
  });
  binaryOps.forEach(function(op) {
    masterMap.set(op, {
      name: op,
      type: 'element',
      inputs: [
        { name: 'a', type: 'v' },
        { name: 'b', type: 'v' },
      ],
      outputs: [
        { type: 'v' },
      ]
    });
  });
  // Just one ternary op for now.
  masterMap.set('?', {
      name: '?',
      type: 'element',
      inputs: [
        { name: 'c', type: 'v' },
        { name: 'a', type: 'v' },
        { name: 'b', type: 'v' },
      ],
      outputs: [
        { type: 'v' },
      ]
  });

  var palette = this.palette = {
    root: {
      type: 'palette',
      x: 0,
      y: 0,
      items: [
        { type: 'element',
          x: 16, y: 16,
          master: '$',
          junction: 'input',
          inputs: [],
          outputs: [
            { type: 'v' },
          ],
        },
        { type: 'element',
          x: 48, y: 16,
          master: '$',
          junction: 'output',
          inputs: [
            { type: 'v' },
          ],
          outputs: [],
        },
        { type: 'element',
          x: 80, y: 16,
          master: '$',
          junction: 'expander',
          inputs: [
            { type: 'v' },
          ],
          outputs: [],
        },
        {
          type: 'element',
          x: 16, y: 56,
          master: '?',
        },
        {
          type: 'element',
          x: 16, y: 140,
          master: '>',
        },
        {
          type: 'element',
          x: 64, y: 140,
          master: '+',
        },
      ],
    }
  }

  // function encodePinType(item) {
  //   // TODO update this
  //   if (item.type == 'v') return 'v';
  //   if (item.type == 'signature') {
  //     let result = '[';
  //     item._master.inputs.forEach(function(input) {
  //       result += encodePinType(input);
  //     });
  //     result += ',';
  //     item._master.outputs.forEach(function(input) {
  //       result += encodePinType(input);
  //     });
  //     result += ']';
  //     return result;
  //   }
  // }

  // Decodes and atomizes pin types into master map.
  function decodePinType(s) {
    let j = 0;
    // close over s, j to avoid extra return values.
    function decode() {
      let i = j;
      if (s[j] == 'v') {
        j++;
        return { type: 'v' };
      }
      if (s[j] == '[') {
        let inputs = [], outputs = [];
        j++;
        while (s[j] != ',') {
          inputs.push(decode());
        }
        j++;
        while (s[j] != ']') {
          outputs.push(decode());
        }
        j++;
        let type = s.substring(i, j);
        let master = masterMap.get(type);
        if (!master) {
          master = {
            type: type,
            inputs: inputs,
            outputs: outputs,
          };
          console.log(type, master);
          masterMap.set(type, master);
        }
        return {
          type: type,
          _master: master,
        };
      }
    }
    return decode();
  }
  this.decodePinType = decodePinType;  // TODO clean these up

  function initializePins(master) {
    let inputs = master.inputs, outputs = master.outputs;
    for (let i = 0; i < inputs.length; i++)
      inputs[i] = decodePinType(inputs[i].type);
    for (let i = 0; i < outputs.length; i++)
      outputs[i] = decodePinType(outputs[i].type);
  }

  // Initialize the built in masters.
  masterMap.forEach(function(master, name) {
    initializePins(master);
    // console.log(name, master);
  });

  // Initialize items in models (e.g. palette and documents).
  function initialize(item) {
    if (item.type == 'element') {
      // Only initialize once.
      // if (!item._master) {
        if (item.master == '$') {
          // Self master (junction).
          initializePins(item);
          item._master = item;
        } else {
          item._master = masterMap.get(item.master);
        }
      // }
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

  // Track changes fields that require re-initialization.
  model.observableModel.addHandler('changed', function (change) {
    if (change.attr == 'master') {
      let item = change.item;
      item._master = undefined;
      initialize(item);
    }
  });
}

Editor.prototype.initialize = function(canvasController) {
  this.canvasController = canvasController;
  this.canvas = canvasController.canvas;
  this.ctx = canvasController.ctx;

  if (!this.renderer)
    this.renderer = new Renderer(canvasController.theme);
  var renderer = this.renderer, ctx = this.ctx;
  renderer.beginDraw(this.palette, ctx);
  this.masterMap.forEach(function(master, name) {
    renderer.layoutMaster(master);
  });
  // TODO clean this up
  this.palette.root.items.forEach(function(item) {
    if (item.master == '$') {
      renderer.layoutMaster(item);
    }
  });
  renderer.endDraw();

  // Create an instance of every master.
  // TODO make palette awesome.
  let x = 160, y = 320, model = this.model, diagram = this.diagram;
  this.masterMap.forEach(function(master) {
    let item = {
      type: 'element',
      master: master.name,
      x: x,
      y: y,
    };

    model.editingModel.newItem(item);
    model.editingModel.addItem(item, diagram);
    x += 48;
  });
}

Editor.prototype.isPaletteItem = function(item) {
  var hierarchicalModel = this.palette.hierarchicalModel;
  return hierarchicalModel.getParent(item) === this.palette.root;
}

Editor.prototype.addTemporaryItem = function(item) {
  this.model.observableModel.changeValue(this.diagram, 'temporary', item);
}

Editor.prototype.removeTemporaryItem = function(item) {
  return this.model.observableModel.changeValue(this.diagram, 'temporary', null);
}

Editor.prototype.getTemporaryItem = function() {
  return this.diagram.temporary;
}

Editor.prototype.draw = function() {
  var renderer = this.renderer, diagram = this.diagram,
      model = this.model, palette = this.palette,
      ctx = this.ctx, canvasController = this.canvasController;
  renderer.beginDraw(model, ctx);
  canvasController.applyTransform();
  visit(diagram, needsLayout, function(item) {
    renderer.layout(item);
  });

  visit(diagram, isConnectable, function(item) {
    renderer.draw(item, normalMode);
  });
  visit(diagram, isConnection, function(item) {
    renderer.draw(item, normalMode);
  });

  model.selectionModel.forEach(function(item) {
    renderer.draw(item, highlightMode);
  });
  if (this.hotTrackInfo)
    renderer.draw(this.hotTrackInfo.item, hotTrackMode);
  renderer.endDraw();

  renderer.beginDraw(palette, ctx);
  ctx.fillStyle = renderer.theme.altBgColor;
  ctx.fillRect(palette.root.x, palette.root.y, 128, 300);
  palette.root.items.forEach(function(item) {
    renderer.draw(item, normalMode);
  });
  renderer.endDraw();

  var temporary = this.getTemporaryItem();
  if (temporary) {
    renderer.beginDraw(model, ctx);
    canvasController.applyTransform();
    if (needsLayout(temporary))
      renderer.layout(temporary);
    renderer.draw(temporary, normalMode);
    renderer.endDraw();
  }

  var hoverHitInfo = this.hoverHitInfo;
  if (hoverHitInfo) {
    renderer.beginDraw(model, ctx);
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
      diagram = this.diagram,
      hitList = [];
  function pushInfo(info) {
    if (info)
      hitList.push(info);
  }
  reverseVisit(this.palette.root, null, function(item) {
    pushInfo(renderer.hitTest(item, p, tol, normalMode));
  });
  // TODO hit test selection first, in highlight, first.
  reverseVisit(diagram, isConnection, function(item) {
    pushInfo(renderer.hitTest(item, cp, cTol, normalMode));
  });
  reverseVisit(diagram, isConnectable, function(item) {
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

function isDraggable(hitInfo, model) {
  return !isDiagram(hitInfo.item);
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
  let mouseHitInfo = this.mouseHitInfo;
  if (!mouseHitInfo)
    return false;
  let canvasController = this.canvasController,
      dragItem = mouseHitInfo.item, type = dragItem.type,
      model = this.model,
      newItem, drag;
  if (this.isPaletteItem(dragItem)) {
    newItem = model.instancingModel.clone(dragItem);
    drag = {
      type: 'paletteItem',
      name: 'Add new ' + dragItem.type,
      isNewItem: true,
    }
    let cp = canvasController.viewToCanvas(newItem);
    newItem.x = cp.x;
    newItem.y = cp.y;
  } else if (mouseHitInfo.input !== undefined) {
    // Wire from input pin.
    let circuitId = model.dataModel.getId(dragItem),
        cp0 = canvasController.viewToCanvas(p0);
    // Start the new wire as connecting the dst element to itself.
    newItem = {
      type: 'wire',
      dstId: circuitId,
      dstPin: mouseHitInfo.input,
      _p2: cp0,
    };
    drag = {
      type: 'connectingW1',
      name: 'Add new wire',
      isNewItem: true,
    };
  } else if (mouseHitInfo.output !== undefined) {
    // Wire from output pin.
    let circuitId = model.dataModel.getId(dragItem),
        cp0 = canvasController.viewToCanvas(p0);
    // Start the new wire as connecting the src element to itself.
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
      case 'element':
        drag = { type: 'moveSelection', name: 'Move selection' };
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
      if (isConnectable(dragItem))
        hitInfo = this.getFirstHit(hitList, isContainerTarget);
      var snapshot = transactionModel.getSnapshot(dragItem);
      if (snapshot) {
        observableModel.changeValue(dragItem, 'x', snapshot.x + dx);
        observableModel.changeValue(dragItem, 'y', snapshot.y + dy);
      }
      break;
    case 'moveSelection':
      if (isConnectable(dragItem))
        hitInfo = this.getFirstHit(hitList, isContainerTarget);
      selectionModel.forEach(function(item) {
        var snapshot = transactionModel.getSnapshot(item);
        if (snapshot) {
          observableModel.changeValue(item, 'x', snapshot.x + dx);
          observableModel.changeValue(item, 'y', snapshot.y + dy);
        }
      });
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
      diagram = this.diagram,
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
  if (drag.type == 'moveSelection' || newItem) {
    // Find element beneath mouse.
    var hitList = this.hitTest(p),
        hitInfo = this.getFirstHit(hitList, isContainerTarget),
        parent = hitInfo ? hitInfo.item : diagram;
    // Add new items.
    if (newItem) {
      editingModel.addItem(newItem, parent);
      selectionModel.set([newItem]);
    } else {
      // Reparent existing items.
      selectionModel.forEach(function(item) {
        if (isConnectable(item)) {
          editingModel.addItem(item, parent);
        }
      });
    }
  }

  // var renderer = this.renderer;
  // renderer.beginDraw(model, this.ctx);
  // editingModel.layout(this.diagram, renderer);
  // renderer.endDraw();

  if (isConnection(dragItem)) {
    // If dragItem is a disconnected wire, delete it.
    if (!dragItem.srcId || !dragItem.dstId) {
      editingModel.deleteItem(dragItem);
      selectionModel.remove(dragItem);
    } else {
      // Adjust pins for junction elements.
      let referencingModel = model.referencingModel,
      srcItem = referencingModel.resolveReference(dragItem, 'srcId'),
      dstItem = referencingModel.resolveReference(dragItem, 'dstId');
      if (isJunction(srcItem)) {
        let dstPin = dstItem._master.inputs[dragItem.dstPin];
        editingModel.setInputJunction(srcItem, dstPin);
      } else if (isJunction(dstItem)) {
        let srcPin = srcItem._master.outputs[dragItem.srcPin];
        editingModel.setOutputJunction(dstItem, srcPin, dstItem.junction == 'expander');
      }
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
      diagram = this.diagram,
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
        diagram.items.forEach(function(v) {
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
      case 75:  // 'k'
        editingModel.doClosure();
        return true;
      case 76:  // 'l'
        editingModel.doAbstract();
        return true;
      case 71:  // 'g'
        editingModel.doGroup();
        return true;
      case 83:  // 's'
        var text = JSON.stringify(
          diagram,
          function(key, value) {
            if (key.toString().charAt(0) === '_')
              return;
            if (value === undefined || value === null)
              return;
            return value;
          },
          2);
        // Writes diagram as JSON to console.
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

  Renderer: Renderer,

  Editor: Editor,
};
})();


var circuit_data =
{
  "type": "diagram",
  "id": 1001,
  "x": 0,
  "y": 0,
  "width": 853,
  "height": 430.60454734008107,
  "name": "Example",
  "items": [
  ]
}
