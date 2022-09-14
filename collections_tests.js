// Collections tests.

const collectionsTests = (function () {
'use strict';

function stringify(iterable) {
  let result = '';
  iterable.forEach(function(item) {
    result += item;
  });
  return result;
}

//------------------------------------------------------------------------------
// LinkedList tests.

test("LinkedList constructor", function() {
  const test = new diagrammar.collections.LinkedList();
  deepEqual(0, test.length);
  ok(test.empty());
  deepEqual('', stringify(test));
});

test("LinkedList pushBack", function() {
  const test = new diagrammar.collections.LinkedList(),
        node1 = test.pushBack('a');
  deepEqual(test.front, node1);
  deepEqual(test.back, node1);
  const node2 = test.pushBack('b');
  deepEqual(test.front, node1);
  deepEqual(test.back, node2);
  deepEqual(test.length, 2);
  deepEqual(stringify(test), 'ab');
});

test("LinkedList pushFront", function() {
  const test = new diagrammar.collections.LinkedList(),
        node1 = test.pushFront('a');
  deepEqual(test.front, node1);
  deepEqual(test.back, node1);
  const node2 = test.pushFront('b');
  deepEqual(test.front, node2);
  deepEqual(test.back, node1);
  deepEqual(test.length, 2);
  deepEqual(stringify(test), 'ba');
});

test("LinkedList insertAfter", function() {
  const test = new diagrammar.collections.LinkedList(),
        node1 = test.insertAfter('a');
  deepEqual(test.front, node1);
  deepEqual(test.back, node1);
  const node2 = test.insertAfter('b', node1);
  deepEqual(test.front, node1);
  deepEqual(test.back, node2);
  deepEqual(test.length, 2);
  deepEqual(stringify(test), 'ab');
});

test("LinkedList insertBefore", function() {
  const test = new diagrammar.collections.LinkedList(),
        node1 = test.insertBefore('a');
  deepEqual(test.front, node1);
  deepEqual(test.back, node1);
  const node2 = test.insertBefore('b', node1);
  deepEqual(test.front, node2);
  deepEqual(test.back, node1);
  deepEqual(test.length, 2);
  deepEqual(stringify(test), 'ba');
});

test("LinkedList remove", function() {
  const test = new diagrammar.collections.LinkedList(),
        node1 = test.pushBack('a'),
        node2 = test.pushBack('b'),
        node3 = test.pushBack('c');
  deepEqual(test.length, 3);
  deepEqual(stringify(test), 'abc');
  deepEqual(test.remove(node2), node2);
  deepEqual(test.length, 2);
  deepEqual(stringify(test), 'ac');
  deepEqual(test.front, node1);
  deepEqual(node1.next, node3);
  deepEqual(node3.prev, node1);
  deepEqual(test.back, node3);
  deepEqual(test.remove(node1), node1);
  deepEqual(test.front, node3);
  deepEqual(test.back, node3);
  deepEqual(test.length, 1);
  deepEqual(stringify(test), 'c');
  deepEqual(test.remove(node3), node3);
  deepEqual(test.front, null);
  deepEqual(test.back, null);
  deepEqual(test.length, 0);
  deepEqual(stringify(test), '');
});

test("LinkedList clear", function() {
  const test = new diagrammar.collections.LinkedList(),
        node1 = test.pushBack(),
        node2 = test.pushBack();
  test.clear();
  deepEqual(test.length, 0);
  deepEqual(stringify(test), '');
});

test("LinkedList map and mapReverse", function() {
  const test = new diagrammar.collections.LinkedList(),
        node1 = test.pushBack('a'),
        node2 = test.pushBack('b'),
        node3 = test.pushBack('c');

  let forward = '';
  test.forEach(function(item) {
    forward += item;
  });
  deepEqual(forward, 'abc');
  let reverse = '';
  test.forEachReverse(function(item) {
    reverse += item;
  });
  deepEqual(reverse, 'cba');
});

test("LinkedList find", function() {
  const test = new diagrammar.collections.LinkedList(),
        node1 = test.pushBack('a'),
        node2 = test.pushBack('b');

  deepEqual(test.find('b'), node2);
});

//------------------------------------------------------------------------------
// Queue tests, for both SimpleQueue and Queue.

test("Queue basic operation", function() {
  const test = new diagrammar.collections.Queue();
  ok(test.empty());
  test.enqueue(1);
  test.enqueue(2);
  test.enqueue(3);
  strictEqual(test.dequeue(), 1);
  strictEqual(test.empty(), false);
  test.enqueue(4);
  strictEqual(test.dequeue(), 2);
  test.clear();
  strictEqual(test.empty(), true);
});

test("Queue error operations", function() {
  const test = new diagrammar.collections.Queue();
  strictEqual(test.dequeue(), undefined);
});

test("Queue enqueue dequeue", function() {
  const test = new diagrammar.collections.Queue();
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      test.enqueue(j);
    }
    for (let j = 0; j < 10; j++) {
      strictEqual(test.dequeue(), j);
    }
  }
});

