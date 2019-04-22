
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

function initialize(item) {
  item.initalized = true;
}

test("circuit.editingModel", function() {
  let circuit = newCircuit();
  let test = circuits.editingModel.extend(circuit);
  ok(test);
  ok(test.model);
  ok(test.model.dataModel);
  ok(test.model.selectionModel);
});

test("circuit.editingModel.newItem", function() {
  let circuit = newCircuit();
  let test = circuits.editingModel.extend(circuit),
      dataModel = test.model.dataModel;
  dataModel.addInitializer(initialize);
  let item1 = newElement();
  test.newItem(item1);
  ok(item1.id);
  ok(item1.initalized);
});

test("circuit.editingModel.addDeleteItem", function() {
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

test("circuit.editingModel.connectInput", function() {
  let circuit = newCircuit();
  let test = circuits.editingModel.extend(circuit);
  circuit.dataModel.initialize();
  // Add an item.
  let item1 = newElement();
  test.newItem(item1);
  test.addItem(item1, circuit.root);
  // Connect input 0.
  test.connectInput(item1, 0);
  deepEqual(circuit.root.items.length, 3);
});


