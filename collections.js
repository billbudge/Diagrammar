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

LinkedList.prototype.empty = function() {
  return this.length == 0;
};

LinkedList.prototype.pushBack = function(value) {
  return this.insertAfter(value, null);
};

LinkedList.prototype.pushFront = function(value) {
  return this.insertBefore(value, null);
};

LinkedList.prototype.popBack = function() {
  var node = this.back;
  return node ? this.remove(node) : null;
};

LinkedList.prototype.popFront = function() {
  var node = this.front;
  return node ? this.remove(node) : null;
};

LinkedList.prototype.remove = function(node) {
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
};

LinkedList.prototype.insertAfter = function(value, prev) {
  const node = (value instanceof LinkedListNode) ? value : new LinkedListNode(value);
  if (!prev)
    prev = this.back;
  const next = prev ? prev.next : null;
  this.insert_(node, prev, next);
  return node;
};

LinkedList.prototype.insertBefore = function(value, next) {
  const node = (value instanceof LinkedListNode) ? value : new LinkedListNode(value);
  if (!next)
    next = this.front;
  const prev = next ? next.prev : null;
  this.insert_(node, prev, next);
  return node;
};

LinkedList.prototype.insert_ = function(node, prev, next) {
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
};

LinkedList.prototype.clear = function() {
  this.front = this.back = null;
  this.length = 0;
};

LinkedList.prototype.forEach = function(fn) {
  let node = this.front;
  while (node) {
    fn(node.value);
    node = node.next;
  }
};

LinkedList.prototype.forEachReverse = function(fn) {
  let node = this.back;
  while (node) {
    fn(node.value);
    node = node.prev;
  }
};

LinkedList.prototype.find = function(value) {
  let node = this.front;
  while (node) {
    if (value === node.value)
      return node;
    node = node.next;
  }
  return null;
};

//------------------------------------------------------------------------------
// Queue, a simple queue implementation.
// The end of the queue is at the end of the backing array.
// The head of the queue is indicated by head_, limited by
// headLimit_.

function Queue() {
  this.q_ = [];
  // Index past unused portion.
  this.head_ = 0;
  // Size limit for unused portion.
  this.headLimit_ = 1000;
  // Minimum size needed to throw out unused portion.
  this.sliceMin_ = 10;
}

Queue.prototype = {
  enqueue: function(item) {
    this.q_.push(item);
    return this;
  },

  dequeue: function() {
    let result;
    if (!this.empty()) {
      result = this.q_[this.head_];
      this.head_++;
      if (this.head_ >= this.headLimit_
          || this.head_ > this.sliceMin_ && this.head_ > this.length) {
        this.q_ = this.q_.slice(this.head_);
        this.head_ = 0;
      }
    }
    return result;
  },

  empty: function() {
    return this.q_.length - this.head_ === 0;
  },

  clear: function() {
    this.q_ = [];
    this.head_ = 0;
  }
};

//------------------------------------------------------------------------------
// Priority Queue.

function PriorityQueue(compareFn, array) {
  this.compareFn_ = compareFn;
  if (array) {
    this.inner_ = array.slice(0);
    this.heapify_();
  } else {
    this.inner_ = [];
  }
}

PriorityQueue.prototype = {
  empty: function() {
    return this.inner_.length == 0;
  },

  front: function() {
    return !empty() ? this.inner_[0] : null;
  },

  push: function(value) {
    this.inner_.push(value);
    this.siftUp_();
  },

  pop: function() {
    const array = this.inner_;
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
    const array = this.inner_;
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
    const array = this.inner_;
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

function SelectionSet() {
  this.list_ = new LinkedList();
  this.map_ = new Map();
  this.length = 0;
}

SelectionSet.prototype = {
  empty: function() {
    return this.length === 0;
  },

  contains: function(element) {
    return this.map_.has(element);
  },

  lastSelected: function() {
    return !this.list_.empty() ? this.list_.front.value : null;
  },

  add: function(element) {
    let node = this.map_.get(element);
    if (node) {
      this.list_.remove(node);
      this.list_.pushFront(node);
    } else {
      node = this.list_.pushFront(element);
      this.map_.set(element, node);
      this.length += 1;
    }
    return true;
  },

  remove: function(element) {
    const node = this.map_.get(element);
    if (node) {
      this.map_.delete(element);
      this.list_.remove(node);
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
    this.list_.clear();
    this.map_.clear();
    this.length = 0;
  },

  forEach: function(fn) {
    return this.list_.forEach(function(item) {
      fn(item);
    });
  },

  forEachReverse: function(fn) {
    return this.list_.forEachReverse(function(item) {
      fn(item);
    });
  },
};

//------------------------------------------------------------------------------
// DisjointSet, a simple Union-Find implementation.

function DisjointSet() {
  this.sets = [];
}

DisjointSet.prototype = {
  makeSet: function(item) {
    const set = {
      item: item,
      rank: 0,
    }
    set.parent = set;
    this.sets.push(set);
    return set;
  },

  find: function(set) {
    while (set.parent != set) {
      const next = set.parent;
      set.parent = next.parent;
      set = next;
    }
    return set;
  },

  union: function(set1, set2) {
   let root1 = this.find(set1),
       root2 = this.find(set2);

   if (root1 == root2)
       return;

   if (root1.rank < root2.rank)
     root1, root2 = root2, root1;

   root2.parent = root1;
   if (root1.rank == root2.rank)
     root1.rank += 1;
  },
};

return {
  LinkedListNode: LinkedListNode,
  LinkedList: LinkedList,

  Queue: Queue,
  PriorityQueue: PriorityQueue,

  SelectionSet: SelectionSet,
  DisjointSet: DisjointSet,
};

})();  // diagrammar.collections

