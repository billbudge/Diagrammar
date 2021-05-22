// Circuit unit tests

const circuitTests = (function () {
'use strict';

function newCircuit() {
  return {
    root: {  // dataModels default is model.root for data.
      kind: 'circuit',
      x: 0,
      y: 0,
      items: [],
      definitions: [],
    }
  };
}

function stringifyType(type) {
  let s = '[';
  function stringifyName(item) {
    if (item.name)
      s += '(' + item.name + ')';
  }
  function stringifyPin(pin) {
    s += pin.type;
    stringifyName(pin);
  }
  if (type.inputs)
    type.inputs.forEach(input => stringifyPin(input));
  s += ',';
  if (type.outputs)
    type.outputs.forEach(output => stringifyPin(output));
  s += ']';
  stringifyName(type);
  return s;
}

function newElement(x, y) {
  return {
    kind: 'element',
    x: x || 0,
    y: y || 0,
    type: '[v,v]',
  };
}

function newTypedElement(type) {
  return {
    kind: 'element',
    x: 0,
    y: 0,
    type: type,
  };
}

function newInputJunction(type) {
  let element = newTypedElement(type);
  element.elementKind = 'input';
  return element;
}

function newOutputJunction(type) {
  let element = newTypedElement(type);
  element.elementKind = 'output';
  return element;
}

function newApplyJunction() {
  let element = newTypedElement('[*,]');
  element.elementKind = 'apply';
  return element;
}

function newLiteral(value) {
  let element = newTypedElement('[,v(' + value + ')]');
  element.elementKind = 'literal';
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
    kind: 'wire',
    srcId: src ? dataModel.getId(src) : undefined,
    srcPin: srcPin,
    dstId: dst ? dataModel.getId(dst) : undefined,
    dstPin: dstPin,
  }
  observableModel.insertElement(parent, 'items', parent.items.length, wire);
  return wire;
}

function newTestCircuitModel() {
  const model = newCircuit(),
        test = circuits.circuitModel.extend(model);
  model.dataModel.initialize();
  return test;
}

function newTestEditingModel() {
  const model = newCircuit(),
        test = circuits.editingModel.extend(model);
  circuits.circuitModel.extend(model);
  model.dataModel.initialize();

  model.renderer = new circuits.Renderer(model);
  // Context sufficient for tests.
  const ctx = {
    measureText: () => { return { width: 10, height: 10 }},
    save: () => {},
  };
  model.renderer.begin(ctx);
  return test;
}

function doInitialize(item) {
  item.initalized = true;
}

//------------------------------------------------------------------------------

test("circuits.TypeParser.add", function() {
  const test = new circuits.TypeParser();
  const types = [
    '[vv,v](+)',
    '[v(a)v(b),v(c)]',
    '[,[,v][v,v]](@)',
    '[[v,vv(q)](a)v(b),v(c)](foo)',
  ];
  types.forEach(type => deepEqual(stringifyType(test.add(type)), type));
  types.forEach(type => ok(test.has(type)));
  // Make sure subtypes are present.
  ok(test.has('[,v]'));
  ok(test.has('[v,v]'));
  ok(test.has('[v,vv(q)]'));
});

test("circuits.TypeParser.splitType", function() {
  const test = new circuits.TypeParser();
  const tuples = [
    { type: '[vv,v](+)', expected: 3 },
    { type: '[v(a)v(b),v(c)]', expected: 9 },
    { type: '[,[,v][v,v]](@)', expected: 1 },
    { type: '[[v,vv(q)](a)v(b),v(c)](foo)', expected: 17 },
  ];
  tuples.forEach(
      tuple => deepEqual(test.splitType(tuple.type), tuple.expected));
});

test("circuits.TypeParser.trimType", function() {
  const test = new circuits.TypeParser();
  deepEqual(test.trimType('[v,vv](foo)'), '[v,vv]');
  deepEqual(test.trimType('[v,vv]'), '[v,vv]');
  deepEqual(test.trimType('[vvv(foo)'), '[vvv');
});

test("circuits.TypeParser.getUnlabeledType", function() {
  const test = new circuits.TypeParser();
  deepEqual(test.getUnlabeledType('[v,vv](foo)'), '[v,vv]');
  deepEqual(test.getUnlabeledType('[v,vv]'), '[v,vv]');
  deepEqual(test.getUnlabeledType('[vvv(foo)'), '[vvv');
});

test("circuits.TypeParser.addInputToType", function() {
  const test = new circuits.TypeParser();
  const tuples = [
    { type: '[,]', innerType: '*(x)', joined: '[*(x),]' },
    { type: '[vv,v](+)', innerType: '*(x)', joined: '[vv*(x),v](+)' },
  ];
  tuples.forEach(
    tuple => deepEqual(test.addInputToType(tuple.type, tuple.innerType), tuple.joined));
});

test("circuits.TypeParser.addOutputToType", function() {
  const test = new circuits.TypeParser();
  const tuples = [
    { type: '[,]', innerType: '*(x)', joined: '[,*(x)]' },
    { type: '[vv,v](+)', innerType: '*(x)', joined: '[vv,v*(x)](+)' },
  ];
  tuples.forEach(
    tuple => deepEqual(test.addOutputToType(tuple.type, tuple.innerType), tuple.joined));
});

//------------------------------------------------------------------------------

test("circuits.circuitModel.extend", function() {
  let test = newTestCircuitModel();
  ok(test);
  ok(test.model);
  ok(test.model.referencingModel);
});

test("circuits.circuitModel.getGraphInfo", function() {
  const test = newTestCircuitModel(),
        a = addElement(test, newTypedElement('[vv,v]')),
        b = addElement(test, newTypedElement('[vv,v]')),
        a0_b1 = addWire(test, a, 0, b, 1);
  let graph;

  graph = test.getGraphInfo([a, b]);
  ok(graph.elementsAndGroups.has(a));
  ok(graph.elementsAndGroups.has(b));
  deepEqual(graph.elementsAndGroups.size, 2);
  deepEqual(graph.wires.size, 1);
  ok(graph.interiorWires.has(a0_b1));
  deepEqual(graph.interiorWires.size, 1);
  deepEqual(graph.incomingWires.size, 0);
  deepEqual(graph.outgoingWires.size, 0);

  const c = addElement(test, newTypedElement('[,v]')),
        d = addElement(test, newTypedElement('[*,]')),
        c0_a1 = addWire(test, c, 0, a, 1),
        b0_d0 = addWire(test, b, 0, d, 0);

  graph = test.getGraphInfo();
  ok(graph.elementsAndGroups.has(a));
  ok(graph.elementsAndGroups.has(b));
  ok(graph.elementsAndGroups.has(c));
  ok(graph.elementsAndGroups.has(d));
  deepEqual(graph.elementsAndGroups.size, 4);
  ok(graph.interiorWires.has(a0_b1));
  ok(graph.interiorWires.has(c0_a1));
  ok(graph.interiorWires.has(b0_d0));
  deepEqual(graph.wires.size, 3);
  deepEqual(graph.interiorWires.size, 3);
  deepEqual(graph.incomingWires.size, 0);
  deepEqual(graph.outgoingWires.size, 0);

  test.checkConsistency();
});

test("circuits.circuitModel.getSubgraphInfo", function() {
  const test = newTestCircuitModel(),
        a = addElement(test, newTypedElement('[vv,v]')),
        b = addElement(test, newTypedElement('[vv,v]')),
        a0_b1 = addWire(test, a, 0, b, 1);
  let subgraph;

  subgraph = test.getSubgraphInfo([a, b]);
  ok(subgraph.elementsAndGroups.has(a));
  ok(subgraph.elementsAndGroups.has(b));
  deepEqual(subgraph.elementsAndGroups.size, 2);
  ok(subgraph.interiorWires.has(a0_b1));
  deepEqual(subgraph.wires.size, 1);
  deepEqual(subgraph.interiorWires.size, 1);
  deepEqual(subgraph.incomingWires.size, 0);
  deepEqual(subgraph.outgoingWires.size, 0);

  const c = addElement(test, newTypedElement('[,v]')),
        d = addElement(test, newTypedElement('[v,]')),
        c0_a1 = addWire(test, c, 0, a, 1),
        b0_d0 = addWire(test, b, 0, d, 0);

  subgraph = test.getSubgraphInfo([a, b]);
  ok(subgraph.elementsAndGroups.has(a));
  ok(subgraph.elementsAndGroups.has(b));
  deepEqual(subgraph.elementsAndGroups.size, 2);
  ok(subgraph.interiorWires.has(a0_b1));
  deepEqual(subgraph.wires.size, 3);
  deepEqual(subgraph.interiorWires.size, 1);
  deepEqual(subgraph.incomingWires.size, 1);
  deepEqual(subgraph.outgoingWires.size, 1);

  test.checkConsistency();
});

function testIterator(fn, element, items) {
  const iterated = [];
  fn(element, (item) => iterated.push(item));
  deepEqual(items, iterated);
}

test("circuits.circuitModel.inputOutputWireIteration", function() {
  const test = newTestCircuitModel(),
        a = addElement(test, newTypedElement('[vv,v]')),
        b = addElement(test, newTypedElement('[vv,v]')),
        a0_b0 = addWire(test, a, 0, b, 0),
        c = addElement(test, newInputJunction('[,v]')),
        d = addElement(test, newOutputJunction('[v,]')),
        c0_a1 = addWire(test, c, 0, a, 1),
        c0_b1 = addWire(test, c, 0, b, 1),
        b0_d0 = addWire(test, b, 0, d, 0);

  const inputFn = test.forInputWires.bind(test),
        outputFn = test.forOutputWires.bind(test);
  testIterator(inputFn, c, []);
  testIterator(outputFn, c, [c0_a1, c0_b1]);
  testIterator(inputFn, a, [c0_a1]);
  testIterator(outputFn, a, [a0_b0]);
  testIterator(inputFn, b, [a0_b0, c0_b1]);
  testIterator(outputFn, b, [b0_d0]);
});

test("circuits.circuitModel.getConnectedElements", function() {
  const test = newTestCircuitModel(),
        items = test.model.root.items,
        a = addElement(test, newTypedElement('[vv,v]')),
        b = addElement(test, newTypedElement('[vv,v]')),
        elem3 = addElement(test, newTypedElement('[vv,v]')),
        wire1 = addWire(test, a, 0, b, 1),
        wire2 = addWire(test, b, 0, elem3, 1);
  // Get upstream and downstream connected elements from b.
  let all = Array.from(test.getConnectedElements([b], true, true));
  deepEqual(all.length, 3);
  ok(all.includes(a));
  ok(all.includes(b));
  ok(all.includes(elem3));
  // Get only downstream connected elements from b.
  let downstream = Array.from(test.getConnectedElements([b], false, true));
  deepEqual(downstream.length, 2);
  ok(downstream.includes(b));
  ok(downstream.includes(elem3));
});

test("circuits.editingAndTyping", function() {
  const test = newTestEditingModel(),
        circuit = test.model.root,
        circuitModel = test.model.circuitModel;
  // Add an item.
  const a = newTypedElement('[vv,v]');
  test.newItem(a);
  test.addItem(a, circuit);
  // Check type.
  const type = a.type;
  deepEqual(stringifyType(circuits.getType(a)), type);
});

test("circuits.editingModel", function() {
  const test = newTestEditingModel();
  ok(test);
  ok(test.model);
  ok(test.model.dataModel);
  ok(test.model.selectionModel);
});

test("circuits.editingModel.newItem", function() {
  const test = newTestEditingModel();
  test.model.dataModel.addInitializer(doInitialize);
  let a = newElement();
  test.newItem(a);
  ok(a.id);
  ok(a.initalized);
});

test("circuits.editingModel.newElement", function() {
  const test = newTestEditingModel();
  test.model.dataModel.addInitializer(doInitialize);
  let a = test.newElement('[v,v]', 10, 20, 'foo');
  ok(a.id);
  ok(a.initalized);
  deepEqual(a.x, 10);
  deepEqual(a.y, 20);
  deepEqual(a.elementKind, 'foo');
});

test("circuits.editingModel.addItem", function() {
  const test = newTestEditingModel(),
        model = test.model,
        circuit = model.root;
  // Add an item.
  const a = newElement();
  test.newItem(a);

  model.transactionModel.beginTransaction();
  test.addItem(a, circuit);
  model.transactionModel.endTransaction();

  deepEqual(circuit.items, [a]);
  deepEqual(model.hierarchicalModel.getParent(a), circuit);

  model.transactionHistory.undo();
  deepEqual(circuit.items, []);
});

test("circuits.editingModel.deleteItem", function() {
  const test = newTestEditingModel(),
        model = test.model,
        circuit = model.root;
  const a = newElement();
  test.newItem(a);
  test.addItem(a, circuit);

  model.transactionModel.beginTransaction();
  test.deleteItem(a);
  model.transactionModel.endTransaction();

  deepEqual(circuit.items, []);

  model.transactionHistory.undo();
  deepEqual(circuit.items, [a]);
});

test("circuits.editingModel.connectInput", function() {
  const test = newTestEditingModel(),
        model = test.model,
        circuit = model.root;
  // Add an item.
  const a = newElement();
  test.newItem(a);
  test.addItem(a, circuit);

  model.transactionModel.beginTransaction();
  // Connect input 0.
  test.connectInput(a, 0);
  model.transactionModel.endTransaction();

  deepEqual(circuit.items.length, 3);
  let junction = circuit.items[1],
      wire = circuit.items[2];
  deepEqual(junction.elementKind, 'input');
  deepEqual(test.getWireSrc(wire), junction);
  deepEqual(test.getWireDst(wire), a);

  model.transactionHistory.undo();
  deepEqual(circuit.items, [a]);
});

test("circuits.editingModel.connectOutput", function() {
  const test = newTestEditingModel(),
        model = test.model,
        circuit = model.root;
  // Add an item.
  const a = newElement();
  test.newItem(a);
  test.addItem(a, circuit);

  model.transactionModel.beginTransaction();
  // Connect output 0.
  test.connectOutput(a, 0);
  model.transactionModel.endTransaction();

  deepEqual(circuit.items.length, 3);
  let junction = circuit.items[1],
      wire = circuit.items[2];
  deepEqual(junction.elementKind, 'output');
  deepEqual(test.getWireSrc(wire), a);
  deepEqual(test.getWireDst(wire), junction);

  model.transactionHistory.undo();
  deepEqual(circuit.items, [a]);
});

test("circuits.editingModel.getLabel", function() {
  const test = newTestEditingModel();
  const a = addElement(test, newInputJunction('[,v(foo)](bar)'));
  deepEqual(test.getLabel(a), 'foo');

  const b = addElement(test, newOutputJunction('[v(foo),](bar)'));
  deepEqual(test.getLabel(b), 'foo');

  const c = addElement(test, newLiteral(0));
  deepEqual(test.getLabel(c), '0');
});

test("circuits.editingModel.setLabel", function() {
  const test = newTestEditingModel(),
        dataModel = test.model.dataModel;
  const input = addElement(test, newInputJunction('[,*]'));
  deepEqual(test.setLabel(input, 'f'), '[,*(f)]');
  deepEqual(test.setLabel(input, ''), '[,*]');
  input.master = '[,*(f)]';
  dataModel.initialize(input);
  deepEqual(test.setLabel(input, 'bar'), '[,*(bar)]');
  deepEqual(test.setLabel(input, ''), '[,*]');

  const literal = addElement(test, newLiteral(0));
  deepEqual(test.setLabel(literal, '1'), '[,v(1)]');

  const output = addElement(test, newOutputJunction('[*,]'));
  deepEqual(test.setLabel(output, 'f'), '[*(f),]');
  deepEqual(test.setLabel(output, ''), '[*,]');
  output.master = '[*(f),]';
  dataModel.initialize(output);
  deepEqual(test.setLabel(output, 'bar'), '[*(bar),]');
  deepEqual(test.setLabel(output, ''), '[*,]');

  const element = addElement(test, newTypedElement('[vv,vv]'));
  deepEqual(test.setLabel(element, 'f'), '[vv,vv](f)');
  deepEqual(test.setLabel(element, ''), '[vv,vv]');
  element.master = '[vv,vv](f)';
  dataModel.initialize(element);
  deepEqual(test.setLabel(element, 'bar'), '[vv,vv](bar)');
  deepEqual(test.setLabel(element, ''), '[vv,vv]');
});

test("circuits.editingModel.changeType", function() {
  const test = newTestEditingModel(),
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
  const test = newTestEditingModel(),
        model = test.model,
        items = model.root.items,
        a = addElement(test, newTypedElement('[vv,v]')),
        b = addElement(test, newTypedElement('[vv,v]')),
        wire = addWire(test, a, 0, b, 1);
  model.transactionModel.beginTransaction();
  // Complete the two element group.
  test.completeGroup([a, b]);
  model.transactionModel.endTransaction();

  deepEqual(items.length, 11);
  deepEqual(items[0], a);
  deepEqual(items[1], b);
  deepEqual(items[2], wire);

  model.transactionHistory.undo();
  deepEqual(items, [a, b, wire]);
});

test("circuits.editingModel.openElements", function() {
  const test = newTestEditingModel(),
        items = test.model.root.items,
        a = addElement(test, newTypedElement('[vv,v]')),
        b = addElement(test, newTypedElement('[v(a)v(b),v(c)]')),
        wire = addWire(test, a, 0, b, 1);
  // Open element #2.
  test.openElements([b]);
  ok(items.includes(a));
  ok(items.includes(wire));
  deepEqual(items.length, 3);
  deepEqual(test.getWireSrc(wire), a);
  deepEqual(wire.srcPin, 0);
  deepEqual(test.getWireDst(wire), items[1]);
  deepEqual(wire.dstPin, 1);
  let openElement = items[1];
  deepEqual(openElement.type, '[v(a)v(b)[vv,v],v(c)]');
});

test("circuits.editingModel.replaceElement", function() {
  const test = newTestEditingModel(),
        model = test.model,
        items = model.root.items,
        a = addElement(test, newTypedElement('[vv,v]')),
        b = addElement(test, newTypedElement('[v(a)v(b),v(c)]')),
        wire = addWire(test, a, 0, b, 1),
        replacement1 = addElement(test, newTypedElement('[vv,v]')),
        replacement2 = addElement(test, newTypedElement('[,v]'));
  model.transactionModel.beginTransaction();
  // Replace a with replacement1. The wire should still be connected.
  test.replaceElement(a, replacement1);
  model.transactionModel.endTransaction();

  deepEqual(items, [replacement1, b, wire, replacement2]);
  deepEqual(test.getWireSrc(wire), replacement1);
  deepEqual(wire.srcPin, 0);

  model.transactionModel.beginTransaction();
  // Replace b with replacement2. The wire should be disconnected.
  test.replaceElement(b, replacement2);
  model.transactionModel.endTransaction();

  deepEqual(items, [replacement1, replacement2]);

  model.transactionHistory.undo();
  model.transactionHistory.undo();
  deepEqual(items, [a, b, wire, replacement1, replacement2]);
});

test("circuits.editingModel.build", function() {
  const test = newTestEditingModel(),
        model = test.model,
        items = model.root.items,
        elem = addElement(test, newTypedElement('[vv,v]')),
        input1 = addElement(test, newInputJunction('[*,v]')),
        input2 = addElement(test, newInputJunction('[*,v(f)]')),
        output = addElement(test, newOutputJunction('[v,*]')),
        wire1 = addWire(test, input1, 0, elem, 0),
        wire2 = addWire(test, input2, 0, elem, 1),
        wire3 = addWire(test, elem, 0, output, 0);
  model.transactionModel.beginTransaction();
  const groupElement = test.build([input1, input2, elem, output]);
  model.transactionModel.endTransaction();

  deepEqual(items, [groupElement]);
  deepEqual(groupElement.type, '[vv(f),v]');

  model.transactionHistory.undo();
  deepEqual(items, [elem, input1, input2, output, wire1, wire2, wire3]);
});

test("circuits.editingModel.wireConsistency", function() {
  const test = newTestEditingModel(),
        model = test.model,
        items = model.root.items,
        a = addElement(test, newInputJunction('[,v]')),
        b = addElement(test, newTypedElement('[vv,v]')),
        wire = addWire(test, a, 0, b, 1);

  // Remove element and make sure dependent wire is also deleted.
  model.transactionModel.beginTransaction();
  test.deleteItem(a);
  model.transactionModel.endTransaction();

  deepEqual(items, [b]);

  model.transactionHistory.undo();
  deepEqual(items, [a, b, wire]);
});

test("circuits.editingModel.wireRollback", function() {
  const test = newTestEditingModel(),
        model = test.model,
        items = model.root.items,
        a = addElement(test, newInputJunction('[,v]')),
        b = addElement(test, newTypedElement('[vv,v]'));

  // Rollback new wire transaction.
  model.transactionModel.beginTransaction();
  const wire = addWire(test, a, 0 /* , undefined, undefined */);
  model.observableModel.changeValue(wire, 'dstId', model.dataModel.getId(b));
  model.observableModel.changeValue(wire, 'dstPin', 0);
  model.transactionModel.cancelTransaction();
  ok(model.circuitModel.checkConsistency());

  deepEqual(items, [a, b]);
});

test("circuits.editingModel.groupConsistency", function() {
  const test = newTestEditingModel(),
        model = test.model,
        items = model.root.items,
        a = addElement(test, newTypedElement('[vv,v]'));

  // Make a group, and add two 'self' instances to it.
  model.transactionModel.beginTransaction();
  const group = test.build([a]),
        inst1 = test.newElement(group.type, 10, 20),
        inst2 = test.newElement(group.type, 30, 40);
  deepEqual(group.items, [a]);
  test.createGroupInstance(group, inst1);
  test.addItem(inst1, group);
  test.createGroupInstance(group, inst2);
  deepEqual(inst1.groupId, inst2.groupId);
  // TODO update group items too.
  // deepEqual(inst1.definitionId, inst2.definitionId);
  test.addItem(inst2, group);
  model.transactionModel.endTransaction();

  // Add an interior wire connecting the 'self' instances. Make sure it's
  // reparented to the group.
  model.transactionModel.beginTransaction();
  const wire1 = test.addItem(test.newWire(inst1.id, 0, inst2.id, 0));
  model.transactionModel.endTransaction();

  deepEqual(group.items, [a, inst1, inst2, wire1]);

  // Add a wire that changes the group type. The instances are replaced.
  model.transactionModel.beginTransaction();
  const wire2 = test.addItem(test.newWire(a.id, 0, inst1.id, 0), group);
  model.transactionModel.endTransaction();

  const inst1b = group.items[1];
  const inst2b = group.items[2];
  const wire1b = group.items[3];
  deepEqual(inst1b.type, '[vv,]');
  deepEqual(inst2b.type, '[vv,]');
  deepEqual(group.items, [a, inst1b, inst2b, wire1b]);

  // Undo adding both wires.
  model.transactionHistory.undo();
  model.transactionHistory.undo();
  deepEqual(group.items, [a, inst1, inst2]);

  // Try to create a type-changing wire again.
  model.transactionModel.beginTransaction();
  const wire2b = test.addItem(test.newWire(a.id, 0, inst1.id, 0));
  model.transactionModel.endTransaction();
});

// TODO fix these tests to work with new grouping

// test("circuits.editingModel.findSrcType", function() {
//   let test = newTestEditingModel(),
//       circuit = test.model,
//       items = circuit.root.items,
//       a = addElement(test, newInputJunction('[,*]')),
//       b = addElement(test, newOutputJunction('[*,]')),
//       wire = addWire(test, a, 0, b, 0),
//       group = addElement(test, test.build([a, b])),
//       elem3 = {
//         kind: 'element',
//         x: 0,
//         y: 0,
//         master: group.master,
//         [_master]: circuits.getType(group),
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
//         kind: 'element',
//         x: newGroupInstanceInfo.x,
//         y: newGroupInstanceInfo.y,
//         master: group.master,
//         [_master]: circuits.getType(group),
//         state: 'palette',
//       };

// test("circuits.editingModel.findDstType", function() {
//   let test = newTestEditingModel(),
//       circuit = test.model,
//       items = circuit.root.items,
//       a = addElement(test, newInputJunction('[,*]')),
//       b = addElement(test, newOutputJunction('[*,]')),
//       wire = addWire(test, a, 0, b, 0),
//       group = test.build([a, b]),
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
