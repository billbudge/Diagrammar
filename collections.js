// Collections.

var diagrammar = diagrammar || {};

diagrammar.collections = (function() {
'use strict';

//------------------------------------------------------------------------------
// Linked list.

function LinkedListNode(value) {
  this.next = null;
  this.prev = null;
  if (value)
    this.value = value;
}

function LinkedList() {
  this.clear();
}

LinkedList.prototype = {
  empty: function() {
    return this.length == 0;
  },

  pushBack: function(value) {
    return this.insertAfter(value, null);
  },

  pushFront: function(value) {
    return this.insertBefore(value, null);
  },

  popBack: function() {
    const node = this.back;
    return node ? this.remove(node) : null;
  },

  popFront: function() {
    const node = this.front;
    return node ? this.remove(node) : null;
  },

  remove: function(node) {
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
  },

  insertAfter: function(value, prev) {
    const node = (value instanceof LinkedListNode) ? value : new LinkedListNode(value);
    if (!prev)
      prev = this.back;
    const next = prev ? prev.next : null;
    this.insert_(node, prev, next);
    return node;
  },

  insertBefore: function(value, next) {
    const node = (value instanceof LinkedListNode) ? value : new LinkedListNode(value);
    if (!next)
      next = this.front;
    const prev = next ? next.prev : null;
    this.insert_(node, prev, next);
    return node;
  },

  insert_: function(node, prev, next) {
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
  },

  clear: function() {
    this.front = this.back = null;
    this.length = 0;
  },

  forEach: function(fn) {
    let node = this.front;
    while (node) {
      fn(node.value);
      node = node.next;
    }
  },

  forEachReverse: function(fn) {
    let node = this.back;
    while (node) {
      fn(node.value);
      node = node.prev;
    }
  },

  find: function(value) {
    let node = this.front;
    while (node) {
      if (value === node.value)
        return node;
      node = node.next;
    }
    return null;
  },
}

//------------------------------------------------------------------------------
// Queue, a simple queue implementation.
// The end of the queue is at the end of the backing array.
// The head of the queue is indicated by head_, limited by
// headLimit_.

const _array = Symbol('array'),
      _head = Symbol('head');

function Queue() {
  this[_array] = new Array();
  // Index past unused portion.
  this[_head] = 0;
}

Queue.prototype = {
  enqueue: function(item) {
    this[_array].push(item);
    return this;
  },

  dequeue: function() {
    const headLimit = 1000, // Size limit for unused portion
          sliceMin = 10;    // Minimum size to discard array

    let result;
    if (!this.empty()) {
      result = this[_array][this[_head]];
      this[_head]++;
      if (this[_head] >= headLimit
          || this[_head] > sliceMin && this[_head] > this.length) {
        this[_array] = this[_array].slice(this[_head]);
        this[_head] = 0;
      }
    }
    return result;
  },

  empty: function() {
    return this[_array].length - this[_head] === 0;
  },

  clear: function() {
    this[_array] = new Array();
    this[_head] = 0;
  }
};

//------------------------------------------------------------------------------
// Priority Queue.

function PriorityQueue(compareFn, array) {
  this.compareFn_ = compareFn;
  if (array) {
    this[_array] = array.slice(0);
    this.heapify_();
  } else {
    this[_array] = new Array();
  }
}

PriorityQueue.prototype = {
  empty: function() {
    return this[_array].length == 0;
  },

  front: function() {
    return !empty() ? this[_array][0] : null;
  },

  push: function(value) {
    this[_array].push(value);
    this.siftUp_();
  },

  pop: function() {
    const array = this[_array];
    if (!array.length)
      return null;
    const value = array[0];
    let i = 1;
    while (i < array.length) {
      const parentIndex = Math.floor((i - 1) / 2);
      let largestChild = i;
      if (i + 1 < array.length && this.compareFn_(array[i], array[i + 1]) < 0)
        largestChild = i + 1;
      array[parentIndex] = array[largestChild];
      i = largestChild * 2 + 1;
    }
    array.pop();
    return value;
  },

  heapify_: function() {
    const array = this[_array];
    for (let i = array.length - 1; i > 0; i--) {
      const value = array[i],
            parentIndex = Math.floor((i - 1) / 2),
            parent = array[parentIndex];
      if (this.compareFn_(parent, value) < 0) {
        array[i] = parent;
        array[parentIndex] = value;
      }
    }
  },

  siftUp_: function() {
    const array = this[_array];
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
};

//------------------------------------------------------------------------------
// Set that orders elements by the order in which they were added. Note that
// adding an element already in the set makes it the most recently added.

const _list = Symbol('list'),
      _map = Symbol('map');

function SelectionSet() {
  this[_list]= new LinkedList();
  this[_map] = new Map();
  this.length = 0;
}

SelectionSet.prototype = {
  empty: function() {
    return this.length === 0;
  },

  contains: function(element) {
    return this[_map].has(element);
  },

  lastSelected: function() {
    return !this[_list].empty() ? this[_list].front.value : null;
  },

  add: function(element) {
    let node = this[_map].get(element);
    if (node) {
      this[_list].remove(node);
      this[_list].pushFront(node);
    } else {
      node = this[_list].pushFront(element);
      this[_map].set(element, node);
      this.length += 1;
    }
    return true;
  },

  remove: function(element) {
    const node = this[_map].get(element);
    if (node) {
      this[_map].delete(element);
      this[_list].remove(node);
      this.length -= 1;
      return true;
    }
    return false;
  },

  toggle: function(element) {
    if (this.contains(element))
      this.remove(element);
    else
      this.add(element);
  },

  clear: function() {
    this[_list].clear();
    this[_map].clear();
    this.length = 0;
  },

  forEach: function(fn) {
    return this[_list].forEach(function(item) {
      fn(item);
    });
  },

  forEachReverse: function(fn) {
    return this[_list].forEachReverse(function(item) {
      fn(item);
    });
  },
};

//------------------------------------------------------------------------------
// DisjointSet, a simple Union-Find implementation.

const _parent = Symbol('parent'),
      _rank = Symbol('rank');

function DisjointSet() {
  this.sets = [];
}

DisjointSet.prototype = {
  makeSet: function(item) {
    const set = {
      item: item,
      [_rank]: 0,
    }
    set[_parent] = set;
    this.sets.push(set);
    return set;
  },

  find: function(set) {
    // Path splitting rather than path compression for simplicity.
    while (set[_parent] != set) {
      const next = set[_parent];
      set[_parent] = next[_parent];
      set = next;
    }
    return set;
  },

  union: function(set1, set2) {
   let root1 = this.find(set1),
       root2 = this.find(set2);

   if (root1 == root2)
       return;

   if (root1[_rank] < root2[_rank])
     root1, root2 = root2, root1;

   root2[_parent] = root1;
   if (root1[_rank] == root2[_rank])
     root1[_rank] += 1;
  },
};

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

return {
  LinkedListNode: LinkedListNode,
  LinkedList: LinkedList,

  Queue: Queue,
  PriorityQueue: PriorityQueue,

  SelectionSet: SelectionSet,
  DisjointSet: DisjointSet,
  EmptyArray: EmptyArray,
  EmptySet: EmptySet,
};

})();  // diagrammar.collections

