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
  return isElement(item) && item.definitionId;
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
      _contextType = Symbol('contextType');

const _x = Symbol('x'),
      _y = Symbol('y'),
      _baseline = Symbol('baseline'),
      _width = Symbol('width'),
      _height = Symbol('height'),
      _p1 = Symbol('p1'),
      _p2 = Symbol('p2'),
      _bezier = Symbol('bezier'),
      _hasLayout = Symbol('hasLayout');

function extendTheme(theme) {
  const extensions = {
    spacing: 6,
    knobbyRadius: 4,

    minTypeWidth: 8,
    minTypeHeight: 8,
  }
  return Object.assign(diagrams.theme.createDefault(), extensions, theme);
}

//------------------------------------------------------------------------------

// A map from type strings to type objects. The type objects are "atomized" so
// there will only be one type object for each possible type string.

function TypeParser() {
  this.map_ = new Map();
}

// Signature format: [inputs,outputs] with optional names, e.g.
// [v(a)v(b),v(sum)](+) for a binary addition element.

TypeParser.prototype = {
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

const globalTypeParser_ = new TypeParser();

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
  const type = globalTypeParser_.add(item.type);
  item[_type] = type;
  return type;
}

//------------------------------------------------------------------------------

const _definition = Symbol('definition'),
      _definitionsAttr = 'definitions';

function getDefinition(item) {
  return item[_definition];
}

//------------------------------------------------------------------------------

// Maintains:
// - maps from element to connected input and output wires.
// - information about graphs and subgraphs.

const _inputs = Symbol('inputs'),
      _outputs = Symbol('outputs');

