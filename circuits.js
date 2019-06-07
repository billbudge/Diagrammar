// Circuits module.

'use strict';

let circuits = (function() {

function isCircuit(item) {
  return item.type == 'circuit';
}

function isContainer(item) {
  return item.type == 'circuit' || item.type == 'group';
}

function isElement(item) {
  return item.type == 'element';
}

function isGroup(item) {
  return item.type == 'group';
}

function isElementOrGroup(item) {
  return isElement(item) || isGroup(item);
}

function isWire(item) {
  return item.type == 'wire';
}

function isLiteral(item) {
  return item.elementType == 'literal';
}

function isJunction(item) {
  return item.elementType == 'input' || item.elementType == 'output' ||
         item.elementType == 'lambda';
}

function isClosed(item) {
  return item.elementType == 'closed';
}

function isAbstract(item) {
  return item.elementType == 'abstract';
}

function isInput(item) {
  return item.elementType == 'input';
}

function isOutput(item) {
  return item.elementType == 'output';
}

function isLambda(item) {
  return item.elementType == 'lambda';
}

function isProto(item) {
  return item.elementType == 'proto';
}

function isHoverable(item) {
  return isElement(item) && item.items;
}

function isInputPinLabeled(item) {
  return isOutput(item) || isAbstract(item) || isLambda(item);
}

function isOutputPinLabeled(item) {
  return isInput(item) || isLiteral(item) || isClosed(item);
}

function isFunctionType(type) {
  return type[0] == '[';
}

function visitItems(items, fn, filter) {
  function visit(item) {
    // Pre-order traversal.
    if (isGroup(item)) {
      item.items.forEach(item => visit(item));
    }
    if (!filter || filter(item)) {
      fn(item);
    }
  }
  items.forEach(item => visit(item));
}

let inputElementType = '[,*]',
    outputElementType = '[*,]',
    lambdaElementType = '[*(λ),]';

let _master = Symbol('master');

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

    // Removes any trailing label. Type may be ill-formed, e.g. '[v(f)'
    unlabelType: function(type) {
      if (type[type.length - 1] == ')')
        type = type.substring(0, type.lastIndexOf('('));
      return type;
    },

    splitType: function(s) {
      let self = this;
      let j = 0, level = 0;
      while (true) {
        if (s[j] == '[')
          level++;
        else if (s[j] == ']')
          level--;
        else if (s[j] == ',')
          if (level == 1) return j;
        j++;
      }
    },

    hasOutput: function(type) {
      return !type.endsWith(',]');
    },

    addInputToType: function(type, inputType) {
      let i = this.splitType(type);
      return type.substring(0, i) + inputType + type.substring(i);
    },

    addOutputToType: function(type, outputType) {
      let i = type.lastIndexOf(']');
      return type.substring(0, i) + outputType + type.substring(i);
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
      visitItems(items, function(element) {
        let master = getMaster(element);
        elementSet.add(element);
        // inputMap takes element to array of incoming wires.
        inputMap.set(element, new Array(master.inputs.length).fill(null));
        // outputMap takes element to array of array of outgoing wires.
        let arrays = new Array(master.outputs.length);
        for (let i = 0; i < arrays.length; i++)
          arrays[i] = new Array();
        outputMap.set(element, arrays);
      }, isElement);
      // Separate wires into incoming, outgoing, and interior. Populate
      // input/output maps, and incoming and outgoing pins.
      let wires = [], incomingWires = [], outgoingWires = [], interiorWires = [],
          inputWires = [], outputWires = [];
      visitItems(this.diagram.items, function(wire) {
        wires.push(wire);
        let src = self.getWireSrc(wire),
            dst = self.getWireDst(wire),
            srcInside = elementSet.has(src),
            dstInside = elementSet.has(dst);
        if (srcInside) {
          outputMap.get(src)[wire.srcPin].push(wire);
          if (dstInside) {
            interiorWires.push(wire);
            if (isInput(src))
              inputWires.push(wire);
            if (isOutput(dst))
              outputWires.push(wire);
          } else {
            outgoingWires.push(wire);
            outputWires.push(wire);
          }
        }
        if (dstInside) {
          inputMap.get(dst)[wire.dstPin] = wire;
          if (!srcInside) {
            incomingWires.push(wire);
            inputWires.push(wire);
          }
        }
      }, isWire);

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

    getConnectedElements: function(items, upstream) {
      let self = this, model = this.model,
          selectionModel = model.selectionModel,
          graphInfo = this.collectGraphInfo(this.diagram.items),
          result = new Set();
      while (items.length > 0) {
        let item = items.pop();
        if (!isElementOrGroup(item)) continue;
        result.add(item);
        if (upstream) {
          graphInfo.inputMap.get(item).forEach(function(wire) {
            if (!wire) return;
            let src = self.getWireSrc(wire);
            if (!result.has(src))
              items.push(src);
          });
        }
        graphInfo.outputMap.get(item).forEach(function(wires) {
          wires.forEach(function(wire) {
            let dst = self.getWireDst(wire);
            if (!result.has(dst))
              items.push(dst);
          });
        });
      }
      return result;
    },

    selectInteriorWires: function() {
      let model = this.model,
          selectionModel = model.selectionModel,
          graphInfo = this.collectGraphInfo(selectionModel.contents());
      selectionModel.add(graphInfo.interiorWires);
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
          selectionModel = model.selectionModel,
          parent = hierarchicalModel.getParent(item);
      if (parent) {
        let items = parent.items,
            index = items.indexOf(item);
        if (index >= 0) {
          model.observableModel.removeElement(parent, 'items', index);
          selectionModel.remove(item);
        }
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
          copies = this.prototype.copyItems(items, map);
      items.forEach(function(item) {
        let copy = map.get(dataModel.getId(item));
        if (isElementOrGroup(copy)) {
          copy.state = 'normal';
        }
      });
      return copies;
    },

    doCopy: function() {
      let selectionModel = this.model.selectionModel;
      this.reduceSelection();
      selectionModel.contents().forEach(function(item) {
        if (!isElementOrGroup(item))
          selectionModel.remove(item);
      });
      this.selectInteriorWires();
      this.prototype.doCopy.call(this);
    },

    addItem: function(item, parent) {
      let model = this.model,
          hierarchicalModel = model.hierarchicalModel,
          translatableModel = model.translatableModel,
          oldParent = hierarchicalModel.getParent(item);
      if (!parent)
        parent = this.diagram;
      if (oldParent === parent)
        return;
      if (isCircuit(parent)) {
        if (!Array.isArray(parent.items))
          model.observableModel.changeValue(parent, 'items', []);
      }
      if (oldParent !== parent) {
        let translation = translatableModel.getToParent(item, parent);
        model.observableModel.changeValue(item, 'x', item.x + translation.x);
        model.observableModel.changeValue(item, 'y', item.y + translation.y);

        if (oldParent)
          this.deleteItem(item);
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
        if (isElementOrGroup(item)) {
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
        master: inputElementType,
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
        master: outputElementType,
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

    getLabel: function (item) {
      let master = getMaster(item);
      if (isInput(item) || isLiteral(item)) {
        return master.outputs[0].name;
      } else if (isOutput(item)) {
        return master.inputs[0].name;
      }
      return master.name;
    },

    setLabel: function (item, newText) {
      let masteringModel = this.model.masteringModel,
          label = newText ? '(' + newText + ')' : '',
          master = item.master,
          newMaster;
      if (isInputPinLabeled(item)) {
        let j = masteringModel.splitType(master),
            prefix = master.substring(0, j),
            suffix = master.substring(j);
        newMaster = masteringModel.unlabelType(prefix) + label + suffix;
      } else if (isOutputPinLabeled(item)) {
        let prefix = master.substring(0, master.length - 1);
        newMaster = masteringModel.unlabelType(prefix) + label + ']';
      } else {
        newMaster = masteringModel.unlabelType(master) + label;
      }
      return newMaster;
    },

    changeType: function (item, newType) {
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
        } else if (isLambda(item)) {
          // let label = master.inputs[0].name;
          // newMaster = '[,' + master.outputs[0].type + label + ']';
        }
      }
      return newMaster;
    },

    closeFunction: function(element, incomingWires, outgoingWireArrays) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          masteringModel = model.masteringModel,
          observableModel = model.observableModel,
          master = getMaster(element);

      let newElement = {
        type: 'element',
        element: element,
        elementType: 'closed',
        x: element.x,
        y: element.y,
      };
      let id = dataModel.assignId(newElement);

      let type = '[',
          closedType = '[',
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
        } else {
          closedType += pin.type;
        }
      });
      // Add only connected output pins to outputs.
      type += ',';
      closedType += ',';
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
        closedType += pin.type;
      });
      type += ']';
      closedType += ']';
      type = masteringModel.addOutputToType(type, closedType);

      newElement.master = type;
      dataModel.initialize(newElement);
      return newElement;
    },

    openFunction: function(element, incomingWires, outgoingWireArrays) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          masteringModel = model.masteringModel,
          observableModel = model.observableModel,
          master = getMaster(element);

      let newElement = {
        type: 'element',
        element: element,
        elementType: 'abstract',
        x: element.x,
        y: element.y,
      };
      let id = dataModel.assignId(newElement);

      // Add all input pins to inputs.
      let pinIndex = 0;
      master.inputs.forEach(function(pin, i) {
        let incomingWire = incomingWires[i];
        // remap wire to new element and pin.
        if (incomingWire) {
          observableModel.changeValue(incomingWire, 'dstId', id);
          observableModel.changeValue(incomingWire, 'dstPin', pinIndex);
          pinIndex++;
        }
      });
      // Add all output pins to outputs.
      pinIndex = 0;
      master.outputs.forEach(function(pin, i) {
        let outgoingWires = outgoingWireArrays[i];
        outgoingWires.forEach(function(outgoingWire, j) {
          // remap wires to new element and pin.
          observableModel.changeValue(outgoingWire, 'srcId', id);
          observableModel.changeValue(outgoingWire, 'srcPin', pinIndex);
        });
        pinIndex++;
      });

      let innerType = masteringModel.unlabelType(element.master),
          type = masteringModel.addInputToType(innerType, innerType);
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
      // Open or close each non-input/output element.
      graphInfo.elementSet.forEach(function(element) {
        if (isInput(element) || isOutput(element) || isLiteral(element)) return;
        let incomingWires = graphInfo.inputMap.get(element),
            outgoingWireArrays = graphInfo.outputMap.get(element);

        let newElement = closing ?
          self.closeFunction(element, incomingWires, outgoingWireArrays) :
          self.openFunction(element, incomingWires, outgoingWireArrays);

        selectionModel.remove(element);
        selectionModel.add(newElement);

        self.deleteItem(element);
        self.addItem(newElement);
      });
    },

    makeGroup: function(elements, new_grouping) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          masteringModel = model.masteringModel,
          observableModel = model.observableModel,
          viewModel = model.viewModel;

      let graphInfo = this.collectGraphInfo(elements),
          entireGraphInfo = this.collectGraphInfo(this.diagram.items),
          groupItems = elements.concat(graphInfo.interiorWires),
          extents = viewModel.getItemRects(graphInfo.elementSet),
          inputs = [], outputs = [];
      // Create the new group element.
      let groupElement = {
        type: 'element',
        x: extents.x + extents.w / 2,
        y: extents.y + extents.h / 2,
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
          let srcPin = srcPins[index],
              srcType = self.getPinType(srcPin);
          if (srcType.startsWith('*')) {
            if (isInput(src))
              srcType = self.findDstType(wire, entireGraphInfo) + srcType.substring(1);
            else
              srcType = self.findSrcType(wire, entireGraphInfo);
          }
          master += srcType;
        }
        return srcIndices[index];
      }

      let incomingSrcMap = new Map(), outgoingSrcMap = new Map();
      // Add input pins for inputWires.
      graphInfo.inputWires.forEach(function(wire) {
        let index = addUniqueSource(wire, incomingSrcMap);
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
      });
      master += ',';
      pinIndex = 0;
      // Add output pins for outputWires.
      graphInfo.outputWires.forEach(function(wire) {
        let index = addUniqueSource(wire, outgoingSrcMap);
        let dst = self.getWireDst(wire);
        if (graphInfo.elementSet.has(dst)) {
          observableModel.changeValue(dst, 'pinIndex', index);
          if (index == pinIndex - 1 && isOutput(dst)) {
            // Let output override source name.
            let name = getMaster(dst).inputs[0].name;
            if (name)
              master =  masteringModel.unlabelType(master) + '(' + name + ')';
          }
        } else {
          // If this is the first instance of the source...
          if (index == pinIndex - 1) {
            // Add an output junction to represent the source.
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
      });
      master += ']';
      if (!masteringModel.hasOutput(master)) {
        // Add a 'use' pin so group can be evaluated. Like 'return void'.
        master = masteringModel.addOutputToType(master, '*');
      }

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

      groupElement.items = groupItems;
      groupItems.forEach(function(item) {
        if (!isWire(item)) {
          observableModel.changeValue(item, 'x', item.x - extents.x);
          observableModel.changeValue(item, 'y', item.y - extents.y);
        }
        self.deleteItem(item);
      });

      if (new_grouping) {
        groupElement.type = 'group';
        groupElement.x = extents.x;
        groupElement.y = extents.y;
      } else {
        groupElement.master = master;
      }

      return groupElement;
    },

    makeProtoGroup: function(elements) {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          masteringModel = model.masteringModel,
          viewModel = model.viewModel;

      let graphInfo = this.collectGraphInfo(elements),
          entireGraphInfo = this.collectGraphInfo(this.diagram.items),
          extents = viewModel.getItemRects(graphInfo.elementSet),
          inputs = [], outputs = [];
      // Create the new group element.
      let groupElement = {
        type: 'element',
        elementType: 'proto',
        x: extents.x + extents.w / 2,
        y: extents.y + extents.h / 2,
      };

      dataModel.assignId(groupElement);

      elements.forEach(function(element) {
        if (isInput(element))
          inputs.push(element);
        else if (isOutput(element))
          outputs.push(element);
      });

      // Sort pins so we encounter them in increasing y-order.
      function compareElements(elem1, elem2) {
        return elem1.y - elem2.y;
      }
      inputs.sort(compareElements);
      outputs.sort(compareElements);

      let master = '[';
      inputs.forEach(function(element) {
        let wire = graphInfo.outputMap.get(element)[0][0],
            type = self.getPinType(getMaster(element).outputs[0]);
        if (wire)
          type = type.replace('*', self.findDstType(wire, entireGraphInfo));
        master += type;
      });
      master += ',';
      outputs.forEach(function(element) {
        let wire = graphInfo.inputMap.get(element)[0],
            type = self.getPinType(getMaster(element).inputs[0]);
        if (wire)
          type = type.replace('*', self.findSrcType(wire, entireGraphInfo));
        master += type;
      });
      master += ']';

      groupElement.master = master;
      return groupElement;
    },

    setLambda: function(wire, graphInfo) {
      let self = this, model = this.model,
          observableModel = model.observableModel,
          srcItem = this.getWireSrc(wire),
          srcPin = getMaster(srcItem).outputs[wire.srcPin],
          fnType = self.findSrcType(wire, graphInfo),
          lambda = this.getWireDst(wire),
          lambaPin = getMaster(lambda).inputs[wire.dstPin];
      // If type is a function, set the lambda to the function type,
      // plus the untyped fn input.
      if (isFunctionType(fnType)) {
        let newMaster = self.model.masteringModel.addInputToType(fnType, '*');
        observableModel.changeValue(lambda, 'master', newMaster);
        observableModel.changeValue(wire, 'dstPin', getMaster(lambda).inputs.length - 1);
      }
    },

    resetLambda: function(element, graphInfo) {
      let self = this, model = this.model,
          observableModel = model.observableModel,
          inputWires = graphInfo.inputMap.get(element),
          outputWires = graphInfo.outputMap.get(element);
      // Delete all wires except the incoming function input.
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
      let wire = inputWires[inputWires.length - 1];
      if (wire) {
        observableModel.changeValue(wire, 'dstPin', 0);
      }
      observableModel.changeValue(element, 'master', lambdaElementType);
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
              if (incomingWire)
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

    doGroup: function(protoGroup, new_grouping) {
      let model = this.model;
      this.reduceSelection();
      let elements = model.selectionModel.contents().filter(isElementOrGroup);
      model.transactionModel.beginTransaction(
        'group' + (protoGroup ? '(proto)' : ''));
      let groupElement = protoGroup ?
        this.makeProtoGroup(elements) : this.makeGroup(elements, new_grouping);
      // console.log(groupElement.master);
      model.dataModel.initialize(groupElement);
      this.addItem(groupElement);
      model.selectionModel.set(groupElement);
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

    doSelectConnectedElements: function(upstream) {
      let selectionModel = this.model.selectionModel,
          selection = selectionModel.contents(),
          newSelection = this.getConnectedElements(selection, upstream);
      selectionModel.set(newSelection);
    },

    makeConsistent: function () {
      let self = this, model = this.model,
          dataModel = model.dataModel,
          masteringModel = model.masteringModel,
          selectionModel = model.selectionModel,
          observableModel = model.observableModel,
          graphInfo = this.collectGraphInfo(this.diagram.items),
          elementSet = graphInfo.elementSet,
          wires = graphInfo.wires;
      // Make sure lambdas are consistent.
      elementSet.forEach(function(element) {
        if (isLambda(element)) {
          let master = getMaster(element),
              inputPins = master.inputs,
              lastIndex = inputPins.length - 1,
              wire = graphInfo.inputMap.get(element)[lastIndex];
          if (wire) {
            let srcType = self.findSrcType(wire, graphInfo);
            if (!isFunctionType(srcType)) {
              self.deleteItem(wire);
              self.resetLambda(element, graphInfo);
            } else {
              let type = masteringModel.addInputToType(srcType, '*');
              if (element.master != type) {
                self.resetLambda(element, graphInfo);
                self.setLambda(wire, graphInfo);
              }
            }
          } else {
            if (element.master != lambdaElementType) {
              self.resetLambda(element, graphInfo);
            }
          }
        }
      });

      // Eliminate dangling wires.
      wires.forEach(function(wire) {
        let src = self.getWireSrc(wire), dst = self.getWireDst(wire);
        if (!src || !elementSet.has(src) || !dst || !elementSet.has(dst)) {
          self.deleteItem(wire);
        }
      });
    },

    layoutGroups: function () {
      let model = this.model,
          viewModel = model.viewModel,
          hierarchicalModel = model.hierarchicalModel,
          translatableModel = model.translatableModel;
      // Make sure groups are layed out.
      visitItems(this.diagram.items, function(group) {
        let extents = viewModel.getItemRects(group.items),
            parent = hierarchicalModel.getParent(group),
            parentX = translatableModel.globalX(parent),
            parentY = translatableModel.globalY(parent),
            x = extents.x - parentX, y = extents.y - parentY;
        viewModel.setItemBounds(group, extents.x + extents.w - group.x,
                                       extents.y + extents.h - group.y);
      }, isGroup);
    }
  }

  function extend(model) {
    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);
    dataModels.selectionModel.extend(model);
    dataModels.referencingModel.extend(model);
    dataModels.hierarchicalModel.extend(model);
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
      // ignore transaction argument.
      instance.makeConsistent();
      instance.layoutGroups();
    });
    function layout(transaction) {
      // ignore transaction argument.
      instance.layoutGroups();
    }
    model.transactionModel.addHandler('didUndo', layout);
    model.transactionModel.addHandler('didRedo', layout);

    model.editingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

