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
  var node = (value instanceof LinkedListNode) ? value : new LinkedListNode(value);
  if (!prev)
    prev = this.back;
  var next = prev ? prev.next : null;
  this.insert_(node, prev, next);
  return node;
};

LinkedList.prototype.insertBefore = function(value, next) {
  var node = (value instanceof LinkedListNode) ? value : new LinkedListNode(value);
  if (!next)
    next = this.front;
  var prev = next ? next.prev : null;
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
  var node = this.front;
  while (node) {
    fn(node.value);
    node = node.next;
  }
};

LinkedList.prototype.forEachReverse = function(fn) {
  var node = this.back;
  while (node) {
    fn(node.value);
    node = node.prev;
  }
};

LinkedList.prototype.find = function(value) {
  var node = this.front;
  while (node) {
    if (value === node.value)
      return node;
    node = node.next;
  }
  return null;
};

//------------------------------------------------------------------------------
// Queue, a simple queue implementation.
// The head of the queue is at the beginning of the backing array.

function Queue() {
	this.head_ = 0;
	this.headLimit_ = 1000;
	this.sliceMin_ = 10;
	this.q_ = [];
}

Queue.prototype = {
    enqueue: function(item) {
      this.q_.push(item);
      return this;
    },

    dequeue: function() {
      var result = this.q_[this.head_];
      delete this.q_[this.head_];
      this.head_ = this.head_ + 1;
      if (this.head_ >= this.headLimit_ ||
          this.head_ > this.sliceMin_ && this.head_ > (this.q_.length - this.head_)) {
        this.q_ = this.q_.slice(this.head_);
        this.head_ = 0;
      }
      return result;
    },

    empty: function() {
      return this.q_.length === this.head_;
    },

    clear: function() {
      var result = this.q_.slice(this.head_);
      this.q_ = [];
      this.head_ = 0;
      return result;
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
    var array = this.inner_;
    if (!array.length)
      return null;
    var value = array[0];
    var i = 1;
    while (i < array.length) {
      var parentIndex = Math.floor((i - 1) / 2);
      var largestChild = i;
      if (i + 1 < array.length && this.compareFn_(array[i], array[i + 1]) < 0)
        largestChild = i + 1;
      array[parentIndex] = array[largestChild];
      i = largestChild * 2 + 1;
    }
    array.pop();
    return value;
  },

  heapify_: function() {
    var array = this.inner_;
    for (var i = array.length - 1; i > 0; i--) {
      var value = array[i];
      var parentIndex = Math.floor((i - 1) / 2);
      var parent = array[parentIndex];
      if (this.compareFn_(parent, value) < 0) {
        array[i] = parent;
        array[parentIndex] = value;
      }
    }
  },

  siftUp_: function() {
    var array = this.inner_;
    var i = array.length - 1;
    while (i > 0) {
      var value = array[i];
      var parentIndex = Math.floor(i / 2);
      var parent = array[parentIndex];
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
    var node = this.map_.get(element);
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
    var node = this.map_.get(element);
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

return {
  LinkedList: LinkedList,
  LinkedListNode: LinkedListNode,
  PriorityQueue: PriorityQueue,
  Queue: Queue,
  SelectionSet: SelectionSet,
};

})();  // diagrammar.collections

