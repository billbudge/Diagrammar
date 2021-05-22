// Statechart unit tests

const statechartTests = (function () {
'use strict';

function newStatechart() {
  return {
    root: {  // dataModels default is model.root for data.
      type: 'statechart',
      x: 0,
      y: 0,
      items: []
    }
  };
}

let id = 1;
function newState(x, y) {
  return {
    type: "state",
    id: id++,
    x: x || 0,
    y: y || 0,
  };
}

function newPseudoState(type, x, y) {
  return {
    type: type,
    x: x || 0,
    y: y || 0,
  };
}

function getId(item) {
  return item.id;
}

function newTransition(src, dst) {
  return {
    type: 'transition',
    srcId: getId(src),
    dstId: getId(dst),
  }
}

function addState(test, state) {
  const model = test.model,
        dataModel = model.dataModel,
        hierarchicalModel = model.hierarchicalModel,
        observableModel = model.observableModel,
        parent = dataModel.root;
  dataModel.assignId(state);
  dataModel.initialize(state);
  observableModel.insertElement(parent, 'items', parent.items.length, state);
  return state;
}

function addTransition(test, transition) {
  const model = test.model,
        observableModel = model.observableModel,
        parent = model.dataModel.root;
  observableModel.insertElement(parent, 'items', parent.items.length, transition);
  return transition;
}

function newTestStatechartModel() {
  let statechart = newStatechart();
  let test = statecharts.statechartModel.extend(statechart),
      dataModel = test.model.dataModel;
  statechart.dataModel.initialize();
  return test;
}

function newTestEditingModel() {
  let statechart = newStatechart();
  let test = statecharts.editingModel.extend(statechart),
      model = test.model;
  statecharts.statechartModel.extend(statechart);
  test.model.dataModel.initialize();

  // Context sufficient for tests.
  const ctx = {
    measureText: () => { return { width: 10, height: 10 }},
    save: () => {},
  };
  model.renderer = new statecharts.Renderer(model);
  model.renderer.begin(ctx);
  return test;
}

test("statecharts.statechartModel.extend", function() {
  let test = newTestStatechartModel();
  ok(test);
  ok(test.model);
  ok(test.model.referencingModel);
});

test("statecharts.statechartModel.extend", function() {
  let test = newTestStatechartModel();
  ok(test);
  ok(test.model);
  ok(test.model.referencingModel);
});

test("statecharts.statechartModel.getGraphInfo", function() {
  const test = newTestStatechartModel(),
        model = test.model,
        items = model.root.items,
        state1 = addState(test, newState()),
        state2 = addState(test, newState()),
        transition1 = addTransition(test, newTransition(state1, state2));
  let graph;

  graph = test.getGraphInfo([state1, state2]);
  ok(graph.statesAndStatecharts.has(state1));
  ok(graph.statesAndStatecharts.has(state2));
  deepEqual(graph.statesAndStatecharts.size, 2);
  deepEqual(graph.transitions.size, 1);
  ok(graph.interiorTransitions.has(transition1));
  deepEqual(graph.interiorTransitions.size, 1);
  deepEqual(graph.inTransitions.size, 0);
  deepEqual(graph.outTransitions.size, 0);

  const input = addState(test, newState()),
        output = addState(test, newState()),
        transition2 = addTransition(test, newTransition(input, state1)),
        transition3 = addTransition(test, newTransition(state2, output));

  graph = test.getGraphInfo();
  ok(graph.statesAndStatecharts.has(state1));
  ok(graph.statesAndStatecharts.has(state2));
  ok(graph.statesAndStatecharts.has(input));
  ok(graph.statesAndStatecharts.has(output));
  deepEqual(graph.statesAndStatecharts.size, 4);
  ok(graph.interiorTransitions.has(transition1));
  ok(graph.interiorTransitions.has(transition2));
  ok(graph.interiorTransitions.has(transition3));
  deepEqual(graph.transitions.size, 3);
  deepEqual(graph.interiorTransitions.size, 3);
  deepEqual(graph.inTransitions.size, 0);
  deepEqual(graph.outTransitions.size, 0);
});

test("statecharts.statechartModel.getSubgraphInfo", function() {
  const test = newTestStatechartModel(),
        model = test.model,
        items = model.root.items,
        state1 = addState(test, newState()),
        state2 = addState(test, newState()),
        transition1 = addTransition(test, newTransition(state1, state2));
  let subgraph;

  subgraph = test.getSubgraphInfo([state1, state2]);
  ok(subgraph.statesAndStatecharts.has(state1));
  ok(subgraph.statesAndStatecharts.has(state2));
  deepEqual(subgraph.statesAndStatecharts.size, 2);
  ok(subgraph.interiorTransitions.has(transition1));
  deepEqual(subgraph.transitions.size, 1);
  deepEqual(subgraph.interiorTransitions.size, 1);
  deepEqual(subgraph.inTransitions.size, 0);
  deepEqual(subgraph.outTransitions.size, 0);

  const input = addState(test, newState()),
        output = addState(test, newState()),
        transition2 = addTransition(test, newTransition(input, state1)),
        transition3 = addTransition(test, newTransition(state2, output));

  subgraph = test.getSubgraphInfo([state1, state2]);
  ok(subgraph.statesAndStatecharts.has(state1));
  ok(subgraph.statesAndStatecharts.has(state2));
  deepEqual(subgraph.statesAndStatecharts.size, 2);
  ok(subgraph.interiorTransitions.has(transition1));
  deepEqual(subgraph.transitions.size, 3);
  deepEqual(subgraph.interiorTransitions.size, 1);
  ok(subgraph.inTransitions.has(transition2));
  deepEqual(subgraph.inTransitions.size, 1);
  ok(subgraph.outTransitions.has(transition3));
  deepEqual(subgraph.outTransitions.size, 1);
});

function testIterator(fn, element, items) {
  const iterated = [];
  fn(element, (item) => iterated.push(item));
  deepEqual(items, iterated);
}

test("statecharts.statechartModel.iterators", function() {
  const test = newTestStatechartModel(),
        model = test.model,
        items = model.root.items,
        state1 = addState(test, newState()),
        state2 = addState(test, newState()),
        transition1 = addTransition(test, newTransition(state1, state2)),
        input = addState(test, newState()),
        output = addState(test, newState()),
        transition2 = addTransition(test, newTransition(input, state1)),
        transition3 = addTransition(test, newTransition(input, state2)),
        transition4 = addTransition(test, newTransition(state2, output));

  const inputFn = test.forInTransitions.bind(test),
        outputFn = test.forOutTransitions.bind(test);
  testIterator(inputFn, input, []);
  testIterator(outputFn, input, [transition2, transition3]);
  testIterator(inputFn, state1, [transition2]);
  testIterator(outputFn, state1, [transition1]);
  testIterator(inputFn, state2, [transition1, transition3]);
  testIterator(outputFn, state2, [transition4]);
});

test("statecharts.editingModel", function() {
  const test = newTestEditingModel(),
        model = test.model,
        statechart = model.root;
  ok(test);
  ok(model);
  ok(model.dataModel);
  ok(model.selectionModel);
});

function doInitialize(item) {
  item.initalized = true;
}

test("statecharts.editingModel.newItem", function() {
  const test = newTestEditingModel(),
        model = test.model,
        statechart = model.root;
  model.dataModel.addInitializer(doInitialize);
  const item1 = newState();
  test.newItem(item1);
  ok(item1.id);
  ok(item1.initalized);
});

test("statecharts.editingModel.addDeleteItem", function() {
  const test = newTestEditingModel(),
        model = test.model,
        statechart = model.root;
  // Add an item.
  const item1 = newState();
  test.newItem(item1);
  test.addItem(item1, model.root);
  deepEqual(model.root.items, [item1]);
  deepEqual(model.hierarchicalModel.getParent(item1), statechart);
  // Delete the item.
  test.deleteItem(item1);
  deepEqual(statechart.items, []);
});

test("statecharts.editingModel.findChildStatechart", function() {
  let test = newTestEditingModel(),
      items = test.model.root.items,
      superState = addState(test, newState()),
      state = newState(),
      transition = newTransition(state, state),
      start = newPseudoState('start');
  // Primitive state has no statechart.
  ok(test.findChildStatechart(superState, state) === -1);
  ok(test.findChildStatechart(superState, start) === -1);
  // Add a child statechart.
  const statechart1 = test.findOrCreateChildStatechart(superState, state);
  // Can add state.
  ok(test.findChildStatechart(superState, state) === 0);
  ok(test.findChildStatechart(superState, start) === 0);
  statechart1.items.push(newState());
  ok(test.findChildStatechart(superState, state) === 0);
  ok(test.findChildStatechart(superState, start) === 0);
  // Add a start state.
  statechart1.items.push(newPseudoState('start'));
  ok(test.findChildStatechart(superState, state) === 0);
  ok(test.findChildStatechart(superState, start) === -1);
});

test("statecharts.editingModel.transitionConsistency", function() {
  let test = newTestEditingModel(),
      items = test.model.root.items,
      state1 = addState(test, newState()),
      state2 = addState(test, newState()),
      transition = addTransition(test, newTransition(state1, state2));

  // Remove element and make sure dependent wire is also deleted.
  test.deleteItem(state1);
  test.makeConsistent();
  ok(!items.includes(transition));
});

})();
