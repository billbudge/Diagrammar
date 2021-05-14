// Data models and related objects.

const dataModels = (function() {
'use strict';

//------------------------------------------------------------------------------

const dataModel = (function() {
  const proto = {
    // Visits the item's top level properties.
    visitProperties: function(item, propFn) {
      if (Array.isArray(item)) {
        // Array item.
        const length = item.length;
        for (let i = 0; i < length; i++)
          propFn(item, i);
      } else {
        // Object.
        for (let attr in item) {
          if (this.isProperty(item, attr))
            propFn(item, attr);
        }
      }
    },

    // Visits the item's top level reference properties.
    visitReferences: function(item, refFn) {
      const self = this;
      this.visitProperties(item, function(item, attr) {
        if (self.isReference(item, attr))
          refFn(item, attr);
      });
    },

    // Visits the item's top level properties that are Arrays or child items.
    visitChildren: function(item, childFn) {
      const self = this;
      this.visitProperties(item, function(item, attr) {
        const value = item[attr];
        if (!self.isItem(value))
          return;
        if (Array.isArray(value))
          self.visitChildren(value, childFn);
        else
          childFn(value);
      });
    },

    // Visits the item and all of its descendant items.
    visitSubtree: function(item, itemFn) {
      itemFn(item);
      const self = this;
      this.visitChildren(item, function(child) {
        self.visitSubtree(child, itemFn);
      });
    },

    addInitializer: function(initialize) {
      this.initializers.push(initialize);
    },

    initialize: function(item) {
      const self = this,
            root = item || this.root;
      this.visitSubtree(root, function(item) {
        self.initializers.forEach(function(initializer) {
          initializer(item);
        });
      });
    },
  }

  let nextId;

  const defaultImpl = {
    // Returns true iff. value is an item in the model.
    isItem: function(value) {
      return value && typeof value === 'object';
    },

    // Returns true iff. item[attr] is a model property.
    isProperty: function(item, attr) {
      return attr !== 'id' &&
             item.hasOwnProperty(attr);
    },

    getId: function(item) {
      return item.id;
    },

    assignId: function(item) {
      // 0 is not a valid id in this model.
      const id = nextId++;
      item.id = id;
      return id;
    },

    // Returns true iff. item[attr] is a property that references an item.
    isReference: function(item, attr) {
      const attrName = attr.toString(),
            position = attrName.length - 2;
      return position >= 0 &&
             attrName.lastIndexOf('Id', position) === position;
    },

    configure: function(model) {
      const self = this,
            root = model.root || model;
      this.root = root;

      // Find the maximum id in the model and set nextId to 1 greater.
      nextId = 0;
      this.visitSubtree(root, function(item) {
        const id = self.getId(item);
        if (id)
          nextId = Math.max(nextId, id);
      });
      nextId++;
    },
  }

  function extend(model, impl) {
    if (model.dataModel)
      return model.dataModel;

    const instance = Object.assign(Object.create(proto), impl || defaultImpl);
    instance.model = model;
    instance.configure(model);

    instance.initializers = new Array();

    model.dataModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

const eventMixin = (function() {
  function addHandler(event, handler) {
    let list = this[event];
    if (!list)
      list = this[event] = new Array();
    list.push(handler);
  }

  function removeHandler(event, handler) {
    const list = this[event];
    if (list) {
      const index = list.indexOf(handler);
      if (index >= 0)
        list.splice(index, 1);
    }
  }

  function onEvent(event, handler) {
    const list = this[event];
    if (list)
      list.forEach(handler);
  }

  function extend(model) {
    if (!model.addHandler)
      model.addHandler = addHandler;
    if (!model.removeHandler)
      model.removeHandler = removeHandler;
    if (!model.onEvent)
      model.onEvent = onEvent;

    return model;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

const observableModel = (function() {
  const proto = {
    // Notifies observers that the value of a property has changed.
    // Standard formats:
    // 'change': item, attr, oldValue.
    // 'insert': item, attr, index.
    // 'remove': item, attr, index, oldValue.
    onChanged: function(change) {
      // console.log(change);
      this.onEvent('changed', function(handler) {
        handler(change);
      });
    },

    onValueChanged: function(item, attr, oldValue) {
      this.onChanged({
        type: 'change',
        item: item,
        attr: attr,
        oldValue: oldValue,
      });
    },

    changeValue: function(item, attr, newValue) {
      const oldValue = item[attr];
      if (newValue !== oldValue) {
        item[attr] = newValue;
        this.onValueChanged(item, attr, oldValue);
      }
      return oldValue;
    },

    onElementInserted: function(item, attr, index) {
      this.onChanged({
        type: 'insert',
        item: item,
        attr: attr,
        index: index,
      });
    },

    insertElement: function(item, attr, index, newValue) {
      const array = item[attr];
      array.splice(index, 0, newValue);
      this.onElementInserted(item, attr, index);
    },

    onElementRemoved: function(item, attr, index, oldValue) {
      this.onChanged({
        type: 'remove',
        item: item,
        attr: attr,
        index: index,
        oldValue: oldValue,
      });
    },

    removeElement: function(item, attr, index) {
      const array = item[attr], oldValue = array[index];
      array.splice(index, 1);
      this.onElementRemoved(item, attr, index, oldValue);
      return oldValue;
    },
  }

  function extend(model) {
    if (model.observableModel)
      return model.observableModel;

    const instance = Object.create(proto);
    instance.model = model;
    eventMixin.extend(instance);

    model.observableModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

const transactionModel = (function() {
  const opProto = {
    undo: function() {
      const change = this.change,
            item = change.item, attr = change.attr,
            observableModel = this.observableModel;
      switch (change.type) {
        case 'change': {
          const oldValue = item[attr];
          item[attr] = change.oldValue;
          change.oldValue = oldValue;
          observableModel.onChanged(change);  // this change is its own inverse.
          break;
        }
        case 'insert': {
          const array = item[attr], index = change.index;
          change.oldValue = array[index];
          array.splice(index, 1);
          observableModel.onElementRemoved(item, attr, index, change.oldValue);
          change.type = 'remove';
          break;
        }
        case 'remove': {
          const array = item[attr], index = change.index;
          array.splice(index, 0, change.oldValue);
          observableModel.onElementInserted(item, attr, index);
          change.type = 'insert';
          break;
        }
      }
    },
    redo: function() {
      // 'change' is a toggle, and we swap 'insert' and 'remove' so redo is
      // just undo.
      this.undo();
    }
  }

  const selectionOpProto = {
    undo: function() {
      this.selectionModel.set(this.startingSelection);
    },
    redo: function() {
      this.selectionModel.set(this.endingSelection);
    }
  }

  const proto = {
    // Notifies observers that a transaction has started.
    beginTransaction: function(name) {
      const transaction = {
        name: name,
        ops: [],
      };
      this.transaction = transaction;
      this.changedItems = new Map();

      this.onBeginTransaction(transaction);
      this.onEvent('transactionBegan', function(handler) {
        handler(transaction);
      });
    },

    // Notifies observers that a transaction is ending. Observers should now
    // do any adjustments to make data valid, or cancel the transaction if
    // the data is in an invalid state.
    endTransaction: function() {
      const transaction = this.transaction;
      this.onEndTransaction(transaction);
      this.onEvent('transactionEnding', function(handler) {
        handler(transaction);
      });

      this.transaction = null;
      this.changedItems = null;

      this.onEvent('transactionEnded', function(handler) {
        handler(transaction);
      });
    },

    // Notifies observers that a transaction was canceled and its changes
    // rolled back.
    cancelTransaction: function() {
      this.undo(this.transaction);
      const transaction = this.transaction;
      this.transaction = null;
      this.onCancelTransaction(transaction);
      this.onEvent('transactionCanceled', function(handler) {
        handler(transaction);
      });
    },

    // Undoes the changes in the transaction.
    undo: function(transaction) {
      // Roll back changes.
      const ops = transaction.ops, length = ops.length;
      for (let i = length - 1; i >= 0; i--) {
        ops[i].undo();
      }
      // TODO consider raising transaction ended event instead.
      this.onEvent('didUndo', function(handler) {
        handler(transaction);
      });
    },

    // Redoes the changes in the transaction.
    redo: function(transaction) {
      // Roll forward changes.
      const ops = transaction.ops, length = ops.length;
      for (let i = 0; i < length; i++) {
        ops[i].redo();
      }
      // TODO consider raising transaction ended event instead.
      this.onEvent('didRedo', function(handler) {
        handler(transaction);
      });
    },

    getSnapshot: function(item) {
      const changedItems = this.changedItems;
      if (!changedItems)
        return;
      const changedItem = changedItems.get(item);
      return changedItem ? changedItem.snapshot : item;
    },

    onBeginTransaction: function(transaction) {
      const selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      this.startingSelection = selectionModel.contents();
    },

    onEndTransaction: function(transaction) {
      const selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      const startingSelection = this.startingSelection;
      let endingSelection = selectionModel.contents();
      if (startingSelection.length === endingSelection.length &&
          startingSelection.every(function(element, i) {
            return element === endingSelection[i];
          })) {
        endingSelection = startingSelection;
      }
      const op = Object.create(selectionOpProto);
      op.startingSelection = startingSelection;
      op.endingSelection = endingSelection;
      op.selectionModel = selectionModel;
      this.transaction.ops.push(op);
      this.startingSelection = null;
    },

    onCancelTransaction: function(transaction) {
      const selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      this.startingSelection = null;
    },

    recordChange_: function(change) {
      const op = Object.create(opProto);
      op.change = change;
      op.observableModel = this.model.observableModel;
      this.transaction.ops.push(op);
    },

    onChanged_: function(change) {
      if (!this.transaction)
        return;

      const dataModel = this.model.dataModel,
            item = change.item, attr = change.attr;

      if (change.type !== 'change') {
        // Record insert and remove element changes.
        this.recordChange_(change);
      } else {
        // Coalesce value changes. Only record them the first time we observe
        // the (item, attr) change.
        const changedItems = this.changedItems;
        let changedItem = changedItems.get(item),
            snapshot, oldValue;
        if (changedItem) {
          snapshot = changedItem.snapshot;
        } else {
          // The snapshot just extends the item, and gradually overrides it as
          // we receive attribute changes for it.
          snapshot = Object.create(item);
          changedItem = { item: item, snapshot: snapshot };
          changedItems.set(item, changedItem);
        }
        if (!snapshot.hasOwnProperty(attr)) {
          snapshot[attr] = change.oldValue;
          this.recordChange_(change);
        }
      }
    },
  }

  function extend(model) {
    if (model.transactionModel)
      return model.transactionModel;

    dataModel.extend(model);
    observableModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;
    eventMixin.extend(instance);
    model.observableModel.addHandler('changed',
                                     change => instance.onChanged_(change));

    model.transactionModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

const transactionHistory = (function() {
  const proto = {
    getRedo: function() {
      const length = this.undone.length;
      return length > 0 ? this.undone[length - 1] : null;
    },

    getUndo: function() {
      const length = this.done.length;
      return length > 0 ? this.done[length - 1] : null;
    },

    redo: function() {
      const transaction = this.getRedo();
      if (transaction) {
        this.model.transactionModel.redo(transaction);
        this.done.push(this.undone.pop());
      }
    },

    undo: function() {
      const transaction = this.getUndo();
      if (transaction) {
        this.model.transactionModel.undo(transaction);
        this.undone.push(this.done.pop());
      }
    },

    onTransactionEnded_: function(transaction) {
      if (this.undone.length)
        this.undone = [];
      this.done.push(transaction);
    },
  }

  function extend(model) {
    if (model.transactionHistory)
      return model.transactionHistory;

    transactionModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;
    instance.done = [];
    instance.undone = [];
    model.transactionModel.addHandler('transactionEnded',
                                      transaction => instance.onTransactionEnded_(transaction));

    model.transactionHistory = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

// Referencing model. It tracks reference targets in the data and resolves
// reference properties from ids to actual references.
const referencingModel = (function() {
  const proto = {
    // Gets the object that is referenced by item[attr]. Default is to return
    // item[_attr].
    getReference: function(item, attr) {
      return item[Symbol.for(attr)] || this.resolveReference(item, attr);
    },

    getReferenceFn: function(attr) {
      // this object caches the reference functions, indexed by the symbol.
      const self = this, symbol = Symbol.for(attr);
      let fn = this[symbol];
      if (!fn) {
        fn = item => { return item[symbol] || self.resolveReference(item, attr); };
        self[symbol] = fn;
      }
      return fn;
    },

    // Resolves an id to a target item if possible.
    resolveId: function(id) {
      return this.targets_.get(id);
    },

    // Resolves a reference to a target item if possible.
    resolveReference: function(item, attr) {
      const newId = item[attr],
            newTarget = this.resolveId(newId);
      item[Symbol.for(attr)] = newTarget;
      return newTarget;
    },

    // Recursively adds item and sub-items as potential reference targets, and
    // resolves any references they contain.
    addTargets_: function(item) {
      const self = this, dataModel = this.model.dataModel;
      dataModel.visitSubtree(item, function(item) {
        const id = dataModel.getId(item);
        if (id)
          self.targets_.set(id, item);
      });
      dataModel.visitSubtree(item, function(item) {
        dataModel.visitReferences(item, function(item, attr) {
          self.resolveReference(item, attr);
        });
      });
    },

    // Recursively removes item and sub-items as potential reference targets.
    removeTargets_: function(item) {
      const self = this, dataModel = this.model.dataModel;
      dataModel.visitSubtree(item, function(item) {
        const id = dataModel.getId(item);
        if (id)
          self.targets_.delete(id);
      });
    },

    onChanged_: function(change) {
      const dataModel = this.model.dataModel,
            item = change.item,
            attr = change.attr;
      switch (change.type) {
        case 'change': {
          if (dataModel.isReference(item, attr)) {
            this.resolveReference(item, attr);
          } else {
            const oldValue = change.oldValue;
            if (dataModel.isItem(oldValue))
              this.removeTargets_(oldValue);
            const newValue = item[attr];
            if (dataModel.isItem(newValue))
              this.addTargets_(newValue);
          }
          break;
        }
        case 'insert': {
          const newValue = item[attr][change.index];
          if (dataModel.isItem(newValue))
            this.addTargets_(newValue);
          break;
        }
        case 'remove': {
          const oldValue = change.oldValue;
          if (dataModel.isItem(oldValue))
            this.removeTargets_(oldValue);
          break;
        }
      }
    },
  }

  function extend(model) {
    if (model.referencingModel)
      return model.referencingModel;

    dataModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;
    if (model.observableModel) {
      model.observableModel.addHandler('changed',
                                       change => instance.onChanged_(change));
    }
    instance.targets_ = new Map();
    instance.addTargets_(model.dataModel.root);

    model.referencingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

const referenceValidator = (function() {
  const proto = {
    onDanglingReference: function(item, attr) {
      this.onEvent('danglingReference', function(handler) {
        handler(item, attr);
      });
    },

    onTransactionEnding_: function(transaction) {
      const self = this, model = this.model,
            dataModel = tmodel.dataModel,
            referencingModel = model.referencingModel;
      dataModel.visitSubtree(dataModel.root, function(item) {
        dataModel.visitReferences(item, function(item, attr) {
          if (!referencingModel.resolveId(item[attr]))
            self.onDanglingReference(item, attr);
        });
      });
    },
  }

  function extend(model) {
    if (model.referenceValidator)
      return model.referenceValidator;

    const instance = Object.create(proto);
    instance.model = model;
    eventMixin.extend(instance);
    dataModel.extend(model);
    transactionModel.extend(model);
    referencingModel.extend(model);

    model.transactionModel.addHandler('transactionEnding',
                                      transaction => instance.onTransactionEnding_(transaction));

    model.referenceValidator = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

const selectionModel = (function() {
  function iterable(item) { return typeof item[Symbol.iterator] === 'function'; }

  const proto = {
    isEmpty: function() {
      return this.selection.length === 0;
    },

    contains: function(item) {
      return this.selection.contains(item);
    },

    lastSelected: function() {
      return this.selection.lastSelected();
    },

    add: function(item) {
      if (iterable(item)) {
        for (let subItem of item)
          this.selection.add(subItem);
      } else {
        this.selection.add(item);
      }
    },

    remove: function(item) {
      if (iterable(item)) {
        for (let subItem of item)
          this.selection.remove(subItem);
      } else {
        this.selection.remove(item);
      }
    },

    toggle: function(item) {
      if (iterable(item)) {
        for (let subItem of item)
          this.selection.toggle(subItem);
      } else {
        this.selection.toggle(item);
      }
    },

    set: function(item) {
      this.selection.clear();
      if (iterable(item)) {
        for (let subItem of item)
          this.selection.add(subItem);
      } else {
        this.selection.add(item);
      }
    },

    select: function(item, extend) {
      if (!this.contains(item)) {
        if (!extend)
          this.clear();
        this.add(item);
      } else {
        if (extend)
          this.remove(item);
        else
          this.add(item);  // make this last selected.
      }
    },

    clear: function() {
      this.selection.clear();
    },

    forEach: function(itemFn) {
      this.selection.forEach(itemFn);
    },

    contents: function() {
      const result = [];
      this.selection.forEach(function(item) { result.push(item); });
      return result;
    }
  }

  function extend(model) {
    if (model.selectionModel)
      return model.selectionModel;

    const instance = Object.create(proto);
    instance.model = model;
    instance.selection = new diagrammar.collections.SelectionSet();

    model.selectionModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

const instancingModel = (function() {
  const proto = {
    canClone: function(item) {
      return true;
    },

    clone: function(item, map) {
      // Return any primitive values without cloning.
      if (!this.model.dataModel.isItem(item))
        return item;

      const self = this, dataModel = this.model.dataModel;
      // Use constructor() to properly clone arrays, sets, maps, etc.
      const copy = item.constructor();
      dataModel.visitProperties(item, function(item, attr) {
        copy[attr] = self.clone(item[attr], map);
      });
      // Assign unique id after cloning all properties.
      if (!Array.isArray(copy)) {
        dataModel.assignId(copy);
        dataModel.initialize(copy);
        if (map) {
          const id = dataModel.getId(item);
          map.set(id, copy);
        }
      }
      return copy;
    },

    cloneGraph: function(items, map) {
      const dataModel = this.model.dataModel,
            copies = [];
      items.forEach(function(item) {
        copies.push(this.clone(item, map));
      }, this);
      copies.forEach(function(copy) {
        dataModel.visitSubtree(copy, function(copy) {
          if (Array.isArray(copy))
            return;
          for (let attr in copy) {
            if (dataModel.isReference(copy, attr)) {
              const originalId = copy[attr],
                    newCopy = map.get(originalId);
              if (newCopy) {
                const newId = dataModel.getId(newCopy);
                copy[attr] = newId;
              }
            }
          }
        });
      }, this);
      return copies;
    },

    // Strict deep equality (no working up prototype chain.)
    isomorphic: function(item1, item2, map) {
      const dataModel = this.model.dataModel;

      // The first pass matches all items and properties except references. It
      // builds the id mapping for the second pass.
      function firstPass(item1, item2) {
        if (!dataModel.isItem(item1) || !dataModel.isItem(item2))
          return item1 === item2;

        const keys1 = Object.keys(item1),
              keys2 = Object.keys(item2);
        if (keys1.length !== keys2.length)
          return false;
        for (let k of keys1) {
          if (!item2.hasOwnProperty(k))
            return false;
          // Skip id's.
          if (k === 'id')
            continue;
          // Skip reference properties.
          if (dataModel.isReference(item1, k) &&
              dataModel.isReference(item2, k)) {
            continue;
          }
          if (!firstPass(item1[k], item2[k])) {
            return false;
          }
        }

        // Add item1 -> item2 id mapping.
        const id1 = dataModel.getId(item1),
              id2 = dataModel.getId(item2);
        if (id1 && id2)
          map.set(id1, id2);

        return true;
      }

      // The second pass makes sure all reference properties of items are
      // to the same item, or isomorphic items.
      function secondPass(item1, item2) {
        if (dataModel.isItem(item1) && dataModel.isItem(item2)) {
          const keys1 = Object.keys(item1),
                keys2 = Object.keys(item2);
          for (let k of keys1) {
            // Check reference properties.
            if (dataModel.isReference(item1, k) &&
                dataModel.isReference(item2, k)) {
              // Check for the same external reference, or to an isomorphic
              // internal reference.
              if (item1[k] !== item2[k] &&
                  map.get(item1[k]) !== item2[k]) {
                return false;
              }
            }
          }
        }
        return true;
      }

      return firstPass(item1, item2) &&
             secondPass(item1, item2);
    },
  }

  function extend(model) {
    if (model.instancingModel)
      return model.instancingModel;

    dataModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;

    model.instancingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

// Tracks references on instances to canonical objects, maintaining a separate
// data array to hold the canonical objects. This array is updated as instances
// are added and removed.
const canonicalInstanceModel = (function() {
  const proto = {
    // Converts the instance to the canonical one if it is already in the model.
    // This should be called before adding the new instance to the model.
    internalize: function(instance) {
      const model = this.model,
            dataModel = model.dataModel,
            instancingModel = model.instancingModel;
      for (let canonical of this.canonicals_) {
        if (instancingModel.isomorphic(instance, canonical, new Map()))
          return canonical;
      }
      dataModel.assignId(instance);
      dataModel.initialize(instance);
      model.observableModel.insertElement(
          this.root, this.canonicalsAttr, this.canonicals_.length, instance);
      return instance;
    },

    insertItem_: function(item) {
      const self = this;
      function insert(item) {
        const canonical = self.getCanonical(item);
        if (canonical) {
          const map = self.references_;
          let count = map.get(canonical) || 0;  // if this is the first instance.
          count++;
          map.set(canonical, count);
          self.unused_.delete(canonical);
          self.onInstanceInserted(item, canonical);
        }
      }
      this.model.dataModel.visitSubtree(item, item => insert(item));
    },

    removeItem_: function(item) {
      const self = this;
      function remove(item) {
        const canonical = self.getCanonical(item);
        if (canonical) {
          const map = self.references_;
          let count = map.get(canonical);
          count--;
          if (count) {
            map.set(canonical, count);
          } else {
            self.unused_.add(canonical);
            map.delete(canonical);
          }
          self.onInstanceRemoved(item, canonical);
        }
      }
      this.model.dataModel.visitSubtree(item, item => remove(item));
    },

    onChange_: function(change) {
      const dataModel = this.model.dataModel;
      switch (change.type) {
        case 'insert':
          const inserted = change.item[change.attr][change.index];
          this.insertItem_(inserted);
          break;
        case 'remove':
          const removed = change.oldValue;
          this.removeItem_(removed);
          break;
      }
    },

    // Eliminate any unreferenced instances.
    makeConsistent_: function() {
      const model = this.model,
            observableModel = model.observableModel,
            unused = this.unused_;
      for (let canonical of unused) {
        const index = this.canonicals_.indexOf(canonical);
        // If undoing an insert, the instance may have already been removed.
        if (index < 0)
          continue;
        observableModel.removeElement(this.root, this.canonicalsAttr, index);
      }
      unused.clear();
    },
  }

  const defaultImpl = {
    canonicalsAttr: 'canonicals',
    canonicalRefAttr: 'canonicalId',

    configure: function(model) {
      this.root = model.dataModel.root;
    },

    onInstanceInserted: function(instance, canonical) {},

    onInstanceRemoved: function(instance, canonical) {},
  }

  function extend(model, impl) {
    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);
    dataModels.transactionModel.extend(model);
    dataModels.referencingModel.extend(model);
    dataModels.instancingModel.extend(model);

    const instance = Object.assign(Object.create(proto), impl || defaultImpl);
    instance.model = model;
    instance.configure(model);

    const root = instance.root,
          canonicalsAttr = instance.canonicalsAttr,
          canonicalRefAttr = instance.canonicalRefAttr,
          canonicalRefFn = model.referencingModel.getReferenceFn(canonicalRefAttr);
    instance.getCanonical = function(item) {
      return item.hasOwnProperty(canonicalRefAttr) ? canonicalRefFn(item) : undefined;
    };
    instance.unused_ = new Set();
    instance.canonicals_ = root[canonicalsAttr];

    // Build the reference map for the entire model.
    instance.references_ = new Map();
    instance.insertItem_(root);

    // Maintain reference counts for canonicals.
    model.observableModel.addHandler('changed',
                                     change => instance.onChange_(change));
    // Remove canonicals with no references.
    model.transactionModel.addHandler('transactionEnding',
                                      () => instance.makeConsistent_());

    model.canonicalInstanceModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------
// A model to add cut/copy/paste/delete behavior with a selection, instancing,
// and transaction model. The actual work of copying, deleting, and adding is
// done by the client.

const copyPasteModel = (function() {
  const proto = {
    // Generic cloning, returning copies and map from item => copy.
    cloneItems: function(items, map) {
      const model = this.model,
            dataModel = model.dataModel,
            instancingModel = model.instancingModel,
            copies = instancingModel.cloneGraph(items, map);
      copies.forEach(function(item) {
        dataModel.initialize(item);
      });
      return copies;
    },

    getScrap: function() {
      return this.scrap_;
    },

    setScrap: function(scrap) {
      this.scrap_ = scrap;
    },

    doDelete: function(deleteItemsFn) {
      const model = this.model, selectionModel = model.selectionModel,
            transactionModel = model.transactionModel;
      transactionModel.beginTransaction("Delete selection");
      deleteItemsFn(selectionModel.contents());
      selectionModel.clear();
      transactionModel.endTransaction();
    },

    doCopy: function(copyItemsFn) {
      const map = new Map(),
            copies = copyItemsFn(this.model.selectionModel.contents(), map);
      this.setScrap(copies);
      return copies;
    },

    doPaste: function(copyItemsFn, addItemsFn) {
      const model = this.model,
            selectionModel = model.selectionModel,
            transactionModel = model.transactionModel;
      transactionModel.beginTransaction("Paste scrap");
      const map = new Map(),
            copies = copyItemsFn(this.getScrap(), map);
      selectionModel.clear();
      addItemsFn(copies);
      selectionModel.set(copies);
      transactionModel.endTransaction();
    },
  }

  function extend(model) {
    if (model.copyPasteModel)
      return model.copyPasteModel;

    transactionModel.extend(model);
    selectionModel.extend(model);
    instancingModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;
    instance.scrap_ = new diagrammar.collections.EmptyArray();

    model.copyPasteModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

const hierarchicalModel = (function() {
  const _parent = Symbol('parent');
  const proto = {
    getRoot: function() {
      return this.model.dataModel.root;
    },

    getParent: function(item) {
      return item[_parent];
    },

    setParent: function(child, parent) {
      child[_parent] = parent;
    },

    visitChildren: function(item, childFn) {
      this.model.dataModel.visitChildren(item, function(child) {
        childFn(child, item);
      });
    },

    visitDescendants: function(item, childFn) {
      const self = this;
      this.visitChildren(item, function(child) {
        childFn(child, item);
        self.visitDescendants(child, childFn);
      });
    },

    isItemInSelection: function(item) {
      const selectionModel = this.model.selectionModel;
      let ancestor = item;
      while (ancestor) {
        if (selectionModel.contains(ancestor))
          return true;
        ancestor = this.getParent(ancestor);
      }
      return false;
    },

    // Reduces the selection to the roots of the current selection. Thus, if a
    // child and ancestor are selected, remove the child.
    reduceSelection: function() {
      const self = this,
            selectionModel = this.model.selectionModel,
            roots = [];
      selectionModel.forEach(function(item) {
        if (!self.isItemInSelection(self.getParent(item)))
          roots.push(item);
      });
      // Reverse, so passing this to selectionModel.set preserves order.
      return roots.reverse();
    },

    getLineage: function(item) {
      const lineage = new Array();
      while (item) {
        lineage.push(item);
        item = this.getParent(item);
      }
      return lineage;
    },

    getHeight: function(item) {
      let height = 0;
      while (item) {
        height++;
        item = this.getParent(item);
      }
      return height;
    },

    getLowestCommonAncestor: function() {
      const items = arguments;
      let lca = arguments[0];
      let heightLCA = this.getHeight(lca);
      for (let i = 1; i < items.length; i++) {
        let next = arguments[i];
        let nextHeight = this.getHeight(next);
        if (heightLCA > nextHeight) {
          while (heightLCA > nextHeight) {
            lca = this.getParent(lca);
            heightLCA--;
          }
        } else {
          while (nextHeight > heightLCA) {
            next = this.getParent(next);
            nextHeight--;
          }
        }
        while (heightLCA && nextHeight && lca !== next) {
          lca = this.getParent(lca);
          next = this.getParent(next);
          heightLCA--;
          nextHeight--;
        }
        if (heightLCA == 0 || nextHeight == 0) return undefined;
      }
      return lca;
    },

    init_: function(item, parent) {
      const self = this;
      this.setParent(item, parent);
      this.visitDescendants(item, function(child, parent) {
        self.setParent(child, parent);
      });
    },

    onChanged_: function(change) {
      const dataModel = this.model.dataModel,
            item = change.item,
            attr = change.attr;
      switch (change.type) {
        case 'change': {
          const newValue = item[attr];
          if (dataModel.isItem(newValue))
            this.init_(newValue, item);
          break;
        }
        case 'insert': {
          const newValue = item[attr][change.index];
          if (dataModel.isItem(newValue))
            this.init_(newValue, item);
          break;
        }
        case 'remove': {
          const oldValue = change.oldValue;
          if (dataModel.isItem(oldValue))
            this.setParent(oldValue, null);
          break;
        }
      }
    },
  }

  function extend(model) {
    if (model.hierarchicalModel)
      return model.hierarchicalModel;

    dataModel.extend(model);
    observableModel.extend(model);
    // TODO selectionModel shouldn't be a dependency.
    selectionModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;

    model.observableModel.addHandler('changed',
                                     change => instance.onChanged_(change));

    instance.init_(model.dataModel.root, null);

    model.hierarchicalModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

// translatableModel maintains absolute positions on a hierarchy of items.
const translatableModel = (function() {
  const _x = Symbol('x'), _y = Symbol('y');
  const proto = {
    // Getter functions which determine translation parameters. Override to
    // fit the model.
    getX: function(item) {
      return item.x;
    },

    getY: function(item) {
      return item.y;
    },

    hasTranslation: function(item) {
      return (typeof this.getX(item) === 'number') &&
             (typeof this.getY(item) === 'number');
    },

    globalX: function(item) {
      return item[_x];
    },

    globalY: function(item) {
      return item[_y];
    },

    // Gets the translation to move an item from its current parent to
    // newParent. Handles the cases where current parent or newParent are null.
    getToParent: function(item, newParent) {
      const oldParent = this.model.hierarchicalModel.getParent(item);
      let dx = 0, dy = 0;
      if (oldParent) {
        dx += this.globalX(oldParent);
        dy += this.globalY(oldParent);
      }
      if (newParent) {
        dx -= this.globalX(newParent);
        dy -= this.globalY(newParent);
      }
      return { x: dx, y: dy };
    },

    updateTranslation: function(item) {
      if (!this.hasTranslation(item))
        return;

      const hierarchicalModel = this.model.hierarchicalModel,
            x = this.getX(item), y = this.getY(item);
      let parent = hierarchicalModel.getParent(item);
      while (parent && !this.hasTranslation(parent))
        parent = hierarchicalModel.getParent(parent);

      if (parent) {
        item[_x] = x + parent[_x];
        item[_y] = y + parent[_y];
      } else {
        item[_x] = x;
        item[_y] = y;
      }
    },

    update: function(item) {
      const self = this;
      this.updateTranslation(item);
      this.model.hierarchicalModel.visitDescendants(item, function(child, parent) {
        self.updateTranslation(child);
      });
    },

    onChanged_: function(change) {
      const dataModel = this.model.dataModel,
            item = change.item, attr = change.attr;
      switch (change.type) {
        case 'change': {
          const newValue = item[attr];
          if (dataModel.isItem(newValue))
            this.update(newValue);
          else
            this.update(item);
          break;
        }
        case 'insert': {
          const newValue = item[attr][change.index];
          if (dataModel.isItem(newValue))
            this.update(newValue);
          break;
        }
        case 'remove':
          break;
      }
    },
  }

  function extend(model) {
    if (model.translatableModel)
      return model.translatableModel;

    dataModel.extend(model);
    hierarchicalModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;

    if (model.observableModel) {
      model.observableModel.addHandler('changed',
                                       change => instance.onChanged_(change));
    }

    // Make sure new items have translations.
    model.dataModel.addInitializer(function(item) {
      instance.updateTranslation(item);
    });

    model.translatableModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

// transformableModel maintains transform matrices on a hierarchy of items. It
// handles 2d transforms with rotation, uniform scaling, and translations. Non-
// uniform scale transforms don't work well with canvas drawing in general.
const transformableModel = (function() {
  const _x = Symbol('x'), _y = Symbol('y'), _scale = Symbol('scale'),
        _ooScale = Symbol('ooScale'), _rotation = Symbol('rotation'),
        _transform = Symbol('transform'),
        _iTransform = Symbol('inverse transform'),
        _aTransform = Symbol('absolute transform'),
        _iaTransform = Symbol('inverse absolute transform');
  const proto = {
    // Getter functions which determine transform parameters. Override if these
    // don't fit your model.
    hasTransform: function(item) {
      return (typeof item.x === 'number') &&
             (typeof item.y === 'number');
    },

    getX: function(item) {
      return item.x || item[_x] || 0;
    },

    getY: function(item) {
      return item.y || item[_y] || 0;
    },

    getScale: function(item) {
      return item.scale || item[_scale] || 1;
    },

    getRotation: function(item) {
      return item.rotation || item[_rotation] || 0;
    },

    // Getter functions for genereated transforms and related information.
    getLocal: function(item) {
      return item[_transform];
    },

    getInverseLocal: function(item) {
      return item[_iTransform];
    },

    getAbsolute: function(item) {
      return item[_aTransform];
    },

    getInverseAbsolute: function(item) {
      return item[_iaTransform];
    },

    getOOScale: function(item) {
      return item[_ooScale];
    },

    // Gets the matrix to move an item from its current parent to newParent.
    // Handles the cases where current parent or newParent are null.
    getToParent: function(item, newParent) {
      const oldParent = this.model.hierarchicalModel.getParent(item),
            oldTransform = oldParent ? this.getAbsolute(oldParent) : null,
            newInverse = newParent ? this.getInverseAbsolute(newParent) : null;
      if (oldTransform && newInverse)
        return geometry.matMulNew(oldTransform, newInverse);
      return oldTransform || newInverse;
    },

    updateLocal: function(item) {
      const tx = this.getX(item), ty = this.getY(item),
            scale = this.getScale(item), ooScale = 1.0 / scale,
            rot = this.getRotation(item),
            cos = Math.cos(rot), sin = Math.sin(rot),
            ooScaleCos = ooScale * cos, ooScaleSin = ooScale * sin;
      item[_ooScale] = ooScale;
      item[_transform] = [ scale * cos, scale * -sin,
                           scale * sin, scale * cos,
                           tx, ty ];
      item[_iTransform] = [ ooScaleCos, ooScaleSin,
                           -ooScaleSin, ooScaleCos,
                           -tx * ooScaleCos + ty * ooScaleSin, -tx * ooScaleSin - ty * ooScaleCos ];
    },

    updateTransforms: function(item) {
      if (!this.hasTransform(item))
        return;

      this.updateLocal(item);

      const hierarchicalModel = this.model.hierarchicalModel;
      let parent = hierarchicalModel.getParent(item);
      while (parent && !this.hasTransform(parent))
        parent = hierarchicalModel.getParent(parent);

      if (parent) {
        item[_ooScale] *= parent[_ooScale];
        item[_aTransform] = geometry.matMulNew(item[_transform], parent[_aTransform]);
        item[_iaTransform] = geometry.matMulNew(parent[_iaTransform], item[_iTransform]);
      } else {
        item[_aTransform] = item[_transform];
        item[_iaTransform] = item[_iTransform];
      }
    },

    update: function(item) {
      const self = this, hierarchicalModel = this.model.hierarchicalModel;
      this.updateTransforms(item);
      hierarchicalModel.visitDescendants(item, function(child, parent) {
        self.updateTransforms(child);
      });
    },

    onChanged_: function(change) {
      const dataModel = this.model.dataModel,
            item = change.item, attr = change.attr;
      switch (change.type) {
        case 'change': {
          const newValue = item[attr];
          if (dataModel.isItem(newValue))
            this.update(newValue);
          else
            this.update(item);
          break;
        }
        case 'insert': {
          const newValue = item[attr][change.index];
          if (dataModel.isItem(newValue))
            this.update(newValue);
          break;
        }
        case 'remove':
          break;
      }
    },
  }

  function extend(model) {
    if (model.transformableModel)
      return model.transformableModel;

    dataModel.extend(model);
    hierarchicalModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;

    if (model.observableModel) {
      model.observableModel.addHandler('changed',
                                       change => instance.onChanged_(change));
    }

    // Make sure new objects have transforms.
    model.dataModel.addInitializer(function(item) {
      instance.updateTransforms(item);
    });

    model.transformableModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

// A model for maintaining a single 'open' item.
const openingModel = (function() {
  const proto = {
    open: function(item) {
      this.openItem_ = item;
    },
    openItem: function() {
      return this.openItem_;
    },
    clear: function() {
      this.openItem_ = undefined;
    },
    onChanged_: function(change) {
      const dataModel = this.model.dataModel,
            item = change.item,
            attr = change.attr;
      switch (change.type) {
        case 'change':
        case 'remove':
          const oldValue = change.oldValue;
          if (dataModel.isItem(oldValue) && oldValue === this.openItem_)
            this.clear();
          break;
      }
    },
  }

  function extend(model) {
    if (model.openingModel)
      return model.openingModel;

    dataModel.extend(model);
    observableModel.extend(model);

    const instance = Object.create(proto);
    instance.model = model;
    model.observableModel.addHandler('changed',
                                      change => instance.onChanged_(change));

    model.openingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

// const myModel = (function() {
//   const proto = {
//     foo: function(item) {
//       return item;
//     },
//   }

//   function extend(model) {
//     // First check if model needs extending.
//     if (model.myModel)
//       return model.myModel;

//     // Extend the model if necessary.
//     dataModels.otherModel.extend(model);

//     // Create the instance from the prototype.
//     const instance = Object.create(proto);
//     instance.model = model;
//     // Extend the instance if necessary.
//     eventMixin.extend(instance);

//     // Initialize instance attributes.

//     model.myModel = instance;
//     return instance;
//   }

//   return {
//     extend: extend,
//   };
// })();

//------------------------------------------------------------------------------

  return {
    dataModel: dataModel,
    eventMixin: eventMixin,
    observableModel: observableModel,
    transactionModel: transactionModel,
    transactionHistory: transactionHistory,
    referencingModel: referencingModel,
    referenceValidator: referenceValidator,
    selectionModel: selectionModel,
    instancingModel: instancingModel,
    canonicalInstanceModel: canonicalInstanceModel,
    copyPasteModel: copyPasteModel,
    hierarchicalModel: hierarchicalModel,
    translatableModel: translatableModel,
    transformableModel: transformableModel,
    openingModel: openingModel,
  }
})();
