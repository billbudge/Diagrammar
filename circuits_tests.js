
// Circuit unit tests

function newCircuit() {
  return {
    root: {  // TODO why is root needed?
      type: 'circuit',
      x: 0,
      y: 0,
      items: []
    }
  };
}

function stringifyMaster(master) {
  let type = '[';
  function stringifyName(item) {
    if (item.name)
      type += '(' + item.name + ')';
  }
  function stringifyPin(pin) {
    type += pin.type;
    stringifyName(pin);
  }
  if (master.inputs)
    master.inputs.forEach(input => stringifyPin(input));
  type += ',';
  if (master.outputs)
    master.outputs.forEach(output => stringifyPin(output));
  type += ']';
  stringifyName(master);
  return type;
}

function newElement(x, y) {
  return {
    type: "element",
    x: x || 0,
    y: y || 0,
    master: '[v,v]',
  };
}

function newTypedElement(master) {
  return {
    type: 'element',
    x: 0,
    y: 0,
    master: master,
  };
}

function newInputJunction(type) {
  let element = newTypedElement(type);
  element.elementType = 'input';
  return element;
}

function newOutputJunction(type) {
  let element = newTypedElement(type);
  element.elementType = 'output';
  return element;
}

function newTestMasteringModel() {
  let circuit = newCircuit();
  let test = circuits.masteringModel.extend(circuit);
  return test;
}

function newTestEditingModel(elements, wires) {
  let circuit = newCircuit();
  circuits.masteringModel.extend(circuit);
  circuits.viewModel.extend(circuit);
  let test = circuits.editingModel.extend(circuit),
      dataModel = test.model.dataModel;
  circuit.dataModel.initialize();
  if (elements) {
    elements.forEach(function(element) {
      test.newItem(element);
      test.addItem(element);
    });
  }
  if (wires) {
    wires.forEach(function(wire) {
      wire.srcId = dataModel.getId(elements[wire.srcId]);
      wire.dstId = dataModel.getId(elements[wire.dstId]);
      test.addItem(wire);
    });
  }
  return test;
}

function initialize(item) {
  item.initalized = true;
}

test("circuits.masteringModel", function() {
  let circuit = newCircuit();
  let test = circuits.masteringModel.extend(circuit);
  ok(test);
  ok(test.model);
  ok(test.model.dataModel);
});

test("circuits.masteringModel", function() {
  let test = newTestMasteringModel();
  let types = [
    '[vv,v](+)',
    '[v(a)v(b),v(c)]',
    '[,[,v][v,v]](@)',
    '[[v,vv(q)](a)v(b),v(c)](foo)',
  ];
  types.forEach(
    type => deepEqual(stringifyMaster(test.decodeType(type)), type));
});

test("circuits.masteringModel.unlabeled", function() {
  let test = newTestMasteringModel();
  deepEqual(test.unlabeled('[v,vv](foo)'), '[v,vv]');
  deepEqual(test.unlabeled('[v,vv]'), '[v,vv]');
});

test("circuits.masteringModel.relabel", function() {
  let test = newTestMasteringModel();
  let input = newInputJunction('[,*]');
  test.initialize(input);
  deepEqual(test.relabel(input, 'f'), '[,*(f)]');
  deepEqual(test.relabel(input, ''), '[,*]');
  input.master = '[,*(f)]';
  test.initialize(input);
  deepEqual(test.relabel(input, 'bar'), '[,*(bar)]');
  deepEqual(test.relabel(input, ''), '[,*]');

  let output = newOutputJunction('[*,]');
  test.initialize(output);
  deepEqual(test.relabel(output, 'f'), '[*(f),]');
  deepEqual(test.relabel(output, ''), '[*,]');
  output.master = '[*(f),]';
  test.initialize(output);
  deepEqual(test.relabel(output, 'bar'), '[*(bar),]');
  deepEqual(test.relabel(output, ''), '[*,]');

  let element = newTypedElement('[vv,vv]');
  test.initialize(element);
  deepEqual(test.relabel(element, 'f'), '[vv,vv](f)');
  deepEqual(test.relabel(element, ''), '[vv,vv]');
  element.master = '[vv,vv](f)';
  test.initialize(element);
  deepEqual(test.relabel(element, 'bar'), '[vv,vv](bar)');
  deepEqual(test.relabel(element, ''), '[vv,vv]');
});

