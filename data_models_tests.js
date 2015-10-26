
// Data model unit tests

test("dataModel extend", function() {
  var model = { root: {} };
  var test = dataModels.dataModel.extend(model);
  deepEqual(test, model.dataModel);
});

test("dataModel ids", function() {
  var testData = {
    id: 1,
    items: [
      { id: 20, },
      { id: 2, },
    ],
  }
  var model = { root: testData };
  var test = dataModels.dataModel.extend(model);
  deepEqual(test, model.dataModel);
  deepEqual(21, test.nextId);
  var item = {};
  test.assignId(item);
  deepEqual(21, item.id);
  deepEqual(22, test.nextId);
});

test("dataModel properties", function() {
  var testData = {
    id: 1,
    prop: 'foo',
    arrayProp: [ 1, 2, 3 ],
    _nonProp: 'bar',
    someId: 42,
  }
  var model = { root: testData };
  var test = dataModels.dataModel.extend(model);
  ok(!test.isProperty(testData, 'id'));
  ok(test.isProperty(testData, 'prop'));
  ok(test.isProperty(testData, 'arrayProp'));
  ok(!test.isProperty(testData, '_nonProp'));
  ok(test.isReference(testData, 'someId'));
  var nameValues = [];
  test.visitProperties(testData, function(item, attr) { nameValues.push(attr); });
  deepEqual(nameValues, [ 'prop', 'arrayProp', 'someId' ]);
  var refValues = [];
  test.visitReferences(testData, function(item, attr) { refValues.push(attr); });
  deepEqual(refValues, [ 'someId' ]);
});

test("dataModel children", function() {
  var testData = {
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
  var model = { root: testData };
  var test = dataModels.dataModel.extend(model);
  var childIds = [];
  test.visitChildren(testData, function(item) { childIds.push(item.id); });
  deepEqual(childIds, [ 2, 3, 6 ]);
});

test("dataModel subtrees", function() {
  var testData = {
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
  var model = { root: testData };
  var test = dataModels.dataModel.extend(model);
  var itemIds = [];
  test.visitSubtree(testData, function(item) { itemIds.push(item.id); });
  deepEqual(itemIds, [ 1, 2, 3, 4, 5, 6 ]);
});

// Data event mixin unit tests.

test("eventMixin", function() {
  var model = {
    onTestEvent: function() {
      this.onEvent('testEvent', function(handler) {
        handler();
      });
    },
  };
  var test = dataModels.eventMixin.extend(model);
  deepEqual(test, model);

  var count = 0;
  var handler = function() { count++; };
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
  var model = {
    root: {},
  };
  var test = dataModels.observableModel.extend(model);
  deepEqual(test, model.observableModel);
});

test("observableModel", function() {
  var model = {
    root: {
      array: [],
    },
  };
  var test = dataModels.observableModel.extend(model);

  var change;
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
  var model = { root: {} };
  var test = dataModels.transactionModel.extend(model);
  deepEqual(test, model.transactionModel);
  ok(model.observableModel);
});

test("transactionModel events", function() {
  var model = {
    root: {},
  };
  var test = dataModels.transactionModel.extend(model);
  var started, ending, ended;
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
});

test("transactionModel transaction", function() {
  var model = {
    root: {
      prop1: 'foo',
      array: [],
    },
  };
  var test = dataModels.transactionModel.extend(model);
  var ended;
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
  var model = {
    root: {},
  };
  model.prop1 = 'foo';
  var test = dataModels.transactionModel.extend(model);
  var ending, canceled;
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
  var model = {
    root: {},
  };
  var test = dataModels.referencingModel.extend(model);
  deepEqual(test, model.referencingModel);
});

test("referencingModel", function() {
  // Default data model references end with 'Id'.
  var child1 = { id: 2, refId: 1 },
      child2 = { id: 3, refId: 1 },
      child3 = { id: 4, firstId: 1, secondId: 3 };
  var root = {
    id: 1,
    child: null,
    items: [
      child1,
    ],
  };
  var model = { root: root };
  dataModels.observableModel.extend(model);

  var test = dataModels.referencingModel.extend(model);
  deepEqual(child1._refId, root);
  deepEqual(child1._refId, model.referencingModel.resolveId(child1.refId));

  model.observableModel.changeValue(root, 'child', child2);
  deepEqual(child2._refId, root);

  model.observableModel.changeValue(child2, 'refId', 2);
  deepEqual(child2._refId, child1);

  model.observableModel.insertElement(root, 'items', root.items.length - 1, child3);
  deepEqual(child3._firstId, root);
  deepEqual(child3._secondId, child2);

  // unresolvable id causes ref to be set to 'null'.
  model.observableModel.changeValue(child2, 'refId', 88);
  deepEqual(child2._refId, undefined);
  deepEqual(model.referencingModel.resolveId(child2.refId), undefined);
});

// Hierarchical model unit tests.

test("hierarchicalModel extend", function() {
  var model = { root: {} };
  var test = dataModels.hierarchicalModel.extend(model);
  deepEqual(test, model.hierarchicalModel);
  ok(model.observableModel);
});

test("hierarchicalModel", function() {
  var child1 = { id: 3 },
      child2 = { id: 4 },
      child3 = { id: 5 };
  child2.items = [ child3 ];
  var root = {
    id: 1,
    item: { id: 2 },
    items: [
      child1,
    ],
  };
  var model = { root: root };
  var test = dataModels.hierarchicalModel.extend(model);
  deepEqual(test.getParent(root), null);
  deepEqual(test.getParent(child1), root);

  model.observableModel.insertElement(root, 'items', root.items.length - 1, child2);
  deepEqual(test.getParent(child2), root);
  deepEqual(test.getParent(child3), child2);

  var selection = dataModels.selectionModel.extend(model);
  selection.set([ root, child1, child2, child3 ]);
  selection.set(test.reduceSelection());
  var contents = selection.contents();
  deepEqual(contents.length, 1);
  deepEqual(contents[0], root);
});

