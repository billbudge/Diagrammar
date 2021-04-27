// Circuits module.

const circuits = (function() {
'use strict';

function isCircuit(item) {
  return item.kind === 'circuit';
}

function isContainer(item) {
  return item.kind === 'circuit' || item.kind === 'group';
}

function isElement(item) {
  return item.kind === 'element';
}

function isGroup(item) {
  return item.kind === 'group';
}

function isElementOrGroup(item) {
  return isElement(item) || isGroup(item);
}

function isGroupInstance(item) {
  return isElement(item) && item[_definitionId];
}

function isWire(item) {
  return item.kind === 'wire';
}

function isLiteral(item) {
  return item.elementKind === 'literal';
}

function isJunction(item) {
  return item.elementKind === 'input' || item.elementKind === 'output';
}

function isClosed(item) {
  return item.elementKind === 'closed';
}

function isAbstract(item) {
  return item.elementKind === 'abstract';
}

function isInput(item) {
  return item.elementKind === 'input';
}

function isOutput(item) {
  return item.elementKind === 'output';
}

function isInputPinLabeled(item) {
  return isOutput(item) || isAbstract(item);
}

function isOutputPinLabeled(item) {
  return isInput(item) || isLiteral(item) || isClosed(item);
}

function isPaletted(item) {
  return item.state === 'palette';
}

function isFunctionType(type) {
  return type[0] === '[';
}

// Visits in pre-order.
function visitItem(item, fn, filter) {
  if (!filter || filter(item)) {
    fn(item);
  }
  if (isContainer(item) && item.items) {
    visitItems(item.items, fn, filter);
  }
}

function visitItems(items, fn, filter) {
  items.forEach(item => visitItem(item, fn, filter));
}

// Visits in post-order.
function reverseVisitItem(item, fn, filter) {
  if (isContainer(item) && item.items) {
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

const _type = Symbol('type'),
      _x = Symbol('x'),
      _y = Symbol('y'),
      _baseline = Symbol('baseline'),
      _width = Symbol('width'),
      _height = Symbol('height'),
      _p1 = Symbol('p1'),
      _p2 = Symbol('p2'),
      _bezier = Symbol('bezier'),
      _has_layout = Symbol('has layout');

//------------------------------------------------------------------------------

// A map from type strings to type objects. The type objects are "atomized" so
// there will only be one type object for each possible type string.

function TypeMap() {
  this.map_ = new Map();
}

TypeMap.prototype = {

  // Signature format: [inputs,outputs] with optional names, e.g.
  // [v(a)v(b),v(sum)](+) for a binary addition element.

  get: function(s) {
    return this.map_.get(s);
  },
  has: function(s) {
    return this.map_.has(s);
  },
  add: function(s) {
    const self = this;

    function addType(s, type) {
      let result = self.map_.get(s);
      if (!result) {
        self.map_.set(s, type);
        result = type;
      }
      return result;
    }

    let j = 0;
    // Close over j to avoid extra return values.
    function parseName() {
      let name;
      if (s[j] === '(') {
        let i = j + 1;
        j = s.indexOf(')', i);
        if (j > i)
          name = s.substring(i, j);
        j++;
      }
      return name;
    }
    function parsePin() {
      let i = j;
      // value types
      if (s[j] === 'v') {
        j++;
        return { type: 'v', name: parseName() };
      }
      // wildcard types
      if (s[j] === '*') {
        j++;
        return { type: '*', name: parseName() };
      }
      // function types
      let type = parseFunction(),
          typeString = s.substring(i, j);
      // Add the pin type, without label.
      addType(typeString, type);
      return {
        name: parseName(),
        type: typeString,
        [_type]: type,
      };
    }
    function parseFunction() {
      let i = j;
      if (s[j] === '[') {
        j++;
        let inputs = [], outputs = [];
        while (s[j] !== ',') {
          inputs.push(parsePin());
        }
        j++;
        while (s[j] !== ']') {
          outputs.push(parsePin());
        }
        j++;
        const typeString = s.substring(i, j);
        const type = {
          type: typeString,
          inputs: inputs,
          outputs: outputs,
        };
        addType(typeString, type);
        return type;
      }
    }
    let type = parseFunction();
    // Add the type with label.
    type.name = parseName();
    addType(s, type);
    return type;
  },

  // Removes any trailing label. Type may be ill-formed, e.g. '[v(f)'
  trimType: function(type) {
    if (type[type.length - 1] === ')')
      type = type.substring(0, type.lastIndexOf('('));
    return type;
  },

  // Removes all labels from signature.
  getUnlabeledType: function(type) {
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

  splitType: function(type) {
    let self = this;
    let j = 0, level = 0;
    while (true) {
      if (type[j] === '[')
        level++;
      else if (type[j] === ']')
        level--;
      else if (type[j] === ',')
        if (level === 1) return j;
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
}

const globalTypeMap_ = new TypeMap();

// Gets the type object with information about a pin or element.
function getType(item) {
  assert(!isWire(item));
  let type = item[_type];
  if (!type)
    type = updateType(item);
  return type;
}

function updateType(item) {
  assert(item.type);
  const type = globalTypeMap_.add(item.type);
  item[_type] = type;
  return type;
}

//------------------------------------------------------------------------------

const _definitionId = 'definitionId',
      _definition = Symbol('definition'),
      _definitionsAttr = 'definitions',
      _definitions = Symbol(_definitionsAttr);

assert(_definition != _definitions);

function getDefinition(item) {
  return item[_definition];
}

//------------------------------------------------------------------------------

// Use dataModels.changeAggregator to maintain:
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
          const src = self.getWireSrc_(wire),
                dst = self.getWireDst_(wire),
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
      const type = getType(element);
      // Initialize maps for new elements.
      if (!this.inputMap_.has(element)) {
        assert(!this.outputMap_.has(element));
        // inputMap_ takes element to array of incoming wires.
        this.inputMap_.set(element, new Array(type.inputs.length).fill(null));
        // outputMap_ takes element to array of arrays of outgoing wires.
        const arrays = [...Array(type.outputs.length)].map(() => new Array());
        this.outputMap_.set(element, arrays);
      }
    },

    removeElement_: function(element) {
      this.elementsAndGroups_.delete(element);
      this.inputMap_.delete(element);
      this.outputMap_.delete(element);
    },

    insertWire_: function(wire) {
      this.wires_.add(wire);
      const src = this.getWireSrc_(wire),
            dst = this.getWireDst_(wire);
      if (src) {
        const outputs = this.outputMap_.get(src);
        if (outputs && wire.srcPin !== undefined)
          outputs[wire.srcPin].push(wire);
      }
      if (dst) {
        const inputs = this.inputMap_.get(dst);
        if (inputs && wire.dstPin !== undefined)
          inputs[wire.dstPin] = wire;
      }
    },

    removeWire_: function(wire) {
      this.wires_.delete(wire);
      const src = this.getWireSrc_(wire),
            dst = this.getWireDst_(wire);
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
      const changeAggregator = this.changeAggregator;
      if (!changeAggregator.hasChanges())
        return;

      const self = this,
            removedItems = changeAggregator.getRemovedItems(),
            insertedItems = changeAggregator.getInsertedItems(),
            changedItems = changeAggregator.getChangedItems();

      // Remove wires before elements and groups.
      visitItems(removedItems, function(wire) {
        self.removeWire_(wire);
      }, isWire);
      visitItems(removedItems, function(item) {
        if (isElement(item)) {
          self.removeElement_(item);
        } else if (isGroup(item)) {
          self.elementsAndGroups_.delete(item);
        }
      }, isElementOrGroup);

      // Add elements and groups before wires.
      visitItems(insertedItems, function(item) {
        if (isElement(item)) {
          self.insertElement_(item);
        } else if (isGroup(item)) {
          self.elementsAndGroups_.add(item);
        }
      }, isElementOrGroup);
      visitItems(insertedItems, function(wire) {
          self.insertWire_(wire);
      }, isWire);

      // For changed wires, remove them and then re-insert them.
      visitItems(changedItems, function(wire) {
        self.removeWire_(wire);
        self.insertWire_(wire);
      }, isWire);

      changeAggregator.clear();
    },

    // May be called during transactions, to update wires during drags.
    updateLayout: function() {
      const self = this,
            graphInfo = this.model.circuitModel.getGraphInfo();
      this.changedElements_.forEach(function(element) {
        function markWire(wire) {
          wire[_has_layout] = false;
        }
        graphInfo.iterators.forInputWires(element, markWire);
        graphInfo.iterators.forOutputWires(element, markWire);
      });
      this.changedElements_.clear();
      this.changedWires_.clear();
    },

    // Called at the end of transactions and undo/redo, to update bounds.
    updateGroupLayout: function() {
      this.changedTopLevelGroups_.forEach(group => group[_has_layout] = false);
      this.changedTopLevelGroups_.clear();
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

    updateLayout_: function(item) {
      const self = this;
      if (isWire(item)) {
        this.changedWires_.add(item);
      } else if (isElement(item)) {
        this.changedElements_.add(item);
        this.addTopLevelGroup_(item);
        if (item.items) {
          visitItems(item.items, child => self.updateLayout_(child));
        }
      } else if (isGroup(item)) {
        visitItems(item.items, child => self.updateLayout_(child));
      }
    },

    onChanged_: function (change) {
      const item = change.item,
            attr = change.attr;
      this.updateLayout_(item);
      switch (change.type) {
        case 'change': {
          // Changed wires need layout.
          if (isWire(item)) {
            item[_has_layout] = false;
          } else if (isElementOrGroup(item) && attr == 'type') {
            // Type changed due to update or relabeling.
            updateType(item);
            item[_has_layout] = false;
          }
          break;
        }
        case 'insert': {
          const newValue = item[attr][change.index];
          this.updateLayout_(newValue);
          // if (isGroup(newValue)) {
          //   newValue[_has_layout] = false;
          // }
          break;
        }
      }
    },
  }

  function extend(model) {
    if (model.circuitModel)
      return model.circuitModel;

    dataModels.observableModel.extend(model);
    dataModels.referencingModel.extend(model);
    dataModels.hierarchicalModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.circuit = model.root;
    instance.changeAggregator = dataModels.changeAggregator.attach(model);

    instance.inputMap_ = new Map();   // element -> input wires[]
    instance.outputMap_ = new Map();  // element -> output wires[][]
    instance.elementsAndGroups_ = new Set();
    instance.wires_ = new Set();

    instance.changedWires_ = new Set();
    instance.changedElements_ = new Set();
    instance.changedTopLevelGroups_ = new Set();

    instance.circuit.items.forEach(item => instance.updateLayout_(item));

    model.observableModel.addHandler('changed',
                                     change => instance.onChanged_(change));

    const transactionModel = model.transactionModel;
    if (transactionModel) {
      function update() {
        instance.updateGroupLayout();
      }
      transactionModel.addHandler('transactionEnded', update);
      transactionModel.addHandler('didUndo', update);
      transactionModel.addHandler('didRedo', update);
    }

    instance.getWireSrc_ = model.referencingModel.getReferenceFn('srcId');
    instance.getWireDst_ = model.referencingModel.getReferenceFn('dstId');

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
            graphInfo = model.circuitModel.getSubgraphInfo(items),
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
      if (isCircuit(parent) || isGroup(parent)) {
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
            circuitModel = model.circuitModel,
            graphInfo = circuitModel.getSubgraphInfo([element]),
            type = getType(element),
            newId = model.dataModel.getId(newElement),
            newType = getType(newElement);
      function canRewire(index, pins, newPins) {
        if (index >= newPins.length)
          return false;
        const type = globalTypeMap_.trimType(pins[index].type),
              newType = globalTypeMap_.trimType(newPins[index].type);
        return type === '*' || type === newType;
      }
      graphInfo.iterators.forInputWires(element, function(wire, pin) {
        if (canRewire(wire.dstPin, type.inputs, newType.inputs)) {
          observableModel.changeValue(wire, 'dstId', newId);
        } else {
          self.deleteItem(wire);
        }
      });
      graphInfo.iterators.forOutputWires(element, function(wire, pin) {
        if (canRewire(wire.srcPin, type.outputs, newType.outputs)) {
          observableModel.changeValue(wire, 'srcId', newId);
        } else {
          self.deleteItem(wire);
        }
      });
      const parent = this.getParent(newElement),
            newParent = this.getParent(element);
      if (parent !== newParent)
        self.addItem(newElement, newParent);
      observableModel.changeValue(newElement, 'x', element.x);
      observableModel.changeValue(newElement, 'y', element.y);
      self.deleteItem(element);
    },

    connectInput: function(element, pin, p) {
      const renderer = this.model.renderer,
            parent = this.getParent(element),
            dstPin = getType(element).inputs[pin],
            pinPoint = p || renderer.pinToPoint(element, pin, true);

      const junction = {
        kind: 'element',
        elementKind: 'input',
        x: pinPoint.x - 32,
        y: pinPoint.y,
        type: inputElementType,
      };
      this.newItem(junction);
      this.addItem(junction, parent);  // same parent as element
      const wire = {
        kind: 'wire',
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
      const renderer = this.model.renderer,
            parent = this.getParent(element),
            srcPin = getType(element).outputs[pin],
            pinPoint = p || renderer.pinToPoint(element, pin, false);

      const junction = {
        kind: 'element',
        elementKind: 'output',
        x: pinPoint.x + 32,
        y: pinPoint.y,
        type: outputElementType,
      };
      this.newItem(junction);
      this.addItem(junction, parent);  // same parent as element
      const wire = {
        kind: 'wire',
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
          if (wires.length === 0)
            self.connectOutput(element, pin);
        });
      });
    },

    getPinTypeWithName: function(pin) {
      let type = pin.type;
      if (pin.name)
        type += '(' + pin.name + ')';
      return type;
    },

    getLabel: function (item) {
      const type = getType(item);
      if (isInput(item) || isLiteral(item)) {
        return type.outputs[0].name;
      } else if (isOutput(item)) {
        return type.inputs[0].name;
      }
      return type.name;
    },

    setLabel: function (item, newText) {
      const label = newText ? '(' + newText + ')' : '',
            type = item.type;
      let result;
      if (isInputPinLabeled(item)) {
        const j = globalTypeMap_.splitType(type),
              prefix = type.substring(0, j),
              suffix = type.substring(j);
        result = globalTypeMap_.trimType(prefix) + label + suffix;
      } else if (isOutputPinLabeled(item)) {
        const prefix = type.substring(0, type.length - 1);
        result = globalTypeMap_.trimType(prefix) + label + ']';
      } else {
        result = globalTypeMap_.trimType(type) + label;
      }
      return result;
    },

    changeType: function (item, newType) {
      const type = getType(item);
      let result;
      if (isJunction(item)) {
        if (isInput(item)) {
          let label = type.outputs[0].name;
          label = label ? '(' + label + ')' : '';
          result = '[,' + newType + label + ']';
        } else if (isOutput(item)) {
          let label = type.inputs[0].name;
          label = label ? '(' + label + ')' : '';
          result = '[' + newType + label + ',]';
        }
      }
      return result;
    },

    openElement: function(element) {
      const self = this, model = this.model,
            dataModel = model.dataModel,
            observableModel = model.observableModel,
            type = getType(element);

      const newElement = {
        kind: 'element',
        elementKind: 'abstract',
        x: element.x,
        y: element.y,
      };
      const id = dataModel.assignId(newElement),
            trimmedType = globalTypeMap_.trimType(element.type),
            innerType = globalTypeMap_.getUnlabeledType(trimmedType),
            newType = globalTypeMap_.addInputToType(trimmedType, innerType);
      newElement.type = newType;
      dataModel.initialize(newElement);
      debugValue = newElement; //////////////////
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
            observableModel = model.observableModel,
            translatableModel = model.translatableModel,
            type = getType(element);

      const newElement = {
        kind: 'element',
        elementKind: 'closed',
        x: translatableModel.globalX(element),
        y: translatableModel.globalY(element),
      };

      const id = dataModel.assignId(newElement);
      let typeString = '[',
          closedType = '[',
          pinIndex = 0;
      // Add only connected input pins to inputs.
      type.inputs.forEach(function(pin, i) {
        let incomingWire = incomingWires[i];
        if (incomingWire) {
          typeString += self.getPinTypeWithName(pin);
          // remap wire to new element and pin.
          observableModel.changeValue(incomingWire, 'dstId', id);
          observableModel.changeValue(incomingWire, 'dstPin', pinIndex);
          pinIndex++;
        } else {
          closedType += pin.type;
        }
      });
      // Add all output pins to outputs.
      typeString += ',';
      closedType += ',';
      pinIndex = 0;
      type.outputs.forEach(function(pin, i) {
        const outgoingWires = outgoingWireArrays[i];
        if (outgoingWires.length > 0) {
          typeString += self.getPinTypeWithName(pin);
          outgoingWires.forEach(function(outgoingWire, j) {
            // remap wire to new element and pin.
            observableModel.changeValue(outgoingWire, 'srcId', id);
            observableModel.changeValue(outgoingWire, 'srcPin', pinIndex);
          });
          pinIndex++;
        }
        closedType += pin.type;
      });
      typeString += ']';
      closedType += ']';
      if (type.name) {
        closedType += '(' + type.name + ')';
      }
      typeString = globalTypeMap_.addOutputToType(typeString, closedType);

      newElement.type = typeString;
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

    getGroupTypeInfo: function(items) {
      const self = this, model = this.model,
            dataModel = model.dataModel,
            circuitModel = model.circuitModel,
            graphInfo = model.circuitModel.getSubgraphInfo(items),
            renderer = this.model.renderer,
            inputs = [], outputs = [],
            contextInputs = [];

      function makePin(item, type, y) {
        return { item: item, type: type, y: y }
      }

      function getInputType(input) {
        const srcPin = getType(input).outputs[0],
              srcType = self.getPinTypeWithName(srcPin),
              wires = graphInfo.outputMap.get(input)[0];
        if (!wires.length)
          return srcType;
        const label = srcType.substring(1);
        return self.findDstType(wires[0]) + label;
      }

      function getOutputType(output) {
        const dstPin = getType(output).inputs[0],
              dstType = self.getPinTypeWithName(dstPin),
              wire = graphInfo.inputMap.get(output)[0];
        if (!wire)
          return dstType;
        const label = dstType.substring(1);
        return self.findSrcType(wire) + label;
      }

      // Add pins for inputs, outputs, and disconnected pins on elements.
      items.forEach(function(item, index) {
        if (!isElement(item))
          return;
        if (isInput(item)) {
          const y = renderer.pinToPoint(item, 0, false).y;
          inputs.push(makePin(item, getInputType(item), y));
        } else if (isOutput(item)) {
          const y = renderer.pinToPoint(item, 0, true).y;
          outputs.push(makePin(item, getOutputType(item), y));
        } else if (isElement(item)) {
          const type = getType(item),
                inputWires = graphInfo.inputMap.get(item),
                outputWires = graphInfo.outputMap.get(item);
          type.inputs.forEach(function(pin, i) {
            if (!inputWires[i]) {
              const y = renderer.pinToPoint(item, i, true).y;
              inputs.push(makePin(item, pin.type, y));
            }
          });
          type.outputs.forEach(function(pin, i) {
            if (outputWires[i].length == 0) {
              const y = renderer.pinToPoint(item, i, false).y;
              outputs.push(makePin(item, pin.type, y));
            }
          });
        }
      });

      // Incoming wires become part of the enclosing context type. Use the
      // output pin's y to order the pins.
      graphInfo.incomingWires.forEach(function(wire) {
        const src = self.getWireSrc(wire),
              srcPin = getType(src).outputs[wire.srcPin],
              y = renderer.pinToPoint(src, wire.srcPin, false).y;
        contextInputs.push(makePin(src, srcPin.type, y));
      });

      // Sort pins so we encounter them in increasing y-order. This lets us lay
      // out the group in an intuitively consistent way.
      function comparePins(pin1, pin2) {
        return pin1.y - pin2.y;
      }

      inputs.sort(comparePins);
      outputs.sort(comparePins);

      let typeString = '[';
      inputs.forEach(function(input, i) {
        typeString += input.type;
        input.item.index = i;
      });
      typeString += ',';
      outputs.forEach(function(output, i) {
        typeString += output.type;
        output.item.index = i;
      });
      typeString += ']';

      contextInputs.sort(comparePins);

      let contextTypeString = '[';
      contextInputs.forEach(function(input, i) {
        contextTypeString += input.type;
        input.item.index = i;
      });
      contextTypeString += ',]';  // no outputs

      const info = {
        type: typeString,
        contextType: contextTypeString,
      }

      // Compute group pass throughs.
      const passThroughs = new Set();
      graphInfo.interiorWires.forEach(function(wire) {
        let src = self.getWireSrc(wire),
            srcPin = getType(src).outputs[wire.srcPin];
        // Trace wires, starting at input junctions.
        if (!isInput(src) || srcPin.type !== '*')
          return;
        let srcPinIndex = src.index,
            activeWires = [wire];
        while (activeWires.length) {
          wire = activeWires.pop();
          let dst = self.getWireDst(wire),
              dstPin = getType(dst).inputs[wire.dstPin];
          if (isOutput(dst) && dstPin.type === '*') {
            passThroughs.add([srcPinIndex, dst.index]);
          } else if (dst.passThroughs) {
            dst.passThroughs.forEach(function(passThrough) {
              if (passThrough[0] === wire.dstPin) {
                let outgoingWires = graphInfo.outputMap.get(dst)[passThrough[1]];
                outgoingWires.forEach(wire => activeWires.push(wire));
              }
            });
          }
        }
      });

      if (passThroughs.size) {
        // console.log(passThroughs);
        info.passThroughs = Array.from(passThroughs);
      }

      return info;
    },

    build: function(items, parent) {
      const self = this, model = this.model,
            dataModel = model.dataModel,
            observableModel = model.observableModel,
            renderer = this.model.renderer,
            circuitModel = model.circuitModel,
            graphInfo = circuitModel.getSubgraphInfo(items),
            groupItems = items.concat(Array.from(graphInfo.interiorWires)),
            extents = renderer.getUnionBounds(graphInfo.elementsAndGroups),
            spacing = this.theme.spacing,
            x = extents.x - spacing,
            y = extents.y - spacing;

      // Create the new group element.
      const group = {
        kind: 'group',
        x: x,
        y: y,
        items: new Array(),
      };

      const id = dataModel.assignId(group);
      Object.assign(group, this.getGroupTypeInfo(items));
      model.dataModel.initialize(group);
      // Add the group before reparenting the items.
      this.addItem(group, parent);
      items.forEach(function(item) {
        // Re-parent group items; wires should remain connected.
        self.addItem(item, group);
      });
      return group;
    },

    createGroupInstance: function(group, element) {
      const model = this.model,
            items = model.copyPasteModel.cloneItems(group.items, new Map()),
            newGroupItems = {
              id: 0,  // Temporary id, so deepEqual will match non-identically.
              kind: 'group items',
              items: items,
            };
      const groupItems = model.canonicalInstanceModel.internalize(newGroupItems);
      element[_definitionId] = model.dataModel.getId(groupItems);
    },

    findSrcType: function(wire) {
      const self = this,
            model = this.model,
            graphInfo = model.circuitModel.getGraphInfo(),
            activeWires = [wire];
      // TODO eliminate array and while; there can be only one pass through.
      while (activeWires.length) {
        wire = activeWires.pop();
        let src = this.getWireSrc(wire),
            srcPin = getType(src).outputs[wire.srcPin],
            dst = this.getWireDst(wire),
            dstPin = getType(dst).inputs[wire.dstPin];
        if (srcPin.type !== '*')
          return srcPin.type;
        if (isGroupInstance(src)) {
          const group = this.getGroupDefinition_(src);
          if (group.passThroughs) {
            group.passThroughs.forEach(function(passThrough) {
              if (passThrough[1] === wire.srcPin) {
                srcPin = group.inputs[passThrough[0]];
                let incomingWire = graphInfo.inputMap.get(src)[passThrough[0]];
                if (incomingWire)
                  activeWires.push(incomingWire);
              }
            });
          }
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
            srcPin = getType(src).outputs[wire.srcPin],
            dstPin = getType(dst).inputs[wire.dstPin];
        if (dstPin.type !== '*')
          return dstPin.type;
        if (isGroupInstance(dst)) {
          const group = this.getGroupDefinition_(src);
          if (group.passThroughs) {
            group.passThroughs.forEach(function(passThrough) {
              if (passThrough[0] === wire.dstPin) {
                dstPin = group.outputs[passThrough[1]];
                let outgoingWires = graphInfo.outputMap.get(dst)[passThrough[1]];
                outgoingWires.forEach(wire => activeWires.push(wire));
              }
            });
          }
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
      const self = this,
            model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('build');
      const items = model.selectionModel.contents().filter(isElementOrGroup),
            parent = items.length === 1 ?
                null : model.hierarchicalModel.getLowestCommonAncestor(...items),
            group = this.build(items, parent);

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

    doTogglePalette: function() {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('toggle palette state');
      model.selectionModel.contents().forEach(function(element) {
        if (!isElement(element))
          return;
        model.observableModel.changeValue(element, 'state',
          (element.state === 'palette') ? 'normal' : 'palette');
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
            selectionModel = model.selectionModel,
            observableModel = model.observableModel,
            circuitModel = model.circuitModel,
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
            wire.srcPin >= getType(src).outputs.length ||
            wire.dstPin >= getType(dst).inputs.length) {
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

      // Update groups. Reverse visit so nested groups work correctly.
      reverseVisitItems(diagram.items, function(group) {
        if (group.items.length === 0) {
          self.deleteItem(group);
          return;
        }
        const oldType = group.type,
              oldSig = globalTypeMap_.trimType(group.type),
              info = self.getGroupTypeInfo(group.items);
        if (oldSig !== info.type) {
          let label = oldType.substring(oldSig.length);
          observableModel.changeValue(group, 'type', info.type + label);
          observableModel.changeValue(group, 'passThroughs', info.passThroughs);
        }
      }, isGroup);

      elementsAndGroups.forEach(function(element) {
        if (isGroup(element)) {
          // Delete empty groups.
          if (element.items.length === 0)
            self.deleteItem(element);
        }
      });
    },
  }

  function extend(model, theme) {
    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);
    dataModels.selectionModel.extend(model);
    dataModels.referencingModel.extend(model);
    dataModels.hierarchicalModel.extend(model);
    dataModels.transactionModel.extend(model);
    dataModels.transactionHistory.extend(model);
    dataModels.instancingModel.extend(model);
    dataModels.copyPasteModel.extend(model);
    dataModels.translatableModel.extend(model);

    circuitModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.diagram = model.root;
    instance.theme = theme;

    instance.getWireSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getWireDst = model.referencingModel.getReferenceFn('dstId');
    instance.getGroupDefinition_ = model.referencingModel.getReferenceFn(_definitionId);

    model.transactionModel.addHandler('transactionEnding',
                                      transaction => instance.makeConsistent());

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

function Renderer(theme, model, ctx) {
  this.theme = theme;
  // Tests set these globally, TODO Set model globally only. begin/end is cumbersome.
  this.model = model;
  this.ctx = ctx;
}

Renderer.prototype = {
  begin: function(model, ctx) {
    const translatableModel = model.translatableModel,
          referencingModel = model.referencingModel;

    assert(translatableModel);
    assert(referencingModel);

    this.model = model;
    this.translatableModel = translatableModel;
    this.referencingModel = referencingModel;

    this.getWireSrc = referencingModel.getReferenceFn('srcId');
    this.getWireDst = referencingModel.getReferenceFn('dstId');

    this.ctx = ctx;

    ctx.save();
    ctx.font = this.theme.font;
  },

  end: function() {
    this.ctx.restore();
  },

  getBounds: function (item) {
    assert(!isWire(item));
    const translatableModel = this.model.translatableModel,
          x = translatableModel.globalX(item),
          y = translatableModel.globalY(item);
    if (isElement(item)) {
      const type = getType(item);
      if (!type[_has_layout])
        this.layoutType(type);
      return { x: x, y: y, w: type[_width], h: type[_height] };
    }
    if (isGroup(item)) {
      return { x: x, y: y, w: item[_width], h: item[_height] };
    }
  },

  setBounds: function (item, width, height) {
    assert(!isWire(item));
    item[_width] = width;
    item[_height] = height;
  },

  getUnionBounds: function(items) {
    let xMin = Number.POSITIVE_INFINITY, yMin = Number.POSITIVE_INFINITY,
        xMax = -Number.POSITIVE_INFINITY, yMax = -Number.POSITIVE_INFINITY;
    for (let item of items) {
      if (isWire(item))
        continue;
      const rect = this.getBounds(item);
      xMin = Math.min(xMin, rect.x);
      yMin = Math.min(yMin, rect.y);
      xMax = Math.max(xMax, rect.x + rect.w);
      yMax = Math.max(yMax, rect.y + rect.h);
    }
    return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
  },

  pinToPoint: function(element, index, isInput) {
    assert(isElement(element));
    const rect = this.getBounds(element),
        w = rect.w, h = rect.h,
        type = getType(element);
    let x = rect.x, y = rect.y,
        pin, nx;
    if (isInput) {
      pin = type.inputs[index];
      nx = -1;
    } else {
      pin = type.outputs[index];
      nx = 1;
      x += w;
    }
    y += pin[_y] + pin[_height] / 2;
    return { x: x, y: y, nx: nx, ny: 0 }
  },

  // Compute sizes for an element type.
  layoutType: function(type) {
    assert(!type[_has_layout]);
    const self = this,
          model = this.model,
          ctx = this.ctx, theme = this.theme,
          textSize = theme.fontSize, spacing = theme.spacing,
          name = type.name,
          inputs = type.inputs, outputs = type.outputs;
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
        self.layoutPin(pin);
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

    this.setBounds(
      type,
      Math.round(Math.max(width, wIn + 2 * spacing + wOut, theme.minTypeWidth)),
      Math.round(Math.max(yIn, yOut, theme.minTypeHeight) + spacing / 2));

    type[_has_layout] = true;
  },

  layoutPin: function(pin) {
    const theme = this.theme, shrink = theme.shrink;
    if (pin.type === 'v' || pin.type === '*') {
      pin[_width] = pin[_height] = 2 * theme.knobbyRadius;
    } else {
      const type = getType(pin);
      if (!type[_has_layout])
        this.layoutType(type);
      pin[_width] = type[_width] * shrink;
      pin[_height] = type[_height] * shrink;
    }
  },

  layoutWire: function(wire) {
    assert(!wire[_has_layout]);
    let src = this.getWireSrc(wire),
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
    wire[_has_layout] = true;
  },

  // Make sure a group is big enough to enclose its contents.
  layoutGroup: function(group) {
    assert(!group[_has_layout]);
    const self = this, spacing = this.theme.spacing;
    function layout(group) {
      const extents = self.getUnionBounds(group.items),
            translatableModel = self.model.translatableModel,
            groupX = translatableModel.globalX(group),
            groupY = translatableModel.globalY(group),
            margin = 2 * spacing,
            type = getType(group);
      let width = extents.x + extents.w - groupX + margin,
          height = extents.y + extents.h - groupY + margin;
      if (!type[_has_layout])
        self.layoutType(type);
      width += type[_width];
      height = Math.max(height, type[_height] + margin);
      self.setBounds(group, width, height);
    }
    // Visit in reverse order to correctly include sub-group bounds.
    reverseVisitItem(group, function(group) {
      layout(group);
    }, isGroup);

    group[_has_layout] = true;
  },

  drawType: function(type, x, y) {
    if (!type[_has_layout])
      this.layoutType(type);

    const self = this, ctx = this.ctx, theme = this.theme,
          textSize = theme.fontSize, spacing = theme.spacing,
          name = type.name,
          w = type[_width], h = type[_height],
          right = x + w;
    ctx.lineWidth = 0.5;
    ctx.fillStyle = theme.textColor;
    ctx.textBaseline = 'bottom';
    if (name) {
      ctx.textAlign = 'center';
      ctx.fillText(name, x + w / 2, y + textSize + spacing / 2);
    }
    type.inputs.forEach(function(pin, i) {
      const name = pin.name;
      self.drawPin(pin, x, y + pin[_y]);
      if (name) {
        ctx.textAlign = 'left';
        ctx.fillText(name, x + pin[_width] + spacing, y + pin[_baseline]);
      }
    });
    type.outputs.forEach(function(pin) {
      const name = pin.name,
            pinLeft = right - pin[_width];
      self.drawPin(pin, pinLeft, y + pin[_y]);
      if (name) {
        ctx.textAlign = 'right';
        ctx.fillText(name, pinLeft - spacing, y + pin[_baseline]);
      }
    });
  },

  drawPin: function(pin, x, y) {
    const theme = this.theme;
    ctx.strokeStyle = theme.strokeColor;
    if (pin.type === 'v' || pin.type === '*') {
      const r = theme.knobbyRadius;
      ctx.beginPath();
      if (pin.type === 'v') {
        const d = 2 * r;
        ctx.rect(x, y, d, d);
      } else {
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2, true);
      }
      ctx.stroke();
    } else {
      const shrink = theme.shrink, invShrink = theme.invShrink,
            type = getType(pin),
            width = type[_width], height = type[_height];
      this.ctx.scale(shrink, shrink);
      x *= invShrink;
      y *= invShrink;
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.stroke();
      this.drawType(type, x, y);
      this.ctx.scale(invShrink, invShrink);
    }
  },

  drawElement: function(element, mode) {
    if (debugValue == element) {
      let foo = 0;
    }
    const ctx = this.ctx,
          theme = this.theme, spacing = theme.spacing,
          rect = this.getBounds(element),
          x = rect.x, y = rect.y, w = rect.w, h = rect.h,
          right = x + w, bottom = y + h;

    switch (element.elementKind) {
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

    switch (mode) {
      case normalMode:
        ctx.fillStyle = element.state === 'palette' ? theme.altBgColor : theme.bgColor;
        ctx.fill();
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        let type = getType(element);
        this.drawType(type, x, y);
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
  },

  drawElementPin: function(element, input, output, mode) {
    const ctx = this.ctx,
          rect = this.getBounds(element),
          type = getType(element);
    let x = rect.x, y = rect.y, w = rect.w, h = rect.h,
        right = x + w,
        pin;

    if (input !== undefined) {
      pin = type.inputs[input];
    } else if (output !== undefined) {
      pin = type.outputs[output];
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
  },

  // Gets the bounding rect for the group instancing element.
  getGroupInstanceBounds: function(type, groupRight, groupBottom) {
    const theme = this.theme, spacing = theme.spacing,
          width = type[_width], height = type[_height],
          x = groupRight - width - spacing, y = groupBottom - height - spacing;
    return { x: x, y: y, w: width, h: height };
  },

  drawGroup: function(group, mode) {
    if (!group[_has_layout])
      this.layoutGroup(group);
    const ctx = this.ctx,
          theme = this.theme,
          rect = this.getBounds(group),
          x = rect.x, y = rect.y, w = rect.w , h = rect.h,
          right = x + w, bottom = y + h;
    diagrams.roundRectPath(x, y, w, h, theme.spacing, ctx);
    switch (mode) {
      case normalMode:
        ctx.fillStyle = theme.bgColor;
        ctx.fill();
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([6,3]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (group.type) {
          let type = getType(group),
              instanceRect = this.getGroupInstanceBounds(type, right, bottom);
          ctx.beginPath();
          ctx.rect(instanceRect.x, instanceRect.y, instanceRect.w, instanceRect.h);
          ctx.fillStyle = theme.altBgColor;
          ctx.fill();
          ctx.strokeStyle = theme.strokeColor;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          this.drawType(type, instanceRect.x, instanceRect.y);
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
  },

  hitTestElement: function(element, p, tol, mode) {
    const rect = this.getBounds(element),
          x = rect.x, y = rect.y, width = rect.w, height = rect.h,
          hitInfo = diagrams.hitTestRect(x, y, width, height, p, tol);
    if (hitInfo) {
      const type = getType(element);
      assert(type[_has_layout]);
      type.inputs.forEach(function(input, i) {
        if (diagrams.hitTestRect(x, y + input[_y],
                                 input[_width], input[_height], p, 0)) {
          hitInfo.input = i;
        }
      });
      type.outputs.forEach(function(output, i) {
        if (diagrams.hitTestRect(x + width - output[_width], y + output[_y],
                                 output[_width], output[_height], p, 0)) {
          hitInfo.output = i;
        }
      });
    }
    return hitInfo;
  },

  hitTestGroup: function(group, p, tol, mode) {
    const rect = this.getBounds(group),
          x = rect.x, y = rect.y, w = rect.w , h = rect.h,
          hitInfo = diagrams.hitTestRect(x, y, w, h, p, tol);
    if (hitInfo) {
      assert(group[_has_layout]);
      const type = getType(group);
      if (type) {
        const instanceRect = this.getGroupInstanceBounds(type, x + w, y + h);
        if (diagrams.hitTestRect(instanceRect.x, instanceRect.y,
                                 instanceRect.w, instanceRect.h, p, tol)) {
          hitInfo.newGroupInstanceInfo = {
            x: instanceRect.x,
            y: instanceRect.y,
          };
        }
      }
    }
    return hitInfo;
  },

  drawWire: function(wire, mode) {
    if (!wire[_has_layout])
      this.layoutWire(wire);
    const ctx = this.ctx;
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
  },

  hitTestWire: function(wire, p, tol, mode) {
    // TODO don't hit test new wire as it's dragged!
    if (!wire[_has_layout])
      return;
    return diagrams.hitTestBezier(wire[_bezier], p, tol);
  },

  draw: function(item, mode) {
    switch (item.kind) {
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
  },

  hitTest: function(item, p, tol, mode) {
    let hitInfo;
    switch (item.kind) {
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
  },

  drawHoverInfo: function(item, p) {
    const self = this, theme = this.theme, ctx = this.ctx,
          x = p.x, y = p.y;
    ctx.fillStyle = theme.hoverColor;
    if (isGroupInstance(item)) {
      const groupItems = getDefinition(item);
      let r = this.getUnionBounds(groupItems);
      ctx.translate(x - r.x, y - r.y);
      let border = 4;
      ctx.fillRect(r.x - border, r.y - border, r.w + 2 * border, r.h + 2 * border);
      ctx.fillStyle = theme.hoverTextColor;
      visitItems(groupItems, item => self.draw(item, normalMode), isElementOrGroup);
      visitItems(groupItems, wire => self.draw(wire, normalMode), isWire);
    } else {
      // // Just list properties as text.
      // let props = [];
      // this.model.dataModel.visitProperties(item, function(item, attr) {
      //   let value = item[attr];
      //   if (Array.isArray(value))
      //     return;
      //   props.push({ name: attr, value: value });
      // });
      // let textSize = theme.fontSize, gap = 16, border = 4,
      //     height = textSize * props.length + 2 * border,
      //     maxWidth = diagrams.measureNameValuePairs(props, gap, ctx) + 2 * border;
      // ctx.fillRect(x, y, maxWidth, height);
      // ctx.fillStyle = theme.hoverTextColor;
      // props.forEach(function(prop) {
      //   ctx.textAlign = 'left';
      //   ctx.fillText(prop.name, x + border, y + textSize);
      //   ctx.textAlign = 'right';
      //   ctx.fillText(prop.value, x + maxWidth - border, y + textSize);
      //   y += textSize;
      // });
    }
  },
}

//------------------------------------------------------------------------------

function createTheme(properties) {
  let theme = diagrams.theme.createDefault();
  // Assign default circuit layout and drawing parameters.
  theme = Object.assign(theme, {
    spacing: 6,
    shrink: 0.7,
    knobbyRadius: 4,

    minTypeWidth: 8,
    minTypeHeight: 8,
  });
  // Assign custom properties.
  if (properties) {
    theme = Object.assign(theme, properties);
  }
  theme.invShrink = 1.0 / theme.shrink;
  return theme;
}

function Editor(model, theme, textInputController) {
  const self = this;
  this.model = model;
  this.diagram = model.root;
  this.theme = theme = createTheme(theme);
  this.renderer = new Renderer(theme);
  // TODO fix layout/renderer dependency
  model.renderer = this.renderer;

  this.textInputController = textInputController;

  this.hitTolerance = 4;

  let junctions = [
    { kind: 'element',
      elementKind: 'input',
      type: inputElementType,
    },
    { kind: 'element',
      elementKind: 'output',
      type: outputElementType,
    },
    { kind: 'element',
      elementKind: 'literal',
      type: '[,v(0)]',
    },
  ];
  this.junctions = junctions;

  let unaryOps = ['!', '~', '-' ];
  let binaryOps = ['+', '-', '*', '/', '%', '==', '!=', '<', '<=', '>', '>=',
                   '|', '&', '||', '&&'];

  let primitives = [];
  unaryOps.forEach(function(op) {
    primitives.push({
      kind: 'element',
      type: '[v,v](' + op + ')',
    });
  });
  binaryOps.forEach(function(op) {
    primitives.push({
      kind: 'element',
      type: '[vv,v](' + op + ')',
    });
  });
  // Just one ternary op for now, the conditional operator.
  primitives.push({
      kind: 'element',
      type: '[vvv,v](?)',
  });

  // Object definition.
  primitives.push({
      kind: 'element',
      type: '[,v[v,v]](let)',
  });
  // Object adapter.
  primitives.push({
      kind: 'element',
      type: '[v,[v,v[v,v]]]({})',
  });
  // Array adapter.
  primitives.push({
      kind: 'element',
      type: '[v,v(n)[v,v[v,v]]]([])',
  });
  // // Set adapter.
  // primitives.push({
  //     kind: 'element',
  //     type: '[,v(size)[v,v](add)[v,v](has)[v,v](delete)[,v](clear)](set)',
  // });
  // // Map adapter.
  // primitives.push({
  //     kind: 'element',
  //     type: '[,v(size)[v,v](get)[vv,v](set)[v,v](has)[v,v](delete)[,v](clear)](map)',
  // });
  // // String adapter.
  // primitives.push({
  //     kind: 'element',
  //     type: '[v,v(length)[vv,v](indexOf)[vv,v](lastIndexOf)[v,v](charAt)[vv,v](substring)](string)',
  // });

  this.primitives = primitives;

  const canonicalImpl = {
    canonicalsAttr: _definitionsAttr,
    canonicalRefAttr: 'definitionId',

    configure: function(model) {
      this.root = model.dataModel.root;
    },

    onInstanceInserted: function(instance, definition) {
      instance[_definition] = definition.items
    },

    onInstanceRemoved: function(instance, definition) {
      instance[_definition] = undefined;
    },
  }
  const canonicalInstanceModel =
      dataModels.canonicalInstanceModel.extend(model, canonicalImpl);

  editingModel.extend(model, theme);
}

Editor.prototype.initialize = function(canvasController) {
  const canvas = canvasController.canvas,
        ctx = canvasController.ctx;
  this.canvasController = canvasController;
  this.canvas = canvas;
  this.ctx = ctx;

  let model = this.model,
      renderer = this.renderer;

  renderer.begin(model, ctx);

  model.dataModel.initialize();

  // Create an instance of every junction and literal.
  let x = 16, y = 16, h = 0;
  const spacing = 8;
  this.junctions.forEach(function(junction) {
    let item = Object.assign(junction);
    item.x = x;
    item.y = y;
    item.state = 'palette';
    model.editingModel.newItem(item);
    model.editingModel.addItem(item);
    let r = renderer.getBounds(item);
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
    let r = renderer.getBounds(item);
    x += r.w + spacing;
    h = Math.max(h, r.h);
    if (x > 208) {
      x = 16, y += h + spacing, h = 0;
    }
  });
  renderer.end();
}

Editor.prototype.draw = function() {
  let renderer = this.renderer, diagram = this.diagram,
      model = this.model, ctx = this.ctx,
      canvasController = this.canvasController;
  // Updates wires as elements are dragged, and graph structure if any change
  // have occurred.
  model.circuitModel.updateLayout();
  renderer.begin(model, ctx);
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

  renderer.begin(model, ctx)
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
  if (item && isElementOrGroup(item) && item.type) {
    let type = getType(item),
        oldText = editingModel.getLabel(item);
    textInputController.start(oldText, function(newText) {
      const newType = editingModel.setLabel(item, newText);
      if (newType !== item.type) {
        model.transactionModel.beginTransaction('rename');
        model.observableModel.changeValue(item, 'type', newType);
        model.transactionModel.endTransaction();
        canvasController.draw();
      }
    });
  } else {
    textInputController.clear();
  }
}

Editor.prototype.onClick = function(p) {
  const model = this.model,
        selectionModel = model.selectionModel,
        shiftKeyDown = this.canvasController.shiftKeyDown,
        cmdKeyDown = this.canvasController.cmdKeyDown,
        hitList = this.hitTest(p),
        mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList, isDraggable);
  if (mouseHitInfo) {
    let item = mouseHitInfo.item;
    if (mouseHitInfo.newGroupInstanceInfo) {
      // Create a temporary palette element that will create the new instance.
      const group = mouseHitInfo.item,
            newGroupInstanceInfo = mouseHitInfo.newGroupInstanceInfo;
      mouseHitInfo.group = item;
      item = mouseHitInfo.item = {
        kind: 'element',
        x: newGroupInstanceInfo.x,
        y: newGroupInstanceInfo.y,
        type: group.type,
        [_type]: getType(group),
        state: 'palette',
      };
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
  return mouseHitInfo !== null;
}

const connectWireSrc = 1,
      connectWireDst = 2,
      moveSelection = 3,
      moveCopySelection = 4;

Editor.prototype.onBeginDrag = function(p0) {
  const mouseHitInfo = this.mouseHitInfo;
  if (!mouseHitInfo)
    return false;

  const model = this.model,
        selectionModel = model.selectionModel,
        editingModel = model.editingModel,
        canvasController = this.canvasController,
        dragItem = mouseHitInfo.item;
  let newWire, drag;
  if (mouseHitInfo.input !== undefined) {
    // Wire from input pin.
    const elementId = model.dataModel.getId(dragItem),
          cp0 = canvasController.viewToCanvas(p0);
    // Start the new wire as connecting the dst element to nothing.
    newWire = {
      kind: 'wire',
      dstId: elementId,
      dstPin: mouseHitInfo.input,
      [_p1]: cp0,
    };
    drag = {
      kind: connectWireSrc,
      name: 'Add new wire',
      isNewWire: true,
    };
  } else if (mouseHitInfo.output !== undefined) {
    // Wire from output pin.
    const elementId = model.dataModel.getId(dragItem),
          cp0 = canvasController.viewToCanvas(p0);
    // Start the new wire as connecting the src element to nothing.
    newWire = {
      kind: 'wire',
      srcId: elementId,
      srcPin: mouseHitInfo.output,
      [_p2]: cp0,
    };
    drag = {
      kind: connectWireDst,
      name: 'Add new wire',
      isNewWire: true,
    };
  } else {
    switch (dragItem.kind) {
      case 'element':
      case 'group':
        if (mouseHitInfo.moveCopy) {
          drag = { kind: moveCopySelection, name: 'Move copy of selection' };
        } else {
          drag = { kind: moveSelection, name: 'Move selection' };
        }
        break;
      case 'wire':
        if (mouseHitInfo.p1)
          drag = { kind: connectWireSrc, name: 'Edit wire' };
        else if (mouseHitInfo.p2)
          drag = { kind: connectWireDst, name: 'Edit wire' };
        break;
    }
  }

  this.drag = drag;
  if (drag) {
    if (drag.kind === moveSelection || drag.kind === moveCopySelection) {
      editingModel.selectInteriorWires();
      editingModel.reduceSelection();
      let items = selectionModel.contents();
      drag.isSingleElement = items.length === 1 && isElement(items[0]);
    }
    model.transactionModel.beginTransaction(drag.name);
    if (newWire) {
      drag.item = newWire;
      editingModel.newItem(newWire);
      editingModel.addItem(newWire);
      selectionModel.set(newWire);
    } else {
      drag.item = dragItem;
      if (mouseHitInfo.moveCopy) {
        const map = new Map(),
              copies = editingModel.copyItems(selectionModel.contents(), map);
        if (drag.isSingleElement && mouseHitInfo.newGroupInstanceInfo) {
          editingModel.createGroupInstance(mouseHitInfo.group, copies[0]);
        }
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
  const model = this.model,
        dataModel = model.dataModel,
        observableModel = model.observableModel,
        transactionModel = model.transactionModel,
        selectionModel = model.selectionModel,
        canvasController = this.canvasController,
        cp0 = canvasController.viewToCanvas(p0),
        cp = canvasController.viewToCanvas(p),
        mouseHitInfo = this.mouseHitInfo,
        dragItem = drag.item,
        snapshot = transactionModel.getSnapshot(dragItem),
        hitList = this.hitTest(p);
  let hitInfo;
  switch (drag.kind) {
    case moveSelection:
    case moveCopySelection:
      if (isElementOrGroup(dragItem)) {
        const filter = drag.isSingleElement ?
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
      const srcId = hitInfo ? dataModel.getId(hitInfo.item) : 0;  // 0 is invalid id.
      observableModel.changeValue(dragItem, 'srcId', srcId);
      if (srcId) {
        observableModel.changeValue(dragItem, 'srcPin', hitInfo.output);
        dragItem[_p1] = undefined;
      } else {
        // Change private property through model to update observers.
        observableModel.changeValue(dragItem, _p1, cp);
      }
      break;
    case connectWireDst:
      hitInfo = this.getFirstHit(hitList, isInputPin);
      const dstId = hitInfo ? dataModel.getId(hitInfo.item) : 0;  // 0 is invalid id.
      observableModel.changeValue(dragItem, 'dstId', dstId);
      if (dstId) {
        observableModel.changeValue(dragItem, 'dstPin', hitInfo.input);
        dragItem[_p2] = undefined;
      } else {
        // Change private property through model to update observers.
        observableModel.changeValue(dragItem, _p2, cp);
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

  switch (drag.kind) {
    case connectWireSrc:
    case connectWireDst:
      if (drag.isNewWire) {
        if (!dragItem.srcId) {
          // Add the appropriate source junction.
          editingModel.deleteItem(dragItem);
          editingModel.connectInput(editingModel.getWireDst(dragItem), dragItem.dstPin, p);
        } else if (!dragItem.dstId) {
          const src = editingModel.getWireSrc(dragItem),
                srcType = getType(src),
                pinIndex = dragItem.srcPin,
                pin = srcType.outputs[pinIndex];
          // Add the appropriate destination junction, or for function outputs,
          // add a new abstract function to connect.
          if (isFunctionType(pin.type)) {
            let element = {
              kind: 'element',
              type: pin.type,
              x: p.x,
              y: p.y,
            };
            editingModel.newItem(element);
            editingModel.addItem(element, diagram);
            const newElement = editingModel.openElement(element);
            editingModel.replaceElement(element, newElement);

            let wire = {
              kind: 'wire',
              srcId: src.id,
              srcPin: pinIndex,
              dstId: newElement.id,
              dstPin: getType(newElement).inputs.length - 1,
            };
            editingModel.newItem(wire);
            editingModel.addItem(wire, diagram);
          } else {
            editingModel.deleteItem(dragItem);
            editingModel.connectOutput(editingModel.getWireSrc(dragItem), dragItem.srcPin, p);
          }
        }
      }
      transactionModel.endTransaction();
      break;
    case moveSelection:
    case moveCopySelection:
      // Find element beneath items.
      const hitList = this.hitTest(p),
            filter = drag.isSingleElement ?
                     isContainerTargetOrElementSlot : isContainerTarget,
            hitInfo = this.getFirstHit(hitList, filter),
            parent = hitInfo ? hitInfo.item : diagram,
            selection = selectionModel.contents();
      if (drag.isSingleElement && !isContainer(parent)) {
        // Replace parent item.
        editingModel.replaceElement(parent, selection[0]);
      } else {
        // Reparent selected items.
        selection.forEach(item => editingModel.addItem(item, parent));
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

  this.renderer.begin(model, ctx);

  if (keyCode === 8) {  // 'delete'
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
        editingModel.doTogglePalette();
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
  this.renderer.end();
}

return {
  circuitModel: circuitModel,
  editingModel: editingModel,
  getType: getType,

  TypeMap: TypeMap,
  Renderer: Renderer,

  Editor: Editor,
  createTheme: createTheme,
};
})();

const circuit_data =
{
  "kind": "circuit",
  "id": 1,
  "x": 0,
  "y": 0,
  "width": 853,
  "height": 430,
  "name": "Example",
  "items": [
  ],
  ['definitions']: [
  ]
}

