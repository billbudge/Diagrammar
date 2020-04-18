// Data model unit tests

const dataModelTests = (function () {
'use strict';

test("dataModel extend", function() {
  const model = { root: {} };
  const test = dataModels.dataModel.extend(model);
  deepEqual(test, model.dataModel);
});

test("dataModel ids", function() {
  const testData = {
    id: 1,
    items: [
      { id: 20, },
      { id: 2, },
    ],
  }
  const model = { root: testData };
  const test = dataModels.dataModel.extend(model);
  deepEqual(test, model.dataModel);
  const item = {};
  const id = test.assignId(item);
  ok(id != 1 && id != 2 && id != 20);
  ok(id == item.id)
});

test("dataModel properties", function() {
  const testData = {
    id: 1,
    prop: 'foo',
    arrayProp: [ 1, 2, 3 ],
    _anotherProp: 'bar',
    someId: 42,
  }
  const model = { root: testData };
  const test = dataModels.dataModel.extend(model);
  ok(!test.isProperty(testData, 'id'));
  ok(test.isProperty(testData, 'prop'));
  ok(test.isProperty(testData, 'arrayProp'));
  ok(test.isProperty(testData, '_anotherProp'));
  ok(test.isReference(testData, 'someId'));
  const nameValues = [];
  test.visitProperties(testData, function(item, attr) { nameValues.push(attr); });
  deepEqual(nameValues, [ 'prop', 'arrayProp', '_anotherProp', 'someId' ]);
  const refValues = [];
  test.visitReferences(testData, function(item, attr) { refValues.push(attr); });
  deepEqual(refValues, [ 'someId' ]);
});

test("dataModel children", function() {
  const testData = {
    id: 1,
    item: { id: 2, },
    arrayItems: [
      {
        id: 3,
        items: [
          { id: 4 },
          { id: 5 },
        ],
      },
      { id: 6 },
    ],
  }
  const model = { root: testData };
  const test = dataModels.dataModel.extend(model);
  const childIds = [];
  test.visitChildren(testData, function(item) { childIds.push(item.id); });
  deepEqual(childIds, [ 2, 3, 6 ]);
});

test("dataModel subtrees", function() {
  const testData = {
    id: 1,
    item: { id: 2, },
    items: [
      {
        id: 3,
        items: [
          { id: 4 },
          { id: 5 },
        ],
      },
      { id: 6 },
    ],
  }
  const model = { root: testData };
  const test = dataModels.dataModel.extend(model);
  const itemIds = [];
  test.visitSubtree(testData, function(item) { itemIds.push(item.id); });
  deepEqual(itemIds, [ 1, 2, 3, 4, 5, 6 ]);
});

// Data event mixin unit tests.

test("eventMixin", function() {
  const model = {
    onTestEvent: function() {
      this.onEvent('testEvent', function(handler) {
        handler();
      });
    },
  };
  const test = dataModels.eventMixin.extend(model);
  deepEqual(test, model);

  let count = 0;
  const handler = function() { count++; };
  model.onTestEvent();
  model.addHandler('testEvent', handler);
  deepEqual(0, count);

  model.onTestEvent();
  deepEqual(1, count);
  model.onTestEvent();
  deepEqual(2, count);

  model.removeHandler('testEvent', handler);
  model.onTestEvent();
  deepEqual(2, count);
});

// Observable model unit tests.

test("observableModel extend", function() {
  const model = {
    root: {},
  };
  const test = dataModels.observableModel.extend(model);
  deepEqual(test, model.observableModel);
});

test("observableModel", function() {
  const model = {
    root: {
      array: [],
    },
  };
  const test = dataModels.observableModel.extend(model);
  let change;
  test.addHandler('changed', function(change_) {
    change = change_;
  });

  test.changeValue(model.root, 'foo', 'bar');
  deepEqual(model.root, change.item);
  deepEqual('foo', change.attr);
  deepEqual(undefined, change.oldValue);
  deepEqual(model.root.foo, 'bar');

  test.insertElement(model.root, 'array', 0, 'foo');
  deepEqual(model.root, change.item);
  deepEqual('array', change.attr);
  deepEqual(0, change.index);
  deepEqual(model.root.array, [ 'foo' ]);

  test.removeElement(model.root, 'array', 0);
  deepEqual(model.root, change.item);
  deepEqual('array', change.attr);
  deepEqual(0, change.index);
  deepEqual('foo', change.oldValue);
  deepEqual(model.root.array, []);
});

// Transaction model unit tests.

test("transactionModel extend", function() {
  const model = { root: {} };
  const test = dataModels.transactionModel.extend(model);
  deepEqual(test, model.transactionModel);
  ok(model.observableModel);
});

test("transactionModel events", function() {
  const model = {
    root: {},
  };
  const test = dataModels.transactionModel.extend(model);
  let started, ending, ended;
  test.addHandler('transactionBegan', function(transaction) {
    ok(!started);
    ok(test.transaction);
    started = transaction;
  });
  test.addHandler('transactionEnding', function(transaction) {
    ok(started && !ending && !ended);
    ending = transaction;
  });
  test.addHandler('transactionEnded', function(transaction) {
    ok(started && ending && !ended);
    ok(!test.transaction);
    ended = transaction;
  });

  ok(!test.transaction);
  test.beginTransaction('test trans');
  ok(started);
  deepEqual(started.name, 'test trans');
  ok(test.transaction);
  deepEqual(test.transaction.name, 'test trans');

  test.endTransaction();
  ok(!test.transaction);
  ok(ending);
  ok(ended);

  let didUndo;
  test.addHandler('didUndo', function(transaction) {
    ok(!didUndo);
    didUndo = transaction;
  });
  test.undo(ended);
  deepEqual(didUndo, ended);

  let didRedo;
  test.addHandler('didRedo', function(transaction) {
    ok(!didRedo);
    didRedo = transaction;
  });
  test.redo(ended);
  deepEqual(didRedo, ended);
});

test("transactionModel transaction", function() {
  const model = {
    root: {
      prop1: 'foo',
      array: [],
    },
  };
  const test = dataModels.transactionModel.extend(model);
  let ended;
  test.addHandler('transactionEnded', function(transaction) {
    ended = transaction;
  });

  test.beginTransaction('test trans');
  model.root.prop1 = 'bar';
  model.observableModel.onValueChanged(model.root, 'prop1', 'foo');
  model.root.array.push('a');
  model.observableModel.onElementInserted(model.root, 'array', 0);
  model.root.array.push('b');
  model.observableModel.onElementInserted(model.root, 'array', 1);
  model.root.array.push('c');
  model.observableModel.onElementInserted(model.root, 'array', 2);
  model.root.array.splice(1, 1);  // remove middle element.
  model.observableModel.onElementRemoved(model.root, 'array', 1, 'b');
  ok(!ended);
  test.endTransaction();
  ok(ended);
  test.undo(ended);
  deepEqual(model.root.prop1, 'foo');
  deepEqual(model.root.array, []);
  test.redo(ended);
  deepEqual(model.root.prop1, 'bar');
  deepEqual(model.root.array, [ 'a', 'c' ]);
});

test("transactionModel cancel", function() {
  const model = {
    root: {},
  };
  model.prop1 = 'foo';
  const test = dataModels.transactionModel.extend(model);
  let ending, canceled;
  test.addHandler('transactionEnding', function(transaction) {
    ok(!ending);
    ending = transaction;
    test.cancelTransaction();
  });
  test.addHandler('transactionCanceled', function(transaction) {
    ok(ending);
    canceled = transaction;
  });

  test.beginTransaction('test trans');
  model.prop1 = 'bar';
  model.observableModel.onValueChanged(model, 'prop1', 'foo');
  ok(!ending && !canceled);
  test.endTransaction();
  ok(ending && canceled);
  deepEqual(model.prop1, 'foo');
});

// Referencing model unit tests.

test("referencingModel extend", function() {
  const model = {
    root: {},
  };
  const test = dataModels.referencingModel.extend(model);
  deepEqual(test, model.referencingModel);
});

test("referencingModel", function() {
  // Default data model references end with 'Id'.
  const child1 = { id: 2, refId: 1 },
        child2 = { id: 3, refId: 1 },
        child3 = { id: 4, firstId: 1, secondId: 3 };
  const root = {
    id: 1,
    child: null,
    items: [
      child1,
    ],
  };
  const model = { root: root };
  dataModels.observableModel.extend(model);

  const test = dataModels.referencingModel.extend(model);
  deepEqual(test.getReference(child1, 'refId'), root);
  deepEqual(test.getReferenceFn('refId')(child1), root);
  deepEqual(test.getReference(child1, 'refId'), model.referencingModel.resolveId(child1.refId));

  model.observableModel.changeValue(root, 'child', child2);
  deepEqual(test.getReference(child2, 'refId'), root);

  model.observableModel.changeValue(child2, 'refId', 2);
  deepEqual(test.getReference(child2, 'refId'), child1);

  model.observableModel.insertElement(root, 'items', root.items.length - 1, child3);
  deepEqual(test.getReference(child3, 'firstId'), root);
  deepEqual(test.getReferenceFn('firstId')(child3), root);
  deepEqual(test.getReference(child3, 'secondId'), child2);
  deepEqual(test.getReferenceFn('secondId')(child3), child2);

  // unresolvable id causes ref to be set to 'null'.
  model.observableModel.changeValue(child2, 'refId', 88);
  deepEqual(test.getReference(child2, 'refId'), undefined);
  deepEqual(model.referencingModel.resolveId(child2.refId), undefined);
});

// Instancing model unit tests.

test("instancingModel isomorphic", function() {
  // TODO add some references.
  const test_data = {
    id: 1,
    item: { id: 2, },
    items: [
      {
        id: 3,
        items: [
          { id: 4, x: 0 },
          { id: 5, x: 1 },
        ],
      },
      {
        id: 6,
        items: [
          { id: 7, x: 0 },
          { id: 8, x: 1 },
        ],
      },
      { id: 9, foo: 'bar' },
    ],
  }
  const model = { root: test_data };
  const test = dataModels.instancingModel.extend(model);
  ok(test.isomorphic(test_data, test_data, new Map()));
  const test_data_clone = test.cloneGraph([test_data])[0];
  ok(test.isomorphic(test_data, test_data_clone, new Map()));
  ok(test.isomorphic(test_data.items[0], test_data.items[1], new Map()));
  ok(!test.isomorphic(test_data.item, test_data.items[2], new Map()));
});

// Mastering model unit tests.

test("masteringModel master tracking", function() {
  // TODO add some references.
  const test_data = {
    id: 1,
    items: [
    ],
    masters: [
    ],
  },
  master1 = {
    id: 2,
    items: [
      { id: 3,
        prop: 'x',
      }
    ]
  },
  instance1 = {
    id: 4,
    masterId: 2,
  },
  instance2 = {
    id: 5,
    masterId: 2,
  }

  const model = { root: test_data };
  const test = dataModels.masteringModel.extend(model);

  const observableModel = model.observableModel,
        referencingModel = model.referencingModel,
        transactionModel = model.transactionModel;
  ok(observableModel);
  ok(referencingModel);
  ok(transactionModel);

  const internal1 = test.internalizeMaster(master1);
  ok(test_data.masters.length === 1);
  deepEqual(internal1, master1);
  deepEqual(test_data.masters[0], internal1);

  observableModel.insertElement(test_data, 'items', 0, instance1);
  deepEqual(referencingModel.getReference(instance1, 'masterId'), internal1);
  ok(test_data.masters.length === 1);
  deepEqual(test_data.masters[0], master1);

  observableModel.insertElement(test_data, 'items', 0, instance2);
  deepEqual(referencingModel.getReference(instance2, 'masterId'), internal1);
  ok(test_data.masters.length === 1);
  deepEqual(test_data.masters[0], master1);

  // Remove both instances. Master should also be removed.
  transactionModel.beginTransaction();
  observableModel.removeElement(test_data, 'items', 0);
  observableModel.removeElement(test_data, 'items', 0);
  transactionModel.endTransaction();
  ok(test_data.masters.length === 0);
});

// Hierarchical model unit tests.

test("hierarchicalModel extend", function() {
  const model = { root: {} };
  const test = dataModels.hierarchicalModel.extend(model);
  deepEqual(test, model.hierarchicalModel);
  ok(model.observableModel);
});

test("hierarchicalModel", function() {
  const child1 = { id: 3 },
        child2 = { id: 4 },
        child3 = { id: 5 };
  child2.items = [ child3 ];
  const root = {
    id: 1,
    item: { id: 2 },
    items: [
      child1,
    ],
  };
  const model = { root: root },
        test = dataModels.hierarchicalModel.extend(model);
  deepEqual(test.getParent(root), null);
  deepEqual(test.getParent(child1), root);

  // Append child2 and subtree to root.
  model.observableModel.insertElement(root, 'items', root.items.length, child2);
  deepEqual(test.getParent(child2), root);
  deepEqual(test.getParent(child3), child2);

  const selection = dataModels.selectionModel.extend(model);
  selection.set([ root, child1, child2, child3 ]);
  selection.set(test.reduceSelection());
  const contents = selection.contents();
  deepEqual(contents.length, 1);
  deepEqual(contents[0], root);

  // Test LCA.
  deepEqual(test.getLineage(child3), [child3, child2, root]);
  deepEqual(test.getLowestCommonAncestor(root, child1), root);
  deepEqual(test.getLowestCommonAncestor(child3, child1), root);
  deepEqual(test.getLineage(child2), [child2, root]);
  deepEqual(test.getLowestCommonAncestor(child1, child2), root);

  // Remove child3 from child2.
  model.observableModel.removeElement(child2, 'items', child2.items.indexOf(child3));
  deepEqual(test.getParent(child3), null);
  // Remove child1 from root.
  model.observableModel.removeElement(root, 'items', root.items.indexOf(child1));
  deepEqual(test.getParent(child1), null);
});

// Selection model unit tests.

test("selectionModel extend", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  deepEqual(test, model.selectionModel);
  ok(test.isEmpty());
  ok(!test.lastSelected());
});

test("selectionModel add", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.add('a');
  ok(!test.isEmpty());
  ok(test.contains('a'));
  deepEqual(test.contents(), ['a']);
  deepEqual(test.lastSelected(), 'a');
  test.add(['b', 'a', 'c']);
  deepEqual(test.contents(), ['c', 'a', 'b']);
  deepEqual(test.lastSelected(), 'c');
});

