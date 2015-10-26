// Collections tests.

'use strict';

//------------------------------------------------------------------------------
// LinkedList tests.

function listStringify(list) {
  var result = '';
  list.forEach(function(item) {
    result += item;
  });
  return result;
}

test("LinkedList constructor", function() {
  var list = new LinkedList();
  deepEqual(0, list.length);
  ok(list.empty());
  deepEqual('', listStringify(list));
});

test("LinkedList pushBack", function() {
  var list = new LinkedList();
  var node1 = list.pushBack('a');
  deepEqual(list.front, node1);
  deepEqual(list.back, node1);
  var node2 = list.pushBack('b');
  deepEqual(list.front, node1);
  deepEqual(list.back, node2);
  deepEqual(list.length, 2);
  deepEqual(listStringify(list), 'ab');
});

test("LinkedList pushFront", function() {
  var list = new LinkedList();
  var node1 = list.pushFront('a');
  deepEqual(list.front, node1);
  deepEqual(list.back, node1);
  var node2 = list.pushFront('b');
  deepEqual(list.front, node2);
  deepEqual(list.back, node1);
  deepEqual(list.length, 2);
  deepEqual(listStringify(list), 'ba');
});

test("LinkedList insertAfter", function() {
  var list = new LinkedList();
  var node1 = list.insertAfter('a');
  deepEqual(list.front, node1);
  deepEqual(list.back, node1);
  var node2 = list.insertAfter('b', node1);
  deepEqual(list.front, node1);
  deepEqual(list.back, node2);
  deepEqual(list.length, 2);
  deepEqual(listStringify(list), 'ab');
});

test("LinkedList insertBefore", function() {
  var list = new LinkedList();
  var node1 = list.insertBefore('a');
  deepEqual(list.front, node1);
  deepEqual(list.back, node1);
  var node2 = list.insertBefore('b', node1);
  deepEqual(list.front, node2);
  deepEqual(list.back, node1);
  deepEqual(list.length, 2);
  deepEqual(listStringify(list), 'ba');
});

test("LinkedList remove", function() {
  var list = new LinkedList();
  var node1 = list.pushBack('a');
  var node2 = list.pushBack('b');
  var node3 = list.pushBack('c');
  deepEqual(list.length, 3);
  deepEqual(listStringify(list), 'abc');
  deepEqual(list.remove(node2), node2);
  deepEqual(list.length, 2);
  deepEqual(listStringify(list), 'ac');
  deepEqual(list.front, node1);
  deepEqual(node1.next, node3);
  deepEqual(node3.prev, node1);
  deepEqual(list.back, node3);
  deepEqual(list.remove(node1), node1);
  deepEqual(list.front, node3);
  deepEqual(list.back, node3);
  deepEqual(list.length, 1);
  deepEqual(listStringify(list), 'c');
  deepEqual(list.remove(node3), node3);
  deepEqual(list.front, null);
  deepEqual(list.back, null);
  deepEqual(list.length, 0);
  deepEqual(listStringify(list), '');
});

test("LinkedList clear", function() {
  var list = new LinkedList();
  var node1 = list.pushBack();
  var node2 = list.pushBack();
  list.clear();
  deepEqual(list.length, 0);
  deepEqual(listStringify(list), '');
});

test("LinkedList map and mapReverse", function() {
  var list = new LinkedList();
  var node1 = list.pushBack('a');
  var node2 = list.pushBack('b');
  var node3 = list.pushBack('c');

  var forward = '';
  list.forEach(function(item) {
    forward += item;
  });
  deepEqual(forward, 'abc');
  var reverse = '';
  list.forEachReverse(function(item) {
    reverse += item;
  });
  deepEqual(reverse, 'cba');
});

test("LinkedList find", function() {
  var list = new LinkedList();
  var node1 = list.pushBack('a');
  var node2 = list.pushBack('b');

  deepEqual(list.find('b'), node2);
});

//------------------------------------------------------------------------------
// PriorityQueue tests.

function pqCompareFn(a, b) {
  if (a < b)
    return -1;
  if (a > b)
    return 1;
  return 0;
}

// Destroys queue.
function priorityQueueContents(queue) {
  var length = arguments.length - 1;
  for (var i = 0; i < length; i++) {
    if (queue.empty())
      return false;
    if (queue.pop() != arguments[i + 1])
      return false;
  }
  return true;
}

test("PriorityQueue constructor", function() {
  var queue = new PriorityQueue(pqCompareFn);
  ok(queue.empty());

  queue = new PriorityQueue(pqCompareFn, [1, 0, 2, 3]);
  ok(!queue.empty());
  priorityQueueContents(queue, 3, 2, 1, 0);
});

test("PriorityQueue push", function() {
  var queue = new PriorityQueue(pqCompareFn);
  ok(queue.empty());
  deepEqual(queue.pop(), null);

  queue = new PriorityQueue(pqCompareFn);
  queue.push(0);
  queue.push(2);
  queue.push(1);
  queue.push(3);
  priorityQueueContents(queue, 3, 2, 1, 0);
});

//------------------------------------------------------------------------------
// SelectionSet tests.

function selectionSetStringify(selectionSet) {
  var result = '';
  selectionSet.forEach(function(item) {
    result += item;
  });
  return result;
}

test("SelectionSet constructor", function() {
  var selectionSet = new SelectionSet();
  deepEqual(selectionSet.length, 0);
  ok(selectionSet.empty());
  deepEqual(selectionSet.lastSelected(), null);
  deepEqual(selectionSetStringify(selectionSet), '');
});

test("SelectionSet add", function() {
  var selectionSet = new SelectionSet();
  selectionSet.add('a');
  selectionSet.add('b');
  deepEqual(selectionSet.length, 2);
  deepEqual(selectionSet.lastSelected(), 'b');
  deepEqual(selectionSetStringify(selectionSet), 'ba');
  selectionSet.add('a');
  deepEqual(selectionSet.length, 2);
  deepEqual(selectionSet.lastSelected(), 'a');
  deepEqual(selectionSetStringify(selectionSet), 'ab');
});

test("SelectionSet remove", function() {
  var selectionSet = new SelectionSet();
  selectionSet.add('a');
  selectionSet.add('b');
  selectionSet.add('c');
  deepEqual(selectionSet.length, 3);
  deepEqual(selectionSet.lastSelected(), 'c');
  deepEqual(selectionSetStringify(selectionSet), 'cba');
  selectionSet.remove('c');
  deepEqual(selectionSet.length, 2);
  deepEqual(selectionSet.lastSelected(), 'b');
  deepEqual(selectionSetStringify(selectionSet), 'ba');
  selectionSet.remove('a');
  deepEqual(selectionSet.length, 1);
  deepEqual(selectionSet.lastSelected(), 'b');
  deepEqual(selectionSetStringify(selectionSet), 'b');
});

test("SelectionSet toggle", function() {
  var selectionSet = new SelectionSet();
  selectionSet.toggle('a');
  deepEqual(selectionSet.length, 1);
  deepEqual(selectionSet.lastSelected(), 'a');
  selectionSet.toggle('a');
  deepEqual(selectionSet.length, 0);
  deepEqual(selectionSet.lastSelected(), null);
});

test("SelectionSet map", function() {
  var selectionSet = new SelectionSet();
  selectionSet.add('a');
  selectionSet.add('b');

  var forward = '';
  selectionSet.forEach(function(item) {
    forward += item;
  });
  deepEqual(forward, 'ba');
  var reverse = '';
  selectionSet.forEachReverse(function(item) {
    reverse += item;
  });
  deepEqual(reverse, 'ab');
});

