// Data models and related objects.


let dataModels = (function () {
  'use strict';

//------------------------------------------------------------------------------

let dataModel = (function () {
  let proto = {
    getRoot: function() {
      return this.model.root;
    },

    // Returns unique id (number) for an item, to allow references to be
    // resolved. Only items have ids and can be referenced. 0 is an invalid id.
    getId: function (item) {
      return item.id;
    },

    assignId: function (item) {
      // 0 is not a valid id in this model.
      let id = this.nextId++;
      item.id = id;
      return id;
    },

    isItem: function (value) {
      return value && typeof value == 'object';
    },

    // Returns true iff. item[attr] is a true property.
    isProperty: function (item, attr) {
      return attr != 'id' &&
             item.hasOwnProperty(attr);
    },

    // Returns true iff. item[attr] is a property that references an item.
    isReference: function (item, attr) {
      let attrName = attr.toString(),
          position = attrName.length - 2;
      if (position < 0)
        return false;
      return attrName.lastIndexOf('Id', position) === position;
    },

    // Visits the item's top level properties.
    visitProperties: function (item, propFn) {
      if (Array.isArray(item)) {
        // Array item.
        let length = item.length;
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
    visitReferences: function (item, refFn) {
      let self = this;
      this.visitProperties(item, function (item, attr) {
        if (self.isReference(item, attr))
          refFn(item, attr);
      });
    },

    // Visits the item's top level properties that are Arrays or child items.
    visitChildren: function (item, childFn) {
      let self = this;
      this.visitProperties(item, function (item, attr) {
        let value = item[attr];
        if (!self.isItem(value))
          return;
        if (Array.isArray(value))
          self.visitChildren(value, childFn);
        else
          childFn(value);
      });
    },

    // Visits the item and all of its descendant items.
    visitSubtree: function (item, itemFn) {
      itemFn(item);
      let self = this;
      this.visitChildren(item, function (child) {
        self.visitSubtree(child, itemFn);
      });
    },

    addInitializer: function(initialize) {
      this.initializers.push(initialize);
    },

    initialize: function(item) {
      let self = this,
          root = item || this.getRoot();
      this.visitSubtree(root, function(item) {
        self.initializers.forEach(function(initializer) {
          initializer(item);
        });
      });
    },
  }

  function extend(model) {
    if (model.dataModel)
      return model.dataModel;

    let instance = Object.create(proto);
    instance.model = model;

    // Find the maximum id in the model and set nextId to 1 greater.
    let maxId = 0, self = this;
    instance.visitSubtree(instance.getRoot(), function (item) {
      let id = instance.getId(item);
      if (id)
        maxId = Math.max(maxId, id);
    });
    // Note that this dataModel will never assign an id of 0.
    instance.nextId = maxId + 1;

    instance.initializers = [];

    model.dataModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

let eventMixin = (function () {
  function addHandler(event, handler) {
    let list = this[event];
    if (!list)
      list = this[event] = new diagrammar.collections.LinkedList();
    list.pushBack(handler);
  }

  function removeHandler(event, handler) {
    let list = this[event];
    if (list) {
      let node = list.find(handler);
      if (node)
        list.remove(node);
    }
  }

  function onEvent(event, handler) {
    let list = this[event];
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

let observableModel = (function () {
  let proto = {
    // Notifies observers that the value of a property has changed.
    // Standard formats:
    // 'change': item, attr, oldValue.
    // 'insert': item, attr, index.
    // 'remove': item, attr, index, oldValue.
    onChanged: function (change) {
      // console.log(change);
      this.onEvent('changed', function (handler) {
        handler(change);
      });
    },

    onValueChanged: function (item, attr, oldValue) {
      this.onChanged({
        type: 'change',
        item: item,
        attr: attr,
        oldValue: oldValue,
      });
    },

    changeValue: function (item, attr, newValue) {
      let oldValue = item[attr];
      if (newValue !== oldValue) {
        item[attr] = newValue;
        this.onValueChanged(item, attr, oldValue);
      }
      return oldValue;
    },

    onElementInserted: function (item, attr, index) {
      this.onChanged({
        type: 'insert',
        item: item,
        attr: attr,
        index: index,
      });
    },

    insertElement: function (item, attr, index, newValue) {
      let array = item[attr];
      array.splice(index, 0, newValue);
      this.onElementInserted(item, attr, index);
    },

    onElementRemoved: function (item, attr, index, oldValue) {
      this.onChanged({
        type: 'remove',
        item: item,
        attr: attr,
        index: index,
        oldValue: oldValue,
      });
    },

    removeElement: function (item, attr, index) {
      let array = item[attr], oldValue = array[index];
      array.splice(index, 1);
      this.onElementRemoved(item, attr, index, oldValue);
      return oldValue;
    },
  }

  function extend(model) {
    if (model.observableModel)
      return model.observableModel;

    let instance = Object.create(proto);
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

let transactionModel = (function () {
  let opProto = {
    undo: function () {
      let change = this.change,
          item = change.item, attr = change.attr,
          observableModel = this.observableModel;
      switch (change.type) {
        case 'change': {
          let oldValue = change.item[change.attr];
          item[attr] = change.oldValue;
          change.oldValue = oldValue;
          observableModel.onChanged(change);  // this change is its own inverse.
          break;
        }
        case 'insert': {
          let array = item[attr], index = change.index;
          change.oldValue = array[index];
          array.splice(index, 1);
          observableModel.onElementRemoved(item, attr, index, change.oldValue);
          change.type = 'remove';
          break;
        }
        case 'remove': {
          let array = item[attr], index = change.index;
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

  let selectionOpProto = {
    undo: function() {
      this.selectionModel.set(this.startingSelection);
    },
    redo: function() {
      this.selectionModel.set(this.endingSelection);
    }
  }

  let proto = {
    // Notifies observers that a transaction has started.
    beginTransaction: function (name) {
      let transaction = {
        name: name,
        ops: [],
      };
      this.transaction = transaction;
      this.changedItems = new Map();

      this.onBeginTransaction(transaction);
      this.onEvent('transactionBegan', function (handler) {
        handler(transaction);
      });
    },

    // Notifies observers that a transaction is ending. Observers should now
    // do any adjustments to make data valid, or cancel the transaction if
    // the data is in an invalid state.
    endTransaction: function () {
      let transaction = this.transaction;
      this.onEndTransaction(transaction);
      this.onEvent('transactionEnding', function (handler) {
        handler(transaction);
      });

      this.transaction = null;
      this.changedItems = null;

      this.onEvent('transactionEnded', function (handler) {
        handler(transaction);
      });
    },

    // Notifies observers that a transaction was canceled and its changes
    // rolled back.
    cancelTransaction: function () {
      this.undo(this.transaction);
      let transaction = this.transaction;
      this.transaction = null;
      this.onCancelTransaction(transaction);
      this.onEvent('transactionCanceled', function (handler) {
        handler(transaction);
      });
    },

    // Undoes the changes in the transaction.
    undo: function (transaction) {
      // Roll back changes.
      let ops = transaction.ops, length = ops.length;
      for (let i = length - 1; i >= 0; i--) {
        ops[i].undo();
      }
    },

    // Redoes the changes in the transaction.
    redo: function (transaction) {
      // Roll forward changes.
      let ops = transaction.ops, length = ops.length;
      for (let i = 0; i < length; i++) {
        ops[i].redo();
      }
    },

    getSnapshot: function(item) {
      let changedItems = this.changedItems;
      if (!changedItems)
        return;
      let changedItem = changedItems.get(item);
      return changedItem ? changedItem.snapshot : item;
    },

    onBeginTransaction: function (transaction) {
      let selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      this.startingSelection = selectionModel.contents();
    },

    onEndTransaction: function (transaction) {
      let selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      let startingSelection = this.startingSelection,
          endingSelection = selectionModel.contents();
      if (startingSelection.length == endingSelection.length &&
          startingSelection.every(function(element, i) {
            return element === endingSelection[i];
          })) {
        endingSelection = startingSelection;
      }
      let op = Object.create(selectionOpProto);
      op.startingSelection = startingSelection;
      op.endingSelection = endingSelection;
      op.selectionModel = selectionModel;
      this.transaction.ops.push(op);
      this.startingSelection = null;
    },

    onCancelTransaction: function (transaction) {
      let selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      this.startingSelection = null;
    },

    recordChange_: function(change) {
      let op = Object.create(opProto);
      op.change = change;
      op.observableModel = this.model.observableModel;
      this.transaction.ops.push(op);
    },

    onChanged_: function (change) {
      if (!this.transaction)
        return;

      let dataModel = this.model.dataModel,
          item = change.item, attr = change.attr;

      if (change.type != 'change') {
        // Record insert and remove element changes.
        this.recordChange_(change);
      } else {
        // Coalesce value changes. Only record them if this is the first time
        // we've observed the (item, attr) change.
        let changedItems = this.changedItems,
            changedItem = changedItems.get(item),
            snapshot, oldValue;
        if (changedItem) {
          snapshot = changedItem.snapshot;
          if (snapshot.hasOwnProperty(attr))
            oldValue = snapshot[attr];
        } else {
          // The snapshot just extends the item, and gradually overrides it as
          // we receive attribute changes for it.
          snapshot = Object.create(item);
          changedItem = { item: item, snapshot: snapshot };
          changedItems.set(item, changedItem);
        }
        if (!oldValue) {
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

    let instance = Object.create(proto);
    instance.model = model;
    eventMixin.extend(instance);
    model.observableModel.addHandler('changed', function (change) {
      instance.onChanged_(change);
    });

    model.transactionModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

let transactionHistory = (function () {
  let proto = {
    getRedo: function () {
      let length = this.undone.length;
      return length > 0 ? this.undone[length - 1] : null;
    },

    getUndo: function () {
      let length = this.done.length;
      return length > 0 ? this.done[length - 1] : null;
    },

    redo: function () {
      let transaction = this.getRedo();
      if (transaction) {
        this.model.transactionModel.redo(transaction);
        this.done.push(this.undone.pop());
      }
    },

    undo: function () {
      let transaction = this.getUndo();
      if (transaction) {
        this.model.transactionModel.undo(transaction);
        this.undone.push(this.done.pop());
      }
    },

    onTransactionEnded_: function (transaction) {
      if (this.undone.length)
        this.undone = [];
      this.done.push(transaction);
    },
  }

  function extend(model) {
    if (model.transactionHistory)
      return model.transactionHistory;

    transactionModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.done = [];
    instance.undone = [];
    model.transactionModel.addHandler('transactionEnded', function (transaction) {
      instance.onTransactionEnded_(transaction);
    });

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
let referencingModel = (function () {
  let proto = {
    // Gets the object that is referenced by item[attr]. Default is to return
    // item[_attr].
    getReference: function (item, attr) {
      return item[Symbol.for(attr)] || this.resolveReference(item, attr);
    },

    getReferenceFn: function (attr) {
      let self = this, s = Symbol.for(attr);
      return function(item) {
        return item[s] || self.resolveReference(item, attr);
      }
    },

    // Resolves an id to a target item if possible.
    resolveId: function (id) {
      return this.targets_.get(id);
    },

    // Resolves a reference to a target item if possible.
    resolveReference: function (item, attr) {
      let newId = item[attr],
          newTarget = this.resolveId(newId);
      item[Symbol.for(attr)] = newTarget;
      return newTarget;
    },

    // Recursively adds item and sub-items as potential reference targets, and
    // resolves any references they contain.
    addTargets_: function (item) {
      let self = this, dataModel = this.model.dataModel;
      dataModel.visitSubtree(item, function (item) {
        let id = dataModel.getId(item);
        if (id)
          self.targets_.set(id, item);
      });
      dataModel.visitSubtree(item, function (item) {
        dataModel.visitReferences(item, function (item, attr) {
          self.resolveReference(item, attr);
        });
      });
    },

    // Recursively removes item and sub-items as potential reference targets.
    removeTargets_: function (item) {
      let self = this, dataModel = this.model.dataModel;
      dataModel.visitSubtree(item, function (item) {
        let id = dataModel.getId(item);
        if (id)
          self.targets_.delete(id);
      });
    },

    onChanged_: function (change) {
      let item = change.item,
          attr = change.attr,
          dataModel = this.model.dataModel;
      switch (change.type) {
        case 'change': {
          if (dataModel.isReference(item, attr)) {
            this.resolveReference(item, attr);
          } else {
            let oldValue = change.oldValue;
            if (dataModel.isItem(oldValue))
              this.removeTargets_(oldValue);
            let newValue = item[attr];
            if (dataModel.isItem(newValue))
              this.addTargets_(newValue);
          }
          break;
        }
        case 'insert': {
          let newValue = item[attr][change.index];
          if (dataModel.isItem(newValue))
            this.addTargets_(newValue);
          break;
        }
        case 'remove': {
          let oldValue = change.oldValue;
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

    let instance = Object.create(proto);
    instance.model = model;
    if (model.observableModel) {
      // Create wrappers here to capture 'instance'.
      model.observableModel.addHandler('changed', function (change) {
        instance.onChanged_(change);
      });
    }
    instance.targets_ = new Map();
    instance.addTargets_(model.dataModel.getRoot());

    model.referencingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

let referenceValidator = (function () {
  let proto = {
    onDanglingReference: function (item, attr) {
      this.onEvent('danglingReference', function (handler) {
        handler(item, attr);
      });
    },

    onTransactionEnding_: function (transaction) {
      let self = this, dataModel = this.model.dataModel,
          referencingModel = this.model.referencingModel;
      dataModel.visitSubtree(dataModel.getRoot(), function (item) {
        dataModel.visitReferences(item, function (item, attr) {
          if (!referencingModel.resolveId(item[attr]))
            self.onDanglingReference(item, attr);
        });
      });
    },
  }

  function extend(model) {
    if (model.referenceValidator)
      return model.referenceValidator;

    let instance = Object.create(proto);
    instance.model = model;
    eventMixin.extend(instance);
    dataModel.extend(model);
    transactionModel.extend(model);
    referencingModel.extend(model);
    // Create wrappers here to capture 'instance'.
    model.transactionModel.addHandler('transactionEnding', function (transaction) {
      instance.onTransactionEnding_(transaction);
    });

    model.referenceValidator = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

let selectionModel = (function () {
  let proto = {
    isEmpty: function () {
      return this.selection.length > 0;
    },

    contains: function (item) {
      return this.selection.contains(item);
    },

    lastSelected: function () {
      return this.selection.lastSelected();
    },

    add: function (item) {
      if (item.forEach) {
        let selection = this.selection;
        item.forEach(function (element) { selection.add(element); });
      } else {
        this.selection.add(item);
      }
    },

    remove: function (item) {
      if (item.forEach) {
        let selection = this.selection;
        item.forEach(function (element) { selection.remove(element); });
      } else {
        this.selection.remove(item);
      }
    },

    toggle: function (item) {
      if (item.forEach) {
        let selection = this.selection;
        item.forEach(function (element) { selection.toggle(element); });
      } else {
        this.selection.toggle(item);
      }
    },

    set: function (item) {
      this.selection.clear();
      if (Array.isArray(item)) {
        item.forEach(function (element) {
          this.selection.add(element);
        }, this);
      } else {
        this.selection.add(item);
      }
    },

    clear: function () {
      this.selection.clear();
    },

    forEach: function (itemFn) {
      this.selection.forEach(itemFn);
    },

    contents: function () {
      let result = [];
      this.selection.forEach(function (item) { result.push(item); });
      return result;
    }
  }

  function extend(model) {
    if (model.selectionModel)
      return model.selectionModel;

    let instance = Object.create(proto);
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

let instancingModel = (function () {
  let proto = {
    canClone: function (item) {
      return true;
    },

    clone: function (item, map) {
      // Return any primitive values without cloning.
      if (!this.model.dataModel.isItem(item))
        return item;

      let self = this, dataModel = this.model.dataModel;
      // Use constructor() to properly clone arrays, sets, maps, etc.
      let copy = item.constructor();
      dataModel.visitProperties(item, function (item, attr) {
        copy[attr] = self.clone(item[attr], map);
      });
      // Assign unique id after cloning all properties.
      if (!Array.isArray(copy)) {
        dataModel.assignId(copy);
        dataModel.initialize(copy);
        if (map) {
          let id = dataModel.getId(item);
          map.set(id, copy);
        }
      }
      return copy;
    },

    cloneGraph: function (items, map) {
      let dataModel = this.model.dataModel,
          copies = [];
      items.forEach(function (item) {
        copies.push(this.clone(item, map));
      }, this);
      copies.forEach(function (copy) {
        dataModel.visitSubtree(copy, function (copy) {
          if (Array.isArray(copy))
            return;
          for (let attr in copy) {
            if (dataModel.isReference(copy, attr)) {
              let originalId = copy[attr],
                  newCopy = map.get(originalId),
                  newId = dataModel.getId(newCopy);
              copy[attr] = newId;
            }
          }
        });
      }, this);
      return copies;
    },
  }

  function extend(model) {
    if (model.instancingModel)
      return model.instancingModel;

    dataModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;

    model.instancingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

let editingModel = (function () {
  let proto = {
    addItems: function (items) {
      // Implement.
    },

    deleteItems: function (items) {
      // Implement.
    },

    copyItems: function (items, map) {
      let model = this.model,
          dataModel = model.dataModel,
          instancingModel = model.instancingModel,
          copies = instancingModel.cloneGraph(items, map);
      copies.forEach(function(item) {
        dataModel.initialize(item);
      });
      return copies;
    },

    getScrap: function () {
      return this.scrap;
    },

    setScrap: function (scrap) {
      this.scrap = scrap;
    },

    doDelete: function () {
      let model = this.model, selectionModel = model.selectionModel,
          transactionModel = model.transactionModel;
      transactionModel.beginTransaction("Delete selection");
      this.deleteItems(selectionModel.contents());
      selectionModel.clear();
      transactionModel.endTransaction();
    },

    doCopy: function () {
      let model = this.model, selectionModel = model.selectionModel,
          map = new Map(),
          copies = this.copyItems(selectionModel.contents(), map);
      this.setScrap(copies);
      return copies;
    },

    doCut: function () {
      let copies = this.doCopy();
      this.doDelete();
      return copies;
    },

    doPaste: function () {
      let model = this.model, selectionModel = model.selectionModel,
          transactionModel = model.transactionModel;
      transactionModel.beginTransaction("Paste scrap");
      let map = new Map(),
          items = this.copyItems(this.getScrap(), map);
      selectionModel.clear();
      this.addItems(items);
      transactionModel.endTransaction();
    },
  }

  function extend(model) {
    if (model.editingModel)
      return model.editingModel;

    transactionModel.extend(model);
    selectionModel.extend(model);
    instancingModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;

    model.editingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

let hierarchicalModel = (function () {
  let _parent = Symbol('parent');
  let proto = {
    getRoot: function () {
      return this.model.dataModel.getRoot();
    },

    getParent: function (item) {
      return item[_parent];
    },

    setParent: function (child, parent) {
      child[_parent] = parent;
    },

    visitChildren: function (item, childFn) {
      this.model.dataModel.visitChildren(item, function (child) {
        childFn(child, item);
      });
    },

    visitDescendants: function (item, childFn) {
      let self = this;
      this.visitChildren(item, function (child) {
        childFn(child, item);
        self.visitDescendants(child, childFn);
      });
    },

    isItemInSelection: function(item) {
      let selectionModel = this.model.selectionModel,
          ancestor = item;
      while (ancestor) {
        if (selectionModel.contains(ancestor))
          return true;
        ancestor = this.getParent(ancestor);
      }
      return false;
    },

    // Reduces the selection to the roots of the current selection. Thus, a
    // parent and child can't be simultaneously selected.
    reduceSelection: function () {
      let selectionModel = this.model.selectionModel,
          roots = [],
          self = this;
      selectionModel.forEach(function (item) {
        if (!self.isItemInSelection(self.getParent(item)))
          roots.push(item);
      });
      return roots;
    },

    init: function (item, parent) {
      this.setParent(item, parent);
      let self = this;
      this.visitDescendants(item, function (child, parent) {
        self.setParent(child, parent);
      });
    },

    onChanged_: function (change) {
      let item = change.item,
          attr = change.attr,
          dataModel = this.model.dataModel;
      switch (change.type) {
        case 'change': {
          let newValue = item[attr];
          if (dataModel.isItem(newValue))
            this.init(newValue, item);
          break;
        }
        case 'insert': {
          let newValue = item[attr][change.index];
          if (dataModel.isItem(newValue))
            this.init(newValue, item);
          break;
        }
        case 'remove': {
          let oldValue = change.oldValue;
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
    selectionModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;

    if (model.observableModel) {
      // Create wrappers here to capture 'instance'.
      model.observableModel.addHandler('changed', function (change) {
        instance.onChanged_(change);
      });
    }

    instance.init(model.dataModel.getRoot(), null);

    model.hierarchicalModel = instance;
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
let transformableModel = (function () {
  let _x = Symbol('x'), _y = Symbol('y'), _scale = Symbol('scale'),
      _ooScale = Symbol('ooScale'), _rotation = Symbol('rotation'),
      _transform = Symbol('transform'),
      _iTransform = Symbol('inverse transform'),
      _aTransform = Symbol('absolute transform'),
      _iaTransform = Symbol('inverse absolute transform');
  let proto = {
    // Getter functions which determine transform parameters. Override if these
    // don't fit your model.
    hasTransform: function (item) {
      return (typeof item.x == 'number') &&
             (typeof item.y == 'number');
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

    getRotation: function (item) {
      return item.rotation || item[_rotation] || 0;
    },

    // Getter functions for genereated transforms and related information.
    getLocal: function (item) {
      return item[_transform];
    },

    getInverseLocal: function (item) {
      return item[_iTransform];
    },

    getAbsolute: function (item) {
      return item[_aTransform];
    },

    getInverseAbsolute: function (item) {
      return item[_iaTransform];
    },

    getOOScale: function (item) {
      return item[_ooScale];
    },

    // Gets the matrix to move an item from its current parent to newParent.
    // Handles the cases where current parent or newParent are null.
    getToParent: function (item, newParent) {
      let oldParent = this.model.hierarchicalModel.getParent(item),
          oldTransform = oldParent ? this.getAbsolute(oldParent) : null,
          newInverse = newParent ? this.getInverseAbsolute(newParent) : null;
      if (oldTransform && newInverse)
        return geometry.matMulNew(oldTransform, newInverse);
      return oldTransform || newInverse;
    },

    updateLocal: function (item) {
      let tx = this.getX(item), ty = this.getY(item),
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

    updateTransforms: function (item) {
      if (!this.hasTransform(item))
        return;

      this.updateLocal(item);

      let hierarchicalModel = this.model.hierarchicalModel,
          parent = hierarchicalModel.getParent(item);
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

    update: function (item) {
      let self = this, hierarchicalModel = this.model.hierarchicalModel;
      this.updateTransforms(item);
      hierarchicalModel.visitDescendants(item, function (child, parent) {
        self.updateTransforms(child);
      });
    },

    onChanged_: function (change) {
      let dataModel = this.model.dataModel,
          item = change.item, attr = change.attr;
      switch (change.type) {
        case 'change': {
          let newValue = item[attr];
          if (dataModel.isItem(newValue))
            this.update(newValue);
          else
            this.update(item);
          break;
        }
        case 'insert': {
          let newValue = item[attr][change.index];
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

    let instance = Object.create(proto);
    instance.model = model;

    if (model.observableModel) {
      // Create wrappers here to capture 'instance'.
      model.observableModel.addHandler('changed', function (change) {
        instance.onChanged_(change);
      });
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
let openingModel = (function () {
  let proto = {
    open: function(item) {
      this.openItem_ = item;
    },
    openItem: function() {
      return this.openItem_;
    },
    clear: function() {
      this.openItem_ = undefined;
    },
    onChanged_: function (change) {
      let item = change.item,
          attr = change.attr,
          dataModel = this.model.dataModel;
      switch (change.type) {
        case 'change':
        case 'remove':
          let oldValue = change.oldValue;
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

    let instance = Object.create(proto);
    instance.model = model;
    model.observableModel.addHandler('changed', function (change) {
      instance.onChanged_(change);
    });

    model.openingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

// let myModel = (function () {
//   let proto = {
//     foo: function (item) {
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
//     let instance = Object.create(proto);
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
    editingModel: editingModel,
    hierarchicalModel: hierarchicalModel,
    transformableModel: transformableModel,
    openingModel: openingModel,
  }
})();