let _x = Symbol('x'),
    _y = Symbol('y'),
    _baseline = Symbol('baseline'),
    _width = Symbol('width'),
    _height = Symbol('height'),
    _p1 = Symbol('p1'),
    _p2 = Symbol('p2'),
    _bezier = Symbol('bezier'),
    _background = Symbol('background');

let viewModel = (function() {
  let proto = {
    getItemRect: function (item) {
      if (isWire(item))
        return;
      let translatableModel = this.model.translatableModel,
          x = translatableModel.globalX(item),
          y = translatableModel.globalY(item),
          width, height;
      if (isGroup(item)) {
        width = item[_width];
        height = item[_height];
      } else if (isElement(item)) {
        let master = getMaster(item);
        width = master[_width];
        height = master[_height];
      }
      return { x: x, y: y, w: width, h: height };
    },

    setItemBounds: function (item, width, height) {
      item[_width] = width;
      item[_height] = height;
    },

    getItemRects: function(items) {
      let xMin = Number.POSITIVE_INFINITY, yMin = Number.POSITIVE_INFINITY,
          xMax = -Number.POSITIVE_INFINITY, yMax = -Number.POSITIVE_INFINITY;
      for (let item of items) {
        if (isWire(item))
          continue;
        let rect = this.getItemRect(item);
        xMin = Math.min(xMin, rect.x);
        yMin = Math.min(yMin, rect.y);
        xMax = Math.max(xMax, rect.x + rect.w);
        yMax = Math.max(yMax, rect.y + rect.h);
      }
      return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
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
    dataModels.translatableModel.extend(model);

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
  this.viewModel = model.viewModel || viewModel.extend(model);
  this.ctx = ctx;
  ctx.save();
  ctx.font = this.theme.font;
}

Renderer.prototype.endDraw = function() {
  this.ctx.restore();
  this.model = null;
  this.ctx = null;
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

  this.viewModel.setItemBounds(
    master,
    Math.round(Math.max(width, wIn + 2 * spacing + wOut, minMasterWidth)),
    Math.round(Math.max(yIn, yOut, minMasterHeight) + spacing / 2));
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

Renderer.prototype.drawMaster = function(master, x, y) {
  let self = this, ctx = this.ctx, theme = this.theme,
      textSize = theme.fontSize, name = master.name,
      inputs = master.inputs, outputs = master.outputs,
      width = master[_width], height = master[_height];
  ctx.lineWidth = 0.5;
  ctx.fillStyle = theme.textColor;
  ctx.textBaseline = 'bottom';
  if (name) {
    ctx.textAlign = 'center';
    ctx.fillText(name, x + width / 2, y + textSize + spacing / 2);
  }
  inputs.forEach(function(pin, i) {
    let name = pin.name;
    self.drawPin(pin, x, y + pin[_y]);
    if (name) {
      ctx.textAlign = 'left';
      ctx.fillText(name, x + pin[_width] + spacing, y + pin[_baseline]);
    }
  });
  outputs.forEach(function(pin) {
    let name = pin.name, left = x + width - pin[_width];
    self.drawPin(pin, left, y + pin[_y]);
    if (name) {
      ctx.textAlign = 'right';
      ctx.fillText(name, left - spacing, y + pin[_baseline]);
    }
  });
}

Renderer.prototype.drawPin = function(pin, x, y) {
  ctx.strokeStyle = theme.strokeColor;
  if (pin.type == 'v' || pin.type == '*') {
    let r = this.knobbyRadius;
    ctx.beginPath();
    if (pin.type == 'v') {
      let d = 2 * r;
      ctx.rect(x, y, d, d);
    } else {
      ctx.arc(x + r, y + r, r, 0, Math.PI * 2, true);
    }
    ctx.stroke();
  } else {
    let master = getMaster(pin),
        width = master[_width], height = master[_height];
    this.ctx.scale(shrink, shrink);
    x *= inv_shrink; y *= inv_shrink;
    ctx.strokeRect(x, y, width, height);
    this.drawMaster(master, x, y);
    this.ctx.scale(inv_shrink, inv_shrink);
  }
}

Renderer.prototype.drawElement = function(element, mode) {
  let ctx = this.ctx, theme = this.theme,
      rect = this.viewModel.getItemRect(element),
      x = rect.x, y = rect.y, width = rect.w, height = rect.h,
      right = x + width, bottom = y + height;
  switch (element.elementType) {
    case 'input':
      diagrams.inFlagPath(x, y, width, height, spacing, ctx);
      break;
    case 'output':
      diagrams.outFlagPath(x, y, width, height, spacing, ctx);
      break;
    case 'proto':
    case 'lambda':
      diagrams.roundRectPath(x, y, width, height, spacing, ctx);
      break;
    default:
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      break;
  }
  switch (mode) {
    case normalMode:
      ctx.fillStyle = element.state == 'palette' ? theme.altBgColor : theme.bgColor;
      ctx.fill();
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 0.5;
      let dashed = isProto(element);
      if (dashed) {
        ctx.setLineDash([6,3]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.stroke();
      }
      let master = getMaster(element);
      this.drawMaster(master, x, y);
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

Renderer.prototype.drawGroup = function(group, mode) {
  let ctx = this.ctx, theme = this.theme,
      rect = this.viewModel.getItemRect(group),
      x = rect.x - spacing, y = rect.y - spacing,
      width = rect.w + 2 * spacing, height = rect.h + 2 * spacing,
      right = x + width, bottom = y + height;
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  switch (mode) {
    case normalMode:
      ctx.fillStyle = theme.bgColor;
      ctx.fill();
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      for (let i = 0; i < group.items.length; i++) {
        this.draw(group.items[i], mode);
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

Renderer.prototype.hitTestElement = function(element, p, tol, mode) {
  let rect = this.viewModel.getItemRect(element),
      x = rect.x, y = rect.y, width = rect.w, height = rect.h,
      hitInfo = diagrams.hitTestRect(x, y, width, height, p, tol);
  if (hitInfo) {
    let master = getMaster(element),
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

Renderer.prototype.hitTestGroup = function(group, p, tol, mode) {
  let rect = this.viewModel.getItemRect(group),
      x = rect.x - spacing, y = rect.y - spacing,
      width = rect.w + 2 * spacing, height = rect.h + 2 * spacing,
      hitInfo = diagrams.hitTestRect(x, y, width, height, p, tol);
  if (hitInfo) {
    // TODO edge hits?
  }
  return hitInfo;
}

Renderer.prototype.layoutWire = function(wire) {
  let viewModel = this.viewModel,
      referencingModel = this.model.referencingModel,
      src = referencingModel.getReference(wire, 'srcId'),
      dst = referencingModel.getReference(wire, 'dstId'),
      p1 = wire[_p1], p2 = wire[_p2];
  let srcDim, dstDim;
  if (src) {
    p1 = viewModel.pinToPoint(src, wire.srcPin, false);
    let master = getMaster(src),
        pin = master.outputs[wire.srcPin];
    srcDim = isFunctionType(pin.type);
  }
  if (dst) {
    p2 = viewModel.pinToPoint(dst, wire.dstPin, true);
    let master = getMaster(dst),
        pin = master.inputs[wire.dstPin];
    dstDim = isFunctionType(pin.type) ||
             (isLambda(dst) && wire.dstPin == master.inputs.length - 1);
  }
  wire[_background] = srcDim || dstDim;
  wire[_bezier] = diagrams.getEdgeBezier(p1, p2);
}

Renderer.prototype.drawWire = function(wire, mode) {
  let ctx = this.ctx;
  diagrams.bezierEdgePath(wire[_bezier], ctx, 0);
  switch (mode) {
    case normalMode:
      ctx.strokeStyle = wire[_background] ? theme.dimColor : theme.strokeColor;
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
  if (isWire(item)) {
    this.layoutWire(item);
  } else if (isGroup(item)) {
    let self = this;
    item.items.forEach(function(subItem) {
      self.layout(subItem);
    });
  }
}

Renderer.prototype.draw = function(item, mode) {
  switch (item.type) {
    case 'element':
      this.drawElement(item, mode);
      break;
    case 'group':
      this.drawGroup(item, mode);
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
    case 'group':
      hitInfo = this.hitTestGroup(item, p, tol, mode);
      break;
    case 'wire':
      hitInfo = this.hitTestWire(item, p, tol, mode);
      break;
  }
  if (hitInfo && !hitInfo.item)
    hitInfo.item = item;
  return hitInfo;
}

Renderer.prototype.drawHoverInfo = function(item, p) {
  let self = this, theme = this.theme,
      x = p.x, y = p.y;
  ctx.fillStyle = theme.hoverColor;
  if (isHoverable(item)) {
    let viewModel = this.viewModel;
    // item.items.forEach(function(item) {
    //   self.layout(item);
    // });
    let r = viewModel.getItemRects(item.items);
    ctx.translate(x - r.x, y - r.y);
    let border = 4;
    ctx.fillRect(r.x - border, r.y - border, r.w + 2 * border, r.h + 2 * border);
    ctx.fillStyle = theme.hoverTextColor;
    item.items.forEach(function(item) {
      self.layout(item);
      self.draw(item, normalMode);
    });
  } else {
    // Just list properties as text.
    let props = [];
    this.model.dataModel.visitProperties(item, function(item, attr) {
      let value = item[attr];
      if (Array.isArray(value))
        return;
      props.push({ name: attr, value: value });
    });
    let textSize = theme.fontSize, gap = 16, border = 4,
        height = textSize * props.length + 2 * border,
        maxWidth = diagrams.measureNameValuePairs(props, gap, ctx) + 2 * border;
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
}

//------------------------------------------------------------------------------

function Editor(model, textInputController) {
  let self = this;
  this.model = model;
  this.diagram = model.root;
  this.textInputController = textInputController;

  this.hitTolerance = 4;

  let junctions = [
    { type: 'element',
      elementType: 'input',
      master: inputElementType,
    },
    { type: 'element',
      elementType: 'output',
      master: outputElementType,
    },
    { type: 'element',
      elementType: 'lambda',
      master: lambdaElementType,
    },
    { type: 'element',
      elementType: 'use',
      master: '[**,*]',
    },
    { type: 'element',
      elementType: 'literal',
      master: '[,v(0)]',
    },
  ];
  this.junctions = junctions;

  let unaryOps = ['!', '~', '-' ];
  let binaryOps = ['+', '-', '*', '/', '%', '==', '!=', '<', '<=', '>', '>=',
                   '|', '&', '||', '&&'];

  let primitives = [];
  unaryOps.forEach(function(op) {
    primitives.push({
      type: 'element',
      master: '[v,v](' + op + ')',
    });
  });
  binaryOps.forEach(function(op) {
    primitives.push({
      type: 'element',
      master: '[vv,v](' + op + ')',
    });
  });
  // Just one ternary op for now, the conditional operator.
  primitives.push({
      type: 'element',
      master: '[vvv,v](?)',
  });

  // Object definition.
  primitives.push({
      type: 'element',
      master: '[,v[v,v]](let)',
  });
  // Object adapter.
  primitives.push({
      type: 'element',
      master: '[v,[v,v[v,v]]]({})',
  });
  // Array adapter.
  primitives.push({
      type: 'element',
      master: '[v,v(n)[v,v[v,v]]]([])',
  });
  // // Set adapter.
  // primitives.push({
  //     type: 'element',
  //     master: '[,v(size)[v,v](add)[v,v](has)[v,v](delete)[,v](clear)](set)',
  // });
  // // Map adapter.
  // primitives.push({
  //     type: 'element',
  //     master: '[,v(size)[v,v](get)[vv,v](set)[v,v](has)[v,v](delete)[,v](clear)](map)',
  // });
  // // String adapter.
  // primitives.push({
  //     type: 'element',
  //     master: '[v,v(length)[vv,v](indexOf)[vv,v](lastIndexOf)[v,v](charAt)[vv,v](substring)](string)',
  // });

  this.primitives = primitives;

  editingModel.extend(model);

  // model.dataModel.addInitializer(function(item) {
  //   if (!isGroup(item))
  //     return;
  //   let ctx = self.ctx,
  //       renderer = self.renderer,
  //       model = self.model;
  //   renderer.beginDraw(model, ctx);
  //   renderer.layout(item);
  //   renderer.endDraw();
  // });

  let masters = masteringModel.extend(model);
  masters.addHandler('masterInserted', function(type, master) {
    let ctx = self.ctx,
        renderer = self.renderer,
        model = self.model;
    renderer.beginDraw(model, ctx);
    renderer.layoutMaster(master);
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
      viewModel = model.viewModel,
      renderer = this.renderer;
  model.dataModel.initialize();

  // Create an instance of every junction and literal.
  let x = 16, y = 16, h = 0, spacing = 8;
  this.junctions.forEach(function(junction) {
    let item = Object.assign(junction);
    item.x = x;
    item.y = y;
    item.state = 'palette';
    model.editingModel.newItem(item);
    model.editingModel.addItem(item);
    let r = viewModel.getItemRect(item);
    x += r.w + spacing;
    h = Math.max(h, r.h);
  });
  y += h + spacing;

  // Create an instance of every primitive.
  x = 16, h = 0;
  this.primitives.forEach(function(primitive) {
    let item = Object.assign(primitive);
    item.x = x;
    item.y = y;
    item.state = 'palette';
    model.editingModel.newItem(item);
    model.editingModel.addItem(item);
    let r = viewModel.getItemRect(item);
    x += r.w + spacing;
    h = Math.max(h, r.h);
    if (x > 208) {
      x = 16, y += h + spacing, h = 0;
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

  // Draw registration frame for generating screen shots.
  ctx.strokeStyle = renderer.theme.dimColor;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(300, 10, 700, 300);

  diagram.items.forEach(function(item) {
    if (isElementOrGroup(item)) {
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
    renderer.drawHoverInfo(hoverHitInfo.item, hoverHitInfo.p);
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
  function reverseVisit(item, filter, fn) {
    if (isContainer(item)) {
      let items = item.items;
      for (let i = items.length - 1; i >= 0; i--) {
        reverseVisit(items[i], filter, fn);
      }
    }
    if (!filter || filter(item))
      fn(item);
  }

  // TODO hit test selection first.
  reverseVisit(diagram, isWire,
    item => pushInfo(renderer.hitTest(item, cp, cTol, normalMode)));
  reverseVisit(diagram, isElementOrGroup,
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
      canvasController = this.canvasController,
      textInputController = this.textInputController,
      item = model.selectionModel.lastSelected(),
      editingModel = model.editingModel;
  if (item && isElement(item)) {
    let master = getMaster(item),
        oldText = editingModel.getLabel(item);
    textInputController.start(oldText, function(newText) {
      let newMaster = editingModel.setLabel(item, newText);
      if (newMaster != item.master) {
        model.transactionModel.beginTransaction('rename');
        model.observableModel.changeValue(item, 'master', newMaster);
        model.transactionModel.endTransaction();
        canvasController.draw();
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
    selectionModel.select(item, shiftKeyDown);
  } else {
    if (!shiftKeyDown)
      selectionModel.clear();
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
      case 'group':
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
      if (isElementOrGroup(dragItem)) {
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
        if (isElementOrGroup(item)) {
          editingModel.addItem(item, parent);
        }
      });
    }
  }

  // if (isWire(dragItem)) {
  //   // if (newItem) {
  //   //   if (newItem.srcId && !newItem.dstId) {
  //   //     // Create an output junction.
  //   //   } else if (newItem.dstId && !newItem.srcId) {
  //   //     // Create an input junction.
  //   //   }
  //   // }
  //   // If dragItem is a disconnected wire, delete it.
  //   if (!dragItem.srcId || !dragItem.dstId) {
  //     editingModel.deleteItem(dragItem);
  //     selectionModel.remove(dragItem);
  //   }
  // }

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
        editingModel.doSelectConnectedElements(!shiftKey);
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
      case 66:  // 'b'
        editingModel.doGroup(false, true);
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

