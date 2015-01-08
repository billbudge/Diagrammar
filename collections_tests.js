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
// HashSet tests.

function hashSetContents(hashSet) {
  var length = arguments.length - 1;
  if (hashSet.length != length)
    return false;
  for (var i = 0; i < length; i++)
    if (!hashSet.contains(arguments[1 + i]))
      return false;
  return true;
}

test("HashSet constructor", function() {
  var hashSet = new HashSet();
  deepEqual(hashSet.length, 0);
  ok(hashSet.empty());
  ok(hashSetContents(hashSet));
});

test("HashSet add", function() {
  var hashSet = new HashSet();
  hashSet.add('a');
  hashSet.add('b');
  deepEqual(hashSet.length, 2);
  ok(hashSetContents(hashSet, 'a', 'b'));
});

test("HashSet remove", function() {
  var hashSet = new HashSet();
  hashSet.add('a');
  hashSet.add('b');
  deepEqual(hashSet.remove('a'), 'a');
  deepEqual(hashSet.remove('non-existent'), null);
  deepEqual(hashSet.length, 1);
  ok(hashSetContents(hashSet, 'b'));
});

test("HashSet clear", function() {
  var hashSet = new HashSet();
  hashSet.add('a');
  hashSet.add('b');
  hashSet.clear();
  deepEqual(hashSet.length, 0);
  ok(hashSet.empty());
  ok(hashSetContents(hashSet));
});

test("HashSet map", function() {
  var hashSet = new HashSet();
  hashSet.add('a');
  hashSet.add('b');

  var length = 0;
  hashSet.forEach(function(item) {
    if (hashSet.contains(item))
      length += 1;
  });
  deepEqual(hashSet.length, length);
});

function getCustomId(obj) {
  return "_" + obj;
}

test("HashSet custom getIdFn", function() {
  var hashSet = new HashSet(getCustomId);
  hashSet.add('a');
  hashSet.add('b');
  deepEqual(hashSet.remove('a'), 'a');
  deepEqual(hashSet.remove('non-existent'), null);
  deepEqual(hashSet.length, 1);
  ok(hashSetContents(hashSet, 'b'));
});

//------------------------------------------------------------------------------
// HashMap tests.

function hashMapContents(hashMap) {
  // Arguments after the first are key-value pairs.
  var length = (arguments.length - 1) / 2;
  if (hashMap.length != length)
    return false;
  for (var i = 0; i < length; i++) {
    if (!hashMap.contains(arguments[1 + i * 2]))
      return false;
    if (hashMap.find(arguments[1 + i * 2]) !== arguments[1 + i * 2 + 1])
      return false;
  }
  return true;
}

test("HashMap constructor", function() {
  var hashMap = new HashMap();
  deepEqual(hashMap.length, 0);
  ok(hashMap.empty());
  ok(hashMapContents(hashMap));
});

test("HashMap add", function() {
  var hashMap = new HashMap();
  hashMap.add('a', 'Able');
  hashMap.add('b', 'Baker');
  deepEqual(hashMap.length, 2);
  ok(hashMapContents(hashMap, 'a', 'Able', 'b', 'Baker'));
});

test("HashMap remove", function() {
  var hashMap = new HashMap();
  hashMap.add('a', 'Able');
  hashMap.add('b', 'Baker');
  hashMap.add('c', 'Charlie');
  hashMap.remove('c');
  deepEqual(hashMap.length, 2);
  ok(hashMapContents(hashMap, 'a', 'Able', 'b', 'Baker'));
});

test("HashMap clear", function() {
  var hashMap = new HashMap();
  hashMap.add('a', 'Able');
  hashMap.add('b', 'Baker');
  hashMap.clear();
  deepEqual(hashMap.length, 0);
  ok(hashMap.empty());
  ok(hashMapContents(hashMap));
});

test("HashMap map", function() {
  var hashMap = new HashMap();
  hashMap.add('a', 'Able');
  hashMap.add('b', 'Baker');

  var length = 0;
  hashMap.forEach(function(key, value) {
    if (hashMap.find(key) === value)
      length += 1;
  });
  deepEqual(hashMap.length, length);
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

