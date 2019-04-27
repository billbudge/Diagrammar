
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

test("circuits.masteringModel.unlabeled", function() {
  let circuit = newCircuit();
  let test = circuits.masteringModel.extend(circuit);
  deepEqual(test.unlabeled('[v,vv](foo)'), '[v,vv]');
  deepEqual(test.unlabeled('[v,vv]'), '[v,vv]');
});

test("circuits.masteringModel.relabel", function() {
  let circuit = newCircuit();
  let test = circuits.masteringModel.extend(circuit);
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
  let circuit = newCircuit();
  let test = circuits.masteringModel.extend(circuit);
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

test("circuits.editingModel.connectInput", function() {
  let circuit = newCircuit();
  circuits.masteringModel.extend(circuit);
  circuits.viewModel.extend(circuit);
  let test = circuits.editingModel.extend(circuit);
  circuit.dataModel.initialize();
  // Add an item.
  let item1 = newElement();
  test.newItem(item1);
  test.addItem(item1, circuit.root);
  console.log(item1);
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
  let circuit = newCircuit();
  circuits.masteringModel.extend(circuit);
  circuits.viewModel.extend(circuit);
  let test = circuits.editingModel.extend(circuit);
  circuit.dataModel.initialize();
  // Add an item.
  let item1 = newElement();
  test.newItem(item1);
  test.addItem(item1, circuit.root);
  console.log(item1);
  // Connect output 0.
  test.connectOutput(item1, 0);
  deepEqual(circuit.root.items.length, 3);
  let junction = circuit.root.items[1],
      wire = circuit.root.items[2];
  deepEqual(junction.elementType, 'output');
  deepEqual(test.getWireSrc(wire), item1);
  deepEqual(test.getWireDst(wire), junction);
});


