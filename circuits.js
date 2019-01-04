// Circuits module.

'use strict';

var circuits = (function() {

function isContainer(item) {
  return item.type == 'diagram';
}

function isElement(item) {
  return item.type == 'element';
}

function isWire(item) {
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
  return isWire(item) || isImmediate(item);
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

let _master = Symbol('master'),
    _y = Symbol('y'), _baseline = Symbol('baseline'),
    _width = Symbol('width'), _height = Symbol('height'),
    _p1 = Symbol('p1'), _p2 = Symbol('p2'), _bezier = Symbol('bezier');


let editingModel = (function() {
  let proto = {
    reduceSelection: function () {
      let model = this.model;
      model.selectionModel.set(model.hierarchicalModel.reduceSelection());
    },

    getConnectedConnections: function (items, copying) {
      let self = this, model = this.model,
          getReference = model.referencingModel.getReference,
          itemsAndChildren = new Set();
      items.forEach(function(item) {
        visit(item, isElement, function(item) {
          itemsAndChildren.add(item);
        });
      });
      let connections = [];
      visit(this.diagram, isWire, function(item) {
        let contains1 = itemsAndChildren.has(getReference(item, 'srcId')),
            contains2 = itemsAndChildren.has(getReference(item, 'dstId'));
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
        if (isElement(copy)) {
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
        if (!isElement(item))
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
        if (isElement(item)) {
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
      if (!isWire(item)) {
        let transformableModel = model.transformableModel,
            toParent = transformableModel.getToParent(item, parent);
        geometry.matMulPt(item, toParent);
      }
      if (isDiagram(parent)) {
        if (!Array.isArray(parent.items))
          model.observableModel.changeValue(parent, 'items', []);
      }
      if (oldParent !== parent) {
        if (oldParent)            // if null, it's a new item.
          this.deleteItem(item);  // notifies observer
        parent.items.push(item);
        model.observableModel.onElementInserted(parent, 'items', parent.items.length - 1);
      }
      return item;
    },

    // TODO implement connection checking / coercing
    canConnect: function(wire) {
      let getReference = this.model.referencingModel.getReference,
          srcItem = getReference(wire, 'srcId'),
          srcPin = srcItem[_master].outputs[wire.srcPin],
          dstItem = getReference(wire, 'dstId'),
          dstPin = dstItem[_master].inputs[wire.dstPin];
      return srcPin.type == '*' || dstPin.type == '*' ||
             srcPin.type == dstPin.type;
    },

    connect: function(wire) {
      let model = this.model,
          observableModel = model.observableModel,
          getReference = this.model.referencingModel.getReference,
          srcItem = getReference(wire, 'srcId'),
          srcPin = srcItem[_master].outputs[wire.srcPin],
          dstItem = getReference(wire, 'dstId'),
          dstPin = dstItem[_master].inputs[wire.dstPin];
      if (srcPin.type == '*') {
        // srcPin takes dstPin's type.
        if (dstPin.type != '*') {
          observableModel.changeValue(srcPin, 'type', dstPin.type);
          model.dataModel.initialize(srcItem);
        }
      } else if (dstPin.type == '*') {
        observableModel.changeValue(dstPin, 'type', srcPin.type);
        // dstPin takes srcPin's type.
        if (isJunction(dstItem) && dstItem.junction == 'opener') {
          // If srcPin is a function, add those inputs and output pins.
          let master = srcPin[_master];
          if (master) {
            master.inputs.forEach(function(input) {
              // Note we're inserting before the original input 0.
              observableModel.insertElement(
                dstItem, 'inputs', dstItem.inputs.length - 1, { type: input.type });
            });
            master.outputs.forEach(function(output) {
              observableModel.insertElement(
                dstItem, 'outputs', dstItem.outputs.length, { type: output.type });
            });
            observableModel.changeValue(wire, 'dstPin', dstItem.inputs.length - 1);
            observableModel.changeValue(dstItem, 'junction', undefined);
          }
        }
        model.dataModel.initialize(dstItem);
      }
    },

    // Partitions group items into elements, interior wires, incoming wires,
    // and outgoing wires, and partitions element input and output pins into
    // connected and disconnected sets.
    collectGroupInfo: function(items) {
      // Get elements and initialize input/output maps.
      let elementSet = new Set();
      let inputMap = new Map(), outputMap = new Map();
      items.forEach(function(item) {
        if (isElement(item)) {
          elementSet.add(item);
          // inputMap takes element to array of incoming wires.
          inputMap.set(item, new Array(item[_master].inputs.length).fill(null));
          // outputMap takes element to array of array of outgoing wires.
          outputMap.set(item, new Array(item[_master].outputs.length).fill([]));
        }
      });
      // Separate connections into incoming, outgoing, and internal. Populate
      // input/output maps, and incoming and outgoing pins.
      let wires = [], incomingWires = [], outgoingWires = [], interiorWires = [],
          getReference = this.model.referencingModel.getReference;
      visit(this.diagram, isWire, function(wire) {
        wires.push(wire);
        let src = getReference(wire, 'srcId'),
            dst = getReference(wire, 'dstId'),
            srcInside = elementSet.has(src),
            dstInside = elementSet.has(dst);
        if (srcInside) {
          outputMap.get(src)[wire.srcPin].push(wire);
          if (dstInside) {
            interiorWires.push(wire);
          } else {
            outgoingWires.push(wire);
          }
        }
        if (dstInside) {
          inputMap.get(dst)[wire.dstPin] = wire;
          if (!srcInside) {
            incomingWires.push(wire);
          }
        }
      });

      return {
        elementSet: elementSet,
        inputMap: inputMap,
        outputMap: outputMap,
        wires: wires,
        interiorWires: interiorWires,
        incomingWires: incomingWires,
        outgoingWires: outgoingWires,
      }
    },

    makePinName: function(element, pin) {
      return pin.name;// || element.name || element[_master].name;
    },

    completeGroup: function(elements) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          selectionModel = model.selectionModel,
          observableModel = model.observableModel,
          viewModel = model.viewModel;

      let groupInfo = this.collectGroupInfo(elements);

      // Add junctions for disconnected pins on selected elements.
      groupInfo.inputMap.forEach(function(elementInputs, element) {
        elementInputs.forEach(function(connectedWire, pin) {
          if (connectedWire)
            return;
          let dstPin = element[_master].inputs[pin];
          let junction = {
            type: 'element',
            name: self.makePinName(element, dstPin),
            x: element.x - 32, y: viewModel.pinToPoint(element, pin, true).y,
            master: '$',
            junction: 'input',
            inputs: [],
            outputs: [
              { type: dstPin.type },
            ],
          };
          self.newItem(junction);
          self.addItem(junction, self.diagram);
          let wire = {
            type: 'wire',
            srcId: junction.id,
            srcPin: 0,
            dstId: element.id,
            dstPin: pin,
          };
          self.newItem(wire);
          self.addItem(wire, self.diagram);
        });
      });
      groupInfo.outputMap.forEach(function(elementOutputs, element) {
        elementOutputs.forEach(function(wires, pin) {
          if (wires.length > 0)
            return;
          let srcPin = element[_master].outputs[pin];
          let junction = {
            type: 'element',
            name: self.makePinName(element, srcPin),
            x: element.x + 128, y: viewModel.pinToPoint(element, pin, false).y,
            master: '$',
            junction: 'output',
            inputs: [
              { type: srcPin.type },
            ],
            outputs: [],
          };
          self.newItem(junction);
          self.addItem(junction, self.diagram);
          let wire = {
            type: 'wire',
            srcId: element.id,
            srcPin: pin,
            dstId: junction.id,
            dstPin: 0,
          };
          self.newItem(wire);
          self.addItem(wire, self.diagram);
        });
      });
    },

    getClosedType: function(element, inputWires) {
      // Create a function type whose inputs are the disconnected inputs,
      // and whose outputs are all the outputs, connected or not.
      let fnType = '[';
      element[_master].inputs.forEach(function(input, i) {
        if (!inputWires[i])
          fnType += input.type;
      });
      fnType += ',';
      element[_master].outputs.forEach(function(output, i) {
        fnType += output.type;
      });
      fnType += ']';
      console.log('closedType', fnType);
      return fnType;
    },

    closeFunction: function(element, incomingWires, outgoingWireArrays) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          observableModel = model.observableModel,
          inputs = [], outputs = [];
      let newElement = {
        type: 'element',
        master: '$',
        element: element,
        x: element.x,
        y: element.y,
        inputs: inputs,
        outputs: outputs,
      };

      let id = dataModel.assignId(newElement);

      // Add only connected input pins to inputs.
      element[_master].inputs.forEach(function(pin, i) {
        let incomingWire = incomingWires[i];
        if (incomingWire) {
          inputs.push({ type: pin.type, name: pin.name });
          // remap wire to new element and pin.
          observableModel.changeValue(incomingWire, 'dstId', id);
          observableModel.changeValue(incomingWire, 'dstPin', inputs.length - 1);
        }
      });
      // Add only connected output pins to outputs.
      element[_master].outputs.forEach(function(pin, i) {
        let outgoingWires = outgoingWireArrays[i];
        if (outgoingWires.length > 0) {
          outputs.push({ type: pin.type, name: pin.name });
          outgoingWires.forEach(function(outgoingWire, j) {
            // remap wire to new element and pin.
            observableModel.changeValue(outgoingWire, 'srcId', id);
            observableModel.changeValue(outgoingWire, 'srcPin', outputs.length - 1);
          });
        }
      });

      outputs.push({ type: self.getClosedType(element, incomingWires) });

      dataModel.initialize(newElement);
      return newElement;
    },

    getOpenedType: function(element) {
      // Create a function type whose inputs are all inputs, and whose outputs
      // are all outputs.
      let fnType = '[';
      element[_master].inputs.forEach(function(input) {
        fnType += input.type;
      });
      fnType += ',';
      element[_master].outputs.forEach(function(output) {
        fnType += output.type;
      });
      fnType += ']';
      console.log('openedType', fnType);
      return fnType;
    },

    openFunction: function(element, incomingWires, outgoingWireArrays) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          observableModel = model.observableModel,
          inputs = [], outputs = [];
      let newElement = {
        type: 'element',
        master: '$',
        element: element,
        x: element.x,
        y: element.y,
        inputs: inputs,
        outputs: outputs,
      };

      let id = dataModel.assignId(newElement);

      // Add all input pins to inputs.
      element[_master].inputs.forEach(function(pin, i) {
        let incomingWire = incomingWires[i];
        inputs.push({ type: pin.type, name: pin.name });
        // remap wire to new element and pin.
        if (incomingWire) {
          observableModel.changeValue(incomingWire, 'dstId', id);
          observableModel.changeValue(incomingWire, 'dstPin', inputs.length - 1);
        }
      });
      // Add all output pins to outputs.
      element[_master].outputs.forEach(function(pin, i) {
        let outgoingWires = outgoingWireArrays[i];
        outputs.push({ type: pin.type, name: pin.name });
        outgoingWires.forEach(function(outgoingWire, j) {
          // remap wires to new element and pin.
          observableModel.changeValue(outgoingWire, 'srcId', id);
          observableModel.changeValue(outgoingWire, 'srcPin', outputs.length - 1);
        });
      });

      inputs.push({type: self.getOpenedType(element) });

      dataModel.initialize(newElement);
      return newElement;
    },

    closeOrOpenFunctions: function(elements, closing) {
      let self = this, model = this.model,
          selectionModel = model.selectionModel;

      let groupInfo = this.collectGroupInfo(elements);
      // Adjust selection to contain just the elements.
      groupInfo.wires.forEach(function(wire) {
        selectionModel.remove(wire);
      });
      // Open or close each non-junction element.
      groupInfo.elementSet.forEach(function(element) {
        if (isJunction(element)) return;
        let incomingWires = groupInfo.inputMap.get(element),
            outgoingWireArrays = groupInfo.outputMap.get(element);

        let newElement = closing ?
          self.closeFunction(element, incomingWires, outgoingWireArrays) :
          self.openFunction(element, incomingWires, outgoingWireArrays);

        selectionModel.remove(element);
        selectionModel.add(newElement)

        self.deleteItem(element);
        self.addItem(newElement, self.diagram);
      });
    },

    makeGroup: function(elements, elementOnly) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          getReference = model.referencingModel.getReference,
          selectionModel = model.selectionModel,
          observableModel = model.observableModel,
          viewModel = model.viewModel;

      let groupInfo = this.collectGroupInfo(elements);
      // Adjust selection to contain just the grouped objects.
      groupInfo.incomingWires.forEach(function(wire) {
        selectionModel.remove(wire);
      });
      groupInfo.outgoingWires.forEach(function(wire) {
        selectionModel.remove(wire);
      });
      groupInfo.interiorWires.forEach(function(wire) {
        selectionModel.add(wire);
      });

      let groupItems = selectionModel.contents();
      let extents = viewModel.getItemRects(groupInfo.elementSet);

      // Add input/output pins for connected 'input' and 'output' junctions.
      let inputs = [], outputs = [];
      groupItems.forEach(function(item) {
        if (isInputJunction(item) && groupInfo.outputMap.get(item)[0].length) {
          let pin = item.outputs[0];
          inputs.push({ type: pin.type, name: item.name, [_y]: item.y });
        } else if (isOutputJunction(item) && groupInfo.inputMap.get(item)[0]) {
          let pin = item.inputs[0];
          outputs.push({ type: pin.type, name: item.name, [_y]: item.y });
        }
        if (!elementOnly)
          self.deleteItem(item);
      });
      // Add pins for incoming source pins. Only add a single pin, even if
      // there are multiple wires incoming from it.
      let incomingOutputMap = new Map();
      groupInfo.incomingWires.forEach(function(wire) {
        let src = getReference(wire, 'srcId'), index = wire.srcPin,
            srcPin = src[_master].outputs[index],
            outputs = incomingOutputMap.get(src);
        if (outputs === undefined) {
          outputs = new Array(src[_master].outputs.length);
          incomingOutputMap.set(src, outputs);
        }
        let name = self.makePinName(src, srcPin);
        if (outputs[index] === undefined) {
          outputs[index] = inputs.length;
          inputs.push({ type: srcPin.type, name: name, [_y]: viewModel.pinToPoint(src, index, false) });
        }
        if (!elementOnly)
          observableModel.changeValue(wire, 'dstPin', outputs[index]);
      });
      // Add pins for outgoing source pins.
      groupInfo.outgoingWires.forEach(function(wire) {
        if (!elementOnly)
          observableModel.changeValue(wire, 'srcPin', outputs.length);
        let dst = getReference(wire, 'dstId'), index = wire.dstPin,
            dstPin = dst[_master].inputs[index];
        let name = self.makePinName(dst, dstPin);
        outputs.push({ type: dstPin.type, name: name, [_y]: viewModel.pinToPoint(dst, index, true)  });
      });

      // Sort inputs and outputs by y.
      function comparePins(a, b) {
        return a[_y] - b[_y];
      }
      inputs.sort(comparePins);
      outputs.sort(comparePins);

      // Create the new group element.
      let name = '';
      if (groupInfo.elementSet.size == 1) {
        let element = groupInfo.elementSet.values().next().value;
        name = element.name || element[_master].name;
      }
      let groupElement = {
        type: 'element',
        name: name,
        master: '$',
        x: extents.x, // TODO center properly
        y: extents.y,
        inputs: inputs,
        outputs: outputs,
      };
      if (!elementOnly) {
        // 'groupItems' is part of data model but not traversed in editor.
        groupElement.groupItems = groupItems;
      }
      this.newItem(groupElement);
      this.addItem(groupElement, this.diagram);
      if (elementOnly)
        selectionModel.add(groupElement);
      else
        selectionModel.set(groupElement);

      if (!elementOnly) {
        // Remap the external connections.
        let id = dataModel.getId(groupElement);
        groupInfo.incomingWires.forEach(function(wire) {
          observableModel.changeValue(wire, 'dstId', id);
        });
        groupInfo.outgoingWires.forEach(function(wire) {
          observableModel.changeValue(wire, 'srcId', id);
        });
      }
    },

    doComplete: function() {
      this.reduceSelection();
      this.model.transactionModel.beginTransaction('complete');
      this.completeGroup(this.model.selectionModel.contents());
      this.model.transactionModel.endTransaction();
    },

    doClosure: function() {
      this.reduceSelection();
      this.model.transactionModel.beginTransaction('closure');
      this.closeOrOpenFunctions(this.model.selectionModel.contents(), true);
      this.model.transactionModel.endTransaction();
    },

    doAbstract: function() {
      this.reduceSelection();
      this.model.transactionModel.beginTransaction('abstract');
      this.closeOrOpenFunctions(this.model.selectionModel.contents(), false);
      this.model.transactionModel.endTransaction();
    },

    doGroup: function(elementOnly) {
      this.reduceSelection();
      this.model.transactionModel.beginTransaction(
        'group' + elementOnly ? '(elementOnly)' : '');
      this.makeGroup(this.model.selectionModel.contents(), elementOnly);
      this.model.transactionModel.endTransaction();
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

    let instance = Object.create(model.editingModel);
    instance.prototype = Object.getPrototypeOf(instance);
    Object.assign(instance, proto);

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

let viewModel = (function() {
  let proto = {
    getItemRect: function (item) {
      let transform = this.model.transformableModel.getAbsolute(item),
          x = transform[4], y = transform[5], w, h;
      switch (item.type) {
        case 'element':
          w = item[_master][_width];
          h = item[_master][_height];
          break;
      }
      return { x: x, y: y, w: w, h: h };
    },

    getItemRects: function(items) {
      let xMin = Number.POSITIVE_INFINITY, yMin = Number.POSITIVE_INFINITY,
          xMax = -Number.POSITIVE_INFINITY, yMax = -Number.POSITIVE_INFINITY;
      for (let item of items) {
        let rect = this.getItemRect(item);
        xMin = Math.min(xMin, rect.x);
        yMin = Math.min(yMin, rect.y);
        xMax = Math.max(xMax, rect.x + rect.w);
        yMax = Math.max(yMax, rect.y + rect.h);
      }
      return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
    },

    pinToPoint: function(item, index, input) {
      let rect = this.getItemRect(item),
          x = rect.x, y = rect.y, w = rect.w, h = rect.h,
          pin;
      if (input) {
        pin = item[_master].inputs[index];
      } else {
        pin = item[_master].outputs[index];
        x += w;
      }
      y += pin[_y] + pin[_height] / 2;

      return {
        x: x,
        y: y,
        nx: input ? -1 : 1,
        ny: 0,
      }
    },
  }

  function extend(model) {
    dataModels.transformableModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;

    model.viewModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

let normalMode = 1,
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
      w = item[_master][_width];
      h = item[_master][_height];
      break;
  }
  return { x: x, y: y, w: w, h: h };
}

Renderer.prototype.pinToPoint = function(item, pin, input) {
  let rect = this.getItemRect(item),
      x = rect.x, y = rect.y, w = rect.w, h = rect.h;
  // Element.
  if (input) {
    pin = item[_master].inputs[pin];
  } else {
    pin = item[_master].outputs[pin];
    x += w;
  }
  y += pin[_y] + pin[_height] / 2;

  return {
    x: x,
    y: y,
    nx: input ? -1 : 1,
    ny: 0,
  }
}

function drawValue(renderer, x, y, type) {
  let ctx = renderer.ctx, r = renderer.knobbyRadius;
  ctx.lineWidth = 0.5;
  if (type == 'v') {
    let d = 2 * r;
    ctx.strokeRect(x, y, d, d);
  } else {
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, 0, Math.PI * 2, true);
    ctx.stroke();
  }
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
    pin[_y] = yIn + spacing / 2;
    let name = pin.name, w = pin[_width], h = pin[_height] + spacing / 2;
    if (name) {
      let offset = Math.abs(h - textSize) / 2;
      pin[_baseline] = yIn + textSize;
      if (textSize > h) {
        pin[_y] += offset;
        h = textSize;
      } else {
        pin[_baseline] += offset;
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
    pin[_y] = yOut + spacing / 2;
    let name = pin.name, w = pin[_width], h = pin[_height] + spacing / 2;
    if (name) {
      let offset = Math.abs(h - textSize) / 2;
      pin[_baseline] = yOut + textSize;
      if (textSize > h) {
        pin[_y] += offset;
        h = textSize;
      } else {
        pin[_baseline] += offset;
      }
      w += spacing + ctx.measureText(name).width;
    }
    yOut += h;
    wOut = Math.max(wOut, w);
  }

  master[_width] = Math.max(width, wIn + 2 * spacing + wOut, minMasterWidth);
  master[_height] = Math.max(yIn, yOut, minMasterHeight) + spacing / 2;
  return master;
}

Renderer.prototype.layoutPin = function(pin) {
  if (pin.type == 'v' || pin.type == '*') {
    pin[_width] = pin[_height] = 2 * this.knobbyRadius;
  } else {
    this.layoutMaster(pin[_master]);
    pin[_width] = pin[_master][_width] * shrink;
    pin[_height] = pin[_master][_height] * shrink;
  }
}

Renderer.prototype.drawMaster = function(master, x, y, mode) {
  var self = this, ctx = this.ctx, theme = this.theme,
      width = master[_width], height = master[_height];
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
        ctx.fillText(name, x + width / 2, y + textSize + spacing / 2);
      }
      inputs.forEach(function(pin, i) {
        let name = pin.name;
        self.drawPin(pin, x, y + pin[_y], mode);
        if (name) {
          ctx.textAlign = 'left';
          ctx.fillText(name, x + pin[_width] + spacing, y + pin[_baseline]);
        }
      });
      outputs.forEach(function(pin) {
        let name = pin.name, left = x + width - pin[_width];
        self.drawPin(pin, left, y + pin[_y], mode);
        if (name) {
          ctx.textAlign = 'right';
          ctx.fillText(name, left - spacing, y + pin[_baseline]);
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
  if (pin.type == 'v' || pin.type == '*') {
    drawValue(this, x, y, pin.type);
  } else {
    let master = pin[_master];
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
    var master = element[_master],
        inputs = master.inputs, outputs = master.outputs,
        self = this;
    inputs.forEach(function(input, i) {
      if (diagrams.hitTestRect(x, y + input[_y], input[_width], input[_height], p, 0))
        hitInfo.input = i;
    });
    outputs.forEach(function(output, i) {
      if (diagrams.hitTestRect(x + width - output[_width],
          y + output[_y], output[_width], output[_height], p, 0))
        hitInfo.output = i;
    });
  }
  return hitInfo;
}

Renderer.prototype.layoutWire = function(wire) {
  var referencingModel = this.model.referencingModel,
      c1 = referencingModel.getReference(wire, 'srcId'),
      c2 = referencingModel.getReference(wire, 'dstId'),
      p1 = wire[_p1], p2 = wire[_p2];

  if (c1)
    p1 = this.pinToPoint(c1, wire.srcPin, false);
  if (c2)
    p2 = this.pinToPoint(c2, wire.dstPin, true);
  wire[_bezier] = diagrams.getEdgeBezier(p1, p2);
}

Renderer.prototype.drawWire = function(wire, mode) {
  var ctx = this.ctx;
  diagrams.bezierEdgePath(wire[_bezier], ctx, 0);
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
  return diagrams.hitTestBezier(wire[_bezier], p, tol);
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
      this.drawMaster(item[_master], rect.x, rect.y, mode);
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

function Editor(model, textInputController) {
  var self = this;
  this.model = model;
  this.diagram = model.root;
  this.textInputController = textInputController;

  this.hitTolerance = 4;

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
        { type: 'v' },
        { type: 'v' },
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
        { type: 'v' },
        { type: 'v' },
        { type: 'v' },
      ],
      outputs: [
        { type: 'v' },
      ]
  });
  // Local storage.
  masterMap.set('@', {
      name: '@',
      type: 'element',
      inputs: [],
      outputs: [
        { type: '[,v]' },
        { type: '[v,v]' },
      ]
  });
  // Array storage.
  masterMap.set('[]', {
      name: '[ ]',
      type: 'element',
      inputs: [
        { name: 'n', type: 'v' },
      ],
      outputs: [
        { name: 'n', type: 'v' },
        { type: '[v,v]' },
        { type: '[vv,v]' },
      ]
  });

  var palette = this.palette = {
    root: {
      type: 'palette',
      x: 0,
      y: 0,
      items: [
        { type: 'element',
          x: 8, y: 8,
          master: '$',
          junction: 'input',
          inputs: [],
          outputs: [
            { type: '*' },
          ],
        },
        { type: 'element',
          x: 38, y: 8,
          master: '$',
          junction: 'output',
          inputs: [
            { type: '*' },
          ],
          outputs: [],
        },
        { type: 'element',
          x: 72, y: 8,
          master: '$',
          junction: 'opener',
          inputs: [
            { type: '*' },
          ],
          outputs: [],
        },
        // TODO Literal object needs work.
        { type: 'element',
          x: 102, y: 8,
          master: '$',
          name: '0',
          inputs: [],
          outputs: [
            { type: 'v' },
          ],
        },
        {
          type: 'element',
          x: 8, y: 36,
          master: '?',
        },
        {
          type: 'element',
          x: 56, y: 44,
          master: '@',
        },
        {
          type: 'element',
          x: 8, y: 108,
          master: '[]',
        },
      ],
    }
  }

  // Decodes and atomizes pin types into master map.
  function decodePinType(s) {
    let j = 0;
    // close over s, j to avoid extra return values.
    function decode() {
      let i = j;
      // value types
      if (s[j] == 'v') {
        j++;
        return { type: 'v' };
      }
      if (s[j] == '*') {
        j++;
        return { type: '*' };
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
        let result = { type: type };
        result[_master] = master;
        return result;
      }
    }
    return decode();
  }
  this.decodePinType = decodePinType;  // TODO clean these up

  function initializePins(master) {
    let inputs = master.inputs, outputs = master.outputs;
    for (let i = 0; i < inputs.length; i++)
      Object.assign(inputs[i], decodePinType(inputs[i].type));
    for (let i = 0; i < outputs.length; i++)
      Object.assign(outputs[i], decodePinType(outputs[i].type));
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
      // if (!item[_master]) {
        if (item.master == '$') {
          // Self master (junction).
          initializePins(item);
          item[_master] = item;
        } else {
          item[_master] = masterMap.get(item.master);
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
  viewModel.extend(palette);

  model.dataModel.addInitializer(initialize);
  model.dataModel.initialize();
  viewModel.extend(model);

  // Track changes fields that require re-initialization.
  model.observableModel.addHandler('changed', function (change) {
    if (change.attr == 'master') {
      let item = change.item;
      item[_master] = undefined;
      initialize(item);
    }
  });
}

Editor.prototype.initialize = function(canvasController) {
  this.canvasController = canvasController;
  this.canvas = canvasController.canvas;
  this.ctx = canvasController.ctx;
  this.renderer = new Renderer(canvasController.theme);

  let renderer = this.renderer, ctx = this.ctx;
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
  this.masterMap.forEach(function(master, name) {
    let item = {
      type: 'element',
      master: name,
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

  visit(diagram, isElement, function(item) {
    if (needsLayout(item))
      renderer.layout(item);
    renderer.draw(item, normalMode);
  });
  visit(diagram, isWire, function(item) {
    if (needsLayout(item))
      renderer.layout(item);
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
  reverseVisit(diagram, isWire, function(item) {
    pushInfo(renderer.hitTest(item, cp, cTol, normalMode));
  });
  reverseVisit(diagram, isElement, function(item) {
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

Editor.prototype.setEditableText = function() {
  let self = this,
      textInputController = this.textInputController,
      selectionModel = this.model.selectionModel,
      item = selectionModel.lastSelected();
  if (item && isElement(item)) {
    // if (isJunction(item)) {
    //   item = item.inputs[0] || item.outputs[0];
    // }
    textInputController.start(item.name, function(newText) {
      if (item.name != newText) {
        self.model.transactionModel.beginTransaction('rename');
        self.model.observableModel.changeValue(item, 'name', newText);
        self.model.transactionModel.endTransaction();
        self.draw();
      }
    });
  } else {
    textInputController.clear();
  }
}

Editor.prototype.onClick = function(p) {
  let model = this.model,
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
  this.setEditableText();
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
      [_p2]: cp0,
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
      [_p2]: cp0,
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
    case 'moveSelection':
      if (isElement(dragItem)) {
        hitInfo = this.getFirstHit(hitList, isContainerTarget);
        selectionModel.forEach(function(item) {
          let snapshot = transactionModel.getSnapshot(item);
          if (snapshot) {
            observableModel.changeValue(item, 'x', snapshot.x + dx);
            observableModel.changeValue(item, 'y', snapshot.y + dy);
          }
        });
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
        dragItem[_p1] = cp;
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
        dragItem[_p2] = cp;
      }
      break;
  }

  this.hotTrackInfo = (hitInfo && hitInfo.item !== this.diagram) ? hitInfo : null;
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
        if (isElement(item)) {
          editingModel.addItem(item, parent);
        }
      });
    }
  }

  // var renderer = this.renderer;
  // renderer.beginDraw(model, this.ctx);
  // editingModel.layout(this.diagram, renderer);
  // renderer.endDraw();

  if (isWire(dragItem)) {
    // If dragItem is a disconnected wire, delete it.
    if (!dragItem.srcId || !dragItem.dstId) {
      editingModel.deleteItem(dragItem);
      selectionModel.remove(dragItem);
    } else {
      editingModel.connect(dragItem);
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
      case 74:  // 'j'
        editingModel.doComplete();
        return true;
      case 75:  // 'k'
        editingModel.doClosure();
        return true;
      case 76:  // 'l'
        editingModel.doAbstract();
        return true;
      case 71:  // 'g'
        editingModel.doGroup(shiftKey);
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
