// Data models and related objects.


var dataModels = (function () {
  'use strict';

//------------------------------------------------------------------------------

var dataModel = (function () {
  var proto = {
    // Returns unique id (number) for an item, to allow references to be
    // resolved. Only items have ids and can be referenced. 0 is an invalid id.
    getId: function (item) {
      return item.id;
    },

    isItem: function (value) {
      return value && typeof value == 'object';
    },

    // Returns true iff. item.attr is a true property (not cached state.)
    isProperty: function (item, attr) {
      return attr != 'id' &&
             item.hasOwnProperty(attr) &&
             (attr.toString().charAt(0) != '_');
    },

    // Returns true iff. item.attr is a property that references an item.
    isReference: function (item, attr) {
      var attrName = attr.toString();
      var position = attrName.length - 2;
      if (position < 0)
        return false;
      return attrName.lastIndexOf('Id', position) === position;
    },

    // Visits the item's top level properties.
    visitProperties: function (item, propFn) {
      if (Array.isArray(item)) {
        // Array item.
        var length = item.length;
        for (var i = 0; i < length; i++)
          propFn(item, i);
      } else {
        // Object.
        for (var attr in item) {
          if (this.isProperty(item, attr))
            propFn(item, attr);
        }
      }
    },

    // Visits the item's top level reference properties.
    visitReferences: function (item, refFn) {
      var self = this;
      this.visitProperties(item, function (item, attr) {
        if (self.isReference(item, attr))
          refFn(item, attr);
      });
    },

    // Visits the item's top level properties that are Arrays or child items.
    visitChildren: function (item, childFn) {
      var self = this;
      this.visitProperties(item, function (item, attr) {
        var value = item[attr];
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
      var self = this;
      this.visitChildren(item, function (child) {
        self.visitSubtree(child, itemFn);
      });
    },

    addInitializer: function(initialize) {
      this.initializers.push(initialize);
    },

    initialize: function(item) {
      var self = this,
          root = item || this.model.root;
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

    var instance = Object.create(proto);
    instance.model = model;

    // Find the maximum id in the model and set nextId to 1 greater.
    var maxId = 0;
    var self = this;
    instance.visitSubtree(model.root, function (item) {
      var id = instance.getId(item);
      if (id)
        maxId = Math.max(maxId, id);
    });
    // Note that this dataModel will never assign an id of 0.
    instance.nextId = maxId + 1;

    instance.initializers = [];
    // Assign a unique id when items are created.
    instance.addInitializer(function(item) {
      // 0 is not a valid id in this model.
      // TODO we should be able to exclude items from the id system, i.e. if
      // they shouldn't be referenced by other items.
      if (!item.id)
        item.id = instance.nextId++;
    });

    model.dataModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

var eventMixin = (function () {
  function addHandler(event, handler) {
    var list = this[event];
    if (!list)
      list = this[event] = new LinkedList();
    list.pushBack(handler);
  }

  function removeHandler(event, handler) {
    var list = this[event];
    if (list) {
      var node = list.find(handler);
      if (node)
        list.remove(node);
    }
  }

  function onEvent(event, handler) {
    var list = this[event];
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

var observableModel = (function () {
  var proto = {
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
      var oldValue = item[attr];
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
      var array = item[attr];
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
      var array = item[attr], oldValue = array[index];
      array.splice(index, 1);
      this.onElementRemoved(item, attr, index, oldValue);
      return oldValue;
    },
  }

  function extend(model) {
    if (model.observableModel)
      return model.observableModel;

    var instance = Object.create(proto);
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

var transactionModel = (function () {
  var opProto = {
    undo: function () {
      var change = this.change,
          item = change.item, attr = change.attr,
          observableModel = this.observableModel;
      switch (change.type) {
        case 'change':
          var oldValue = change.item[change.attr];
          item[attr] = change.oldValue;
          change.oldValue = oldValue;
          observableModel.onChanged(change);  // this change is its own inverse.
          break;
        case 'insert':
          var array = item[attr], index = change.index;
          change.oldValue = array[index];
          array.splice(index, 1);
          observableModel.onElementRemoved(item, attr, index, change.oldValue);
          change.type = 'remove';
          break;
        case 'remove':
          var array = item[attr], index = change.index;
          array.splice(index, 0, change.oldValue);
          observableModel.onElementInserted(item, attr, index);
          change.type = 'insert';
          break;
      }
    },
    redo: function() {
      // 'change' is a toggle, and we swap 'insert' and 'remove' so redo is
      // just undo.
      this.undo();
    }
  }

  var selectionOpProto = {
    undo: function() {
      this.selectionModel.set(this.startingSelection);
    },
    redo: function() {
      this.selectionModel.set(this.endingSelection);
    }
  }

  var proto = {
    // Notifies observers that a transaction has started.
    beginTransaction: function (name) {
      var transaction = {
        name: name,
        ops: [],
      };
      this.transaction = transaction;
      this.changedItems = new HashMap();

      this.onBeginTransaction(transaction);
      this.onEvent('transactionBegan', function (handler) {
        handler(transaction);
      });
    },

    // Notifies observers that a transaction is ending. Observers should now
    // do any adjustments to make data valid, or cancel the transaction.
    endTransaction: function () {
      var transaction = this.transaction;
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
      var transaction = this.transaction;
      this.transaction = null;
      this.onCancelTransaction(transaction);
      this.onEvent('transactionCanceled', function (handler) {
        handler(transaction);
      });
    },

    // Undoes the changes in the transaction.
    undo: function (transaction) {
      // Roll back changes.
      var ops = transaction.ops;
      var length = ops.length;
      for (var i = length - 1; i >= 0; i--)
        ops[i].undo();
    },

    // Redoes the changes in the transaction.
    redo: function (transaction) {
      // Roll forward changes.
      var ops = transaction.ops;
      var length = ops.length;
      for (var i = 0; i < length; i++)
        ops[i].redo();
    },

    getSnapshot: function(item) {
      var changedItems = this.changedItems;
      if (!changedItems)
        return;
      var dataModel = this.model.dataModel,
          changedItem = changedItems.find(dataModel.getId(item));
      return changedItem ? changedItem.snapshot : item;
    },

    onBeginTransaction: function (transaction) {
      var selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      this.startingSelection = selectionModel.contents();
    },

    onEndTransaction: function (transaction) {
      var selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      var startingSelection = this.startingSelection,
          endingSelection = selectionModel.contents();
      if (startingSelection.length == endingSelection.length &&
          startingSelection.every(function(element, i) {
            return element === endingSelection[i];
          })) {
        endingSelection = startingSelection;
      }
      var op = Object.create(selectionOpProto);
      op.startingSelection = startingSelection;
      op.endingSelection = endingSelection;
      op.selectionModel = selectionModel;
      this.transaction.ops.push(op);
      this.startingSelection = null;
    },

    onCancelTransaction: function (transaction) {
      var selectionModel = this.model.selectionModel;
      if (!selectionModel)
        return;
      this.startingSelection = null;
    },

    recordChange_: function(change) {
      var op = Object.create(opProto);
      op.change = change;
      op.observableModel = this.model.observableModel;
      this.transaction.ops.push(op);
    },

    onChanged_: function (change) {
      if (!this.transaction)
        return;

      var dataModel = this.model.dataModel,
          item = change.item, attr = change.attr;

      if (change.type != 'change') {
        // Record insert and remove element changes.
        this.recordChange_(change);
      } else {
        // Coalesce value changes. Only record them if this is the first time
        // we've observed the (item, attr) change.
        var id = dataModel.getId(item),
            changedItems = this.changedItems,
            changedItem = changedItems.find(id),
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
          changedItems.add(id, changedItem);
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

    var instance = Object.create(proto);
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

var transactionHistory = (function () {
  var proto = {
    getRedo: function () {
      var length = this.undone.length;
      return length > 0 ? this.undone[length - 1] : null;
    },

    getUndo: function () {
      var length = this.done.length;
      return length > 0 ? this.done[length - 1] : null;
    },

    redo: function () {
      var transaction = this.getRedo();
      if (transaction) {
        this.model.transactionModel.redo(transaction);
        this.done.push(this.undone.pop());
      }
    },

    undo: function () {
      var transaction = this.getUndo();
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

    var instance = Object.create(proto);
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
var referencingModel = (function () {
  var proto = {
    // Gets the object that is referenced by item[attr]. Default is to return
    // item[_attr].
    getReference: function (item, attr) {
      return item['_' + attr] || this.resolveReference(item, attr);
    },

    // Resolves an id to a target item if possible.
    resolveId: function (id) {
      return this.targets_.find(id);
    },

    // Resolves a reference to a target item if possible.
    resolveReference: function (item, attr) {
      var newId = item[attr],
          newTarget = this.resolveId(newId);
      item['_' + attr] = newTarget;
      return newTarget;
    },

    // Recursively adds item and sub-items as potential reference targets, and
    // resolves any references they contain.
    addTargets_: function (item) {
      var self = this, dataModel = this.model.dataModel;
      dataModel.visitSubtree(item, function (item) {
        var id = dataModel.getId(item);
        if (id)
          self.targets_.add(id, item);
      });
      dataModel.visitSubtree(item, function (item) {
        dataModel.visitReferences(item, function (item, attr) {
          self.resolveReference(item, attr);
        });
      });
    },

    // Recursively removes item and sub-items as potential reference targets.
    removeTargets_: function (item) {
      var self = this, dataModel = this.model.dataModel;
      dataModel.visitSubtree(item, function (item) {
        var id = dataModel.getId(item);
        if (id)
          self.targets_.remove(id);
      });
    },

    onChanged_: function (change) {
      var item = change.item,
          attr = change.attr,
          dataModel = this.model.dataModel;
      switch (change.type) {
        case 'change':
          if (dataModel.isReference(item, attr)) {
            this.resolveReference(item, attr);
          } else {
            var oldValue = change.oldValue;
            if (dataModel.isItem(oldValue))
              this.removeTargets_(oldValue);
            var newValue = item[attr];
            if (dataModel.isItem(newValue))
              this.addTargets_(newValue);
          }
          break;
        case 'insert':
          var newValue = item[attr][change.index];
          if (dataModel.isItem(newValue))
            this.addTargets_(newValue);
          break;
        case 'remove':
          var oldValue = change.oldValue;
          if (dataModel.isItem(oldValue))
            this.removeTargets_(oldValue);
          break;
      }
    },
  }

  function extend(model) {
    if (model.referencingModel)
      return model.referencingModel;

    dataModel.extend(model);

    var instance = Object.create(proto);
    instance.model = model;
    if (model.observableModel) {
      // Create wrappers here to capture 'instance'.
      model.observableModel.addHandler('changed', function (change) {
        instance.onChanged_(change);
      });
    }
    instance.targets_ = new HashMap();
    instance.addTargets_(model.root);

    model.referencingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

var referenceValidator = (function () {
  var proto = {
    onDanglingReference: function (item, attr) {
      this.onEvent('danglingReference', function (handler) {
        handler(item, attr);
      });
    },

    onTransactionEnding_: function (transaction) {
      var self = this, dataModel = this.model.dataModel,
          referencingModel = this.model.referencingModel;
      dataModel.visitSubtree(this.model.root, function (item) {
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

    var instance = Object.create(proto);
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

var selectionModel = (function () {
  var proto = {
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
        var selection = this.selection;
        item.forEach(function (element) { selection.add(element); });
      } else {
        this.selection.add(item);
      }
    },

    remove: function (item) {
      if (item.forEach) {
        var selection = this.selection;
        item.forEach(function (element) { selection.remove(element); });
      } else {
        this.selection.remove(item);
      }
    },

    toggle: function (item) {
      if (item.forEach) {
        var selection = this.selection;
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
      var result = [];
      this.selection.forEach(function (item) { result.push(item); });
      return result;
    }
    // TODO selection change notification.
  }

  function extend(model) {
    if (model.selectionModel)
      return model.selectionModel;

    var instance = Object.create(proto);
    instance.model = model;
    instance.selection = new SelectionSet(model.dataModel.getId);

    model.selectionModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

var instancingModel = (function () {
  var proto = {
    canClone: function (item) {
      return true;
    },

    clone: function (item, map) {
      // Return any primitive values without cloning.
      if (!this.model.dataModel.isItem(item))
        return item;

      var copy = item.constructor();
      var self = this;
      this.model.dataModel.visitProperties(item, function (item, attr) {
        copy[attr] = self.clone(item[attr], map);
      });
      // Assign unique id after cloning all properties.
      if (!Array.isArray(copy)) {
        this.model.dataModel.initialize(copy);
        if (map) {
          var id = this.model.dataModel.getId(item);
          map.add(id, copy);
        }
      }
      return copy;
    },

    cloneGraph: function (items, map) {
      var dataModel = this.model.dataModel,
          copies = [];
      items.forEach(function (item) {
        copies.push(this.clone(item, map));
      }, this);
      copies.forEach(function (copy) {
        dataModel.visitSubtree(copy, function (copy) {
          if (Array.isArray(copy))
            return;
          for (var attr in copy) {
            if (dataModel.isReference(copy, attr)) {
              var originalId = copy[attr];
              var newCopy = map.find(originalId);
              var newId = dataModel.getId(newCopy);
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

    var instance = Object.create(proto);
    instance.model = model;

    model.instancingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

var editingModel = (function () {
  var proto = {
    addItems: function (items) {
      // Implement.
    },

    deleteItems: function (items) {
      // Implement.
    },

    copyItems: function (items, map) {
      var model = this.model,
          dataModel = model.dataModel,
          instancingModel = model.instancingModel;
      var copies = instancingModel.cloneGraph(items, map);
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
      var model = this.model, selectionModel = model.selectionModel,
          transactionModel = model.transactionModel;
      transactionModel.beginTransaction("Delete selection");
      this.deleteItems(selectionModel.contents());
      selectionModel.clear();
      transactionModel.endTransaction();
    },

    doCopy: function () {
      var model = this.model, selectionModel = model.selectionModel,
          map = new HashMap(),
          copies = this.copyItems(selectionModel.contents(), map);
      this.setScrap(copies);
      return copies;
    },

    doCut: function () {
      var copies = this.doCopy();
      this.doDelete();
      return copies;
    },

    doPaste: function () {
      var model = this.model, selectionModel = model.selectionModel,
          transactionModel = model.transactionModel;
      transactionModel.beginTransaction("Paste scrap");
      var map = new HashMap(),
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

    var instance = Object.create(proto);
    instance.model = model;

    model.editingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

var hierarchicalModel = (function () {
  var proto = {
    getRoot: function () {
      return this.model.root;
    },

    getParent: function (item) {
      return item._parent;
    },

    setParent: function (child, parent) {
      child._parent = parent;
    },

    visitChildren: function (item, childFn) {
      this.model.dataModel.visitChildren(item, function (child) {
        childFn(child, item);
      });
    },

    visitDescendants: function (item, childFn) {
      var self = this;
      this.visitChildren(item, function (child) {
        childFn(child, item);
        self.visitDescendants(child, childFn);
      });
    },

    isItemInSelection: function(item) {
      var selectionModel = this.model.selectionModel,
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
      var selectionModel = this.model.selectionModel,
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
      var self = this;
      this.visitDescendants(item, function (child, parent) {
        self.setParent(child, parent);
      });
    },

    onChanged_: function (change) {
      var item = change.item,
          attr = change.attr,
          dataModel = this.model.dataModel;
      switch (change.type) {
        case 'change':
          var newValue = item[attr];
          if (dataModel.isItem(newValue))
            this.init(newValue, item);
          break;
        case 'insert':
          var newValue = item[attr][change.index];
          if (dataModel.isItem(newValue))
            this.init(newValue, item);
          break;
        case 'remove':
          var oldValue = change.oldValue;
          if (dataModel.isItem(oldValue))
            this.setParent(oldValue, null);
          break;
      }
    },
  }

  function extend(model) {
    if (model.hierarchicalModel)
      return model.hierarchicalModel;

    dataModel.extend(model);
    observableModel.extend(model);
    selectionModel.extend(model);

    var instance = Object.create(proto);
    instance.model = model;

    if (model.observableModel) {
      // Create wrappers here to capture 'instance'.
      model.observableModel.addHandler('changed', function (change) {
        instance.onChanged_(change);
      });
    }

    instance.init(model.root, null);

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
var transformableModel = (function () {
  var proto = {
    // Getter functions which determine transform parameters. Override if these
    // don't fit your model.
    hasTransform: function (item) {
      return item.x !== undefined && item.y !== undefined;
    },

    getX: function(item) {
      return item.x || item._x || 0;
    },

    getY: function(item) {
      return item.y || item._y || 0;
    },

    getScale: function(item) {
      return item.scale || item._scale || 1;
    },

    getRotation: function (item) {
      return item.rotation || item._rotation || 0;
    },

    // Getter functions for genereated transforms and related information.
    getLocal: function (item) {
      return item._transform;
    },

    getInverseLocal: function (item) {
      return item._itransform;
    },

    getAbsolute: function (item) {
      return item._atransform;
    },

    getInverseAbsolute: function (item) {
      return item._aitransform;
    },

    getOOScale: function (item) {
      return item._ooScale;
    },

    // Gets the matrix to move an item from its current parent to newParent.
    // Handles the cases where current parent or newParent are null.
    getToParent: function (item, newParent) {
      var oldParent = this.model.hierarchicalModel.getParent(item),
          oldTransform = oldParent ? this.getAbsolute(oldParent) : null,
          newInverse = newParent ? this.getInverseAbsolute(newParent) : null;
      if (oldTransform && newInverse)
        return geometry.matMulNew(oldTransform, newInverse);
      return oldTransform || newInverse;
    },

    updateLocal: function (item) {
      var tx = this.getX(item), ty = this.getY(item),
          scale = this.getScale(item), ooScale = 1.0 / scale,
          rot = this.getRotation(item),
          cos = Math.cos(rot), sin = Math.sin(rot),
          ooScaleCos = ooScale * cos, ooScaleSin = ooScale * sin;
      item._ooScale = ooScale;
      item._transform = [ scale * cos, scale * -sin,
                          scale * sin, scale * cos,
                          tx, ty ];
      item._itransform = [ ooScaleCos, ooScaleSin,
                           -ooScaleSin, ooScaleCos,
                           -tx * ooScaleCos + ty * ooScaleSin, -tx * ooScaleSin - ty * ooScaleCos ];
    },

    updateTransforms: function (item) {
      if (!this.hasTransform(item))
        return;

      this.updateLocal(item);

      var hierarchicalModel = this.model.hierarchicalModel,
          parent = hierarchicalModel.getParent(item);
      while (parent && !this.hasTransform(parent))
        parent = hierarchicalModel.getParent(parent);

      if (parent) {
        item._ooScale *= parent._ooScale;
        item._atransform = geometry.matMulNew(item._transform, parent._atransform);
        item._aitransform = geometry.matMulNew(parent._aitransform, item._itransform);
      } else {
        item._atransform = item._transform;
        item._aitransform = item._itransform;
      }
    },

    update: function (item) {
      var self = this, hierarchicalModel = this.model.hierarchicalModel;
      this.updateTransforms(item);
      hierarchicalModel.visitDescendants(item, function (child, parent) {
        self.updateTransforms(child);
      });
    },

    onChanged_: function (change) {
      var hierarchicalModel = this.model.hierarchicalModel,
          item = change.item, attr = change.attr;
      switch (change.type) {
        case 'change':
          var newValue = item[attr];
          if (this.model.dataModel.isItem(newValue))
            this.update(newValue);
          else
            this.update(item);
          break;
        case 'insert':
          var newValue = item[attr][change.index];
          if (this.model.dataModel.isItem(newValue))
            this.update(newValue);
          break;
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

    var instance = Object.create(proto);
    instance.model = model;

    if (model.observableModel) {
      // Create wrappers here to capture 'instance'.
      model.observableModel.addHandler('changed', function (change) {
        instance.onChanged_(change);
      });
    }

    // Make sure new objects have transforms.
    instance.model.dataModel.addInitializer(function(item) {
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

// var viewableModel = (function () {
//   var proto = {
//     getItemRect: function(item) {
//       var x = item.x, y = item.y, w = item.width, h = item.height;
//       if (x && y && w && h)
//         return { x: x, y: y, width: w, height: h };
//     },

//     getSelectionRect: function() {
//       var selectionModel = this.model.selectionModel;
//       if (selectionModel) {
//         var xMin = Number.MAX_VALUE, yMin = Number.MAX_VALUE,
//             xMax = Number.MIN_VALUE, yMax = Number.MIN_VALUE,
//             exists,
//             self = this;
//         selectionModel.forEach(function(item) {
//           var rect = self.getItemRect(item);
//           if (rect) {
//             var x = rect.x, y = rect.y;
//             xMin = Math.min(xMin, x);
//             yMin = Math.min(yMin, y);
//             xMax = Math.max(xMax, x + rect.width);
//             yMax = Math.max(yMax, y + rect.height);
//             exists = true;
//           }
//         });
//       }
//       if (exists)
//         return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
//     }
//   }

//   function extend(model) {
//     if (model.viewableModel)
//       return model.viewableModel;

//     var instance = Object.create(proto);
//     instance.model = model;

//     model.viewableModel = instance;
//     return instance;
//   }

//   return {
//     extend: extend,
//   };
// })();

//------------------------------------------------------------------------------

// var myModel = (function () {
//   var proto = {
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
//     var instance = Object.create(proto);
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
  }
})();
