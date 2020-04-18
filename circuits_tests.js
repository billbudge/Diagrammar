// Circuit unit tests

const circuitTests = (function () {
'use strict';

function newCircuit() {
  return {
    root: {  // dataModels default is model.root for data.
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

function newApplyJunction() {
  let element = newTypedElement('[*,]');
  element.elementType = 'apply';
  return element;
}

function newLiteral(value) {
  let element = newTypedElement('[,v(' + value + ')]');
  element.elementType = 'literal';
  return element;
}

function newTestSignatureModel() {
  let circuit = newCircuit();
  let test = circuits.signatureModel.extend(circuit);
  return test;
}

function addElement(test, element) {
  const model = test.model,
        dataModel = model.dataModel,
        hierarchicalModel = model.hierarchicalModel,
        observableModel = model.observableModel,
        parent = dataModel.root;
  dataModel.assignId(element);
  dataModel.initialize(element);
  observableModel.insertElement(parent, 'items', parent.items.length, element);
  return element;
}

function addWire(test, src, srcPin, dst, dstPin) {
  const model = test.model,
        dataModel = model.dataModel,
        observableModel = model.observableModel,
        parent = dataModel.root;
  let wire = {
    type: 'wire',
    srcId: dataModel.getId(src),
    srcPin: srcPin,
    dstId: dataModel.getId(dst),
    dstPin: dstPin,
  }
  observableModel.insertElement(parent, 'items', parent.items.length, wire);
  return wire;
}

function newTestCircuitModel() {
  let circuit = newCircuit();
  let test = circuits.circuitModel.extend(circuit),
      dataModel = test.model.dataModel;
  circuits.signatureModel.extend(circuit);
  circuit.dataModel.initialize();
  return test;
}

function newTestEditingModel() {
  let circuit = newCircuit();
  let test = circuits.editingModel.extend(circuit),
      dataModel = test.model.dataModel;
  circuits.signatureModel.extend(circuit);
  circuits.viewModel.extend(circuit);
  circuit.dataModel.initialize();
  circuit.viewModel.initialize();
  return test;
}

function doInitialize(item) {
  item.initalized = true;
}

test("circuits.signatureModel", function() {
  let circuit = newCircuit();
  let test = circuits.signatureModel.extend(circuit);
  ok(test);
  ok(test.model);
  ok(test.model.dataModel);
});

test("circuits.signatureModel", function() {
  let test = newTestSignatureModel();
  let types = [
    '[vv,v](+)',
    '[v(a)v(b),v(c)]',
    '[,[,v][v,v]](@)',
    '[[v,vv(q)](a)v(b),v(c)](foo)',
  ];
  types.forEach(
    type => deepEqual(stringifyMaster(test.decodeType(type)), type));
});

test("circuits.signatureModel.unlabelType", function() {
  let test = newTestSignatureModel();
  deepEqual(test.unlabelType('[v,vv](foo)'), '[v,vv]');
  deepEqual(test.unlabelType('[v,vv]'), '[v,vv]');
  deepEqual(test.unlabelType('[vvv(foo)'), '[vvv');
});

test("circuits.signatureModel.getSignature", function() {
  let test = newTestSignatureModel();
  deepEqual(test.getSignature('[v,vv](foo)'), '[v,vv]');
  deepEqual(test.getSignature('[v(a),v(b)v](foo)'), '[v,vv]');
  deepEqual(test.getSignature('[[v,v](a),vv](foo)'), '[[v,v],vv]');
});

test("circuits.signatureModel.splitType", function() {
  let test = newTestSignatureModel();
  let tuples = [
    { type: '[vv,v](+)', split: 3 },
    { type: '[v(a)v(b),v(c)]', split: 9 },
    { type: '[,[,v][v,v]](@)', split: 1 },
    { type: '[[v,vv(q)](a)v(b),v(c)](foo)', split: 17 },
  ];
  tuples.forEach(
    tuple => deepEqual(test.splitType(tuple.type), tuple.split));
});

test("circuits.signatureModel.addInputToType", function() {
  let test = newTestSignatureModel();
  let tuples = [
    { type: '[,]', innerType: '*(x)', joined: '[*(x),]' },
    { type: '[vv,v](+)', innerType: '*(x)', joined: '[vv*(x),v](+)' },
  ];
  tuples.forEach(
    tuple => deepEqual(test.addInputToType(tuple.type, tuple.innerType), tuple.joined));
});

test("circuits.signatureModel.addOutputToType", function() {
  let test = newTestSignatureModel();
  let tuples = [
    { type: '[,]', innerType: '*(x)', joined: '[,*(x)]' },
    { type: '[vv,v](+)', innerType: '*(x)', joined: '[vv,v*(x)](+)' },
  ];
  tuples.forEach(
    tuple => deepEqual(test.addOutputToType(tuple.type, tuple.innerType), tuple.joined));
});

test("circuits.circuitModel.extend", function() {
  let test = newTestCircuitModel();
  ok(test);
  ok(test.model);
  ok(test.model.dataModel);
  ok(test.model.observableModel);
  ok(test.model.referencingModel);
  ok(test.model.changeModel);
});

// TODO circuitModel tests.

test("circuits.circuitModel.getGraphInfo", function() {
  const test = newTestCircuitModel(),
        circuit = test.model,
        items = circuit.root.items,
        elem1 = addElement(test, newTypedElement('[vv,v]')),
        elem2 = addElement(test, newTypedElement('[vv,v]')),
        wire1 = addWire(test, elem1, 0, elem2, 1);
  let graph;

  graph = test.getGraphInfo([elem1, elem2]);
  ok(graph.elementsAndGroups.has(elem1));
  ok(graph.elementsAndGroups.has(elem2));
  deepEqual(graph.elementsAndGroups.size, 2);
  deepEqual(graph.wires.size, 1);
  ok(graph.interiorWires.has(wire1));
  deepEqual(graph.interiorWires.size, 1);
  deepEqual(graph.incomingWires.size, 0);
  deepEqual(graph.outgoingWires.size, 0);

  const input = addElement(test, newInputJunction('[,*]')),
        output = addElement(test, newOutputJunction('[*,]')),
        wire2 = addWire(test, input, 0, elem1, 1),
        wire3 = addWire(test, elem2, 0, output, 0);

  graph = test.getGraphInfo();
  ok(graph.elementsAndGroups.has(elem1));
  ok(graph.elementsAndGroups.has(elem2));
  ok(graph.elementsAndGroups.has(input));
  ok(graph.elementsAndGroups.has(output));
  deepEqual(graph.elementsAndGroups.size, 4);
  ok(graph.interiorWires.has(wire1));
  ok(graph.interiorWires.has(wire2));
  ok(graph.interiorWires.has(wire3));
  deepEqual(graph.wires.size, 3);
  deepEqual(graph.interiorWires.size, 3);
  deepEqual(graph.incomingWires.size, 0);
  deepEqual(graph.outgoingWires.size, 0);
});

test("circuits.circuitModel.getSubgraphInfo", function() {
  const test = newTestCircuitModel(),
        circuit = test.model,
        items = circuit.root.items,
        elem1 = addElement(test, newTypedElement('[vv,v]')),
        elem2 = addElement(test, newTypedElement('[vv,v]')),
        wire1 = addWire(test, elem1, 0, elem2, 1);
  let subgraph;

  subgraph = test.getSubgraphInfo([elem1, elem2]);
  ok(subgraph.elementsAndGroups.has(elem1));
  ok(subgraph.elementsAndGroups.has(elem2));
  deepEqual(subgraph.elementsAndGroups.size, 2);
  ok(subgraph.interiorWires.has(wire1));
  deepEqual(subgraph.wires.size, 1);
  deepEqual(subgraph.interiorWires.size, 1);
  deepEqual(subgraph.incomingWires.size, 0);
  deepEqual(subgraph.outgoingWires.size, 0);

  const input = addElement(test, newInputJunction('[,*]')),
        output = addElement(test, newOutputJunction('[*,]')),
        wire2 = addWire(test, input, 0, elem1, 1),
        wire3 = addWire(test, elem2, 0, output, 0);

  subgraph = test.getSubgraphInfo([elem1, elem2]);
  ok(subgraph.elementsAndGroups.has(elem1));
  ok(subgraph.elementsAndGroups.has(elem2));
  deepEqual(subgraph.elementsAndGroups.size, 2);
  ok(subgraph.interiorWires.has(wire1));
  deepEqual(subgraph.wires.size, 3);
  deepEqual(subgraph.interiorWires.size, 1);
  deepEqual(subgraph.incomingWires.size, 1);
  deepEqual(subgraph.outgoingWires.size, 1);
});

function testIterator(fn, element, items) {
  const iterated = [];
  fn(element, (item) => iterated.push(item));
  deepEqual(items, iterated);
}

test("circuits.circuitModel.iterators", function() {
  const test = newTestCircuitModel(),
        circuit = test.model,
        items = circuit.root.items,
        elem1 = addElement(test, newTypedElement('[vv,v]')),
        elem2 = addElement(test, newTypedElement('[vv,v]')),
        wire1 = addWire(test, elem1, 0, elem2, 0),
        input = addElement(test, newInputJunction('[,*]')),
        output = addElement(test, newOutputJunction('[*,]')),
        wire2 = addWire(test, input, 0, elem1, 1),
        wire3 = addWire(test, input, 0, elem2, 1),
        wire4 = addWire(test, elem2, 0, output, 0);

  let subgraph = test.getSubgraphInfo([elem1, elem2]);
  testIterator(subgraph.iterators.forInputWires, input, []);
  testIterator(subgraph.iterators.forOutputWires, input, [wire2, wire3]);
  testIterator(subgraph.iterators.forInputWires, elem1, [wire2]);
  testIterator(subgraph.iterators.forOutputWires, elem1, [wire1]);
  testIterator(subgraph.iterators.forInputWires, elem2, [wire1, wire3]);
  testIterator(subgraph.iterators.forOutputWires, elem2, [wire4]);
});

test("circuits.editingAndMastering", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      signatureModel = test.model.signatureModel;
  let types = [], masters = [];
  function onMasterInserted(type, master) {
    types.push(type);
    masters.push(master);
  }
  signatureModel.addHandler('masterInserted', onMasterInserted);

  // Add an item.
  let item1 = newTypedElement('[vv,v]');
  test.newItem(item1);
  test.addItem(item1, circuit.root);
  // Check master
  let type = item1.master;
  deepEqual(stringifyMaster(signatureModel.getMaster(item1)), type);
  deepEqual(types, [type]);
  deepEqual(masters, [signatureModel.getMaster(item1)]);
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

test("circuits.editingModel.getLabel", function() {
  let test = newTestEditingModel();
  let input = addElement(test, newInputJunction('[,*(foo)](bar)'));
  deepEqual(test.getLabel(input), 'foo');

  let output = addElement(test, newOutputJunction('[*(foo),](bar)'));
  deepEqual(test.getLabel(output), 'foo');

  let literal = addElement(test, newLiteral(0));
  deepEqual(test.getLabel(literal), '0');
});

test("circuits.editingModel.setLabel", function() {
  let test = newTestEditingModel(),
      dataModel = test.model.dataModel;
  let input = addElement(test, newInputJunction('[,*]'));
  deepEqual(test.setLabel(input, 'f'), '[,*(f)]');
  deepEqual(test.setLabel(input, ''), '[,*]');
  input.master = '[,*(f)]';
  dataModel.initialize(input);
  deepEqual(test.setLabel(input, 'bar'), '[,*(bar)]');
  deepEqual(test.setLabel(input, ''), '[,*]');

  let literal = addElement(test, newLiteral(0));
  deepEqual(test.setLabel(literal, '1'), '[,v(1)]');

  let output = addElement(test, newOutputJunction('[*,]'));
  deepEqual(test.setLabel(output, 'f'), '[*(f),]');
  deepEqual(test.setLabel(output, ''), '[*,]');
  output.master = '[*(f),]';
  dataModel.initialize(output);
  deepEqual(test.setLabel(output, 'bar'), '[*(bar),]');
  deepEqual(test.setLabel(output, ''), '[*,]');

  let element = addElement(test, newTypedElement('[vv,vv]'));
  deepEqual(test.setLabel(element, 'f'), '[vv,vv](f)');
  deepEqual(test.setLabel(element, ''), '[vv,vv]');
  element.master = '[vv,vv](f)';
  dataModel.initialize(element);
  deepEqual(test.setLabel(element, 'bar'), '[vv,vv](bar)');
  deepEqual(test.setLabel(element, ''), '[vv,vv]');
});

test("circuits.editingModel.changeType", function() {
  let test = newTestEditingModel(),
      dataModel = test.model.dataModel;
  let input = addElement(test, newInputJunction('[,*(f)]'));
  deepEqual(test.changeType(input, '[v,v]'), '[,[v,v](f)]');
  deepEqual(test.changeType(input, '*'), '[,*(f)]');
  input.master = '[,[v,v](f)]';
  dataModel.initialize(input);
  deepEqual(test.changeType(input, '*'), '[,*(f)]');
  deepEqual(test.changeType(input, 'v'), '[,v(f)]');

  let output = addElement(test, newOutputJunction('[*(f),]'));
  deepEqual(test.changeType(output, '[v,v]'), '[[v,v](f),]');
  deepEqual(test.changeType(output, '*'), '[*(f),]');
  output.master = '[[v,v](f),]';
  dataModel.initialize(output);
  deepEqual(test.changeType(output, '*'), '[*(f),]');
  deepEqual(test.changeType(output, 'v'), '[v(f),]');
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
  let all = Array.from(test.getConnectedElements([elem2], true, true));
  deepEqual(all.length, 3);
  ok(all.includes(elem1));
  ok(all.includes(elem2));
  ok(all.includes(elem3));
  // Get only downstream connected elements from elem2.
  let downstream = Array.from(test.getConnectedElements([elem2], false, true));
  deepEqual(downstream.length, 2);
  ok(downstream.includes(elem2));
  ok(downstream.includes(elem3));
});

test("circuits.editingModel.openElements", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[v(a)v(b),v(c)]')),
      wire = addWire(test, elem1, 0, elem2, 1);
  // Open element #2.
  test.openElements([elem2]);
  ok(items.includes(elem1));
  ok(items.includes(wire));
  deepEqual(items.length, 3);
  deepEqual(test.getWireSrc(wire), elem1);
  deepEqual(wire.srcPin, 0);
  deepEqual(test.getWireDst(wire), items[2]);
  deepEqual(wire.dstPin, 1);
  let openElement = items[2];
  deepEqual(openElement.master, '[v(a)v(b)[vv,v],v(c)]');
});

test("circuits.editingModel.closeFunction", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      wire = addWire(test, elem1, 0, elem2, 1);
  // Close element #2.
  test.closeElements([elem2]);
  deepEqual(items.length, 3);
  deepEqual(items[0], elem1);
  deepEqual(test.getWireSrc(wire), elem1);
  deepEqual(wire.srcPin, 0);
  deepEqual(test.getWireDst(wire), items[2]);
  deepEqual(wire.dstPin, 0);
  let closedElement = items[2];
  deepEqual(closedElement.master, '[v,[v,v]]');
});

test("circuits.editingModel.replaceElement", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newTypedElement('[vv,v]')),
      elem2 = addElement(test, newTypedElement('[v(a)v(b),v(c)]')),
      wire = addWire(test, elem1, 0, elem2, 1),
      replacement1 = addElement(test, newTypedElement('[vv,v]')),
      replacement2 = addElement(test, newTypedElement('[,v]'));
  // Replace elem1 with replacement1. The wire should still be connected.
  test.replaceElement(elem1, replacement1);
  deepEqual(items.length, 4);
  ok (!items.includes(elem1));
  ok(items.includes(replacement1));
  ok(items.includes(wire));
  deepEqual(test.getWireSrc(wire), replacement1);
  deepEqual(wire.srcPin, 0);
  test.replaceElement(elem2, replacement2);
  deepEqual(items.length, 2);
  ok(!items.includes(elem2));
  ok(items.includes(replacement2));
  ok(!items.includes(wire));
});

test("circuits.editingModel.build", function() {
  const test = newTestEditingModel(),
        circuit = test.model,
        items = circuit.root.items,
        elem = addElement(test, newTypedElement('[vv,v]')),
        input1 = addElement(test, newInputJunction('[*,v]')),
        input2 = addElement(test, newInputJunction('[*,v(f)]')),
        output = addElement(test, newOutputJunction('[v,*]')),
        wire1 = addWire(test, input1, 0, elem, 0),
        wire2 = addWire(test, input2, 0, elem, 1),
        wire3 = addWire(test, elem, 0, output, 0);
  const groupElement = test.build([input1, input2, elem, output]);
  deepEqual(groupElement.master, '[vv(f),v]');
  ok(items.length === 0);
});

test("circuits.editingModel.wireConsistency", function() {
  let test = newTestEditingModel(),
      circuit = test.model,
      items = circuit.root.items,
      elem1 = addElement(test, newInputJunction('[,v]')),
      elem2 = addElement(test, newTypedElement('[vv,v]')),
      wire = addWire(test, elem1, 0, elem2, 1);

  // Remove element and make sure dependent wire is also deleted.
  test.deleteItem(elem1);
  test.makeConsistent();
  ok(!items.includes(wire));
});

// TODO fix these tests to work with new grouping

// test("circuits.editingModel.findSrcType", function() {
//   let test = newTestEditingModel(),
//       circuit = test.model,
//       items = circuit.root.items,
//       elem1 = addElement(test, newInputJunction('[,*]')),
//       elem2 = addElement(test, newOutputJunction('[*,]')),
//       wire = addWire(test, elem1, 0, elem2, 0),
//       group = addElement(test, test.build([elem1, elem2])),
//       elem3 = {
//         type: 'element',
//         x: 0,
//         y: 0,
//         master: group.master,
//         [_master]: getMaster(group),
//       },
//       expectedType = '[v,v]',
//       elem4 = addElement(test, newTypedElement('[,' + expectedType + ']')),
//       elem5 = addElement(test, newOutputJunction('[*,]')),
//       wire2 = addWire(test, elem4, 0, elem3, 0),
//       wire3 = addWire(test, elem3, 0, elem5, 0);

//   test.createGroupInstance(group, elem3);
//   let actualType = test.findSrcType(wire3)
//   deepEqual(actualType, expectedType);
// });
//       item = mouseHitInfo.item = {
//         type: 'element',
//         x: newGroupInstanceInfo.x,
//         y: newGroupInstanceInfo.y,
//         master: group.master,
//         [_master]: getMaster(group),
//         state: 'palette',
//       };

// test("circuits.editingModel.findDstType", function() {
//   let test = newTestEditingModel(),
//       circuit = test.model,
//       items = circuit.root.items,
//       elem1 = addElement(test, newInputJunction('[,*]')),
//       elem2 = addElement(test, newOutputJunction('[*,]')),
//       wire = addWire(test, elem1, 0, elem2, 0),
//       group = test.build([elem1, elem2]),
//       elem3 = addElement(test, group),
//       expectedType = '[v,v]',
//       elem4 = addElement(test, newTypedElement('[' + expectedType + ',]')),
//       elem5 = addElement(test, newInputJunction('[,*]')),
//       wire2 = addWire(test, elem5, 0, elem3, 0),
//       wire3 = addWire(test, elem3, 0, elem4, 0),
//       actualType = test.findDstType(wire2);

//   deepEqual(actualType, expectedType);
// });

})();
