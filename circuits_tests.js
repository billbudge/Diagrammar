
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

function newLiteral(value) {
  let element = newTypedElement('[,v(' + value + ')]');
  element.elementType = 'literal';
  return element;
}

function newTestMasteringModel() {
  let circuit = newCircuit();
  let test = circuits.masteringModel.extend(circuit);
  return test;
}

function addElement(test, element) {
  test.newItem(element);
  test.addItem(element);
  return element;
}

function addWire(test, src, srcPin, dst, dstPin) {
  let dataModel = test.model.dataModel;
  let wire = {
    type: 'wire',
    srcId: dataModel.getId(src),
    srcPin: srcPin,
    dstId: dataModel.getId(dst),
    dstPin: dstPin,
  }
  test.addItem(wire);
  return wire;
}

function newTestEditingModel() {
  let circuit = newCircuit();
  circuits.masteringModel.extend(circuit);
  circuits.viewModel.extend(circuit);
  let test = circuits.editingModel.extend(circuit),
      dataModel = test.model.dataModel;
  circuit.dataModel.initialize();
  return test;
}

function doInitialize(item) {
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

test("circuits.masteringModel.getUnlabeledType", function() {
  let test = newTestMasteringModel();
  deepEqual(test.getUnlabeledType('[v,vv](foo)'), '[v,vv]');
  deepEqual(test.getUnlabeledType('[v,vv]'), '[v,vv]');
});

test("circuits.masteringModel.getLabel", function() {
  let test = newTestMasteringModel();
  let input = newInputJunction('[,*(foo)](bar)');
  test.initialize(input);
  deepEqual(test.getLabel(input), 'foo');

  let output = newOutputJunction('[*(foo),](bar)');
  test.initialize(output);
  deepEqual(test.getLabel(output), 'foo');

  let literal = newLiteral(0);
  test.initialize(literal);
  deepEqual(test.getLabel(literal), '0');
});

test("circuits.masteringModel.setLabel", function() {
  let test = newTestMasteringModel();
  let input = newInputJunction('[,*]');
  test.initialize(input);
  deepEqual(test.setLabel(input, 'f'), '[,*(f)]');
  deepEqual(test.setLabel(input, ''), '[,*]');
  input.master = '[,*(f)]';
  test.initialize(input);
  deepEqual(test.setLabel(input, 'bar'), '[,*(bar)]');
  deepEqual(test.setLabel(input, ''), '[,*]');

  let literal = newLiteral(0);
  test.initialize(literal);
  deepEqual(test.setLabel(literal, '1'), '[,v(1)]');

  let output = newOutputJunction('[*,]');
  test.initialize(output);
  deepEqual(test.setLabel(output, 'f'), '[*(f),]');
  deepEqual(test.setLabel(output, ''), '[*,]');
  output.master = '[*(f),]';
  test.initialize(output);
  deepEqual(test.setLabel(output, 'bar'), '[*(bar),]');
  deepEqual(test.setLabel(output, ''), '[*,]');

  let element = newTypedElement('[vv,vv]');
  test.initialize(element);
  deepEqual(test.setLabel(element, 'f'), '[vv,vv](f)');
  deepEqual(test.setLabel(element, ''), '[vv,vv]');
  element.master = '[vv,vv](f)';
  test.initialize(element);
  deepEqual(test.setLabel(element, 'bar'), '[vv,vv](bar)');
  deepEqual(test.setLabel(element, ''), '[vv,vv]');
});

test("circuits.masteringModel.changeType", function() {
  let test = newTestMasteringModel();
  let input = newInputJunction('[,*(f)]');
  test.initialize(input);
  deepEqual(test.changeType(input, '[v,v]'), '[,[v,v](f)]');
  deepEqual(test.changeType(input, '*'), '[,*(f)]');
  input.master = '[,[v,v](f)]';
  test.initialize(input);
  deepEqual(test.changeType(input, '*'), '[,*(f)]');
  deepEqual(test.changeType(input, 'v'), '[,v(f)]');

  let output = newOutputJunction('[*(f),]');
  test.initialize(output);
  deepEqual(test.changeType(output, '[v,v]'), '[[v,v](f),]');
  deepEqual(test.changeType(output, '*'), '[*(f),]');
  output.master = '[[v,v](f),]';
  test.initialize(output);
  deepEqual(test.changeType(output, '*'), '[*(f),]');
  deepEqual(test.changeType(output, 'v'), '[v(f),]');

  // TODO 'apply' junctions.
});

test("circuits.masteringModel.splitType", function() {
  let test = newTestMasteringModel();
  let pairs = [
    { type: '[vv,v](+)', split: 3 },
    { type: '[v(a)v(b),v(c)]', split: 9 },
    { type: '[,[,v][v,v]](@)', split: 1 },
    { type: '[[v,vv(q)](a)v(b),v(c)](foo)', split: 17 },
  ];
  pairs.forEach(
    pair => deepEqual(test.splitType(pair.type), pair.split));
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
  test.model.dataModel.addInitializer(doInitialize);
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
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      wire = addWire(test, elem1, 0, elem2, 1);
  // Complete the two element group.
  test.completeGroup([elem1, elem2]);
  deepEqual(items.length, 11);
  deepEqual(items[0], elem1);
  deepEqual(items[1], elem2);
  deepEqual(items[2], wire);
});

test("circuits.editingModel.collectGraphInfo", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      wire = addWire(test, elem1, 0, elem2, 1);
  // Complete the two element group, then collect graph info.
  test.completeGroup([elem1, elem2]);
  let graphInfo = test.collectGraphInfo([elem1, elem2]);
  ok(graphInfo.elementSet.has(elem1));
  ok(graphInfo.elementSet.has(elem2));
  deepEqual(graphInfo.elementSet.size, 2);
  ok(graphInfo.interiorWires.includes(wire));
  deepEqual(graphInfo.wires.length, 5);
  deepEqual(graphInfo.interiorWires.length, 1);
  deepEqual(graphInfo.incomingWires.length, 3);
  deepEqual(graphInfo.inputWires.length, 3);
  deepEqual(graphInfo.outgoingWires.length, 1);
  deepEqual(graphInfo.outputWires.length, 1);
});