test("circuits.masteringModel.retype", function() {
  let test = newTestMasteringModel();
  let input = newInputJunction('[,*(f)]');
  test.initialize(input);
  deepEqual(test.retype(input, '[v,v]'), '[,[v,v](f)]');
  deepEqual(test.retype(input, '*'), '[,*(f)]');
  input.master = '[,[v,v](f)]';
  test.initialize(input);
  deepEqual(test.retype(input, '*'), '[,*(f)]');
  deepEqual(test.retype(input, 'v'), '[,v(f)]');

  let output = newOutputJunction('[*(f),]');
  test.initialize(output);
  deepEqual(test.retype(output, '[v,v]'), '[[v,v](f),]');
  deepEqual(test.retype(output, '*'), '[*(f),]');
  output.master = '[[v,v](f),]';
  test.initialize(output);
  deepEqual(test.retype(output, '*'), '[*(f),]');
  deepEqual(test.retype(output, 'v'), '[v(f),]');

  // TODO 'apply' junctions.
});

test("circuits.editingAndMastering", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      masteringModel = test.model.masteringModel;
  let types = [], masters = [];
  function onMasterInserted(type, master) {
    types.push(type);
    masters.push(master);
  }
  masteringModel.addHandler('masterInserted', onMasterInserted);

  // Add an item.
  let item1 = newTypedElement('[vv,v]');
  test.newItem(item1);
  test.addItem(item1, circuit.root);
  // Check master
  let type = item1.master;
  deepEqual(stringifyMaster(masteringModel.getMaster(item1)), type);
  deepEqual(types, [type]);
  deepEqual(masters, [masteringModel.getMaster(item1)]);
});

test("circuits.editingModel", function() {
  let test = newTestEditingModel();
  ok(test);
  ok(test.model);
  ok(test.model.dataModel);
  ok(test.model.selectionModel);
});

test("circuits.editingModel.newItem", function() {
  let test = newTestEditingModel();
  test.model.dataModel.addInitializer(initialize);
  let item1 = newElement();
  test.newItem(item1);
  ok(item1.id);
  ok(item1.initalized);
});

test("circuits.editingModel.addDeleteItem", function() {
  let test = newTestEditingModel(),
      circuit = test.model;
  // Add an item.
  let item1 = newElement();
  test.newItem(item1);
  test.addItem(item1, circuit.root);
  deepEqual(circuit.root.items, [item1]);
  deepEqual(circuit.hierarchicalModel.getParent(item1), circuit.root);
  // Delete the item.
  test.deleteItem(item1);
  deepEqual(circuit.root.items, []);
});

test("circuits.editingModel.connectInput", function() {
  let test = newTestEditingModel(),
      circuit = test.model;
  // Add an item.
  let item1 = newElement();
  test.newItem(item1);
  test.addItem(item1, circuit.root);
  // Connect input 0.
  test.connectInput(item1, 0);
  deepEqual(circuit.root.items.length, 3);
  let junction = circuit.root.items[1],
      wire = circuit.root.items[2];
  deepEqual(junction.elementType, 'input');
  deepEqual(test.getWireSrc(wire), junction);
  deepEqual(test.getWireDst(wire), item1);
});

test("circuits.editingModel.connectOutput", function() {
  let test = newTestEditingModel(),
      circuit = test.model;
  // Add an item.
  let item1 = newElement();
  test.newItem(item1);
  test.addItem(item1, circuit.root);
  // Connect output 0.
  test.connectOutput(item1, 0);
  deepEqual(circuit.root.items.length, 3);
  let junction = circuit.root.items[1],
      wire = circuit.root.items[2];
  deepEqual(junction.elementType, 'output');
  deepEqual(test.getWireSrc(wire), item1);
  deepEqual(test.getWireDst(wire), junction);
});

test("circuits.editingModel.completeGroup", function() {
  let elements = [
        newTypedElement('[vv,v]'),
        newTypedElement('[vv,v]'),
      ],
      wires = [
        { type: 'wire', srcId: 0, srcPin: 0, dstId: 1, dstPin: 1 },
      ],
      test = newTestEditingModel(elements, wires),
      circuit = test.model,
      dataModel = circuit.dataModel,
      items = circuit.root.items;
  // Complete the two element group.
  test.completeGroup(elements);
  deepEqual(items.length, 11);
  deepEqual(items[0], elements[0]);
  deepEqual(items[1], elements[1]);
  deepEqual(items[2], wires[0]);
});

