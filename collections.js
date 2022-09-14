// Collections.

// TODO move stuff off of global object.

diagrammar.collections = (function() {
'use strict';

//------------------------------------------------------------------------------
// Linked list.

class LinkedListNode {
  constructor(value) {
    this.next = null;
    this.prev = null;
    this.value = value;
  }
}

class LinkedList {
  constructor() {
    this.clear();
  }

  empty() {
    return this.length === 0;
  }

  pushBack(value) {
    return this.insertAfter(value, undefined);
  }

  pushFront(value) {
    return this.insertBefore(value, undefined);
  }

  popBack() {
    const node = this.back;
    return node ? this.remove(node) : undefined;
  }

  popFront() {
    const node = this.front;
    return node ? this.remove(node) : undefined;
  }

  remove(node) {
    if (node.next)
      node.next.prev = node.prev;
    else
      this.back = node.prev;
    if (node.prev)
      node.prev.next = node.next;
    else
      this.front = node.next;

    node.next = node.prev = null;
    this.length -= 1;
    return node;
  }

  insertAfter(value, prev) {
    const node = (value instanceof LinkedListNode) ? value : new LinkedListNode(value);
    if (!prev)
      prev = this.back;
    const next = prev ? prev.next : null;
    this.insert_(node, prev, next);
    return node;
  }

  insertBefore(value, next) {
    const node = (value instanceof LinkedListNode) ? value : new LinkedListNode(value);
    if (!next)
      next = this.front;
    const prev = next ? next.prev : null;
    this.insert_(node, prev, next);
    return node;
  }

  insert_(node, prev, next) {
    if (prev)
      prev.next = node;
    else
      this.front = node;
    if (next)
      next.prev = node;
    else
      this.back = node;
    node.prev = prev;
    node.next = next;
    this.length += 1;
  }

  clear() {
    this.front = this.back = null;
    this.length = 0;
  }

  forEach(fn) {
    let node = this.front;
    while (node) {
      fn(node.value);
      node = node.next;
    }
  }

  forEachReverse(fn) {
    let node = this.back;
    while (node) {
      fn(node.value);
      node = node.prev;
    }
  }

  find(value) {
    let node = this.front;
    while (node) {
      if (value === node.value)
        return node;
      node = node.next;
    }
    return undefined;
  }
}

//------------------------------------------------------------------------------
// Queue, a simple queue implementation.
// The end of the queue is at the end of the backing array.
// The head of the queue is indicated by head_, limited by
// headLimit_.

class Queue {
  constructor() {
    this.clear();
  }

  enqueue(item) {
    this.array.push(item);
    return this;
  }

  dequeue() {
    const headLimit = 1000, // Size limit for unused portion
          sliceMin = 10;    // Minimum size to discard array

    let result;
    if (!this.empty()) {
      result = this.array[this.head];
      this.head++;
      if (this.head >= headLimit
          || this.head > sliceMin && this.head > this.length) {
        this.array = this.array.slice(this.head);
        this.head = 0;
      }
    }
    return result;
  }

  empty() {
    return this.array.length - this.head === 0;
  }

  clear() {
    this.array = new Array();
    this.head = 0;
  }
}

//------------------------------------------------------------------------------
// Priority Queue.

class PriorityQueue {
  constructor(compareFn, array) {
    this.compareFn_ = compareFn;
    if (array) {
      this.array = array.slice(0);
      this.heapify_();
    } else {
      this.array = new Array();
    }
  }

  empty() {
    return this.array.length === 0;
  }

  front() {
    return !empty() ? this.array[0] : undefined;
  }

  push(value) {
    const array = this.array,
          end = array.length;;
    array.push(value);
    [array[0], array[end]] = [array[end], array[0]];
    this.siftDown_(0);
  }

  pop() {
    const array = this.array;
    if (!array.length)
      return undefined;
    const result = array[0];
    const last = array.pop();  // take the last element to avoid a hole in the last generation.
    if (array.length) {
      array[0] = last;
      this.siftDown_(0);
    }
    return result;
  }

  heapify_() {
    const array = this.array;
    let parent = Math.floor((array.length - 1) / 2);  // the last parent in the heap.
    while (parent >= 0) {
      this.siftDown_(parent);
      parent--;
    }
  }

  siftDown_(parent) {
    const array = this.array;
    while (true) {
      const first = parent * 2 + 1;
      if (first >= array.length)
        break;
      const second = first + 1;
      let child = first;
      if (second < array.length && this.compareFn_(array[first], array[second]) < 0) {
        child = second;
      }
      if (this.compareFn_(array[parent], array[child]) >= 0)
        break;
      // swap parent and child and continue.
      [array[parent], array[child]] = [array[child], array[parent]];
      parent = child;
    }
  }

  siftUp_() {
    const array = this.array;
    let i = array.length - 1;
    while (i > 0) {
      const value = array[i],
            parentIndex = Math.floor(i / 2),
            parent = array[parentIndex];
      if (this.compareFn_(parent, value) >= 0)
        break;
      array[i] = parent;
      array[parentIndex] = value;
      i = parentIndex;
    }
  }
}

//------------------------------------------------------------------------------
// Set that orders elements by the order in which they were added. Note that
// adding an element already in the set makes it the most recently added.

class SelectionSet {
  constructor() {
    this.list= new LinkedList();
    this.map = new Map();
    this.length = 0;
  }

  empty() {
    return this.length === 0;
  }

  contains(element) {
    return this.map.has(element);
  }

  lastSelected() {
    return !this.list.empty() ? this.list.front.value : undefined;
  }

  add(element) {
    let node = this.map.get(element);
    if (node) {
      this.list.remove(node);
      this.list.pushFront(node);
    } else {
      node = this.list.pushFront(element);
      this.map.set(element, node);
      this.length += 1;
    }
    return true;
  }

  remove(element) {
    const node = this.map.get(element);
    if (node) {
      this.map.delete(element);
      this.list.remove(node);
      this.length -= 1;
      return true;
    }
    return false;
  }

  toggle(element) {
    if (this.contains(element))
      this.remove(element);
    else
      this.add(element);
  }

  clear() {
    this.list.clear();
    this.map.clear();
    this.length = 0;
  }

  forEach(fn) {
    return this.list.forEach(function(item) {
      fn(item);
    });
  }

  forEachReverse(fn) {
    return this.list.forEachReverse(function(item) {
      fn(item);
    });
  }
}

//------------------------------------------------------------------------------
// DisjointSet, a simple Union-Find implementation.

class DisjointSet {
  constructor() {
    this.sets = [];
  }

  makeSet(item) {
    const set = {
      item: item,
      rank: 0,
    }
    set.parent = set;
    this.sets.push(set);
    return set;
  }

  find(set) {
    // Path splitting rather than path compression for simplicity.
    while (set.parent != set) {
      const next = set.parent;
      set.parent = next.parent;
      set = next;
    }
    return set;
  }

  union(set1, set2) {
   let root1 = this.find(set1),
       root2 = this.find(set2);

   if (root1 === root2)
       return;

   if (root1.rank < root2.rank)
     root1, root2 = root2, root1;

   root2.parent = root1;
   if (root1.rank === root2.rank)
     root1.rank += 1;
  }
}

//------------------------------------------------------------------------------
// EmptyArray instance.

const _emptyArray = new Array();
_emptyArray.push =
_emptyArray.unshift =
_emptyArray.pop =
_emptyArray.shift =
_emptyArray.splice = function() {}

Object.freeze(_emptyArray);

function EmptyArray() {
  return _emptyArray;
}

//------------------------------------------------------------------------------
// EmptySet instance.

const _emptySet = new Set();
_emptySet.add =
_emptySet.delete =
_emptySet.clear = function() {}

Object.freeze(_emptySet);

function EmptySet() {
  return _emptySet;
}

//------------------------------------------------------------------------------
// Collection utilities.

function equalSets(a, b) {
  if (a.size != b.size)
    return false;

  for (let element of a) {
    if (!b.has(element)) {
      return false;
    }
  }
  return true;
}

//------------------------------------------------------------------------------

return {
  LinkedList: LinkedList,

  Queue: Queue,
  PriorityQueue: PriorityQueue,

  SelectionSet: SelectionSet,
  DisjointSet: DisjointSet,
  EmptyArray: EmptyArray,
  EmptySet: EmptySet,

  equalSets: equalSets,
};

})();  // diagrammar.collections