test("circuits.editingModel.getConnectedElements", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      elem3 = addElement(test, newTypedElement('[vv,v]')),
      wire1 = addWire(test, elem1, 0, elem2, 1),
      wire2 = addWire(test, elem2, 0, elem3, 1),
      selectionModel = circuit.selectionModel;
  // Get upstream and downstream connected elements from elem2.
  let all = Array.from(test.getConnectedElements([elem2], true));
  deepEqual(all.length, 3);
  ok(all.includes(elem1));
  ok(all.includes(elem2));
  ok(all.includes(elem3));
  // Get only downstream connected elements from elem2.
  let downstream = Array.from(test.getConnectedElements([elem2], false));
  deepEqual(downstream.length, 2);
  ok(downstream.includes(elem2));
  ok(downstream.includes(elem3));
});

test("circuits.editingModel.closeFunction", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      wire = addWire(test, elem1, 0, elem2, 1);
  // Close element #2.
  test.closeOrOpenFunctions([elem2], true);
  deepEqual(items.length, 3);
  deepEqual(items[0], elem1);
  deepEqual(test.getWireSrc(wire), elem1);
  deepEqual(wire.srcPin, 0);
  deepEqual(test.getWireDst(wire), items[2]);
  deepEqual(wire.dstPin, 0);
  let closedElement = items[2];
  deepEqual(closedElement.master, '[v,[v,v]]');
});

test("circuits.editingModel.openFunction", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      wire = addWire(test, elem1, 0, elem2, 1);
  // Open element #1.
  test.closeOrOpenFunctions([elem2], false);
  deepEqual(items.length, 3);
  deepEqual(items[0], elem1);
  deepEqual(test.getWireSrc(wire), elem1);
  deepEqual(wire.srcPin, 0);
  deepEqual(test.getWireDst(wire), items[2]);
  deepEqual(wire.dstPin, 0);
  let closedElement = items[2];
  deepEqual(closedElement.master, '[vv[vv,v],v]');
});

test("circuits.editingModel.makeGroup", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      wire = addWire(test, elem1, 0, elem2, 1);
  // Complete the two element group, then collect graph info.
  test.completeGroup([elem1, elem2]);
  let groupElement = test.makeGroup(items, false);
  deepEqual(groupElement.master, '[vvv,v]');
});

test("circuits.editingModel.wireConsistency", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newInputJunction('[,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      wire = addWire(test, elem1, 0, elem2, 1);

  // Complete the two element group, then collect graph info.
  test.deleteItem(elem1);
  test.makeConsistent();
  ok(!items.includes(wire));
});

test("circuits.editingModel.junctionConsistency", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newInputJunction('[,*]')),
      elem2 = addElement(test, newTypedElement('[v[v,v],v]')),
      wire = addWire(test, elem1, 0, elem2, 1);

  // Complete the two element group, then collect graph info.
  test.makeConsistent();
  deepEqual(elem1.master, '[,[v,v]]');
  test.deleteItem(wire);
  test.makeConsistent();
  deepEqual(elem1.master, '[,*]');
});

test("circuits.editingModel.passThroughConsistency", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      selectionModel = circuit.selectionModel,
      items = circuit.root.items,
      elem1 = addElement(test, newInputJunction('[,*]')),
      elem2 = addElement(test, newOutputJunction('[*,]')),
      wire = addWire(test, elem1, 0, elem2, 0);

  // Group the junctions into [*,*].
  selectionModel.add(elem1);
  selectionModel.add(elem2);
  test.makeGroup(items, false);
  let group = items[0];
  deepEqual(group.master, '[*,*]');
  deepEqual(items.length, 1);

  let output = addElement(test, newOutputJunction('[*,]')),
      elem3 = addElement(test, newTypedElement('[v,[v,v]]')),
      wire1 = addWire(test, group, 0, output, 0),
      wire2 = addWire(test, elem3, 0, group, 0);
  test.makeConsistent();
  deepEqual(output.master, '[[v,v],]');
  test.deleteItem(wire2);
  test.makeConsistent();
  deepEqual(output.master, '[*,]');
});