test("selectionModel remove", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.add(['b', 'a', 'c']);
  test.remove('c');
  deepEqual(test.contents(), ['a', 'b']);
  deepEqual(test.lastSelected(), 'a');
  test.remove('d');  // not selected
  deepEqual(test.contents(), ['a', 'b']);
  deepEqual(test.lastSelected(), 'a');
});

test("selectionModel toggle", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.add(['a', 'b', 'c']);
  test.toggle('c');
  deepEqual(test.contents(), ['b', 'a']);
  deepEqual(test.lastSelected(), 'b');
  test.toggle('c');
  deepEqual(test.contents(), ['c', 'b', 'a']);
  deepEqual(test.lastSelected(), 'c');
});

test("selectionModel set", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.set('a');
  deepEqual(test.contents(), ['a']);
  deepEqual(test.lastSelected(), 'a');
  test.set(['a', 'b', 'c']);
  deepEqual(test.contents(), ['c', 'b', 'a']);
  deepEqual(test.lastSelected(), 'c');
});

test("selectionModel select", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.set(['a', 'b', 'c']);
  test.select('d', true);
  deepEqual(test.contents(), ['d', 'c', 'b', 'a']);
  test.select('d', true);
  deepEqual(test.contents(), ['c', 'b', 'a']);
  test.select('a', false);
  deepEqual(test.contents(), ['a', 'c', 'b']);
  test.select('a', true);
  deepEqual(test.contents(), ['c', 'b']);
});