test("circuits.editingModel.collectGraphInfo", function() {
  let elements = [
        newTypedElement('[vv,v]'),
        newTypedElement('[vv,v]'),
      ],
      wires = [
        { type: 'wire', srcId: 0, srcPin: 0, dstId: 1, dstPin: 1 },
      ],
      test = newTestEditingModel(elements, wires),
      circuit = test.model,
      dataModel = circuit.dataModel,
      items = circuit.root.items;
  // Complete the two element group, then collect graph info.
  test.completeGroup(elements);
  let graphInfo = test.collectGraphInfo(elements);
  ok(graphInfo.elementSet.has(elements[0]));
  ok(graphInfo.elementSet.has(elements[1]));
  deepEqual(graphInfo.elementSet.size, 2);
  ok(graphInfo.interiorWires.includes(wires[0]));
  deepEqual(graphInfo.wires.length, 5);
  deepEqual(graphInfo.interiorWires.length, 1);
  deepEqual(graphInfo.incomingWires.length, 3);
  deepEqual(graphInfo.inputWires.length, 3);
  deepEqual(graphInfo.outgoingWires.length, 1);
  deepEqual(graphInfo.outputWires.length, 1);
});

test("circuits.editingModel.closeFunction", function() {
  let elements = [
        newTypedElement('[vv,v]'),
        newTypedElement('[vv,v]'),
      ],
      wires = [
        { type: 'wire', srcId: 0, srcPin: 0, dstId: 1, dstPin: 1 },
      ],
      test = newTestEditingModel(elements, wires),
      circuit = test.model,
      dataModel = circuit.dataModel,
      items = circuit.root.items;
  // Close element #1.
  test.closeOrOpenFunctions([elements[1]], true);
  deepEqual(items.length, 3);
  deepEqual(items[0], elements[0]);
  let wire = wires[0];
  deepEqual(wire.srcId, dataModel.getId(elements[0]));
  deepEqual(wire.srcPin, 0);
  deepEqual(wire.dstId, dataModel.getId(items[2]));
  deepEqual(wire.dstPin, 0);
  let closedElement = items[2];
  deepEqual(closedElement.master, '[v,[v,v]]');
});

test("circuits.editingModel.openFunction", function() {
  let elements = [
        newTypedElement('[vv,v]'),
        newTypedElement('[vv,v]'),
      ],
      wires = [
        { type: 'wire', srcId: 0, srcPin: 0, dstId: 1, dstPin: 1 },
      ],
      test = newTestEditingModel(elements, wires),
      circuit = test.model,
      dataModel = circuit.dataModel,
      items = circuit.root.items;
  // Open element #1.
  test.closeOrOpenFunctions([elements[1]], false);
  deepEqual(items.length, 3);
  deepEqual(items[0], elements[0]);
  let wire = wires[0];
  deepEqual(wire.srcId, dataModel.getId(elements[0]));
  deepEqual(wire.srcPin, 0);
  deepEqual(wire.dstId, dataModel.getId(items[2]));
  deepEqual(wire.dstPin, 0);
  let closedElement = items[2];
  deepEqual(closedElement.master, '[vv[vv,v],v]');
});

test("circuits.editingModel.makeGroup", function() {
  let elements = [
        newTypedElement('[vv,v]'),
        newTypedElement('[vv,v]'),
      ],
      wires = [
        { type: 'wire', srcId: 0, srcPin: 0, dstId: 1, dstPin: 1 },
      ],
      test = newTestEditingModel(elements, wires),
      circuit = test.model,
      dataModel = circuit.dataModel,
      items = circuit.root.items;
  // Complete the two element group, then collect graph info.
  test.completeGroup(elements);
  let groupElement = test.makeGroup(items, false);
  deepEqual(groupElement.master, '[vvv,v]');
});

test("circuits.editingModel.junctionConsistency", function() {
  let elements = [
        newInputJunction('[,*]'),
        newTypedElement('[v[v,v],v]'),
      ],
      wires = [
        { type: 'wire', srcId: 0, srcPin: 0, dstId: 1, dstPin: 1 },
      ],
      test = newTestEditingModel(elements, wires),
      circuit = test.model,
      dataModel = circuit.dataModel,
      items = circuit.root.items;
  // Complete the two element group, then collect graph info.
  test.makeConsistent();
  deepEqual(elements[0].master, '[,[v,v]]');
});