const circuitModel = (function() {

  const proto = {
    getInputs: function(element) {
      assert(isElement(element));
      return element[_inputs];
    },

    getOutputs: function(element) {
      assert(isElement(element));
      return element[_outputs];
    },

    forInputWires: function(element, fn) {
      const inputs = this.getInputs(element);
      if (!inputs)
        return;
      inputs.forEach((input, i) => { if (input) fn(input, i); });
    },

    forOutputWires: function(element, fn) {
      const arrays = this.getOutputs(element);
      if (!arrays)
        return;
      arrays.forEach((outputs, i) => outputs.forEach(output => fn(output, i)));
    },

    getGraphInfo: function() {
      return {
        elementsAndGroups: this.elementsAndGroups_,
        wires: this.wires_,
        interiorWires: this.wires_,
        incomingWires: new diagrammar.collections.EmptySet(),
        outgoingWires: new diagrammar.collections.EmptySet(),
      }
    },

    getSubgraphInfo: function(items) {
      const self = this,
            elementsAndGroups = new Set(),
            wires = new Set(),
            interiorWires = new Set(),
            incomingWires = new Set(),
            outgoingWires = new Set();
      // First collect elements and groups.
      visitItems(items, function(item) {
        elementsAndGroups.add(item);
      }, isElementOrGroup);
      // Now collect and classify wires that connect to elements.
      visitItems(items, function(element) {
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
        self.forInputWires(element, addWire);
        self.forOutputWires(element, addWire);
      }, isElement);

      return {
        elementsAndGroups: elementsAndGroups,
        wires: wires,
        interiorWires: interiorWires,
        incomingWires: incomingWires,
        outgoingWires: outgoingWires,
      }
    },

    getConnectedElements: function(elements, upstream, downstream) {
      const self = this,
            result = new Set();
      while (elements.length > 0) {
        const element = elements.pop();
        if (!isElement(element))
          continue;

        result.add(element);

        if (upstream) {
          this.forInputWires(element, function(wire) {
            const src = self.getWireSrc(wire);
            if (!result.has(src))
              elements.push(src);
          });
        }
        if (downstream) {
          this.forOutputWires(element, function(wire) {
            const dst = self.getWireDst(wire);
            if (!result.has(dst))
              elements.push(dst);
          });
        }
      }
      return result;
    },

    insertElement_: function(element) {
      this.elementsAndGroups_.add(element);
      const type = getType(element);
      // Initialize maps for new elements.
      if (element[_inputs] === undefined) {
        assert(element[_outputs] === undefined);
        // array of incoming wires.
        element[_inputs] = new Array(type.inputs.length).fill(null);
        // array of arrays of outgoing wires.
        const arrays = [...Array(type.outputs.length)].map(() => new Array());
        element[_outputs] = arrays;
      }
    },

    addWireToInputs_: function(wire, element, pin) {
      if (!element || pin === undefined) return;
      const inputs = this.getInputs(element);
      inputs[pin] = wire;
    },

    addWireToOutputs_: function(wire, element, pin) {
      if (!element || pin === undefined) return;
      const outputs = this.getOutputs(element);
      outputs[pin].push(wire);
    },

    insertWire_: function(wire) {
      this.wires_.add(wire);
      this.addWireToOutputs_(wire, this.getWireSrc(wire), wire.srcPin);
      this.addWireToInputs_(wire, this.getWireDst(wire), wire.dstPin);
    },

    insertItem_: function(item) {
      if (isElement(item)) {
        this.insertElement_(item);
      } else if (isWire(item)) {
        this.insertWire_(item);
      } else if (isGroup(item)) {
        this.elementsAndGroups_.add(item);
        const self = this;
        item.items.forEach(subItem => self.insertItem_(subItem));
      }
    },

    removeElement_: function(element) {
      this.elementsAndGroups_.delete(element);
    },

    removeWireFromInputs_: function(wire, element, pin) {
      if (!element || pin === undefined) return;
      const inputs = this.getInputs(element);
      if (inputs)
        inputs[pin] = null;
    },

    removeWireFromOutputs_: function(wire, element, pin) {
      if (!element || pin === undefined) return;
      const outputArrays = this.getOutputs(element);
      if (outputArrays) {
        const outputs = outputArrays[pin];
        const index = outputs.indexOf(wire);
        if (index >= 0) {
          outputs.splice(index, 1);
        }
      }
    },

    removeWire_: function(wire) {
      this.wires_.delete(wire);
      this.removeWireFromOutputs_(wire, this.getWireSrc(wire), wire.srcPin);
      this.removeWireFromInputs_(wire, this.getWireDst(wire), wire.dstPin);
    },

    removeItem_: function(item) {
      if (isElement(item)) {
        this.removeElement_(item);
      } else if (isWire(item)) {
        this.removeWire_(item);
      } else if (isGroup(item)) {
        this.elementsAndGroups_.delete(item);
        const self = this;
        item.items.forEach(subItem => self.removeItem_(subItem));
      }
    },

    // May be called inside transactions, to update wires during drags.
    updateLayout: function() {
      const self = this,
            circuitModel = this.model.circuitModel;
      this.changedElements_.forEach(function(element) {
        function markWire(wire) {
          wire[_hasLayout] = false;
        }
        circuitModel.forInputWires(element, markWire);
        circuitModel.forOutputWires(element, markWire);
      });
      this.changedElements_.clear();
    },

    // Called at the end of transactions and undo/redo, to update bounds.
    updateGroupLayout: function() {
      this.changedTopLevelGroups_.forEach(group => group[_hasLayout] = false);
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
        item[_hasLayout] = false;
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
          if (isWire(item)) {
            // Changed wires need layout.
            item[_hasLayout] = false;
            // Wires may pass through invalid states, since each connection
            // requires two edits to change. insertWire_ and removeWire_ should
            // handle non-existent connections.
            if (attr == 'srcId' || attr == 'srcPin' ||
                attr == 'dstId' || attr == 'dstPin') {
              const referencingModel = this.model.referencingModel,
                    oldValue = change.oldValue,
                    newValue = item[attr];
              item[attr] = oldValue;
              referencingModel.resolveReference(item, 'srcId');
              referencingModel.resolveReference(item, 'dstId');
              this.removeWire_(item);

              item[attr] = newValue;
              referencingModel.resolveReference(item, 'srcId');
              referencingModel.resolveReference(item, 'dstId');
              this.insertWire_(item);
            }
          } else if (isElementOrGroup(item) && attr == 'type') {
            // Type changed due to update or relabeling.
            updateType(item);
            item[_hasLayout] = false;
          }
          break;
        }
        case 'insert': {
          const newValue = item[attr][change.index];
          this.updateLayout_(newValue);
          this.insertItem_(newValue);
          break;
        }
        case 'remove': {
          const oldValue = change.oldValue;
          this.removeItem_(oldValue);
        }
      }
    },

    checkConsistency: function() {
      const self = this,
            mappedWires = new Set();
      this.elementsAndGroups_.forEach(function(element) {
        if (!isElement(element)) return;
        self.getInputs(element).forEach(function(wire) {
          if (wire) mappedWires.add(wire);
        });
        self.getOutputs(element).forEach(function(wires) {
          wires.forEach(function(wire) {
            if (wire) mappedWires.add(wire);
          });
        });
      });
      return true;
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

    instance.elementsAndGroups_ = new Set();
    instance.wires_ = new Set();

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

const editingModel = (function() {
  const proto = {
    getParent: function(item) {
      return this.model.hierarchicalModel.getParent(item);
    },

    reduceSelection: function () {
      let model = this.model;
      model.selectionModel.set(model.hierarchicalModel.reduceSelection());
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
      return item;
    },

    newItems: function(items) {
      const self = this;
      items.forEach(item => self.newItem(item));
    },

    newElement: function(type, x, y, elementKind) {
      const result = {
        kind: 'element',
        type: type,
        state: 'normal',
        x: x,
        y: y,
      }
      if (elementKind)
        result.elementKind = elementKind;

      return this.newItem(result);
    },

    newGroup: function(x, y) {
      // Create the new group element.
      const result = {
        kind: 'group',
        x: x,
        y: y,
        items: [],
      };
      return this.newItem(result);
    },

    newGroupInstance: function(groupId, definitionId, type, x, y) {
      const result = this.newElement(type, x, y);
      result.groupId = groupId;
      result.definitionId = definitionId;
      return result;
    },

    newWire: function(srcId, srcPin, dstId, dstPin) {
      const result = {
        kind: 'wire',
        srcId: srcId,
        srcPin: srcPin,
        dstId: dstId,
        dstPin: dstPin,
      }
      return this.newItem(result);
    },

    getItemIndex: function(item) {
      const parent = this.getParent(item);
      assert(parent);
      return parent.items.indexOf(item);
    },

    deleteItem: function(item) {
      const model = this.model,
            parent = this.getParent(item),
            index = this.getItemIndex(item);
      assert(index >= 0);
      model.observableModel.removeElement(parent, 'items', index);
      model.selectionModel.remove(item);
      return index;
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

    addItem: function(item, parent, index) {
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
        if (index === undefined)
          index = parent.items.length;
        model.observableModel.insertElement(parent, 'items', index, item);
      }
      return item;
    },

    addItems: function(items, parent) {
      // Add elements and groups first, then wires, so circuitModel can update.
      for (let item of items) {
        if (!isWire(item)) this.addItem(item, parent);
      }
      for (let item of items) {
        if (isWire(item)) this.addItem(item, parent);
      }
    },

    replaceElement: function(element, newElement) {
      const self = this, model = this.model,
            observableModel = model.observableModel,
            circuitModel = model.circuitModel,
            type = getType(element),
            newId = model.dataModel.getId(newElement),
            newType = getType(newElement),
            parent = this.getParent(newElement),
            newParent = this.getParent(element),
            index = this.getItemIndex(element);
      // Add newElement right after element. Both should be present as we
      // rewire them.
      if (parent) {
        self.deleteItem(newElement);
      }
      self.addItem(newElement, newParent, index + 1);
      observableModel.changeValue(newElement, 'x', element.x);
      observableModel.changeValue(newElement, 'y', element.y);

      // Update all incoming and outgoing wires if possible, otherwise they
      // will be deleted as dangling wires by makeConsistent.
      const srcChange = [], dstChange = [];
      function canRewire(index, pins, newPins) {
        if (index >= newPins.length)
          return false;
        const type = globalTypeParser_.trimType(pins[index].type),
              newType = globalTypeParser_.trimType(newPins[index].type);
        return type === '*' || type === newType;
      }
      circuitModel.forInputWires(element, function(wire, pin) {
        if (canRewire(wire.dstPin, type.inputs, newType.inputs)) {
          dstChange.push(wire);
        }
      });
      circuitModel.forOutputWires(element, function(wire, pin) {
        if (canRewire(wire.srcPin, type.outputs, newType.outputs)) {
          srcChange.push(wire);
        }
      });
      srcChange.forEach(function(wire) {
        observableModel.changeValue(wire, 'srcId', newId);
      });
      dstChange.forEach(function(wire) {
        observableModel.changeValue(wire, 'dstId', newId);
      });

      this.deleteItem(element);
    },

    connectInput: function(element, pin, p) {
      const renderer = this.model.renderer,
            parent = this.getParent(element);  // same parent as element

      p = p || renderer.pinToPoint(element, pin, true);
      const junction = this.newElement(inputElementType, p.x - 32, p.y, 'input');
      this.addItem(junction, parent);
      const wire = this.newWire(junction.id, 0, element.id, pin);
      this.addItem(wire, parent);
      return { junction: junction, wire: wire };
    },

    connectOutput: function(element, pin, p) {
      const renderer = this.model.renderer,
            parent = this.getParent(element);

      p = p || renderer.pinToPoint(element, pin, false);
      const junction = this.newElement(outputElementType, p.x + 32, p.y, 'output');
      this.addItem(junction, parent);  // same parent as element
      const wire = this.newWire(element.id, pin, junction.id, 0);
      this.addItem(wire, parent);  // same parent as element
      return { junction: junction, wire: wire };
    },

    completeGroup: function(elements) {
      const self = this,
            model = this.model,
            circuitModel = model.circuitModel;

      // Add junctions for disconnected pins on elements.
      elements.forEach(function(element) {
        const inputs = circuitModel.getInputs(element),
              outputs = circuitModel.getOutputs(element);
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
        const j = globalTypeParser_.splitType(type),
              prefix = type.substring(0, j),
              suffix = type.substring(j);
        result = globalTypeParser_.trimType(prefix) + label + suffix;
      } else if (isOutputPinLabeled(item)) {
        const prefix = type.substring(0, type.length - 1);
        result = globalTypeParser_.trimType(prefix) + label + ']';
      } else {
        result = globalTypeParser_.trimType(type) + label;
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

    exportElement: function(element) {
      const model = this.model,
            dataModel = model.dataModel,
            observableModel = model.observableModel,
            type = element.type,
            newType = '[,' + type + ']';

      const result = this.newElement(newType, element.x, element.y, 'element');
      return result;
    },

    exportElements: function(elements) {
      const self = this,
            selectionModel = this.model.selectionModel;

      // Open each non-input/output element.
      elements.forEach(function(element) {
        selectionModel.remove(element);
        if (isInput(element) || isOutput(element) ||
            isLiteral(element) || isGroup(element) || isWire(element))
          return;
        const newElement = self.exportElement(element);
        self.replaceElement(element, newElement);
        selectionModel.add(newElement);
      });
    },

    openElement: function(element) {
      const model = this.model,
            dataModel = model.dataModel,
            observableModel = model.observableModel,
            type = getType(element),
            trimmedType = globalTypeParser_.trimType(element.type),
            innerType = globalTypeParser_.getUnlabeledType(trimmedType),
            newType = globalTypeParser_.addInputToType(trimmedType, innerType);

      const result = this.newElement(newType, element.x, element.y, 'abstract');
      return result;
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

    isInstanceOfGroup: function(element, group) {
      assert(isElement(element));
      // Recursive group instances aren't included in the signature.
      return isGroupInstance(element) &&
             element.groupId == this.model.dataModel.getId(group);
    },

    getGroupTypeInfo: function(items, group) {
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
              wires = circuitModel.getOutputs(input)[0];
        if (!wires.length)
          return srcType;
        const label = srcType.substring(1);
        return self.findDstType(wires[0]) + label;
      }

      function getOutputType(output) {
        const dstPin = getType(output).inputs[0],
              dstType = self.getPinTypeWithName(dstPin),
              wire = circuitModel.getInputs(output)[0];
        if (!wire)
          return dstType;
        const label = dstType.substring(1);
        return self.findSrcType(wire) + label;
      }

      // Add pins for inputs, outputs, and disconnected pins on elements.
      items.forEach(function(item, index) {
        if (isInput(item)) {
          const y = renderer.pinToPoint(item, 0, false).y,
                type = getInputType(item);
          if (globalTypeParser_.trimType(type) != '*')
            inputs.push(makePin(item, type, y));
        } else if (isOutput(item)) {
          const y = renderer.pinToPoint(item, 0, true).y,
                type = getOutputType(item);
          if (globalTypeParser_.trimType(type) != '*')
            outputs.push(makePin(item, type, y));
        } else if (isElement(item)) {
          // Recursive group instances aren't included in the signature.
          if (group && self.isInstanceOfGroup(item, group))
            return;
          const type = getType(item),
                inputWires = circuitModel.getInputs(item),
                outputWires = circuitModel.getOutputs(item);
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
        }/* else if (isGroup(item)) {
          const y = renderer.getBounds(item).y;
          outputs.push(makePin(item, item.type, y));
        }*/
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
                let outgoingWires = circuitModel.getOutputs(dst)[passThrough[1]];
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
      // console.log(info.type, info.contextType);
      return info;
    },

    build: function(items, parent) {
      const self = this,
            model = this.model,
            graphInfo = model.circuitModel.getSubgraphInfo(items),
            extents = model.renderer.getUnionBounds(graphInfo.elementsAndGroups),
            spacing = this.theme.spacing,
            x = extents.x - spacing,
            y = extents.y - spacing;

      // Create the new group element.
      const group = this.newGroup(x, y);
      Object.assign(group, this.getGroupTypeInfo(items));

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
      element.groupId = model.dataModel.getId(group);
      element.definitionId = model.dataModel.getId(groupItems);
    },

    findSrcType: function(wire) {
      const self = this,
            model = this.model,
            circuitModel = model.circuitModel,
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
                let incomingWire = circuitModel.getInputs(src)[passThrough[0]];
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
                let outgoingWires = circuitModel.getOutputs(dst)[passThrough[1]];
                outgoingWires.forEach(wire => activeWires.push(wire));
              }
            });
          }
        }
      }
      return '*';
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

    doComplete: function() {
      let model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('complete');
      this.completeGroup(model.selectionModel.contents());
      model.transactionModel.endTransaction();
    },

    doExport: function() {
      let transactionModel = this.model.transactionModel;
      this.reduceSelection();
      transactionModel.beginTransaction('export');
      this.exportElements(this.model.selectionModel.contents());
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
          circuitModel = this.model.circuitModel,
          newSelection = circuitModel.getConnectedElements(selection, upstream, true);
      selectionModel.set(newSelection);
    },

    makeConsistent: function () {
      const self = this, model = this.model,
            diagram = this.diagram,
            dataModel = model.dataModel,
            hierarchicalModel = model.hierarchicalModel,
            selectionModel = model.selectionModel,
            observableModel = model.observableModel,
            circuitModel = model.circuitModel;

// TODO don't mutate while iterating???
      let graphInfo, elementsAndGroups, wires;
      function refreshGraphInfo() {
       graphInfo = model.circuitModel.getGraphInfo();
       elementsAndGroups = graphInfo.elementsAndGroups;
       wires = graphInfo.wires;
      }
      refreshGraphInfo();

      // Update groups. Reverse visit so nested groups work correctly.
      reverseVisitItems(diagram.items, function(group) {
        if (group.items.length === 0) {
          self.deleteItem(group);
          refreshGraphInfo();
          return;
        }
        const oldType = group.type,
              oldSig = globalTypeParser_.trimType(group.type),
              info = self.getGroupTypeInfo(group.items, group);
        if (oldSig !== info.type) {
          // Maintain the label of the group.
          let label = oldType.substring(oldSig.length);
          info.type += label;
          // Assign info properties.
          for (let attr in info) {
            observableModel.changeValue(group, attr, info[attr]);
          }
          // Replace any 'self' instances with instances of the new type.
          group.items.forEach(function(item) {
            if (isElement(item) && self.isInstanceOfGroup(item, group)) {
              const newInstance = self.newGroupInstance(
                  item.groupId, item.definitionId, info.type, item.x, item.y);
              self.replaceElement(item, newInstance);
              // Recalculate the graph data.
              refreshGraphInfo();
            }
          });
        }
      }, isGroup);

      elementsAndGroups.forEach(function(element) {
        if (isGroup(element)) {
          // Delete empty groups.
          if (element.items.length === 0) {
            self.deleteItem(element);
            // Recalculate the graph data.
            refreshGraphInfo();
          }
        }
      });

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
          // Recalculate the graph data.
          refreshGraphInfo();
          return;
        }
        // Make sure wires belong to lowest common container (circuit or group).
        const lca = hierarchicalModel.getLowestCommonAncestor(src, dst);
        if (self.getParent(wire) !== lca) {
          self.deleteItem(wire);
          self.addItem(wire, lca);
          // Reparenting doesn't change the graph structure.
        }
      });

      assert(circuitModel.checkConsistency());
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

    circuitModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.diagram = model.root;
    instance.theme = extendTheme(theme);

    instance.getWireSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getWireDst = model.referencingModel.getReferenceFn('dstId');
    instance.getGroupDefinition_ = model.referencingModel.getReferenceFn('definitionId');

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

class Renderer {
  constructor(model, theme) {
    this.model = model;
    this.theme = extendTheme(theme);

    const translatableModel = model.translatableModel,
          referencingModel = model.referencingModel;

    assert(translatableModel);
    assert(referencingModel);

    this.translatableModel = translatableModel;
    this.referencingModel = referencingModel;

    this.getWireSrc = referencingModel.getReferenceFn('srcId');
    this.getWireDst = referencingModel.getReferenceFn('dstId');
  }

  begin(ctx) {
    this.ctx = ctx;

    ctx.save();
    ctx.font = this.theme.font;
  }

  end() {
    this.ctx.restore();
  }

  getBounds(item) {
    assert(!isWire(item));
    const translatableModel = this.model.translatableModel,
          x = translatableModel.globalX(item),
          y = translatableModel.globalY(item);
    if (isElement(item)) {
      const type = getType(item);
      if (!type[_hasLayout])
        this.layoutType(type);
      return { x: x, y: y, w: type[_width], h: type[_height] };
    }
    if (isGroup(item)) {
      if (!item[_hasLayout])
        this.layoutGroup(item);
      return { x: x, y: y, w: item[_width], h: item[_height] };
    }
  }

  setBounds(item, width, height) {
    assert(!isWire(item));
    item[_width] = width;
    item[_height] = height;
  }

  getUnionBounds(items) {
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
  }

  pinToPoint(element, index, isInput) {
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
  }

  // Compute sizes for an element type.
  layoutType(type) {
    assert(!type[_hasLayout]);
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

    type[_hasLayout] = true;
  }

  layoutPin(pin) {
    const theme = this.theme;
    if (pin.type === 'v' || pin.type === '*') {
      pin[_width] = pin[_height] = 2 * theme.knobbyRadius;
    } else {
      const type = getType(pin);
      if (!type[_hasLayout])
        this.layoutType(type);
      pin[_width] = type[_width];
      pin[_height] = type[_height];
    }
  }

  layoutWire(wire) {
    assert(!wire[_hasLayout]);
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
    wire[_hasLayout] = true;
  }

  // Make sure a group is big enough to enclose its contents.
  layoutGroup(group) {
    assert(!group[_hasLayout]);
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
      if (!type[_hasLayout])
        self.layoutType(type);
      width += type[_width];
      height = Math.max(height, type[_height] + margin);
      self.setBounds(group, width, height);
    }
    // Visit in reverse order to correctly include sub-group bounds.
    reverseVisitItem(group, function(group) {
      layout(group);
    }, isGroup);

    group[_hasLayout] = true;
  }

  drawType(type, x, y, fillOutputs) {
    if (!type[_hasLayout])
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
      self.drawPin(pin, x, y + pin[_y], false);
      if (name) {
        ctx.textAlign = 'left';
        ctx.fillText(name, x + pin[_width] + spacing, y + pin[_baseline]);
      }
    });
    type.outputs.forEach(function(pin) {
      const name = pin.name,
            pinLeft = right - pin[_width];
      self.drawPin(pin, pinLeft, y + pin[_y], fillOutputs);
      if (name) {
        ctx.textAlign = 'right';
        ctx.fillText(name, pinLeft - spacing, y + pin[_baseline]);
      }
    });
  }

  drawPin(pin, x, y, fill) {
    const ctx = this.ctx,
          theme = this.theme;
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
      const type = getType(pin),
            width = type[_width], height = type[_height];
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      // if (level == 1) {
      //   ctx.fillStyle = theme.altBgColor;
      //   ctx.fill();
      // }
      ctx.stroke();
      this.drawType(type, x, y);
    }
  }

  drawElement(element, mode) {
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
        this.drawType(type, x, y, 0);
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

  drawElementPin(element, input, output, mode) {
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
  }

  // Gets the bounding rect for the group instancing element.
  getGroupInstanceBounds(type, groupRight, groupBottom) {
    const theme = this.theme, spacing = theme.spacing,
          width = type[_width], height = type[_height],
          x = groupRight - width - spacing, y = groupBottom - height - spacing;
    return { x: x, y: y, w: width, h: height };
  }

  drawGroup(group, mode) {
    if (!group[_hasLayout])
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

        const type = getType(group),
              instanceRect = this.getGroupInstanceBounds(type, right, bottom);
        ctx.beginPath();
        ctx.rect(instanceRect.x, instanceRect.y, instanceRect.w, instanceRect.h);
        ctx.fillStyle = theme.altBgColor;
        ctx.fill();
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        this.drawType(type, instanceRect.x, instanceRect.y, 0);
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

  hitTestElement(element, p, tol, mode) {
    const rect = this.getBounds(element),
          x = rect.x, y = rect.y, width = rect.w, height = rect.h,
          hitInfo = diagrams.hitTestRect(x, y, width, height, p, tol);
    if (hitInfo) {
      const type = getType(element);
      assert(type[_hasLayout]);
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
  }

  hitTestGroup(group, p, tol, mode) {
    const rect = this.getBounds(group),
          x = rect.x, y = rect.y, w = rect.w , h = rect.h,
          hitInfo = diagrams.hitTestRect(x, y, w, h, p, tol);
    if (hitInfo) {
      assert(group[_hasLayout]);
      const type = getType(group),
            instanceRect = this.getGroupInstanceBounds(type, x + w, y + h);
      if (diagrams.hitTestRect(instanceRect.x, instanceRect.y,
                               instanceRect.w, instanceRect.h, p, tol)) {
        hitInfo.newGroupInstanceInfo = {
          x: instanceRect.x,
          y: instanceRect.y,
        };
      }
    }
    return hitInfo;
  }

  drawWire(wire, mode) {
    if (!wire[_hasLayout])
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
  }

  hitTestWire(wire, p, tol, mode) {
    // TODO don't hit test new wire as it's dragged!
    if (!wire[_hasLayout])
      return;
    return diagrams.hitTestBezier(wire[_bezier], p, tol);
  }

  draw(item, mode) {
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
  }

  hitTest(item, p, tol, mode) {
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
  }

  drawHoverInfo(item, p) {
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
  }
}

//------------------------------------------------------------------------------

function Editor(model, theme, textInputController) {
  const self = this;
  this.model = model;
  this.diagram = model.root;
  this.theme = extendTheme(theme);
  this.textInputController = textInputController;

  this.hitTolerance = 4;

  editingModel.extend(model, this.theme);

  model.renderer = new Renderer(model, this.theme);

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
}

Editor.prototype.initialize = function(canvasController) {
  const canvas = canvasController.canvas,
        ctx = canvasController.ctx;
  this.canvasController = canvasController;
  this.canvas = canvas;
  this.ctx = ctx;

  let model = this.model,
      renderer = model.renderer;

  renderer.begin(ctx);

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
  let diagram = this.diagram,
      ctx = this.ctx,
      canvasController = this.canvasController,
      model = this.model,
      renderer = model.renderer;
  // Update wires as elements are dragged.
  model.circuitModel.updateLayout();
  renderer.begin(ctx);
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

Editor.prototype.print = function(ctx) {
  let diagram = this.diagram,
      canvasController = this.canvasController,
      model = this.model,
      renderer = model.renderer;
  // Update wires as elements are dragged.
  model.circuitModel.updateLayout();
  renderer.begin(ctx);
  canvasController.applyTransform();

  // // Draw registration frame for generating screen shots.
  // ctx.strokeStyle = renderer.theme.dimColor;
  // ctx.lineWidth = 0.5;
  // ctx.strokeRect(300, 10, 700, 300);

  visitItems(diagram.items,
    function(item) {
      renderer.draw(item, normalMode);
    }, isElementOrGroup);
  visitItems(diagram.items,
    function(wire) {
      renderer.draw(wire, normalMode);
    }, isWire);


  // let hoverHitInfo = this.hoverHitInfo;
  // if (hoverHitInfo) {
  //   renderer.drawHoverInfo(hoverHitInfo.item, hoverHitInfo.p);
  // }
  renderer.end();
}

Editor.prototype.hitTest = function(p) {
  let model = this.model,
      renderer = model.renderer,
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

  renderer.begin(ctx)
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
        editingModel = model.editingModel,
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
      assert(isWire(dragItem));
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
      assert(isWire(dragItem));
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
        // Coalesce the creation and editing of the dragged wire into an
        // insertion of a new wire.
        const src = editingModel.getWireSrc(dragItem),
              dst = editingModel.getWireDst(dragItem),
              srcId = dragItem.srcId, srcPin = dragItem.srcPin,
              dstId = dragItem.dstId, dstPin = dragItem.dstPin;
        selectionModel.clear();
        transactionModel.cancelTransaction();
        transactionModel.beginTransaction('Add new wire');
        if (!src) {
          // Add the appropriate source junction.
          const connection = editingModel.connectInput(dst, dstPin, p);
          selectionModel.set(connection.junction, connection.wire);
        } else if (!dst) {
          const srcType = getType(src),
                pinIndex = srcPin,
                pin = srcType.outputs[pinIndex];
          // Add the appropriate destination junction.
          // if (isFunctionType(pin.type)) {
          //   const element = editingModel.newElement(pin.type, p.x, p.y);
          //   editingModel.addItem(element, diagram);
          //   const newElement = editingModel.openElement(element);
          //   editingModel.replaceElement(element, newElement);
          //   const dstPin = getType(newElement).inputs.length - 1,
          //         wire = editingModel.newWire(
          //             src.id, pinIndex, newElement.id, dstPin);
          //   editingModel.addItem(wire, diagram);
          //   selectionModel.set(newElement, wire)
          // } else {
          const connection = editingModel.connectOutput(src, srcPin, p);
          selectionModel.set(connection.junction, connection.wire);
        } else {
          const newWire = editingModel.newWire(srcId, srcPin, dstId, dstPin);
          editingModel.addItem(newWire);
          selectionModel.set(newWire);
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
  let diagram = this.diagram,
      model = this.model,
      ctx = this.ctx,
      renderer = model.renderer,
      selectionModel = model.selectionModel,
      editingModel = model.editingModel,
      transactionHistory = model.transactionHistory,
      keyCode = e.keyCode,
      cmdKey = e.ctrlKey || e.metaKey,
      shiftKey = e.shiftKey;

  renderer.begin(ctx);

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
        editingModel.doExport();
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
      case 83:  // 's':
        // let text = JSON.stringify(
        //   diagram,
        //   function(key, value) {
        //     if (key.toString().charAt(0) === '_')
        //       return;
        //     if (value === undefined || value === null)
        //       return;
        //     return value;
        //   },
        //   2);
        // // Writes diagram as JSON to console.
        // console.log(text);
        {
          // Render the selected elements using Canvas2SVG to convert to SVG format.
          let bounds = renderer.getUnionBounds(selectionModel.contents());
          let ctx = new C2S(bounds.w, bounds.h);
          ctx.translate(-bounds.x, -bounds.y);
          this.print(ctx);

          // Write out the SVG file.
          let serializedSVG = ctx.getSerializedSvg();
          let blob = new Blob([serializedSVG], {
            type: 'text/plain'
          });
          saveAs(blob, 'circuit.svg', true);
          return true;
      }
    }
  }
  renderer.end();
}

return {
  circuitModel: circuitModel,
  editingModel: editingModel,
  getType: getType,

  TypeParser: TypeParser,
  Renderer: Renderer,

  Editor: Editor,
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

