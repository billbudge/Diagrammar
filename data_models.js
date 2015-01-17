// Data models and related objects.


var dataModels = (function () {
  'use strict';

//------------------------------------------------------------------------------

var dataModel = (function () {
  var proto = {
    // Returns unique id (number) for an item, to allow references to be
    // resolved. Only items have ids and can be referenced. Zero is an invalid
    // id and can be used to signal null.
    getId: function (item) {
      return item.id;
    },

    // Assign a unique id to the item.
    assignId: function (item) {
      item.id = this.nextId++;
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
        maxId = Math.max(maxId, id);
      });
    // Note that this dataModel will never assign an id of 0.
    instance.nextId = maxId + 1;

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
      this[event] = list = new LinkedList();
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
    // 'insert': item, array, index.
    // 'remove': item, array, index, oldValue.
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

    onElementInserted: function (item, array, index) {
      this.onChanged({
        type: 'insert',
        item: item,
        array: array,
        attr: index,
      });
    },

    insertElement: function (item, array, index, newValue) {
      array.splice(index, 0, newValue);
      this.onElementInserted(item, array, index);
    },

    onElementRemoved: function (item, array, index, oldValue) {
      this.onChanged({
        type: 'remove',
        item: item,
        array: array,
        attr: index,
        oldValue: oldValue,
      });
    },

    removeElement: function (item, array, index) {
      var oldValue = array[index];
      array.splice(index, 1);
      this.onElementRemoved(item, array, index, oldValue);
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
    undo: function (observableModel) {
      var change = this.change;
      var item = change.item, attr = change.attr;
      switch (change.type) {
        case 'change':
          var oldValue = change.item[change.attr];
          change.item[change.attr] = change.oldValue;
          change.oldValue = oldValue;
          observableModel.onChanged(change);  // this change is its own inverse.
          break;
        case 'insert':
          change.oldValue = change.array[attr];
          change.array.splice(attr, 1);
          observableModel.onElementRemoved(item, change.array, attr, change.oldValue);
          change.type = 'remove';
          break;
        case 'remove':
          change.array.splice(change.attr, 0, change.oldValue);
          observableModel.onElementInserted(item, change.array, attr);
          change.type = 'insert';
          break;
      }
    },
  }

  var proto = {
    // Notifies observers that a transaction has started.
    beginTransaction: function (name) {
      var transaction = {
        name: name,
        ops: [],
      };
      this.transaction = transaction;
      this.onEvent('transactionStarted', function (handler) {
        handler(transaction);
      });
    },

    // Notifies observers that a transaction is ending. Observers should now
    // do any adjustments to make data valid, or cancel the transaction.
    endTransaction: function () {
      var transaction = this.transaction;
      this.onEvent('transactionEnding', function (handler) {
        handler(transaction);
      });
      this.transaction = null;
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
        ops[i].undo(this.model.observableModel);
    },

    // Redoes the changes in the transaction.
    redo: function (transaction) {
      // Roll forward changes.
      var ops = transaction.ops;
      var length = ops.length;
      for (var i = 0; i < length; i++)
        ops[i].undo(this.model.observableModel);  // undo a previous undo.
    },

    onChanged_: function (change) {
      if (!this.transaction)
        return;
      var op = Object.create(opProto);
      op.change = change;
      this.transaction.ops.push(op);
    },
  }

  function extend(model) {
    if (model.transactionModel)
      return model.transactionModel;

    observableModel.extend(model);

    var instance = Object.create(proto);
    instance.model = model;
    eventMixin.extend(instance);
    instance.changed_ = function (change) {
      instance.onChanged_(change);
    }
    model.observableModel.addHandler('changed', instance.changed_);

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
    instance.transactionEnded_ = function (op) {
      instance.onTransactionEnded_(op);
    }
    model.transactionModel.addHandler('transactionEnded', instance.transactionEnded_);
    instance.done = [];
    instance.undone = [];

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
    //
    getReference: function (item, attr) {
      return item['_' + attr];
    },

    // Resolves an id to a target item if possible.
    resolveId: function (id) {
      return this.targets_.find(id);
    },

    // Resolves a reference to a target item if possible.
    resolveReference: function (item, attr) {
      var newId = item[attr];
      var newTarget = this.resolveId(newId);
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
          array = change.array,
          attr = change.attr,
          oldValue = change.oldValue,
          dataModel = this.model.dataModel;
      switch (change.type) {
        case 'change':
          if (dataModel.isReference(item, attr)) {
            this.resolveReference(item, attr);
          } else {
            if (dataModel.isItem(oldValue))
              this.removeTargets_(oldValue);
            var newValue = item[attr];
            if (dataModel.isItem(newValue))
              this.addTargets_(newValue);
          }
          break;
        case 'insert':
          var newValue = array[attr];
          if (dataModel.isItem(newValue))
            this.addTargets_(newValue);
          break;
        case 'remove':
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
      instance.changed_ = function (change) {
        instance.onChanged_(change);
      }
      model.observableModel.addHandler('changed', instance.changed_);
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

// var referenceValidator = (function () {
//   var proto = {
//     onDanglingReference: function (item, attr) {
//       console.log(item, attr);
//     },

//     onTransactionEnding_: function (transaction) {
//       var self = this, dataModel = this.model.dataModel,
//           referencingModel = this.model.referencingModel;
//       dataModel.visitSubtree(this.model.root, function (item) {
//         dataModel.visitReferences(item, function (item, attr) {
//           if (!referencingModel.resolveId(item[attr]))
//             self.onDanglingReference(item, attr);
//         });
//       });
//     },
//   }

//   function extend(model) {
//     if (model.referenceValidator)
//       return model.referenceValidator;

//     var instance = Object.create(proto);
//     instance.model = model;
//     dataModel.extend(model);
//     transactionModel.extend(model);
//     referencingModel.extend(model);
//     // Create wrappers here to capture 'instance'.
//     instance.transactionEnding_ = function (transaction) {
//       instance.onTransactionEnding_(transaction);
//     }
//     model.transactionModel.addHandler('transactionEnding', instance.transactionEnding_);

//     model.referenceValidator = instance;
//     return instance;
//   }

//   return {
//     extend: extend,
//   };
// })();

//------------------------------------------------------------------------------

var selectionModel = (function () {
  var proto = {
    contains: function (item) {
      return this.selection.contains(item);
    },

    lastSelected: function () {
      return this.selection.lastSelected();
    },

    add: function (item) {
      if (Array.isArray(item)) {
        var sel = this.selection;
        item.forEach(function (element) { sel.add(element); });
      } else {
        this.selection.add(item);
      }
    },

    remove: function (item) {
      if (Array.isArray(item)) {
        var sel = this.selection;
        item.forEach(function (element) { sel.remove(element); });
      } else {
        this.selection.remove(item);
      }
    },

    set: function (item) {
      this.selection.clear();
      if (Array.isArray(item)) {
        var self = this;
        item.forEach(function (element) {
          self.selection.add(element);
        });
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
      var roots = [];
      this.selection.forEach(function (item) { roots.push(item); });
      return roots;
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
        this.model.dataModel.assignId(copy);
        if (map) {
          var id = this.model.dataModel.getId(item);
          map.add(id, copy);
        }
      }
      return copy;
    },

    cloneGraph: function (items, map) {
      var copies = [];
      var self = this;
      items.forEach(function (item) {
        copies.push(self.clone(item, map));
      });
      copies.forEach(function (copy) {
        self.model.dataModel.visitSubtree(copy, function (copy) {
          if (Array.isArray(copy))
            return;
          for (var attr in copy) {
            if (self.model.dataModel.isReference(copy, attr)) {
              var originalId = copy[attr];
              var newCopy = map.find(originalId);
              var newId = self.model.dataModel.getId(newCopy);
              copy[attr] = newId;
            }
          }
        });
      });
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
          instancingModel = model.instancingModel;
      var copies = instancingModel.cloneGraph(items, map);
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

    // Reduces the selection to the roots of the current selection. Thus, a
    // parent and child can't be simultaneously selected.
    reduceSelection: function (selectionModel) {  // TODO eliminate parameter
      var roots = [];
      var self = this;
      selectionModel.forEach(function (item) {
        var ancestor = self.getParent(item);
        while (ancestor) {
          if (selectionModel.contains(ancestor))
            return;
          ancestor = self.getParent(ancestor);
        }
        roots.push(item);
      });
      selectionModel.set(roots);
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
          array = change.array,
          attr = change.attr,
          oldValue = change.oldValue;
      switch (change.type) {
        case 'change':
          var newValue = item[attr];
          if (this.model.dataModel.isItem(newValue))
            this.init(newValue, item);
          break;
        case 'insert':
          var newValue = array[attr];
          if (this.model.dataModel.isItem(newValue))
            this.init(newValue, item);
          break;
        case 'remove':
          break;
      }
    },
  }

  function extend(model) {
    if (model.hierarchicalModel)
      return model.hierarchicalModel;

    dataModel.extend(model);
    observableModel.extend(model);

    var instance = Object.create(proto);
    instance.model = model;

    if (model.observableModel) {
      // Create wrappers here to capture 'instance'.
      instance.changed_ = function (change) {
        instance.onChanged_(change);
      }
      model.observableModel.addHandler('changed', instance.changed_);
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

function ValueChangeTracker(model, isValueFn, onChangedFn) {
  this.model = model;
  this.isValueFn = isValueFn || function (item, attr) {
    return typeof item[attr] == 'number';
  }
  this.onChangedFn = onChangedFn || function (item, attr, oldValue) {
    model.observableModel.onValueChanged(item, attr, oldValue);
  }
  this.snapshots = new HashMap();
  var self = this;
  var dataModel = this.model.dataModel;
  dataModel.visitSubtree(this.model.root, function (item) {
    var snapshot = {}, nonEmpty = false;
    dataModel.visitProperties(item, function (item, attr) {
      if (self.isValueFn(item, attr)) {
        snapshot[attr] = item[attr];
        nonEmpty = true;
      }
    });
    if (nonEmpty)
      self.snapshots.add(dataModel.getId(item), snapshot);
  });
}

ValueChangeTracker.prototype.getSnapshot = function (item) {
  var snapshots = this.snapshots;
  if (snapshots)
    return snapshots.find(this.model.dataModel.getId(item));
}

ValueChangeTracker.prototype.end = function () {
  var self = this;
  var dataModel = this.model.dataModel;
  dataModel.visitSubtree(this.model.root, function (item) {
    var snapshot = self.getSnapshot(item);
    if (snapshot) {
      dataModel.visitProperties(item, function (item, attr) {
        if (self.isValueFn(item, attr)) {
          var oldValue = snapshot[attr];
          var newValue = item[attr];
          if (oldValue !== newValue)
            self.onChangedFn(item, attr, oldValue);
        }
      });
    }
  });
  this.snapshots = null;
}

//------------------------------------------------------------------------------

var transformableModel = (function () {
  var proto = {
    hasTransform: function (item) {
      return item.x !== undefined && item.y !== undefined;
    },

    getRotation: function (item) {
      return item.rotation || item._rotation || 0;
    },

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

    updateLocal: function (item) {
      var tx = item.x, ty = item.y,
          rot = this.getRotation(item),
          cos = Math.cos(rot), sin = Math.sin(rot),
          tx = item.x, ty = item.y;
      item._transform = [ cos, -sin,
                          sin, cos,
                          tx, ty ];
      item._itransform = [ cos, sin,
                          -sin, cos,
                          -tx * cos + ty * sin, -tx * sin - ty * cos ];
    },

    updateTransforms: function (item, parent) {
      if (!this.hasTransform(item))
        return;
      this.updateLocal(item);
      while (parent && !this.hasTransform(parent))
        parent = this.model.hierarchicalModel.getParent(parent);

      if (parent) {
        item._atransform = geometry.matMulNew(item._transform, parent._atransform);
        item._aitransform = geometry.matMulNew(parent._aitransform, item._itransform);
      } else {
        item._atransform = item._aitransform = [1, 0, 0, 1, 0, 0];
      }
    },

    update: function (item, parent) {
      var self = this, hierarchicalModel = this.model.hierarchicalModel;
      this.updateTransforms(item, parent);
      hierarchicalModel.visitDescendants(item, function (child, parent) {
        self.updateTransforms(child, parent);
      });
    },

    onChanged_: function (change) {
      var hierarchicalModel = this.model.hierarchicalModel,
          item = change.item, array = change.array, attr = change.attr;
      switch (change.type) {
        case 'change':
          var newValue = item[attr];
          if (this.model.dataModel.isItem(newValue))
            this.update(newValue, item);
          else
            this.update(item, hierarchicalModel.getParent(item));
          break;
        case 'insert':
          var newValue = array[attr];
          if (this.model.dataModel.isItem(newValue))
            this.update(newValue, item);
          break;
        case 'remove':
          break;
      }
    },
  }

  function extend(model) {
    if (model.transformableModel)
      return model.transformableModel;

    var instance = Object.create(proto);
    instance.model = model;

    if (model.observableModel) {
      // Create wrappers here to capture 'instance'.
      instance.changed_ = function (change) {
        instance.onChanged_(change);
      }
      model.observableModel.addHandler('changed', instance.changed_);
    }

    instance.update(model.root, null);

    model.transformableModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

var layoutModel = (function () {
  var proto = {
    getLayout: function (item) {
      return item;
    },

    setLayout: function (item, x, y, width, height) {
      item.x = x;
      item.y = y;
      item.width = width;
      item.height = height;
    },
  }

  function extend(model) {
    if (model.layoutModel)
      return model.layoutModel;

    editingModel.extend(model);
    transactionModel.extend(model);

    var instance = Object.create(proto);
    instance.model = model;

    model.layoutModel = instance;
    return instance;
  }

  return {
    extend: extend,
  };
})();

//------------------------------------------------------------------------------

// var myModel = (function () {
//   var proto = {
//     getParent: function (item) {
//       return item._parent;
//     },
//   }

//   function extend(model) {
//     if (model.myModel)
//       return model.myModel;

//     var instance = Object.create(proto);
//     instance.model = model;

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
    // referenceValidator: referenceValidator,
    selectionModel: selectionModel,
    instancingModel: instancingModel,
    editingModel: editingModel,
    hierarchicalModel: hierarchicalModel,
    transformableModel: transformableModel,
    // dragAndDropModel: dragAndDropModel,

    ValueChangeTracker: ValueChangeTracker,
  }
})();