//------------------------------------------------------------------------------
// PriorityQueue tests.

function pqCompareFn(a, b) {
  return a - b;
}

// Destroys queue.
function pqContents(queue) {
  const length = arguments.length - 1;
  for (let i = 0; i < length; i++) {
    if (queue.empty())
      return false;
    if (queue.pop() != arguments[i + 1])
      return false;
  }
  return true;
}

test("PriorityQueue constructor", function() {
  const test1 = new diagrammar.collections.PriorityQueue(pqCompareFn);
  ok(test1.empty());

  const test2 = new diagrammar.collections.PriorityQueue(pqCompareFn, [1, 0, 2, 3]);
  ok(!test2.empty());
  ok(pqContents(test2, 3, 2, 1, 0));
});

test("PriorityQueue push", function() {
  const test1 = new diagrammar.collections.PriorityQueue(pqCompareFn);
  test1.push(0);
  test1.push(2);
  test1.push(1);
  test1.push(3);
  ok(pqContents(test1, 3, 2, 1, 0));
});

test("PriorityQueue pop", function() {
  const test1 = new diagrammar.collections.PriorityQueue(pqCompareFn);
  test1.push(0);
  test1.push(2);
  test1.push(1);
  test1.push(3);
  let value = test1.pop();
  strictEqual(value, 3);
  value = test1.pop();
  strictEqual(value, 2);
  value = test1.pop();
  strictEqual(value, 1);
  value = test1.pop();
  strictEqual(value, 0);
  ok(test1.empty());
});

//------------------------------------------------------------------------------
// SelectionSet tests.

test("SelectionSet constructor", function() {
  const test = new diagrammar.collections.SelectionSet();
  deepEqual(test.length, 0);
  ok(test.empty());
  deepEqual(test.lastSelected(), undefined);
  deepEqual(stringify(test), '');
});

test("SelectionSet add", function() {
  const test = new diagrammar.collections.SelectionSet();
  test.add('a');
  test.add('b');
  deepEqual(test.length, 2);
  deepEqual(test.lastSelected(), 'b');
  deepEqual(stringify(test), 'ba');
  test.add('a');
  deepEqual(test.length, 2);
  deepEqual(test.lastSelected(), 'a');
  deepEqual(stringify(test), 'ab');
});

test("SelectionSet remove", function() {
  const test = new diagrammar.collections.SelectionSet();
  test.add('a');
  test.add('b');
  test.add('c');
  deepEqual(test.length, 3);
  deepEqual(test.lastSelected(), 'c');
  deepEqual(stringify(test), 'cba');
  test.remove('c');
  deepEqual(test.length, 2);
  deepEqual(test.lastSelected(), 'b');
  deepEqual(stringify(test), 'ba');
  test.remove('a');
  deepEqual(test.length, 1);
  deepEqual(test.lastSelected(), 'b');
  deepEqual(stringify(test), 'b');
});

test("SelectionSet toggle", function() {
  const test = new diagrammar.collections.SelectionSet();
  test.toggle('a');
  deepEqual(test.length, 1);
  deepEqual(test.lastSelected(), 'a');
  test.toggle('a');
  deepEqual(test.length, 0);
  deepEqual(test.lastSelected(), undefined);
});

test("SelectionSet map", function() {
  const test = new diagrammar.collections.SelectionSet();
  test.add('a');
  test.add('b');

  let forward = '';
  test.forEach(function(item) {
    forward += item;
  });
  deepEqual(forward, 'ba');
  let reverse = '';
  test.forEachReverse(function(item) {
    reverse += item;
  });
  deepEqual(reverse, 'ab');
});

test("DisjointSet union find", function() {
  const test = new diagrammar.collections.DisjointSet();
  const a = test.makeSet('a'),
        b = test.makeSet('b'),
        c = test.makeSet('c'),
        d = test.makeSet('d');
  strictEqual(test.find(a), a);
  test.union(a, b);
  strictEqual(test.find(a), test.find(b));
  test.union(a, c);
  strictEqual(test.find(a), test.find(b));
  strictEqual(test.find(a), test.find(c));

  notStrictEqual(test.find(a), test.find(d));

  test.union(d, a);
  strictEqual(test.find(d), test.find(a));
});

test("EmptyArray", function() {
  const test = diagrammar.collections.EmptyArray();
  strictEqual(test.length, 0);
  test.push('foo');
  strictEqual(test.length, 0);
  test.pop();
  strictEqual(test.length, 0);
});

test("EmptySet", function() {
  const test = diagrammar.collections.EmptySet();
  strictEqual(test.size, 0);
  test.add('foo');
  strictEqual(test.size, 0);
});

})();
