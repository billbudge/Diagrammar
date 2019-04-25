
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

function newElement(x, y, inputs, outputs) {
  return {
    type: "element",
    x: x || 0,
    y: y || 0,
    master: '$',
    inputs: inputs || [{ type: 'v', }],
    outputs: outputs || [{ type: 'v', }],
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
  let circuit = newCircuit();
  let test = circuits.masteringModel.extend(circuit);
  let types = [
    '[vv,v](+)',
    '[v(a)v(b),v(c)]',
    '[,[,v][v,v]](@)',
    '[[v,vv(q)](a)v(b),v(c)](foo)',
  ];
  types.forEach(
    type => deepEqual(stringifyMaster(test.decodeType(type)), type));
});

test("circuits.editingAndMastering", function() {
  let circuit = newCircuit();
  let editingModel = circuits.editingModel.extend(circuit);
  let test = circuits.masteringModel.extend(circuit);
  circuit.dataModel.initialize();
  let types = [], masters = [];
  function onMasterInserted(type, master) {
    types.push(type);
    masters.push(master);
  }
  test.addHandler('masterInserted', onMasterInserted);

  // Add an item.
  let item1 = newTypedElement('[vv,v]');
  editingModel.newItem(item1);
  editingModel.addItem(item1, circuit.root);
  // Check master
  let type = item1.master;
  deepEqual(stringifyMaster(test.getMaster(item1)), type);
  deepEqual(types, [type]);
  deepEqual(masters, [test.getMaster(item1)]);
});

test("circuits.editingModel", function() {
  let circuit = newCircuit();
  let test = circuits.editingModel.extend(circuit);
  ok(test);
  ok(test.model);
  ok(test.model.dataModel);
  ok(test.model.selectionModel);
});

test("circuits.editingModel.newItem", function() {
  let circuit = newCircuit();
  let test = circuits.editingModel.extend(circuit),
      dataModel = test.model.dataModel;
  dataModel.addInitializer(initialize);
  let item1 = newElement();
  test.newItem(item1);
  ok(item1.id);
  ok(item1.initalized);
});

test("circuits.editingModel.addDeleteItem", function() {
  let circuit = newCircuit();
  let test = circuits.editingModel.extend(circuit);
  circuit.dataModel.initialize();
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

// test("circuits.editingModel.connectInput", function() {
//   let circuit = newCircuit();
//   let test = circuits.editingModel.extend(circuit);
//   circuit.dataModel.initialize();
//   // Add an item.
//   let item1 = newElement();
//   test.newItem(item1);
//   test.addItem(item1, circuit.root);
//   // Connect input 0.
//   test.connectInput(item1, 0);
//   deepEqual(circuit.root.items.length, 3);
// });


