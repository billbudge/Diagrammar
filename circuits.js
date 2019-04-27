// Circuits module.

'use strict';

let circuits = (function() {

function isContainer(item) {
  return item.type == 'circuit';
}

function isElement(item) {
  return item.type == 'element';
}

function isWire(item) {
  return item.type == 'wire';
}

function isLiteral(item) {
  return item.elementType == 'literal';
}

function isJunction(item) {
  return item.elementType == 'input' || item.elementType == 'output' ||
         item.elementType == 'apply';
}

function isInput(item) {
  return item.elementType == 'input';
}

function isOutput(item) {
  return item.elementType == 'output';
}

function isApplication(item) {
  return item.elementType == 'apply';
}

function isGroup(item) {
  return isElement(item) && item.groupItems;
}

function isCircuit(item) {
  return item.type == 'circuit';
}

//------------------------------------------------------------------------------

let _master = Symbol('master'),
    _y = Symbol('y'),
    _baseline = Symbol('baseline'),
    _width = Symbol('width'),
    _height = Symbol('height'),
    _p1 = Symbol('p1'),
    _p2 = Symbol('p2'),
    _bezier = Symbol('bezier');

//------------------------------------------------------------------------------

function getMaster(item) {
  return item[_master];
}

let masteringModel = (function() {
  let proto = {
    getMaster: function(item) {
      return item[_master];
    },

    onMasterInserted_: function(type, master) {
      // console.log(master);
      this.onEvent('masterInserted', function (handler) {
        handler(type, master);
      });
    },

    // Type description: [inputs,outputs] with optional names, e.g.
    // [v(a)v(b),v(sum)](+) for a binop.
    decodeType: function(s) {
      let self = this;
      let j = 0;
      // close over j to avoid extra return values.
      function decodeName() {
        let name;
        if (s[j] == '(') {
          let i = j + 1;
          j = s.indexOf(')', i);
          if (j > i)
            name = s.substring(i, j);
          j++;
        }
        return name;
      }
      function addMaster(type, master) {
        let existing = self.masterMap_.get(type);
        if (existing)
          return existing;
        self.masterMap_.set(type, master);
        self.onMasterInserted_(type, master);
        return master;
      }
      function decodePin() {
        let i = j;
        // value types
        if (s[j] == 'v') {
          j++;
          return { type: 'v', name: decodeName() };
        }
        // wildcard types
        if (s[j] == '*') {
          j++;
          return { type: '*', name: decodeName() };
        }
        // function types
        let f = decodeFunction(),
            type = s.substring(i, j),
            name = decodeName(),
            master = addMaster(type, f);
        return {
          type: type,
          name: name,
          [_master]: master,
        };
      }
      function decodeFunction() {
        let i = j;
        if (s[j] == '[') {
          j++;
          let inputs = [], outputs = [];
          while (s[j] != ',') {
            inputs.push(decodePin());
          }
          j++;
          while (s[j] != ']') {
            outputs.push(decodePin());
          }
          j++;
          let type = s.substring(i, j);
          return {
            type: type,
            inputs: inputs,
            outputs: outputs,
          };
        }
      }
      let f = decodeFunction(),
          name = decodeName(),
          type = s;
      let master = {
        type: type,
        name: name,
        inputs: f.inputs,
        outputs: f.outputs,
      };
      master = addMaster(type, master);
      return master;
    },

    unlabeled: function(type) {
      if (type[type.length - 1] == ')')
        type = type.substring(0, type.lastIndexOf('('));
      return type;
    },

    relabel: function (item, newText) {
      let master = getMaster(item),
          label = newText ? '(' + newText + ')' : '',
          newMaster;
      if (isJunction(item) || isLiteral(item)) {
        if (isInput(item) || isLiteral(item)) {
          newMaster = '[,' + master.outputs[0].type + label + ']';
        } else if (isOutput(item)) {
          newMaster = '[' + master.inputs[0].type + label + ',]';
        }
      } else {
        newMaster = this.unlabeled(master.type) + label;
      }
      return newMaster;
    },

    retype: function (item, newType) {
      let master = getMaster(item),
          newMaster;
      if (isJunction(item)) {
        if (isInput(item)) {
          let label = master.outputs[0].name;
          label = label ? '(' + label + ')' : '';
          newMaster = '[,' + newType + label + ']';
        } else if (isOutput(item)) {
          let label = master.inputs[0].name;
          label = label ? '(' + label + ')' : '';
          newMaster = '[' + newType + label + ',]';
        } else if (isApplication(item)) {
          // let label = master.inputs[0].name;
          // newMaster = '[,' + master.outputs[0].type + label + ']';
        }
      }
      return newMaster;
    },

    initialize: function(item) {
      if (item.type == 'element') {
        item[_master] = this.masterMap_.get(item.master) ||
                        this.decodeType(item.master);
      }
    },
  }

  function extend(model) {
    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.masterMap_ = new Map();

    dataModels.eventMixin.extend(instance);

    // Make sure new elements have masters.
    model.dataModel.addInitializer(function(item) {
      instance.initialize(item);
    });
    // Make sure elements are remastered if their master type changes.
    model.observableModel.addHandler('changed', function (change) {
      if (isElement(change.item) && change.attr == 'master')
      instance.initialize(change.item);
    });

    model.masteringModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

let editingModel = (function() {
  let proto = {
    reduceSelection: function () {
      let model = this.model;
      model.selectionModel.set(model.hierarchicalModel.reduceSelection());
    },

    // Collects subgraph information such as elements, interior wires, incoming
    // wires, outgoing wires, for each element, an array of input wires
    // and an array of arrays of output wires.
    collectGraphInfo: function(items) {
      let self = this;
      // Get elements and initialize input/output maps.
      let elementSet = new Set();
      let inputMap = new Map(), outputMap = new Map();
      items.forEach(function(item) {
        if (isElement(item)) {
          elementSet.add(item);
          // inputMap takes element to array of incoming wires.
          inputMap.set(item, new Array(getMaster(item).inputs.length).fill(null));
          // outputMap takes element to array of array of outgoing wires.
          outputMap.set(item, new Array(getMaster(item).outputs.length).fill([]));
        }
      });
      // Separate wires into incoming, outgoing, and interior. Populate
      // input/output maps, and incoming and outgoing pins.
      let wires = [], incomingWires = [], outgoingWires = [], interiorWires = [],
          inputWires = [], outputWires = [];
      this.diagram.items.forEach(function(item) {
        if (isWire(item)) {
          wires.push(item);
          let src = self.getWireSrc(item),
              dst = self.getWireDst(item),
              srcInside = elementSet.has(src),
              dstInside = elementSet.has(dst);
          if (srcInside) {
            outputMap.get(src)[item.srcPin].push(item);
            if (dstInside) {
              interiorWires.push(item);
              if (isInput(src))
                inputWires.push(item);
              if (isOutput(dst))
                outputWires.push(item);
            } else {
              outgoingWires.push(item);
              outputWires.push(item);
            }
          }
          if (dstInside) {
            inputMap.get(dst)[item.dstPin] = item;
            if (!srcInside) {
              incomingWires.push(item);
              inputWires.push(item);
            }
          }
        }
      });

      return {
        elementSet: elementSet,
        inputMap: inputMap,
        outputMap: outputMap,
        wires: wires,
        interiorWires: interiorWires,
        inputWires: inputWires,
        outputWires: outputWires,
        incomingWires: incomingWires,
        outgoingWires: outgoingWires,
      }
    },

    closeSelection: function() {
      let self = this, model = this.model,
          selectionModel = model.selectionModel,
          graphInfo = this.collectGraphInfo(this.diagram.items),
          toVisit = Array.from(selectionModel.contents());
      while (toVisit.length > 0) {
        let item = toVisit.pop();
        if (!isElement(item)) continue;
        selectionModel.add(item);
        graphInfo.inputMap.get(item).forEach(function(wire) {
          if (!wire) return;
          let src = self.getWireSrc(wire);
          if (!selectionModel.contains(src))
            toVisit.push(src);
        });
        graphInfo.outputMap.get(item).forEach(function(wires) {
          wires.forEach(function(wire) {
            let dst = self.getWireDst(wire);
            if (!selectionModel.contains(dst))
              toVisit.push(dst);
          });
        });
      }
    },

    selectInteriorWires: function() {
      let model = this.model,
          selectionModel = model.selectionModel,
          graphInfo = this.collectGraphInfo(selectionModel.contents());
      let elements = Array.from(graphInfo.elementSet.values());
      let closure = graphInfo.interiorWires.concat(elements);
      selectionModel.set(closure);
    },

    newItem: function(item) {
      let dataModel = this.model.dataModel;
      dataModel.assignId(item);
      dataModel.initialize(item);
    },

    newItems: function(items) {
      let self = this;
      items.forEach(item => self.newItem(item));
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
      let self = this;
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
          diagram = this.diagram,
          transformableModel = model.transformableModel,
          copies = this.prototype.copyItems(items, map);
      items.forEach(function(item) {
        let copy = map.get(dataModel.getId(item));
        if (isElement(copy)) {
          copy.state = 'normal';
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
      this.selectInteriorWires();
      this.prototype.doCopy.call(this);
    },

    addItem: function(item, parent) {
      let model = this.model,
          hierarchicalModel = model.hierarchicalModel,
          oldParent = hierarchicalModel.getParent(item);
      if (!parent)
        parent = this.diagram;
      if (oldParent === parent)
        return;
      if (!isWire(item)) {
        let transformableModel = model.transformableModel,
            toParent = transformableModel.getToParent(item, parent);
        geometry.matMulPt(item, toParent);
      }
      if (isCircuit(parent)) {
        if (!Array.isArray(parent.items))
          model.observableModel.changeValue(parent, 'items', []);
      }
      if (oldParent !== parent) {
        if (oldParent)            // if non-null, first remove from old parent.
          this.deleteItem(item);  // notifies observer
        model.observableModel.insertElement(
          parent, 'items', parent.items.length, item);
      }
      return item;
    },

    addItems: function(items, parent) {
      let self = this;
      items.forEach(function(item) {
        self.addItem(item, parent);
      });
    },

    doPaste: function(dx, dy) {
      this.getScrap().forEach(function(item) {
        // Offset pastes so the user can see them.
        if (isElement(item)) {
          item.x += dx;
          item.y += dy;
        }
      });
      this.prototype.doPaste.call(this);
    },

    connectInput: function(element, pin) {
      let viewModel = this.model.viewModel,
          dstPin = getMaster(element).inputs[pin],
          pinPoint = viewModel.pinToPoint(element, pin, true);
      let junction = {
        type: 'element',
        elementType: 'input',
        // Let user name pin.
        x: pinPoint.x - 32,
        y: pinPoint.y,
        master: '[,' + dstPin.type + ']',
      };
      this.newItem(junction);
      this.addItem(junction);
      let wire = {
        type: 'wire',
        srcId: junction.id,
        srcPin: 0,
        dstId: element.id,
        dstPin: pin,
      };
      this.newItem(wire);
      this.addItem(wire);
      return { junction: junction, wire: wire };
    },

    connectOutput: function(element, pin) {
      let viewModel = this.model.viewModel,
          srcPin = getMaster(element).outputs[pin],
          pinPoint = viewModel.pinToPoint(element, pin, false);
      let junction = {
        type: 'element',
        elementType: 'output',
        // Let user name pin.
        x: pinPoint.x + 32,
        y: pinPoint.y,
        master: '[' + srcPin.type + ',]',
      };
      this.newItem(junction);
      this.addItem(junction);
      let wire = {
        type: 'wire',
        srcId: element.id,
        srcPin: pin,
        dstId: junction.id,
        dstPin: 0,
      };
      this.newItem(wire);
      this.addItem(wire);
      return { junction: junction, wire: wire };
    },

    completeGroup: function(elements) {
      let self = this, model = this.model,
          selectionModel = model.selectionModel,
          graphInfo = this.collectGraphInfo(elements);

      // Add junctions for disconnected pins on selected elements.
      graphInfo.inputMap.forEach(function(elementInputs, element) {
        elementInputs.forEach(function(connectedWire, pin) {
          if (connectedWire)
            return;
          self.connectInput(element, pin);
        });
      });
      graphInfo.outputMap.forEach(function(elementOutputs, element) {
        elementOutputs.forEach(function(wires, pin) {
          if (wires.length > 0)
            return;
          self.connectOutput(element, pin);
        });
      });
    },

    getPinType: function(pin) {
      let type = pin.type;
      if (pin.name)
        type += '(' + pin.name + ')';
      return type;
    },

    getClosedType: function(element, inputWires) {
      // Create a function type whose inputs are the disconnected inputs,
      // and whose outputs are all the outputs, connected or not.
      let master = getMaster(element);
      let fnType = '[';
      master.inputs.forEach(function(input, i) {
        if (!inputWires[i])
          fnType += input.type;
      });
      fnType += ',';
      master.outputs.forEach(function(output, i) {
        fnType += output.type;
      });
      fnType += ']';
      // console.log('closedType', fnType);
      return fnType;
    },

    closeFunction: function(element, incomingWires, outgoingWireArrays) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          observableModel = model.observableModel,
          master = getMaster(element);

      let newElement = {
        type: 'element',
        // We shouldn't name the closure based on the closed function.
        element: element,
        x: element.x,
        y: element.y,
      };
      let id = dataModel.assignId(newElement);

      let type = '[',
          pinIndex = 0;
      // Add only connected input pins to inputs.
      master.inputs.forEach(function(pin, i) {
        let incomingWire = incomingWires[i];
        if (incomingWire) {
          type += self.getPinType(pin);
          // remap wire to new element and pin.
          observableModel.changeValue(incomingWire, 'dstId', id);
          observableModel.changeValue(incomingWire, 'dstPin', pinIndex);
          pinIndex++;
        }
      });
      // Add only connected output pins to outputs.
      type += ',';
      pinIndex = 0;
      master.outputs.forEach(function(pin, i) {
        let outgoingWires = outgoingWireArrays[i];
        if (outgoingWires.length > 0) {
          type += self.getPinType(pin);
          outgoingWires.forEach(function(outgoingWire, j) {
            // remap wire to new element and pin.
            observableModel.changeValue(outgoingWire, 'srcId', id);
            observableModel.changeValue(outgoingWire, 'srcPin', pinIndex);
          });
          pinIndex++;
        }
      });
      type += self.getClosedType(element, incomingWires);
      type += ']';

      newElement.master = type;
      dataModel.initialize(newElement);
      return newElement;
    },

    getOpenedType: function(element) {
      return this.model.masteringModel.unlabeled(element.master);
    },

    openFunction: function(element, incomingWires, outgoingWireArrays) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          observableModel = model.observableModel,
          master = getMaster(element);

      let newElement = {
        type: 'element',
        // We shouldn't name the abstraction based on the concrete function.
        element: element,
        x: element.x,
        y: element.y,
      };
      let id = dataModel.assignId(newElement);

      // Add all input pins to inputs.
      let type = '[',
          pinIndex = 0;
      master.inputs.forEach(function(pin, i) {
        let incomingWire = incomingWires[i];
        type += self.getPinType(pin);
        // remap wire to new element and pin.
        if (incomingWire) {
          observableModel.changeValue(incomingWire, 'dstId', id);
          observableModel.changeValue(incomingWire, 'dstPin', pinIndex);
          pinIndex++;
        }
      });
      type += self.getOpenedType(element);
      // Add all output pins to outputs.
      type += ',';
      pinIndex = 0;
      master.outputs.forEach(function(pin, i) {
        let outgoingWires = outgoingWireArrays[i];
        type += self.getPinType(pin);
        outgoingWires.forEach(function(outgoingWire, j) {
          // remap wires to new element and pin.
          observableModel.changeValue(outgoingWire, 'srcId', id);
          observableModel.changeValue(outgoingWire, 'srcPin', pinIndex);
        });
        pinIndex++;
      });
      type += ']';

      newElement.master = type;
      dataModel.initialize(newElement);
      return newElement;
    },

    closeOrOpenFunctions: function(elements, closing) {
      let self = this, model = this.model,
          selectionModel = model.selectionModel;

      let graphInfo = this.collectGraphInfo(elements);
      // Adjust selection to contain just the elements.
      graphInfo.wires.forEach(function(wire) {
        selectionModel.remove(wire);
      });
      // Open or close each non-junction element.
      graphInfo.elementSet.forEach(function(element) {
        if (isJunction(element)) return;
        let incomingWires = graphInfo.inputMap.get(element),
            outgoingWireArrays = graphInfo.outputMap.get(element);

        let newElement = closing ?
          self.closeFunction(element, incomingWires, outgoingWireArrays) :
          self.openFunction(element, incomingWires, outgoingWireArrays);

        selectionModel.remove(element);
        selectionModel.add(newElement)

        self.deleteItem(element);
        self.addItem(newElement);
      });
    },

    makeGroup: function(elements, elementOnly) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          selectionModel = model.selectionModel,
          observableModel = model.observableModel,
          viewModel = model.viewModel;

      let graphInfo = this.collectGraphInfo(elements);
      // Adjust selection to contain just the interior elements and wires.
      graphInfo.incomingWires.forEach(wire => selectionModel.remove(wire));
      graphInfo.outgoingWires.forEach(wire => selectionModel.remove(wire));
      graphInfo.interiorWires.forEach(wire => selectionModel.add(wire));
      let groupItems = selectionModel.contents();

      // Create the new group element.
      let extents = viewModel.getItemRects(graphInfo.elementSet),
          inputs = [], outputs = [];
      let groupElement = {
        type: 'element',
        x: extents.x + extents.width / 2,
        y: extents.y + extents.height / 2,
      };

      let groupId = dataModel.assignId(groupElement);

      // Sort wire arrays so we encounter pins in increasing y-order.
      function compareIncomingWires(wire1, wire2) {
        let src1 = self.getWireSrc(wire1), src2 = self.getWireSrc(wire2);
        return viewModel.pinToPoint(src1, wire1.srcPin, false).y -
               viewModel.pinToPoint(src2, wire2.srcPin, false).y;
      }
      function compareOutgoingWires(wire1, wire2) {
        let dst1 = self.getWireDst(wire1), dst2 = self.getWireDst(wire2);
        return viewModel.pinToPoint(dst1, wire1.dstPin, true).y -
               viewModel.pinToPoint(dst2, wire2.dstPin, true).y;
      }
      graphInfo.inputWires.sort(compareIncomingWires);
      graphInfo.outputWires.sort(compareOutgoingWires);

      let master = '[';
      let pinIndex = 0;

      // Use srcMap to ensure that an internal or external source is only
      // represented once in inputs and outputs.
      function addUniqueSource(wire, srcMap) {
        let src = self.getWireSrc(wire),
            srcPins = getMaster(src).outputs,
            srcIndices = srcMap.get(src);
        if (srcIndices === undefined) {
          srcIndices = new Array(srcPins.length);
          srcMap.set(src, srcIndices);
        }
        let index = wire.srcPin;
        if (srcIndices[index] === undefined) {
          srcIndices[index] = pinIndex++;
          let srcPin = srcPins[index];
          master += self.getPinType(srcPin);
        }
        return srcIndices[index];
      }

      let incomingSrcMap = new Map(), outgoingSrcMap = new Map();
      // Add input pins for inputWires.
      graphInfo.inputWires.forEach(function(wire) {
        let index = addUniqueSource(wire, incomingSrcMap);
        if (!elementOnly) {
          let src = self.getWireSrc(wire);
          if (graphInfo.elementSet.has(src)) {
            observableModel.changeValue(src, 'pinIndex', index);
          } else {
            // If this is the first instance of the source...
            if (index == pinIndex - 1) {
              // Add an input junction to represent the source.
              let element = self.getWireDst(wire),
                  pin = wire.dstPin,
                  connection = self.connectInput(element, pin);
              connection.junction.pinIndex = index;
              groupItems.push(connection.junction, connection.wire);
              graphInfo.interiorWires.push(connection.wire);
            }
            observableModel.changeValue(wire, 'dstId', groupId);
            observableModel.changeValue(wire, 'dstPin', index);
          }
        }
      });
      master += ',';
      pinIndex = 0;
      // Add output pins for outputWires.
      graphInfo.outputWires.forEach(function(wire) {
        let index = addUniqueSource(wire, outgoingSrcMap);
        if (!elementOnly) {
          let dst = self.getWireDst(wire);
          if (graphInfo.elementSet.has(dst)) {
            observableModel.changeValue(dst, 'pinIndex', index);
            if (index == pinIndex - 1 && isOutput(dst)) {
              let name = getMaster(dst).inputs[0].name;
              if (name)
                master += '(' + name + ')';
            }
          } else {
            // If this is the first instance of the source...
            if (index == pinIndex - 1) {
              // Add an input junction to represent the source.
              let element = self.getWireSrc(wire),
                  pin = wire.srcPin,
                  connection = self.connectOutput(element, pin);
              connection.junction.pinIndex = index;
              groupItems.push(connection.junction, connection.wire);
              graphInfo.interiorWires.push(connection.wire);
            }
            observableModel.changeValue(wire, 'srcId', groupId);
            observableModel.changeValue(wire, 'srcPin', index);
          }
        }
      });

      // Compute wildcard pass throughs.
      let passThroughs = new Set();
      graphInfo.interiorWires.forEach(function(wire) {
        let src = self.getWireSrc(wire),
            srcPin = getMaster(src).outputs[wire.srcPin];
        // Trace wires, starting at input junctions.
        if (!isInput(src) || srcPin.type != '*')
          return;
        let srcPinIndex = src.pinIndex,
            activeWires = [wire];
        while (activeWires.length) {
          wire = activeWires.pop();
          let dst = self.getWireDst(wire),
              dstPin = getMaster(dst).inputs[wire.dstPin];
          if (isOutput(dst) && dstPin.type == '*') {
            passThroughs.add([srcPinIndex, dst.pinIndex]);
          } else if (dst.passThroughs) {
            dst.passThroughs.forEach(function(passThrough) {
              if (passThrough[0] == wire.dstPin) {
                let outgoingWires = graphInfo.outputMap.get(dst)[passThrough[1]];
                outgoingWires.forEach(wire => activeWires.push(wire));
              }
            });
          }
        }
      });
      if (passThroughs.size) {
        groupElement.passThroughs = Array.from(passThroughs);
      }

      if (!elementOnly) {
        groupElement.groupItems = groupItems;
        groupItems.forEach(item => self.deleteItem(item));
      } else {
        // Add an output pin for the group fn itself.
        master += master + '(γ)' + ']';
      }

      master += ']';
      groupElement.master = master;
      // console.log(master);
      dataModel.initialize(groupElement);

      this.addItem(groupElement);

      selectionModel.set(groupElement);

      return groupElement;
    },

    setApply: function(wire) {
      let self = this, model = this.model,
          observableModel = model.observableModel,
          srcItem = this.getWireSrc(wire),
          srcPin = getMaster(srcItem).outputs[wire.srcPin],
          dstItem = this.getWireDst(wire),
          dstPin = getMaster(dstItem).inputs[wire.dstPin];
      // If srcPin is a function, add those inputs and output pins.
      let master = getMaster(srcPin);
      if (master) {
        let newMaster = '[';
        master.inputs.forEach(function(pin) {
          newMaster += pin.type;
        });
        newMaster += srcPin.type;
        newMaster += ','
        master.outputs.forEach(function(pin) {
          newMaster += pin.type;
        });
        newMaster += ']';
        observableModel.changeValue(wire, 'dstPin', master.inputs.length);
        observableModel.changeValue(dstItem, 'master', newMaster);
      }
    },

    resetApply: function(element, graphInfo) {
      let self = this, model = this.model,
          observableModel = model.observableModel;
      // Delete all wires except the incoming function input.
      let inputWires = graphInfo.inputMap.get(element),
          outputWires = graphInfo.outputMap.get(element);
      for (let i = 0; i < inputWires.length - 1; i++) {
        let wire = inputWires[i];
        if (wire) {
          self.deleteItem(wire);
        }
      }
      for (let i = 0; i < outputWires.length; i++) {
        let wires = outputWires[i];
        for (let j = 0; j < wires.length; j++) {
          self.deleteItem(wires[j]);
        }
      }
      let wire = inputWires[inputWires.length - 1],
          dstPin = getMaster(element).inputs[0];

      if (wire) {
        observableModel.changeValue(wire, 'dstPin', 0);
      }
    },

    findSrcType: function(wire, graphInfo) {
      let self = this, model = this.model, activeWires = [wire];
      // TODO get rid of array and while, there can be only one pass through.
      while (activeWires.length) {
        wire = activeWires.pop();
        let src = this.getWireSrc(wire),
            srcPin = getMaster(src).outputs[wire.srcPin],
            dst = this.getWireDst(wire),
            dstPin = getMaster(dst).inputs[wire.dstPin];
        if (srcPin.type != '*')
          return srcPin.type;
        if (src.passThroughs) {
          src.passThroughs.forEach(function(passThrough) {
            if (passThrough[1] == wire.srcPin) {
              srcPin = getMaster(src).inputs[passThrough[0]];
              let incomingWire = graphInfo.inputMap.get(src)[passThrough[0]];
              activeWires.push(incomingWire);
            }
          });
        }
      }
      return '*';
    },

    findDstType: function(wire, graphInfo) {
      let self = this, model = this.model, activeWires = [wire];
      while (activeWires.length) {
        wire = activeWires.pop();
        let src = this.getWireSrc(wire),
            srcPin = getMaster(src).outputs[wire.srcPin],
            dst = this.getWireDst(wire),
            dstPin = getMaster(dst).inputs[wire.dstPin];
        if (dstPin.type != '*')
          return dstPin.type;
        if (dst.passThroughs) {
          dst.passThroughs.forEach(function(passThrough) {
            if (passThrough[0] == wire.dstPin) {
              dstPin = getMaster(dst).outputs[passThrough[1]];
              let outgoingWires = graphInfo.outputMap.get(dst)[passThrough[1]];
              outgoingWires.forEach(wire => activeWires.push(wire));
            }
          });
        }
      }
      return '*';
    },

    doComplete: function() {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('complete');
      this.completeGroup(model.selectionModel.contents());
      model.transactionModel.endTransaction();
    },

    doClosure: function() {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('closure');
      this.closeOrOpenFunctions(model.selectionModel.contents(), true);
      model.transactionModel.endTransaction();
    },

    doAbstract: function() {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('abstract');
      this.closeOrOpenFunctions(model.selectionModel.contents(), false);
      model.transactionModel.endTransaction();
    },

    doGroup: function(elementOnly) {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction(
        'group' + (elementOnly ? '(elementOnly)' : ''));
      this.makeGroup(model.selectionModel.contents(), elementOnly);
      model.transactionModel.endTransaction();
    },

    doToggleMaster: function() {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('toggle master state');
      model.selectionModel.contents().forEach(function(element) {
        model.observableModel.changeValue(element, 'state',
          (element.state == 'palette') ? 'normal' : 'palette');
      })
      model.transactionModel.endTransaction();
    },

    onTransactionEnding_: function (transaction) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          observableModel = model.observableModel,
          masteringModel = model.masteringModel;
      // Collect info for entire graph.
      let graphInfo = this.collectGraphInfo(this.diagram.items),
          elementSet = graphInfo.elementSet,
          wires = graphInfo.wires;
      // Make sure junctions are consistent.
      elementSet.forEach(function(element) {
        if (isJunction(element)) {
          switch (element.junctionType) {
            case 'input': {
              // Input junction pin 0 type should match all of its destinations.
              // Just trace the first one.
              let outputPin = getMaster(element).outputs[0],
                  type = outputPin.type,
                  dstType = '*',
                  wires = graphInfo.outputMap.get(element)[0];
              if (wires.length > 0) {
                dstType = self.findDstType(wires[0], graphInfo);
              }
              if (type != dstType) {
                observableModel.changeValue(element, 'master',
                  masteringModel.retype(element, dstType));
              }
              break;
            }
            case 'output': {
              // Output junction pin 0 type should match its unique source.
              let inputPin = getMaster(element).inputs[0],
                  type = inputPin.type,
                  srcType = '*',
                  wire = graphInfo.inputMap.get(element)[0];
              if (wire) {
                srcType = self.findSrcType(wire, graphInfo);
              }
              if (type != srcType) {
                observableModel.changeValue(element, 'master',
                  masteringModel.retype(element, srcType));
              }
              break;
            }
            case 'apply': {
              let inputPins = getMaster(element).inputs,
                  lastIndex = inputPins.length - 1,
                  inputPin = inputPins[lastIndex],
                  type = inputPin.type,
                  srcType = '*',
                  wire = graphInfo.inputMap.get(element)[lastIndex];
              if (wire) {
                srcType = self.findSrcType(wire, graphInfo);
              }
              if (type != srcType) {
                if (type != '*') {
                  self.resetApply(element, graphInfo);
                }
                if (srcType != '*') {
                  self.setApply(wire);
                }
              }
              break;
            }
          }
        }
      });
      // Eliminate dangling wires.
      wires.forEach(function(wire) {
        let src = self.getWireSrc(wire), dst = self.getWireDst(wire);
        if (!elementSet.has(src) || !elementSet.has(dst)) {
          self.deleteItem(wire);
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

    let instance = Object.create(model.editingModel);
    instance.prototype = Object.getPrototypeOf(instance);
    Object.assign(instance, proto);

    instance.model = model;
    instance.diagram = model.root;

    instance.getWireSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getWireDst = model.referencingModel.getReferenceFn('dstId');

    model.transactionModel.addHandler('transactionEnding', function (transaction) {
      instance.onTransactionEnding_(transaction);
    });

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
          w = getMaster(item)[_width];
          h = getMaster(item)[_height];
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
      return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
    },

    pinToPoint: function(item, index, isInput) {
      let rect = this.getItemRect(item),
          x = rect.x, y = rect.y, w = rect.w, h = rect.h,
          pin;
      if (isInput) {
        pin = getMaster(item).inputs[index];
      } else {
        pin = getMaster(item).outputs[index];
        x += w;
      }
      y += pin[_y] + pin[_height] / 2;

      return {
        x: x,
        y: y,
        nx: isInput ? -1 : 1,
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
    paletteMode = 2,
    highlightMode = 3,
    hotTrackMode = 4;

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
      w = getMaster(item)[_width];
      h = getMaster(item)[_height];
      break;
  }
  return { x: x, y: y, w: w, h: h };
}

Renderer.prototype.pinToPoint = function(item, pin, input) {
  let rect = this.getItemRect(item),
      x = rect.x, y = rect.y, w = rect.w, h = rect.h;
  // Element.
  if (input) {
    pin = getMaster(item).inputs[pin];
  } else {
    pin = getMaster(item).outputs[pin];
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
    let master = getMaster(pin);
    this.layoutMaster(master);
    pin[_width] = master[_width] * shrink;
    pin[_height] = master[_height] * shrink;
  }
}

Renderer.prototype.drawMaster = function(master, x, y, mode) {
  var self = this, ctx = this.ctx, theme = this.theme,
      width = master[_width], height = master[_height];
  switch (mode) {
    case normalMode:
    case paletteMode:
      let textSize = theme.fontSize, name = master.name,
          inputs = master.inputs, outputs = master.outputs;
      ctx.fillStyle = theme.bgColor;
      ctx.fillStyle = mode == normalMode ? theme.bgColor : theme.altBgColor;
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
    let master = getMaster(pin);
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
    var master = getMaster(element),
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
  let referencingModel = this.model.referencingModel,
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
  if (item.type == 'wire')
    this.layoutWire(item);
}

Renderer.prototype.draw = function(item, mode) {
  let rect;
  switch (item.type) {
    case 'element':
      rect = this.getItemRect(item);
      if (item.state == 'palette' && mode == normalMode)
        mode = paletteMode;
      this.drawMaster(getMaster(item), rect.x, rect.y, mode);
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

  let junctions = [
    { type: 'element',
      elementType: 'input',
      master: '[,*]',
    },
    { type: 'element',
      elementType: 'output',
      master: '[*,]',
    },
    { type: 'element',
      elementType: 'apply',
      master: '[*,](λ)',
    },
    { type: 'element',
      elementType: 'literal',
      master: '[,v](0)',
    },
  ];
  this.junctions = junctions;

  let unaryOps = ['!', '~', '-' ];
  let binaryOps = ['+', '-', '*', '/', '%', '==', '!=', '<', '<=', '>', '>=',
                   '|', '&', '||', '&&'];

  let primitives = [];
  unaryOps.forEach(function(op) {
    primitives.push({
      name: op,
      type: 'element',
      master: '[v,v](' + op + ')',
    });
  });
  binaryOps.forEach(function(op) {
    primitives.push({
      name: op,
      type: 'element',
      master: '[vv,v](' + op + ')',
    });
  });
  // Just one ternary op for now, the conditional operator.
  primitives.push({
      name: '?',
      type: 'element',
      master: '[vvv,v](?)',
  });

  // Local storage.
  primitives.push({
      name: '@',
      type: 'element',
      master: '[,[,v][v,v]](@)',
  });
  primitives.push({
      name: '[ ]',
      type: 'element',
      master: '[v(n),v(n)[v,v][vv,v]]',
  });
  this.primitives = primitives;

  editingModel.extend(model);

  let masters = masteringModel.extend(model);
  masters.addHandler('masterInserted', function(type, master) {
    let ctx = self.ctx,
        renderer = self.renderer,
        model = self.model;
    renderer.beginDraw(model, ctx);
    renderer.layoutMaster(master);
    // console.log(master);
    renderer.endDraw();
  });

  viewModel.extend(model);
}

Editor.prototype.initialize = function(canvasController) {
  this.canvasController = canvasController;
  this.canvas = canvasController.canvas;
  this.ctx = canvasController.ctx;
  this.renderer = new Renderer(canvasController.theme);

  let model = this.model,
      renderer = this.renderer;
  model.dataModel.initialize();

  // Create an instance of every junction and literal.
  let x, y;
  x = 16, y = 16,
  this.junctions.forEach(function(junction) {
    let item = Object.assign(junction);
    item.x = x;
    item.y = y;
    item.state = 'palette';
    model.editingModel.newItem(item);
    model.editingModel.addItem(item);
    x += 40;
  });

  // Create an instance of every primitive.
  x = 16, y = 56;
  this.primitives.forEach(function(primitive) {
    let item = Object.assign(primitive);
    item.x = x;
    item.y = y;
    item.state = 'palette';
    model.editingModel.newItem(item);
    model.editingModel.addItem(item);
    x += 48;
    if (x > 256) {
      x = 16, y += 56;
    }
  });
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
      model = this.model, ctx = this.ctx,
      canvasController = this.canvasController;
  renderer.beginDraw(model, ctx);
  canvasController.applyTransform();

  diagram.items.forEach(function(item) {
    if (isElement(item)) {
      renderer.layout(item);
      renderer.draw(item, normalMode);
    }
  });
  diagram.items.forEach(function(item) {
    if (isWire(item)) {
      renderer.layout(item);
      renderer.draw(item, normalMode);
    }
  });

  model.selectionModel.forEach(function(item) {
    renderer.draw(item, highlightMode);
  });
  if (this.hotTrackInfo)
    renderer.draw(this.hotTrackInfo.item, hotTrackMode);
  renderer.endDraw();

  var temporary = this.getTemporaryItem();
  if (temporary) {
    renderer.beginDraw(model, ctx);
    canvasController.applyTransform();
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
  function reverseForEach(items, filter, fn) {
    for (let i = items.length - 1; i >= 0; i--) {
      let item = items[i];
      if (!filter || filter(item))
        fn(item);
    }
  }
  // TODO hit test selection first, in highlight, first.
  reverseForEach(diagram.items, isWire,
    item => pushInfo(renderer.hitTest(item, cp, cTol, normalMode)));
  reverseForEach(diagram.items, isElement,
    item => pushInfo(renderer.hitTest(item, cp, cTol, normalMode)));
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
  return !isCircuit(hitInfo.item);
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
      model = this.model,
      textInputController = this.textInputController,
      item = model.selectionModel.lastSelected();
  if (item && isElement(item)) {
    textInputController.start(item.name, function(newText) {
      let newMaster = model.masteringModel.relabel(item, newText);
      if (newMaster != item.master) {
        model.transactionModel.beginTransaction('rename');
        model.observableModel.changeValue(item, 'master', newMaster);
        model.transactionModel.endTransaction();
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
      cmdKeyDown = this.canvasController.cmdKeyDown,
      hitList = this.hitTest(p),
      mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList, isDraggable);
  if (mouseHitInfo) {
    let item = mouseHitInfo.item;
    if (cmdKeyDown || item.state == 'palette') {
      mouseHitInfo.moveCopy = true;
      // No wire dragging in this mode.
      mouseHitInfo.input = mouseHitInfo.output = undefined;
    }
    if (!selectionModel.contains(item)) {
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
      selectionModel = model.selectionModel,
      editingModel = model.editingModel,
      newItem, drag;
  if (mouseHitInfo.input !== undefined) {
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
        if (mouseHitInfo.moveCopy) {
          drag = { type: 'moveCopySelection', name: 'Move copy of selection' };
        } else {
          drag = { type: 'moveSelection', name: 'Move selection' };
        }
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
    if (drag.type === 'moveSelection' || drag.type == 'moveCopySelection')
      editingModel.reduceSelection();
    model.transactionModel.beginTransaction(drag.name);
    if (newItem) {
      drag.item = newItem;
      model.dataModel.initialize(newItem);
      this.addTemporaryItem(newItem);
    } else {
      drag.item = dragItem;
      if (mouseHitInfo.moveCopy) {
        editingModel.reduceSelection();
        editingModel.selectInteriorWires();
        let map = new Map(),
            copies = editingModel.copyItems(selectionModel.contents(), map);
        editingModel.addItems(copies);
        selectionModel.set(copies);
        // TODO clean up.
        // Any cloned items may need layout.
        let renderer = this.renderer;
        renderer.beginDraw(model, this.ctx);
        copies.forEach(function(copy) {
          renderer.layout(copy);
        });
        renderer.endDraw();
      }
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
    case 'moveSelection':
    case 'moveCopySelection':
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
    // do this to collapse all of the changes into a single insert transaction.
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

  if (isWire(dragItem)) {
    // If dragItem is a disconnected wire, delete it.
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
          editingModel.doPaste(24, 24);
          return true;
        }
        return false;
      case 69:  // 'e'
        editingModel.closeSelection();
        return true;
      case 72:  // 'h'
        editingModel.doToggleMaster();
        return true;
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
  masteringModel: masteringModel,
  viewModel: viewModel,

  normalMode: normalMode,
  paletteMode: paletteMode,
  highlightMode: highlightMode,
  hotTrackMode: hotTrackMode,

  Renderer: Renderer,

  Editor: Editor,
};
})();


var circuit_data =
{
  "type": "circuit",
  "id": 1,
  "x": 0,
  "y": 0,
  "width": 853,
  "height": 430.60454734008107,
  "name": "Example",
  "items": [
  ]
}