// Change model unit tests.

test("changeModel extend", function() {
  const model = { root: {} };
  const test = dataModels.changeModel.extend(model);
  deepEqual(test, model.changeModel);
  ok(model.observableModel);
});

test("changeModel", function() {
  const model = {
    root: {
      prop1: 'foo',
      array: [],
    },
  };
  const test = dataModels.changeModel.extend(model);
  deepEqual(test.getChangedItems(), []);
  ok(!test.hasChanges());

  // change attribute
  model.root.prop1 = 'bar';
  model.observableModel.onValueChanged(model.root, 'prop1', 'foo');
  ok(test.hasChanges());
  deepEqual(test.getChangedItems(), [model.root]);
  deepEqual(test.getInsertedItems(), []);
  deepEqual(test.getRemovedItems(), []);
  test.clear();
  ok(!test.hasChanges());

  // insert child
  const child = { prop1: 'bar' };
  model.root.array.push(child);
  model.observableModel.onElementInserted(model.root, 'array', 0);
  ok(test.hasChanges());
  deepEqual(test.getChangedItems(), [model.root]);
  deepEqual(test.getInsertedItems(), [child]);
  deepEqual(test.getRemovedItems(), []);
  test.clear();

  // remove child
  model.root.array.pop();
  model.observableModel.onElementRemoved(model.root, 'array', 1, child);
  ok(test.hasChanges());
  deepEqual(test.getChangedItems(), [model.root]);
  deepEqual(test.getInsertedItems(), []);
  deepEqual(test.getRemovedItems(), [child]);
  test.clear();

  // remove and then re-insert an item.
  model.root.array.push(child);
  model.root.array.pop();
  model.observableModel.onElementRemoved(model.root, 'array', 0, child);
  model.root.array.push(child);
  model.observableModel.onElementInserted(model.root, 'array', 0);
  ok(test.hasChanges());
  deepEqual(test.getChangedItems(), [model.root]);
  deepEqual(test.getInsertedItems(), [child]);
  deepEqual(test.getRemovedItems(), []);
  test.clear();

  // multiple changed items
  child.prop1 = 'baz';
  model.observableModel.onValueChanged(child, 'prop1', 'baz');
  ok(test.hasChanges());
  deepEqual(test.getChangedItems(), [child]);
  model.root.prop1 = 'baz';
  model.observableModel.onValueChanged(model.root, 'prop1', 'baz');
  ok(test.hasChanges());
  const items = test.getChangedItems();
  deepEqual(items.length, 2);
  ok(items.includes(model.root));
  ok(items.includes(child));
});

})();

