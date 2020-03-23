// Circuits module.

const circuits = (function() {
'use strict';

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

function isWireComplete(wire) {
  return wire.srcId != 0 && wire.dstId != 0 &&
         wire.srcPin !== undefined && wire.dstPin != undefined;
}

function isLiteral(item) {
  return item.elementType == 'literal';
}

function isJunction(item) {
  return item.elementType == 'input' || item.elementType == 'output';
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

function isHoverable(item) {
  return isElement(item) && item.items;
}

function isInputPinLabeled(item) {
  return isOutput(item) || isAbstract(item);
}

function isOutputPinLabeled(item) {
  return isInput(item) || isLiteral(item) || isClosed(item);
}

function isPaletted(item) {
  return item.state == 'palette';
}

function isFunctionType(type) {
  return type[0] == '[';
}

// Visits in pre-order.
function visitItem(item, fn, filter) {
  if (!filter || filter(item)) {
    fn(item);
  }
  if (isContainer(item)) {
    visitItems(item.items, fn, filter);
  }
}

function visitItems(items, fn, filter) {
  items.forEach(item => visitItem(item, fn, filter));
}

// Visits in post-order.
function reverseVisitItem(item, fn, filter) {
  if (isContainer(item)) {
    reverseVisitItems(item.items, fn, filter);
  }
  if (!filter || filter(item)) {
    fn(item);
  }
}

function reverseVisitItems(items, fn, filter) {
  for (let i = items.length - 1; i >= 0; i--) {
    reverseVisitItem(items[i], fn, filter);
  }
}

const inputElementType = '[,*]',
      outputElementType = '[*,]';

const _master = Symbol('master');

function getMaster(item) {
  return item[_master];
}

//------------------------------------------------------------------------------

const signatureModel = (function() {
  const proto = {
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

    // Removes all labels from type.
    getSignature: function(type) {
      let result = '', label = 0;
      while (true) {
        label = type.indexOf('(');
        if (label <= 0)
          break;
        result += type.substring(0, label);
        label = type.indexOf(')', label);
        if (label <= 0)
          break;
        type = type.substring(label + 1, type.length);
      }
      return result + type;
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
      if (isElementOrGroup(item)) {
        const master = item.master;
        item[_master] = master ?
                        this.masterMap_.get(master) || this.decodeType(master) :
                        null;
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
      if (isElementOrGroup(change.item)) {
        if (change.attr == 'master') {
          instance.initialize(change.item);
        }
      }
    });

    model.signatureModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

// Extends dataModels.changeModel to add:
// - maps from element to connected input and output wires.
// - information about graphs and subgraphs.
// - iterators for walking the graph.

const circuitModel = (function() {

  function iterators(self) {

    function forInputWires(element, fn) {
      const inputs = self.inputMap_.get(element);
      if (!inputs)
        return;
      for (let i = 0; i < inputs.length; i++) {
        if (inputs[i])
          fn(inputs[i], i);
      }
    }

    function forOutputWires(element, fn) {
      const arrays = self.outputMap_.get(element);
      if (!arrays)
        return;
      for (let i = 0; i < arrays.length; i++) {
        let outputs = arrays[i];
        if (outputs.length > 0) {
          for (let j = 0; j < outputs.length; j++)
            fn(outputs[j], i);
        }
      }
    }

    return {
      forInputWires: forInputWires,
      forOutputWires: forOutputWires,
    }
  }

  const proto = {
    getGraphInfo: function() {
      this.update_();

      return {
        elementsAndGroups: this.elementsAndGroups_,
        wires: this.wires_,
        inputMap: this.inputMap_,
        outputMap: this.outputMap_,
        interiorWires: this.wires_,
        incomingWires: new diagrammar.collections.EmptySet(),
        outgoingWires: new diagrammar.collections.EmptySet(),
        iterators: iterators(this),
      }
    },

    getSubgraphInfo: function(items) {
      this.update_();

      const self = this,
            elementsAndGroups = new Set(),
            wires = new Set(),
            interiorWires = new Set(),
            incomingWires = new Set(),
            outgoingWires = new Set(),
            iters = iterators(this);
      // First collect elements and groups.
      visitItems(items, function(item) {
        elementsAndGroups.add(item);
      }, isElementOrGroup);
      // Now collect and classify wires that connect to items.
      visitItems(items, function(item) {
        function addWire(wire) {
          wires.add(wire);
          const src = self.getWireSrc(wire),
                dst = self.getWireDst(wire),
                srcInside = elementsAndGroups.has(src),
                dstInside = elementsAndGroups.has(dst);
          if (srcInside) {
            if (dstInside) {
              interiorWires.add(wire);
            } else {
              outgoingWires.add(wire);
            }
          }
          if (dstInside) {
            if (!srcInside) {
              incomingWires.add(wire);
            }
          }
        }
        iters.forInputWires(item, addWire);
        iters.forOutputWires(item, addWire);
      }, isElement);

      return {
        elementsAndGroups: elementsAndGroups,
        wires: wires,
        inputMap: this.inputMap_,
        outputMap: this.outputMap_,
        interiorWires: interiorWires,
        incomingWires: incomingWires,
        outgoingWires: outgoingWires,
        iterators: iters,
      }
    },

    insertElement_: function(element) {
      this.elementsAndGroups_.add(element);
      const master = getMaster(element);
      // inputMap_ takes element to array of incoming wires.
      this.inputMap_.set(element, new Array(master.inputs.length).fill(null));
      // outputMap_ takes element to array of arrays of outgoing wires.
      const arrays = [...Array(master.outputs.length)].map(() => new Array());
      this.outputMap_.set(element, arrays);
    },
    removeElement_: function(element) {
      this.elementsAndGroups_.delete(element);
      this.inputMap_.delete(element);
      this.outputMap_.delete(element);
    },

    insertWire_: function(wire) {
      this.wires_.add(wire);
      const src = this.getWireSrc(wire),
            dst = this.getWireDst(wire),
            outputs = this.outputMap_.get(src),
            inputs = this.inputMap_.get(dst);
      if (outputs)
        outputs[wire.srcPin].push(wire);
      if (inputs)
        inputs[wire.dstPin] = wire;
    },

    removeWire_: function(wire) {
      this.wires_.delete(wire);
      const src = this.getWireSrc(wire),
            dst = this.getWireDst(wire);
      // remove wire from output array.
      if (src && wire.srcPin !== undefined) {
        const outputArrays = this.outputMap_.get(src);
        if (outputArrays) {
          const outputs = outputArrays[wire.srcPin];
          const index = outputs.indexOf(wire);
          if (index > -1) {
            outputs.splice(index, 1);
          }
        }
      }
      // clear wire from input.
      if (dst && wire.dstPin !== undefined) {
        const inputs = this.inputMap_.get(dst);
        if (inputs)
          inputs[wire.dstPin] = null;
      }
    },

    // Update the model to incorporate pending changes.
    update_: function() {
      const changeModel = this.model.changeModel;
      if (!changeModel.hasChanges())
        return;

      const self = this,
            removedItems = changeModel.getRemovedItems(),
            insertedItems = changeModel.getInsertedItems(),
            changedItems = changeModel.getChangedItems();

      // Remove wires, then elements.
      removedItems.forEach(function(item) {
        if (isWire(item) && isWireComplete(item)) {
          self.removeWire_(item);
        } else if (isGroup(item)) {
          visitItem(item, function(wire) {
            self.removeWire_(wire);
          }, isWire);
        }
      });
      removedItems.forEach(function(item) {
        visitItem(item, function(item) {
          if (isElement(item)) {
            self.removeElement_(item);
          } else if (isGroup(item)) {
            self.elementsAndGroups_.delete(item);
          }
        }, isElementOrGroup);
      });
      // Add elements, then wires.
      insertedItems.forEach(function(item) {
        visitItem(item, function(item) {
          if (isElement(item)) {
            self.insertElement_(item);
          } else if (isGroup(item)) {
            self.elementsAndGroups_.add(item);
          }
        }, isElementOrGroup);
      });
      insertedItems.forEach(function(item) {
        if (isWire(item) && isWireComplete(item)) {
          self.insertWire_(item);
        } else if (isGroup(item)) {
          visitItem(item, function(wire) {
            self.insertWire_(wire);
          }, isWire);
        }
      });
      // For changed wires, remove them and then re-insert them.
      changedItems.forEach(function(item) {
        if (isWire(item)) {
          self.removeWire_(item);
          self.insertWire_(item);
        }
      });

      changeModel.clear();
    }
  }

  function extend(model) {
    if (model.circuitModel)
      return model.circuitModel;

    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);
    dataModels.referencingModel.extend(model);
    dataModels.changeModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.circuit = model.root;

    instance.inputMap_ = new Map();   // element -> input wires[]
    instance.outputMap_ = new Map();  // element -> output wires[][]
    instance.elementsAndGroups_ = new Set();
    instance.wires_ = new Set();

    instance.getWireSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getWireDst = model.referencingModel.getReferenceFn('dstId');

    // Initialize elements and wires.
    visitItem(instance.circuit, function(element) {
      instance.insertElement_(element);
    }, isElement);
    visitItem(instance.circuit, function(wire) {
      instance.insertWire_(wire);
    }, isWire);

    model.circuitModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

const _index = Symbol('index'),
      _passThroughs = Symbol('passThroughs');

const editingModel = (function() {
  const proto = {
    getParent: function(item) {
      return this.model.hierarchicalModel.getParent(item);
    },

    reduceSelection: function () {
      let model = this.model;
      model.selectionModel.set(model.hierarchicalModel.reduceSelection());
    },

    getConnectedElements: function(items, upstream, downstream) {
      const self = this,
            model = this.model,
            graphInfo = model.circuitModel.getGraphInfo(),
            result = new Set();
      while (items.length > 0) {
        const item = items.pop();
        if (!isElement(item))
          continue;

        result.add(item);

        if (upstream) {
          graphInfo.iterators.forInputWires(item, function(wire) {
            const src = self.getWireSrc(wire);
            if (!result.has(src))
              items.push(src);
          });
        }
        if (downstream) {
          graphInfo.iterators.forOutputWires(item, function(wire) {
            const dst = self.getWireDst(wire);
            if (!result.has(dst))
              items.push(dst);
          });
        }
      }
      return result;
    },

    selectInteriorWires: function() {
      const model = this.model,
            selectionModel = model.selectionModel,
            graphInfo = model.circuitModel.getSubgraphInfo(selectionModel.contents());
      selectionModel.add(graphInfo.interiorWires);
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

    deleteItem: function(item) {
      const model = this.model,
            parent = this.getParent(item);
      if (parent) {
        const items = parent.items,
            index = items.indexOf(item);
        if (index >= 0) {
          model.observableModel.removeElement(parent, 'items', index);
          model.selectionModel.remove(item);
        }
      }
    },

    deleteItems: function(items) {
      const self = this;
      items.forEach(item => self.deleteItem(item));
    },

    doDelete: function() {
      this.reduceSelection();
      this.model.copyPasteModel.doDelete(this.deleteItems.bind(this));
    },

    copyItems: function(items, map) {
      const model = this.model,
            diagram = this.diagram,
            dataModel = model.dataModel,
            translatableModel = model.translatableModel,
            copies = this.model.copyPasteModel.cloneItems(items, map);
      items.forEach(function(item) {
        const copy = map.get(dataModel.getId(item));
        if (isElementOrGroup(copy)) {
          // De-palettize clone.
          copy.state = 'normal';
          // Clone coordinates should be in circuit-space. Get global position
          // from original item.
          const translation = translatableModel.getToParent(item, diagram);
          copy.x += translation.x;
          copy.y += translation.y;
        }
      });
      return copies;
    },

    doCopy: function() {
      const selectionModel = this.model.selectionModel;
      selectionModel.contents().forEach(function(item) {
        if (!isElementOrGroup(item))
          selectionModel.remove(item);
      });
      this.selectInteriorWires();
      this.reduceSelection();
      this.model.copyPasteModel.doCopy(this.copyItems.bind(this));
    },

    doCut: function() {
      this.doCopy();
      this.doDelete();
    },

    addItem: function(item, parent) {
      const model = this.model,
            translatableModel = model.translatableModel,
            oldParent = this.getParent(item);
      if (!parent)
        parent = this.diagram;
      if (oldParent === parent)
        return;
      if (isCircuit(parent)) {
        if (!Array.isArray(parent.items))
          model.observableModel.changeValue(parent, 'items', []);
      }
      if (oldParent !== parent) {
        if (isElementOrGroup(item)) {
          let translation = translatableModel.getToParent(item, parent);
          model.observableModel.changeValue(item, 'x', item.x + translation.x);
          model.observableModel.changeValue(item, 'y', item.y + translation.y);
        }

        if (oldParent)
          this.deleteItem(item);
        model.observableModel.insertElement(
          parent, 'items', parent.items.length, item);
      }
      return item;
    },

    addItems: function(items, parent) {
      const self = this;
      items.forEach(item => self.addItem(item, parent));
    },

    doPaste: function(dx, dy) {
      const copyPasteModel = this.model.copyPasteModel;
      copyPasteModel.getScrap().forEach(function(item) {
        // Offset pastes so the user can see them.
        if (isElementOrGroup(item)) {
          item.x += dx;
          item.y += dy;
        }
      });
      copyPasteModel.doPaste(this.copyItems.bind(this),
                             this.addItems.bind(this));
    },

    replaceElement: function(element, newElement) {
      const self = this, model = this.model,
            observableModel = model.observableModel,
            signatureModel = model.signatureModel,
            graphInfo = model.circuitModel.getGraphInfo(),
            master = getMaster(element),
            newId = model.dataModel.getId(newElement),
            newMaster = getMaster(newElement);
      function canRewire(index, pins, newPins) {
        if (index >= newPins.length)
          return false;
        const type = signatureModel.getSignature(pins[index].type),
              newType = signatureModel.getSignature(newPins[index].type);
        return type == '*' || type == newType;
      }
      graphInfo.iterators.forInputWires(element, function(wire, pin) {
        if (canRewire(wire.dstPin, master.inputs, newMaster.inputs)) {
          observableModel.changeValue(wire, 'dstId', newId);
        } else {
          self.deleteItem(wire);
        }
      });
      graphInfo.iterators.forOutputWires(element, function(wire, pin) {
        if (canRewire(wire.srcPin, master.outputs, newMaster.outputs)) {
          observableModel.changeValue(wire, 'srcId', newId);
        } else {
          self.deleteItem(wire);
        }
      });
      const parent = this.getParent(newElement),
            newParent = this.getParent(element);
      if (parent != newParent)
        self.addItem(newElement, newParent);
      observableModel.changeValue(newElement, 'x', element.x);
      observableModel.changeValue(newElement, 'y', element.y);
      self.deleteItem(element);
    },

    connectInput: function(element, pin, p) {
      const viewModel = this.model.viewModel,
            parent = this.getParent(element),
            dstPin = getMaster(element).inputs[pin],
            pinPoint = p || viewModel.pinToPoint(element, pin, true);

      const junction = {
        type: 'element',
        elementType: 'input',
        x: pinPoint.x - 32,
        y: pinPoint.y,
        master: inputElementType,
      };
      this.newItem(junction);
      this.addItem(junction, parent);  // same parent as element
      const wire = {
        type: 'wire',
        srcId: junction.id,
        srcPin: 0,
        dstId: element.id,
        dstPin: pin,
      };
      this.newItem(wire);
      this.addItem(wire, parent);  // same parent as element
      return { junction: junction, wire: wire };
    },

    connectOutput: function(element, pin, p) {
      const viewModel = this.model.viewModel,
            parent = this.getParent(element),
            srcPin = getMaster(element).outputs[pin],
            pinPoint = p || viewModel.pinToPoint(element, pin, false);

      const junction = {
        type: 'element',
        elementType: 'output',
        x: pinPoint.x + 32,
        y: pinPoint.y,
        master: outputElementType,
      };
      this.newItem(junction);
      this.addItem(junction, parent);  // same parent as element
      const wire = {
        type: 'wire',
        srcId: element.id,
        srcPin: pin,
        dstId: junction.id,
        dstPin: 0,
      };
      this.newItem(wire);
      this.addItem(wire, parent);  // same parent as element
      return { junction: junction, wire: wire };
    },

    completeGroup: function(elements) {
      const self = this,
            model = this.model,
            graphInfo = model.circuitModel.getSubgraphInfo(elements);

      // Add junctions for disconnected pins on elements.
      elements.forEach(function(element) {
        const inputs = graphInfo.inputMap.get(element),
              outputs = graphInfo.outputMap.get(element);
        inputs.forEach(function(wire, pin) {
          if (!wire)
            self.connectInput(element, pin);
        });
        outputs.forEach(function(wires, pin) {
          if (wires.length == 0)
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
      const master = getMaster(item);
      if (isInput(item) || isLiteral(item)) {
        return master.outputs[0].name;
      } else if (isOutput(item)) {
        return master.inputs[0].name;
      }
      return master.name;
    },

    setLabel: function (item, newText) {
      const signatureModel = this.model.signatureModel,
            label = newText ? '(' + newText + ')' : '',
            master = item.master;
      let newMaster;
      if (isInputPinLabeled(item)) {
        const j = signatureModel.splitType(master),
              prefix = master.substring(0, j),
              suffix = master.substring(j);
        newMaster = signatureModel.unlabelType(prefix) + label + suffix;
      } else if (isOutputPinLabeled(item)) {
        const prefix = master.substring(0, master.length - 1);
        newMaster = signatureModel.unlabelType(prefix) + label + ']';
      } else {
        newMaster = signatureModel.unlabelType(master) + label;
      }
      return newMaster;
    },

    changeType: function (item, newType) {
      const master = getMaster(item);
      let newMaster;
      if (isJunction(item)) {
        if (isInput(item)) {
          let label = master.outputs[0].name;
          label = label ? '(' + label + ')' : '';
          newMaster = '[,' + newType + label + ']';
        } else if (isOutput(item)) {
          let label = master.inputs[0].name;
          label = label ? '(' + label + ')' : '';
          newMaster = '[' + newType + label + ',]';
        }
      }
      return newMaster;
    },

    openElement: function(element) {
      const self = this, model = this.model,
            dataModel = model.dataModel,
            signatureModel = model.signatureModel,
            observableModel = model.observableModel,
            master = getMaster(element);

      const newElement = {
        type: 'element',
        elementType: 'abstract',
        x: element.x,
        y: element.y,
      };
      const id = dataModel.assignId(newElement),
            type = signatureModel.unlabelType(element.master),
            innerType = signatureModel.getSignature(type),
            newType = signatureModel.addInputToType(type, innerType);
      newElement.master = newType;
      dataModel.initialize(newElement);
      return newElement;
    },

    openElements: function(elements) {
      const self = this,
            selectionModel = this.model.selectionModel;

      // Open each non-input/output element.
      elements.forEach(function(element) {
        selectionModel.remove(element);
        if (isInput(element) || isOutput(element) ||
            isLiteral(element) || isGroup(element) || isWire(element))
          return;
        const newElement = self.openElement(element);
        self.replaceElement(element, newElement);
        selectionModel.add(newElement);
      });
    },

    closeElement: function(element, incomingWires, outgoingWireArrays) {
      const self = this, model = this.model,
            dataModel = model.dataModel,
            signatureModel = model.signatureModel,
            observableModel = model.observableModel,
            translatableModel = model.translatableModel,
            master = getMaster(element);

      const newElement = {
        type: 'element',
        elementType: 'closed',
        x: translatableModel.globalX(element),
        y: translatableModel.globalY(element),
      };

      const id = dataModel.assignId(newElement);
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
      // Add all output pins to outputs.
      type += ',';
      closedType += ',';
      pinIndex = 0;
      master.outputs.forEach(function(pin, i) {
        const outgoingWires = outgoingWireArrays[i];
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
      if (master.name) {
        closedType += '(' + master.name + ')';
      }
      type = signatureModel.addOutputToType(type, closedType);

      newElement.master = type;
      dataModel.initialize(newElement);
      return newElement;
    },

    closeElements: function(elements) {
      const self = this, model = this.model,
            selectionModel = model.selectionModel,
            graphInfo = model.circuitModel.getSubgraphInfo(elements);
      // Close each non-input/output element.
      graphInfo.elementsAndGroups.forEach(function(element) {
        if (isInput(element) || isOutput(element) ||
            isLiteral(element) || isGroup(element) || isWire(element))
          return;
        const incomingWires = graphInfo.inputMap.get(element),
              outgoingWireArrays = graphInfo.outputMap.get(element),
              newElement = self.closeElement(element, incomingWires, outgoingWireArrays),
              parent = self.getParent(element);

        selectionModel.remove(element);
        self.deleteItem(element);
        self.addItem(newElement, parent);
      });
    },

    setGroupMasterInfo: function(group, items) {
      const self = this, model = this.model,
            dataModel = model.dataModel,
            signatureModel = model.signatureModel,
            viewModel = model.viewModel,
            graphInfo = model.circuitModel.getSubgraphInfo(items),
            inputs = [], outputs = [];

      function makePin(item, type, y) {
        return {
          item: item,
          type: type,
          y: y,
        }
      }
      function getInputType(input) {
        const srcPin = getMaster(input).outputs[0],
              srcType = self.getPinType(srcPin),
              label = srcType.substring(1),
              wires = graphInfo.outputMap.get(input)[0];
        if (!wires.length)
          return srcType;
        return self.findDstType(wires[0]) + label;
      }

      function getOutputType(output) {
        const dstPin = getMaster(output).inputs[0],
              dstType = self.getPinType(dstPin),
              label = dstType.substring(1),
              wire = graphInfo.inputMap.get(output)[0];
        if (!wire)
          return dstType;
        return self.findSrcType(wire) + label;
      }
      function addItems(items) {
        let inputCount = 0, outputCount = 0;
        items.forEach(function(item, index) {
          if (!isElement(item))
            return;
          if (isInput(item)) {
            const y = viewModel.pinToPoint(item, 0, false).y;
            inputs.push(makePin(item, getInputType(item), y));
          } else if (isOutput(item)) {
            const y = viewModel.pinToPoint(item, 0, true).y;
            outputs.push(makePin(item, getOutputType(item), y));
          } else if (isGroup(item)) {
            addItems(item.items);
          }
        });
      }
      addItems(items);

      // Sort pins so we encounter them in increasing y-order. This lets us lay
      // out the group in an intuitively consistent way.
      function comparePins(pin1, pin2) {
        return pin1.y - pin2.y;
      }
      inputs.sort(comparePins);
      outputs.sort(comparePins);

      let master = '[';
      inputs.forEach(function(input, i) {
        master += input.type;
        input.item[_index] = i;
      });
      master += ',';
      outputs.forEach(function(output, i) {
        master += output.type;
        output.item[_index] = i;
      });
      master += ']';

      // Compute group pass throughs.
      const passThroughs = new Set();
      graphInfo.interiorWires.forEach(function(wire) {
        let src = self.getWireSrc(wire),
            srcPin = getMaster(src).outputs[wire.srcPin];
        // Trace wires, starting at input junctions.
        if (!isInput(src) || srcPin.type != '*')
          return;
        let srcPinIndex = src[_index],
            activeWires = [wire];
        while (activeWires.length) {
          wire = activeWires.pop();
          let dst = self.getWireDst(wire),
              dstPin = getMaster(dst).inputs[wire.dstPin];
          if (isOutput(dst) && dstPin.type == '*') {
            passThroughs.add([srcPinIndex, dst[_index]]);
          } else if (dst[_passThroughs]) {
            dst[_passThroughs].forEach(function(passThrough) {
              if (passThrough[0] == wire.dstPin) {
                let outgoingWires = graphInfo.outputMap.get(dst)[passThrough[1]];
                outgoingWires.forEach(wire => activeWires.push(wire));
              }
            });
          }
        }
      });
      if (passThroughs.size) {
        console.log(passThroughs);
        group[_passThroughs] = Array.from(passThroughs);
      }

      return master;
    },

    build: function(items) {
      const self = this, model = this.model,
            dataModel = model.dataModel,
            signatureModel = model.signatureModel,
            observableModel = model.observableModel,
            viewModel = model.viewModel,
            graphInfo = model.circuitModel.getSubgraphInfo(items),
            groupItems = items.concat(Array.from(graphInfo.interiorWires)),
            extents = viewModel.getItemRects(graphInfo.elementsAndGroups),
            x = extents.x - spacing,
            y = extents.y - spacing;

      // Create the new group element.
      const group = {
        type: 'element',
        x: x,
        y: y,
      };

      const groupId = dataModel.assignId(group),
            master = self.setGroupMasterInfo(group, items);

      group.items = groupItems;
      groupItems.forEach(function(item) {
        let r = viewModel.getItemRect(item);
        if (r) {
          observableModel.changeValue(item, 'x', r.x - x);
          observableModel.changeValue(item, 'y', r.y - y);
        }
        self.deleteItem(item);
      });

      group.type = 'group';
      group.master = master;
      group.x = x;
      group.y = y;

      return group;
    },

    findSrcType: function(wire) {
      const self = this,
            model = this.model,
            graphInfo = model.circuitModel.getGraphInfo(),
            activeWires = [wire];
      // TODO get rid of array and while, there can be only one pass through.
      while (activeWires.length) {
        wire = activeWires.pop();
        let src = this.getWireSrc(wire),
            srcPin = getMaster(src).outputs[wire.srcPin],
            dst = this.getWireDst(wire),
            dstPin = getMaster(dst).inputs[wire.dstPin];
        if (srcPin.type != '*')
          return srcPin.type;
        if (src[_passThroughs]) {
          src[_passThroughs].forEach(function(passThrough) {
            console.log(src, graphInfo);
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

    findDstType: function(wire) {
      const self = this,
            model = this.model,
            graphInfo = model.circuitModel.getGraphInfo(),
            activeWires = [wire];
      while (activeWires.length) {
        wire = activeWires.pop();
        let src = this.getWireSrc(wire),
            dst = this.getWireDst(wire),
            srcPin = getMaster(src).outputs[wire.srcPin],
            dstPin = getMaster(dst).inputs[wire.dstPin];
        if (dstPin.type != '*')
          return dstPin.type;
        if (dst[_passThroughs]) {
          dst[_passThroughs].forEach(function(passThrough) {
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

    doClose: function() {
      let transactionModel = this.model.transactionModel;
      transactionModel.beginTransaction('close');
      this.closeElements(this.model.selectionModel.contents());
      transactionModel.endTransaction();
    },

    doAbstract: function() {
      let transactionModel = this.model.transactionModel;
      this.reduceSelection();
      transactionModel.beginTransaction('abstract');
      this.openElements(this.model.selectionModel.contents());
      transactionModel.endTransaction();
    },

    doBuild: function() {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('build');
      let items = model.selectionModel.contents().filter(isElementOrGroup),
          parent = items.length == 1 ?
              null : model.hierarchicalModel.getLowestCommonAncestor(...items),
          group = this.build(items);
      model.dataModel.initialize(group);
      this.addItem(group, parent);
      model.selectionModel.set(group);
      model.transactionModel.endTransaction();
    },

    doGroup: function() {
      // let model = this.model;
      // this.reduceSelection();
      // let groups = model.selectionModel.contents().filter(isGroup);
      // model.transactionModel.beginTransaction('group');
      // groups.forEach(function(group) {
      //   model.observableModel.changeValue(group, 'frozen', true);
      // });
      // model.transactionModel.endTransaction();
    },

    doToggleMaster: function() {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('toggle master state');
      model.selectionModel.contents().forEach(function(element) {
        if (!isElement(element))
          return;
        model.observableModel.changeValue(element, 'state',
          (element.state == 'palette') ? 'normal' : 'palette');
      })
      model.transactionModel.endTransaction();
    },

    doSelectConnectedElements: function(upstream) {
      let selectionModel = this.model.selectionModel,
          selection = selectionModel.contents(),
          newSelection = this.getConnectedElements(selection, upstream, true);
      selectionModel.set(newSelection);
    },

    makeConsistent: function () {
      const self = this, model = this.model,
            diagram = this.diagram,
            dataModel = model.dataModel,
            hierarchicalModel = model.hierarchicalModel,
            signatureModel = model.signatureModel,
            selectionModel = model.selectionModel,
            observableModel = model.observableModel,
            graphInfo = model.circuitModel.getGraphInfo(),
            elementsAndGroups = graphInfo.elementsAndGroups,
            wires = graphInfo.wires;
      // Eliminate dangling wires.
      wires.forEach(function(wire) {
        const src = self.getWireSrc(wire),
              dst = self.getWireDst(wire);
        if (!src ||
            !dst ||
            !elementsAndGroups.has(src) ||
            !elementsAndGroups.has(dst) ||
            wire.srcPin >= getMaster(src).outputs.length ||
            wire.dstPin >= getMaster(dst).inputs.length) {
          self.deleteItem(wire);
          return;
        }
        // Make sure wires belong to lowest common container (circuit or group).
        const lca = hierarchicalModel.getLowestCommonAncestor(src, dst);
        if (self.getParent(wire) !== lca) {
          self.deleteItem(wire);
          self.addItem(wire, lca);
        }
      });

      // Update group types. Reverse visit so nested groups work correctly.
      reverseVisitItems(diagram.items, function(group) {
        if (group.items.length == 0) {
          self.deleteItem(group);
          return;
        }
        const newSig = self.setGroupMasterInfo(group, group.items),
              oldSig = signatureModel.unlabelType(group.master);
        if (oldSig !== newSig) {
          let label = group.master.substring(oldSig.length);
          observableModel.changeValue(group, 'master', newSig + label);
        }
      }, isGroup);

      elementsAndGroups.forEach(function(element) {
        if (isGroup(element)) {
          // Delete empty groups.
          if (element.items.length == 0)
            self.deleteItem(element);
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
    dataModels.transactionModel.extend(model);
    dataModels.transactionHistory.extend(model);
    dataModels.instancingModel.extend(model);
    dataModels.copyPasteModel.extend(model);

    circuitModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.diagram = model.root;

    instance.getWireSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getWireDst = model.referencingModel.getReferenceFn('dstId');
    instance.getGroup = model.referencingModel.getReferenceFn('groupId');

    function makeConsistent(transaction) {
      instance.makeConsistent();
    }
    const transactionModel = model.transactionModel;
    transactionModel.addHandler('transactionEnding', makeConsistent);

    model.editingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

const _x = Symbol('x'),
      _y = Symbol('y'),
      _baseline = Symbol('baseline'),
      _width = Symbol('width'),
      _height = Symbol('height'),
      _p1 = Symbol('p1'),
      _p2 = Symbol('p2'),
      _bezier = Symbol('bezier');

const spacing = 6;
const shrink = 0.7, inv_shrink = 1 / shrink;
const minMasterWidth = 8;
const minMasterHeight = 8;

const knobbyRadius = 4;
const padding = 8;

const viewModel = (function() {
  const proto = {
    initialize: function(ctx, theme) {
      this.ctx = ctx ||
        {
          measureText: () => { return { width: 10, height: 10 }},
        };
      this.theme = theme || diagrams.theme.create();
    },

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
          master = getMaster(item),
          pin, nx;
      if (isInput) {
        pin = master.inputs[index];
        nx = -1;
      } else {
        pin = master.outputs[index];
        nx = 1;
        x += w;
      }
      y += pin[_y] + pin[_height] / 2;

      return {
        x: x,
        y: y,
        nx: nx,
        ny: 0,
      }
    },

    updateLayout: function() {
      const self = this,
            graphInfo = this.model.circuitModel.getGraphInfo();
      this.changedElements_.forEach(function(element) {
        function addWire(wire) {
          if (wire)
            self.changedWires_.add(wire);
        }
        graphInfo.iterators.forInputWires(element, addWire);
        graphInfo.iterators.forOutputWires(element, addWire);
      });
      this.changedElements_.clear();

      this.changedWires_.forEach(wire => self.layoutWire_(wire));
      this.changedWires_.clear();
    },

    updateGroupLayout: function() {
      const self = this;
      this.changedTopLevelGroups_.forEach(group => self.layoutGroup_(group));
      this.changedTopLevelGroups_.clear();
    },

    // Make sure a group is big enough to enclose its contents.
    layoutGroup_: function(group) {
      const self = this;
      function layout(group) {
        const extents = self.getItemRects(group.items),
              translatableModel = self.model.translatableModel,
              groupX = translatableModel.globalX(group),
              groupY = translatableModel.globalY(group),
              margin = 2 * spacing,
              master = getMaster(group);
        let width = extents.x + extents.w - groupX + margin,
            height = extents.y + extents.h - groupY + margin;
        if (master) {
          width += master[_width];
          height = Math.max(height, master[_height] + margin);
        }
        self.setItemBounds(group, width, height);
      }
      // visit in reverse order to correctly include sub-group bounds.
      reverseVisitItem(group, function(group) {
        layout(group);
      }, isGroup);
    },

    // Compute sizes for an element master.
    layoutMaster_: function(master) {
      const self = this,
            model = this.model,
            ctx = this.ctx, theme = this.theme,
            textSize = theme.fontSize, name = master.name,
            inputs = master.inputs, outputs = master.outputs;
      let height = 0, width = 0;
      if (name) {
        width = 2 * spacing + ctx.measureText(name).width;
        height += textSize + spacing / 2;
      } else {
        height += spacing / 2;
      }

      function layoutPins(pins) {
        let y = height, w = 0;
        for (let i = 0; i < pins.length; i++) {
          let pin = pins[i];
          self.layoutPin_(pin);
          pin[_y] = y + spacing / 2;
          let name = pin.name, pw = pin[_width], ph = pin[_height] + spacing / 2;
          if (name) {
            pin[_baseline] = y + textSize;
            if (textSize > ph) {
              pin[_y] += (textSize - ph) / 2;
              ph = textSize;
            } else {
              pin[_baseline] += (ph - textSize) / 2;
            }
            pw += 2 * spacing + ctx.measureText(name).width;
          }
          y += ph;
          w = Math.max(w, pw);
        }
        return [y, w];
      }
      const [yIn, wIn] = layoutPins(inputs);
      const [yOut, wOut] = layoutPins(outputs);

      this.setItemBounds(
        master,
        Math.round(Math.max(width, wIn + 2 * spacing + wOut, minMasterWidth)),
        Math.round(Math.max(yIn, yOut, minMasterHeight) + spacing / 2));
      return master;
    },

    layoutPin_: function(pin) {
      if (pin.type == 'v' || pin.type == '*') {
        pin[_width] = pin[_height] = 2 * knobbyRadius;
      } else {
        let master = getMaster(pin);
        this.layoutMaster_(master);
        pin[_width] = master[_width] * shrink;
        pin[_height] = master[_height] * shrink;
      }
    },

    layoutWire_: function(wire) {
      let referencingModel = this.model.referencingModel,
          src = this.getWireSrc(wire),
          dst = this.getWireDst(wire),
          p1 = wire[_p1],
          p2 = wire[_p2];
      // Since we intercept change events and not transactions, wires may be in
      // an inconsistent state, so check before creating the path.
      if (src && wire.srcPin !== undefined) {
        p1 = this.pinToPoint(src, wire.srcPin, false);
      }
      if (dst && wire.dstPin !== undefined) {
        p2 = this.pinToPoint(dst, wire.dstPin, true);
      }
      if (p1 && p2) {
        wire[_bezier] = diagrams.getEdgeBezier(p1, p2);
      }
    },

    addTopLevelGroup_: function(item) {
      let hierarchicalModel = this.model.hierarchicalModel,
          ancestor = item;
      do {
        item = ancestor;
        ancestor = hierarchicalModel.getParent(ancestor);
      } while (ancestor && !isCircuit(ancestor));

      if (isGroup(item)) {
        this.changedTopLevelGroups_.add(item);
      }
    },

    update_: function (item) {
      const self = this;
      if (isWire(item)) {
        this.changedWires_.add(item);
      } else if (isElement(item)) {
        this.changedElements_.add(item);
        this.addTopLevelGroup_(item);
      } else if (isGroup(item)) {
        visitItems(item.items, child => self.update_(child));
      }
    },

    onChanged_: function (change) {
      const item = change.item,
            attr = change.attr;
      switch (change.type) {
        case 'change':
        case 'remove': {
          this.update_(item);
          break;
        }
        case 'insert': {
          const newValue = item[attr][change.index];
          this.update_(item);
          this.update_(newValue);
          if (isGroup(newValue))
            this.layoutGroup_(newValue);
          break;
        }
      }
    },
  }

  function extend(model) {
    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);
    dataModels.referencingModel.extend(model);
    dataModels.hierarchicalModel.extend(model);
    dataModels.translatableModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;

    model.observableModel.addHandler('changed', function (change) {
      instance.onChanged_(change);
    });

    model.signatureModel.addHandler('masterInserted', function(type, master) {
      instance.layoutMaster_(master);
    });

    instance.wiredElements_ = new Map();
    instance.changedWires_ = new Set();
    instance.changedElements_ = new Set();
    instance.changedTopLevelGroups_ = new Set();

    const dataModel = model.dataModel;
    // Initialize items and layout groups.
    // TODO fix this...
    dataModel.getRoot().items.forEach(function(item) {
      instance.update_(item);
    });
    dataModel.getRoot().items.forEach(function(item) {
      if (isGroup(item))
        instance.layoutGroup_(item);
    });

    instance.getWireSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getWireDst = model.referencingModel.getReferenceFn('dstId');

    model.viewModel = instance;
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

function Renderer(ctx, theme) {
  this.ctx = ctx;
  this.theme = theme || diagrams.theme.create();
}

Renderer.prototype.begin = function(model) {
  let viewModel = model.viewModel;
  this.model = model;
  this.viewModel = viewModel;

  ctx.save();
  ctx.font = this.theme.font;

  viewModel.updateLayout();
}

Renderer.prototype.end = function() {
  this.ctx.restore();
  this.model = null;
}

Renderer.prototype.drawMaster = function(master, x, y) {
  let self = this, ctx = this.ctx, theme = this.theme,
      textSize = theme.fontSize, name = master.name,
      w = master[_width], h = master[_height],
      right = x + w;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = theme.textColor;
  ctx.textBaseline = 'bottom';
  if (name) {
    ctx.textAlign = 'center';
    ctx.fillText(name, x + w / 2, y + textSize + spacing / 2);
  }
  master.inputs.forEach(function(pin, i) {
    let name = pin.name;
    self.drawPin(pin, x, y + pin[_y]);
    if (name) {
      ctx.textAlign = 'left';
      ctx.fillText(name, x + pin[_width] + spacing, y + pin[_baseline]);
    }
  });
  master.outputs.forEach(function(pin) {
    let name = pin.name,
        pinLeft = right - pin[_width];
    self.drawPin(pin, pinLeft, y + pin[_y]);
    if (name) {
      ctx.textAlign = 'right';
      ctx.fillText(name, pinLeft - spacing, y + pin[_baseline]);
    }
  });
}

Renderer.prototype.drawPin = function(pin, x, y) {
  ctx.strokeStyle = theme.strokeColor;
  if (pin.type == 'v' || pin.type == '*') {
    let r = knobbyRadius;
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
      ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
    this.drawMaster(master, x, y);
    this.ctx.scale(inv_shrink, inv_shrink);
  }
}

function makePath(elementType, x, y, w, h, ctx) {
  switch (elementType) {
    case 'input':
      diagrams.inFlagPath(x, y, w, h, spacing, ctx);
      break;
    case 'output':
      diagrams.outFlagPath(x, y, w, h, spacing, ctx);
      break;
    default:
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      break;
  }
}

Renderer.prototype.drawElement = function(element, mode) {
  let ctx = this.ctx, theme = this.theme,
      rect = this.viewModel.getItemRect(element),
      x = rect.x, y = rect.y, w = rect.w, h = rect.h,
      right = x + w, bottom = y + h;

  makePath(element.elementType, x, y, w, h, ctx);

  switch (mode) {
    case normalMode:
      ctx.fillStyle = element.state == 'palette' ? theme.altBgColor : theme.bgColor;
      ctx.fill();
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
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

Renderer.prototype.drawElementPin = function(element, input, output, mode) {
  let ctx = this.ctx,
      rect = this.viewModel.getItemRect(element),
      x = rect.x, y = rect.y, w = rect.w, h = rect.h,
      right = x + w,
      master = getMaster(element),
      pin;

  if (input !== undefined) {
    pin = master.inputs[input];
  } else if (output != undefined) {
    pin = master.outputs[output];
    x = right - pin[_width];
  }
  ctx.beginPath();
  ctx.rect(x, y + pin[_y], pin[_width], pin[_height]);

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

Renderer.prototype.getGroupMasterBounds = function(master, groupRight, groupBottom) {
  let width = master[_width], height = master[_height],
      x = groupRight - width - spacing, y = groupBottom - height - spacing;
  return { x: x, y: y, w: width, h: height };
}

Renderer.prototype.drawGroup = function(group, mode) {
  let ctx = this.ctx, theme = this.theme,
      rect = this.viewModel.getItemRect(group),
      x = rect.x, y = rect.y, w = rect.w , h = rect.h,
      right = x + w, bottom = y + h;
  diagrams.roundRectPath(x, y, w, h, spacing, ctx);
  switch (mode) {
    case normalMode:
      ctx.fillStyle = theme.bgColor;
      ctx.fill();
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([6,3]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (group.master) {
        let master = getMaster(group),
            masterRect = this.getGroupMasterBounds(master, right, bottom);
        ctx.beginPath();
        ctx.rect(masterRect.x, masterRect.y, masterRect.w, masterRect.h);
        ctx.fillStyle = theme.altBgColor;
        ctx.fill();
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        this.drawMaster(master, masterRect.x, masterRect.y);
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
      if (diagrams.hitTestRect(x, y + input[_y],
                               input[_width], input[_height], p, 0)) {
        hitInfo.input = i;
      }
    });
    outputs.forEach(function(output, i) {
      if (diagrams.hitTestRect(x + width - output[_width], y + output[_y],
                               output[_width], output[_height], p, 0)) {
        hitInfo.output = i;
      }
    });
  }
  return hitInfo;
}

Renderer.prototype.hitTestGroup = function(group, p, tol, mode) {
  let rect = this.viewModel.getItemRect(group),
      x = rect.x, y = rect.y, w = rect.w , h = rect.h,
      hitInfo = diagrams.hitTestRect(x, y, w, h, p, tol);
  if (hitInfo) {
    let master = getMaster(group);
    if (master) {
      const newElementRect = this.getGroupMasterBounds(master, x + w, y + h);
      if (diagrams.hitTestRect(newElementRect.x, newElementRect.y,
                               newElementRect.w, newElementRect.h, p, tol)) {
        hitInfo.newElement = {
          type: 'element',
          x: newElementRect.x,
          y: newElementRect.y,
          master: group.master,
          [_master]: master,
          groupId: this.model.dataModel.getId(group),
          state: 'palette',
        };
      }
    }
  }
  return hitInfo;
}

Renderer.prototype.drawWire = function(wire, mode) {
  let ctx = this.ctx;
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
  const self = this;
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
  signatureModel.extend(model);
  viewModel.extend(model);

  function update() {
    self.model.viewModel.updateGroupLayout();
  }
  const transactionModel = model.transactionModel;
  transactionModel.addHandler('transactionEnded', update);
  transactionModel.addHandler('didUndo', update);
  transactionModel.addHandler('didRedo', update);
}

Editor.prototype.initialize = function(canvasController) {
  const canvas = canvasController.canvas,
        ctx = canvasController.ctx,
        theme = canvasController.theme;
  this.canvasController = canvasController;
  this.canvas = canvas;
  this.ctx = ctx;
  this.renderer = new Renderer(ctx, theme);

  let model = this.model,
      viewModel = model.viewModel,
      renderer = this.renderer;

  viewModel.initialize(ctx, theme);

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

Editor.prototype.draw = function() {
  let renderer = this.renderer, diagram = this.diagram,
      model = this.model, ctx = this.ctx,
      canvasController = this.canvasController;
  renderer.begin(model);
  canvasController.applyTransform();

  // Draw registration frame for generating screen shots.
  ctx.strokeStyle = renderer.theme.dimColor;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(300, 10, 700, 300);

  visitItems(diagram.items,
    function(item) {
      renderer.draw(item, normalMode);
    }, isElementOrGroup);
  visitItems(diagram.items,
    function(wire) {
      renderer.draw(wire, normalMode);
    }, isWire);

  model.selectionModel.forEach(function(item) {
    renderer.draw(item, highlightMode);
  });

  if (this.hotTrackInfo) {
    let hitInfo = this.hotTrackInfo,
        item = hitInfo.item,
        input = hitInfo.input,
        output = hitInfo.output;
    if (input !== undefined || output !== undefined) {
      renderer.drawElementPin(item, input, output, hotTrackMode);
    } else {
      renderer.draw(item, hotTrackMode);
    }
  }

  let hoverHitInfo = this.hoverHitInfo;
  if (hoverHitInfo) {
    renderer.drawHoverInfo(hoverHitInfo.item, hoverHitInfo.p);
  }
  renderer.end();
}

Editor.prototype.hitTest = function(p) {
  let renderer = this.renderer,
      model = this.model,
      canvasController = this.canvasController,
      cp = canvasController.viewToCanvas(p),
      scale = canvasController.scale,
      zoom = Math.max(scale.x, scale.y),
      tol = this.hitTolerance,
      cTol = tol / zoom,
      diagram = this.diagram,
      hitList = [];
  function pushHit(info) {
    if (info)
      hitList.push(info);
  }
  renderer.begin(model)
  model.selectionModel.forEach(function(item) {
    item => pushHit(renderer.hitTest(item, cp, cTol, normalMode));
  });
  reverseVisitItems(diagram.items,
    item => pushHit(renderer.hitTest(item, cp, cTol, normalMode)), isWire);
  reverseVisitItems(diagram.items,
    item => pushHit(renderer.hitTest(item, cp, cTol, normalMode)), isElementOrGroup);
  renderer.end();
  return hitList;
}

Editor.prototype.getFirstHit = function(hitList, filterFn) {
  if (hitList) {
    let model = this.model,
    length = hitList.length;
    for (let i = 0; i < length; i++) {
      let hitInfo = hitList[i];
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
  let item = hitInfo.item;
  return isContainer(item) &&
         !model.hierarchicalModel.isItemInSelection(item);
}

function isContainerTargetOrElementSlot(hitInfo, model) {
  if (isContainerTarget(hitInfo, model))
    return true;
  // TODO drop element on function inputs.
  let item = hitInfo.item;
  return isElement(item) && !isPaletted(item) &&
         !model.hierarchicalModel.isItemInSelection(item);
}

Editor.prototype.setEditableText = function() {
  let self = this,
      model = this.model,
      canvasController = this.canvasController,
      textInputController = this.textInputController,
      item = model.selectionModel.lastSelected(),
      editingModel = model.editingModel;
  if (item && isElementOrGroup(item) && item.master) {
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
    if (mouseHitInfo.newElement) {
      mouseHitInfo.newElementOrigin = item;
      item = mouseHitInfo.item = mouseHitInfo.newElement;
    }
    if (cmdKeyDown || isPaletted(item)) {
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

const connectWireSrc = 1,
      connectWireDst = 2,
      moveSelection = 3,
      moveCopySelection = 4;

Editor.prototype.onBeginDrag = function(p0) {
  let mouseHitInfo = this.mouseHitInfo;
  if (!mouseHitInfo)
    return false;
  let self = this,
      canvasController = this.canvasController,
      dragItem = mouseHitInfo.item,
      model = this.model,
      selectionModel = model.selectionModel,
      editingModel = model.editingModel,
      newWire, drag;
  if (mouseHitInfo.input !== undefined) {
    // Wire from input pin.
    let elementId = model.dataModel.getId(dragItem),
        cp0 = canvasController.viewToCanvas(p0);
    // Start the new wire as connecting the dst element to nothing.
    newWire = {
      type: 'wire',
      dstId: elementId,
      dstPin: mouseHitInfo.input,
      [_p1]: cp0,
    };
    drag = {
      type: connectWireSrc,
      name: 'Add new wire',
      isNewWire: true,
    };
  } else if (mouseHitInfo.output !== undefined) {
    // Wire from output pin.
    const elementId = model.dataModel.getId(dragItem),
          cp0 = canvasController.viewToCanvas(p0);
    // Start the new wire as connecting the src element to nothing.
    newWire = {
      type: 'wire',
      srcId: elementId,
      srcPin: mouseHitInfo.output,
      [_p2]: cp0,
    };
    drag = {
      type: connectWireDst,
      name: 'Add new wire',
      isNewWire: true,
    };
  } else {
    switch (dragItem.type) {
      case 'element':
      case 'group':
        if (mouseHitInfo.moveCopy) {
          drag = { type: moveCopySelection, name: 'Move copy of selection' };
        } else {
          drag = { type: moveSelection, name: 'Move selection' };
        }
        break;
      case 'wire':
        if (mouseHitInfo.p1)
          drag = { type: connectWireSrc, name: 'Edit wire' };
        else if (mouseHitInfo.p2)
          drag = { type: connectWireDst, name: 'Edit wire' };
        break;
    }
  }
  this.drag = drag;
  if (drag) {
    if (drag.type === moveSelection || drag.type == moveCopySelection) {
      editingModel.selectInteriorWires();
      editingModel.reduceSelection();
      let items = selectionModel.contents();
      drag.isSingleElement = items.length == 1 && isElement(items[0]);
    }
    model.transactionModel.beginTransaction(drag.name);
    if (newWire) {
      drag.item = newWire;
      model.dataModel.initialize(newWire);
      editingModel.addItem(newWire);
      selectionModel.set(newWire);
    } else {
      drag.item = dragItem;
      if (mouseHitInfo.moveCopy) {
        let model = this.model,
            renderer = this.renderer,
            map = new Map(),
            copies = editingModel.copyItems(selectionModel.contents(), map);
        if (drag.isSingleElement && mouseHitInfo.newElementOrigin) {
          copies[0].groupId = model.dataModel.getId(mouseHitInfo.newElementOrigin);
        }
        editingModel.addItems(copies);
        selectionModel.set(copies);
      }
    }
  }
}

Editor.prototype.onDrag = function(p0, p) {
  let drag = this.drag;
  if (!drag)
    return;
  let dragItem = drag.item,
      model = this.model,
      dataModel = model.dataModel,
      observableModel = model.observableModel,
      transactionModel = model.transactionModel,
      selectionModel = model.selectionModel,
      canvasController = this.canvasController,
      cp0 = canvasController.viewToCanvas(p0),
      cp = canvasController.viewToCanvas(p),
      mouseHitInfo = this.mouseHitInfo,
      snapshot = transactionModel.getSnapshot(dragItem),
      hitList = this.hitTest(p), hitInfo;
  switch (drag.type) {
    case moveSelection:
    case moveCopySelection:
      if (isElementOrGroup(dragItem)) {
        let filter = drag.isSingleElement ?
                     isContainerTargetOrElementSlot : isContainerTarget;
        hitInfo = this.getFirstHit(hitList, filter);
        selectionModel.forEach(function(item) {
          if (isElementOrGroup(item)) {
            let snapshot = transactionModel.getSnapshot(item);
            if (snapshot) {
              let dx = cp.x - cp0.x, dy = cp.y - cp0.y;
              observableModel.changeValue(item, 'x', snapshot.x + dx);
              observableModel.changeValue(item, 'y', snapshot.y + dy);
            }
          }
        });
      }
      break;
    case connectWireSrc:
      hitInfo = this.getFirstHit(hitList, isOutputPin);
      let srcId = hitInfo ? dataModel.getId(hitInfo.item) : 0;  // 0 is invalid id.
      observableModel.changeValue(dragItem, 'srcId', srcId);
      if (srcId) {
        observableModel.changeValue(dragItem, 'srcPin', hitInfo.output);
      } else {
        // TODO remove dummy property change.
        observableModel.changeValue(dragItem, 'p1', cp);
        dragItem[_p1] = cp;
      }
      break;
    case connectWireDst:
      hitInfo = this.getFirstHit(hitList, isInputPin);
      let dstId = hitInfo ? dataModel.getId(hitInfo.item) : 0;  // 0 is invalid id.
      observableModel.changeValue(dragItem, 'dstId', dstId);
      if (dstId) {
        observableModel.changeValue(dragItem, 'dstPin', hitInfo.input);
      } else {
        // TODO remove dummy property change.
        observableModel.changeValue(dragItem, 'p2', cp);
        dragItem[_p2] = cp;
      }
      break;
  }

  this.hotTrackInfo = (hitInfo && hitInfo.item !== this.diagram) ? hitInfo : null;
}

Editor.prototype.onEndDrag = function(p) {
  let drag = this.drag;
  if (!drag)
    return;
  let dragItem = drag.item,
      model = this.model,
      diagram = this.diagram,
      // dataModel = model.dataModel,
      selectionModel = model.selectionModel,
      transactionModel = model.transactionModel,
      editingModel = model.editingModel;

  switch (drag.type) {
    case connectWireSrc:
    case connectWireDst:
      if (drag.isNewWire) {
        if (!dragItem.srcId) {
          // Add the appropriate source junction.
          editingModel.connectInput(editingModel.getWireDst(dragItem), dragItem.dstPin, p);
        } else if (!dragItem.dstId) {
          const src = editingModel.getWireSrc(dragItem),
                srcMaster = getMaster(src),
                pinIndex = dragItem.srcPin,
                pin = srcMaster.outputs[pinIndex];
          // Add the appropriate destination junction, or for function outputs,
          // add a new abstract function to connect.
          if (isFunctionType(pin.type)) {
            let element = {
              type: 'element',
              master: pin.type,
              x: p.x,
              y: p.y,
            };
            editingModel.newItem(element);
            editingModel.addItem(element, diagram);
            const newElement = editingModel.openElement(element);
            editingModel.replaceElement(element, newElement);

            let wire = {
              type: 'wire',
              srcId: src.id,
              srcPin: pinIndex,
              dstId: newElement.id,
              dstPin: getMaster(newElement).inputs.length - 1,
            };
            editingModel.newItem(wire);
            editingModel.addItem(wire, diagram);
          } else {
            editingModel.connectOutput(editingModel.getWireSrc(dragItem), dragItem.srcPin, p);
          }
        }
      }
      transactionModel.endTransaction();
      break;
    case moveSelection:
    case moveCopySelection:
      // Find element beneath items.
      let hitList = this.hitTest(p),
          filter = drag.isSingleElement ?
                   isContainerTargetOrElementSlot : isContainerTarget,
          hitInfo = this.getFirstHit(hitList, filter),
          parent = hitInfo ? hitInfo.item : diagram;
      let selection = selectionModel.contents();
      if (drag.isSingleElement && parent && !isContainer(parent)) {
        // Replace parent item.
        editingModel.replaceElement(parent, selection[0]);
      } else {
        // Reparent existing items.
        selection.forEach(function(item) {
          editingModel.addItem(item, parent);
        });
      }
      transactionModel.endTransaction();
      break;
  }

  this.setEditableText();

  this.drag = null;
  this.mouseHitInfo = null;
  this.hotTrackInfo = null;
  this.mouseHitInfo = null;

  this.canvasController.draw();
}

Editor.prototype.onBeginHover = function(p) {
  let model = this.model,
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
  let model = this.model,
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
        if (model.copyPasteModel.getScrap()) {
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
        editingModel.doClose();
        return true;
      case 76:  // 'l'
        editingModel.doAbstract();
        return true;
      case 66:  // 'b'
        editingModel.doBuild();
        return true;
      case 71:  // 'g'
        editingModel.doGroup();
        return true;
      case 83:  // 's'
        let text = JSON.stringify(
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
  circuitModel: circuitModel,
  editingModel: editingModel,
  signatureModel: signatureModel,
  viewModel: viewModel,

  normalMode: normalMode,
  highlightMode: highlightMode,
  hotTrackMode: hotTrackMode,

  Renderer: Renderer,

  Editor: Editor,
};
})();


const circuit_data =
{
  "type": "circuit",
  "id": 1,
  "x": 0,
  "y": 0,
  "width": 853,
  "height": 430,
  "name": "Example",
  "items": [
  ]
}

