// Statecharts module.

const statecharts = (function() {
'use strict';

function isPseudostate(item) {
  return item.type === 'start';
}

function isState(item) {
  return item.type === 'state' || isPseudostate(item);
}

function isTrueState(item) {
  return item.type === 'state';
}

function isStatechart(item) {
  return item.type === 'statechart';
}

function isStateOrStatechart(item) {
  return item.type === 'statechart' || isState(item);
}

function isTrueStateOrStatechart(item) {
  return item.type === 'state' || item.type === 'statechart';
}

function isContainable(item) {
  return item.type !== 'transition';
}

function isTransition(item) {
  return item.type === 'transition';
}

function isPaletted(item) {
  return item.state === 'palette';
}

const _p1 = Symbol('p1'),
      _p2 = Symbol('p2'),
      _master = Symbol('master');

// Visits in pre-order.
function visitItem(item, fn, filter) {
  if (!filter || filter(item)) {
    fn(item);
  }
  if (isTrueStateOrStatechart(item) && item.items) {
    visitItems(item.items, fn, filter);
  }
}

function visitItems(items, fn, filter) {
  items.forEach(item => visitItem(item, fn, filter));
}

// Visits in post-order.
function reverseVisitItem(item, fn, filter) {
  if (isTrueStateOrStatechart(item) && item.items) {
    reverseVisitItems(item.items, fn, filter);
  }
  if (!filter || filter(item)) {
    fn(item);
  }
}

function reverseVisitItems(items, fn, filter) {
  for (let i = items.length - 1; i >= 0; i--) {
    reverseVisitItem(items[i], fn, filter);
  }
}

// Initialized by editor.
// TODO remove these globals
let getTransitionSrc,
    getTransitionDst;

//------------------------------------------------------------------------------

// Use dataModels.changeAggregator to maintain:
// - maps from element to connected transitions.
// - information about graphs and subgraphs.
// - iterators for walking the graph.

const statechartModel = (function() {

  function iterators(self) {

    function forInTransitions(state, fn) {
      const inputs = self.inputMap_.get(state);
      if (!inputs)
        return;
      for (let i = 0; i < inputs.length; i++) {
        fn(inputs[i], i);
      }
    }

    function forOutTransitions(state, fn) {
      const outputs = self.outputMap_.get(state);
      if (!outputs)
        return;
      for (let i = 0; i < outputs.length; i++) {
        fn(outputs[i], i);
      }
    }

    return {
      forInTransitions: forInTransitions,
      forOutTransitions: forOutTransitions,
    }
  }

  const proto = {
    getGraphInfo: function() {
      this.update_();

      return {
        statesAndStatecharts: this.statesAndStatecharts_,
        transitions: this.transitions_,
        inputMap: this.inputMap_,
        outputMap: this.outputMap_,
        interiorTransitions: this.transitions_,
        inTransitions: new diagrammar.collections.EmptySet(),
        outTransitions: new diagrammar.collections.EmptySet(),
        iterators: iterators(this),
      }
    },

    getSubgraphInfo: function(items) {
      this.update_();

      const self = this,
            statesAndStatecharts = new Set(),
            transitions = new Set(),
            interiorTransitions = new Set(),
            inTransitions = new Set(),
            outTransitions = new Set(),
            iters = iterators(this);
      // First collect states and statecharts.
      visitItems(items, function(item) {
        statesAndStatecharts.add(item);
      }, isStateOrStatechart);
      // Now collect and classify transitions that connect to them.
      visitItems(items, function(item) {
        function addTransition(transition) {
          transitions.add(transition);
          const src = self.getTransitionSrc(transition),
                dst = self.getTransitionDst(transition),
                srcInside = statesAndStatecharts.has(src),
                dstInside = statesAndStatecharts.has(dst);
          if (srcInside) {
            if (dstInside) {
              interiorTransitions.add(transition);
            } else {
              outTransitions.add(transition);
            }
          }
          if (dstInside) {
            if (!srcInside) {
              inTransitions.add(transition);
            }
          }
        }
        iters.forInTransitions(item, addTransition);
        iters.forOutTransitions(item, addTransition);
      }, isState);

      return {
        statesAndStatecharts: statesAndStatecharts,
        transitions: transitions,
        inputMap: this.inputMap_,
        outputMap: this.outputMap_,
        interiorTransitions: interiorTransitions,
        inTransitions: inTransitions,
        outTransitions: outTransitions,
        iterators: iters,
      }
    },

    getTopLevelState: function(item) {
      const hierarchicalModel = this.model.hierarchicalModel,
            topLevelStatechart = this.statechart;
      let result;
      do {
        result = item;
        item = hierarchicalModel.getParent(item);
      } while (item && item !== topLevelStatechart);
      return result;
    },

    insertState_: function(state) {
      this.statesAndStatecharts_.add(state);
      // inputMap_ takes state to array of incoming transitions.
      if (!this.inputMap_.has(state))
        this.inputMap_.set(state, new Array());
      // outputMap_ takes state to array of outgoing transitions.
      if (!this.outputMap_.has(state))
        this.outputMap_.set(state, new Array());
    },

    insertStatechart_: function(state) {
      this.statesAndStatecharts_.add(state);
    },

    removeState_: function(state) {
      this.statesAndStatecharts_.delete(state);
      this.inputMap_.delete(state);
      this.outputMap_.delete(state);
    },

    removeStatechart_: function(state) {
      this.statesAndStatecharts_.delete(state);
    },

    insertTransition_: function(transition) {
      this.transitions_.add(transition);
      const src = this.getTransitionSrc(transition),
            dst = this.getTransitionDst(transition);
      if (src) {
        const outputs = this.outputMap_.get(src);
        if (outputs)
          outputs.push(transition);
      }
      if (dst) {
        const inputs = this.inputMap_.get(dst);
        if (inputs)
          inputs.push(transition);
      }
    },

    removeTransition_: function(transition) {
      this.transitions_.delete(transition);
      const src = this.getTransitionSrc(transition),
            dst = this.getTransitionDst(transition);
      function remove(array, item) {
        const index = array.indexOf(item);
        if (index > -1) {
          array.splice(index, 1);
        }
      }
      if (src) {
        const outputs = this.outputMap_.get(src);
        if (outputs)
          remove(outputs, transition);
      }
      if (dst) {
        const inputs = this.inputMap_.get(dst);
        if (inputs)
          remove(inputs, transition);
      }
    },

    // Update the model to incorporate pending changes.
    update_: function() {
      const changeAggregator = this.changeAggregator;
      if (!changeAggregator.hasChanges())
        return;

      const self = this,
            removedItems = changeAggregator.getRemovedItems(),
            insertedItems = changeAggregator.getInsertedItems(),
            changedItems = changeAggregator.getChangedItems();

      // Remove transitions, then states.
      removedItems.forEach(function(item) {
        if (isTransition(item)) {
          self.removeTransition_(item);
        }
      });
      removedItems.forEach(function(item) {
        if (isState(item)) {
          self.removeState_(item);
        } else if (isStatechart(item)) {
          self.removeStatechart_(item);
        }
      });
      // Add states, then transitions.
      insertedItems.forEach(function(item) {
        if (isState(item)) {
          self.insertState_(item);
        } else if (isStatechart(item)) {
          self.insertStatechart_(item);
        }
      });
      insertedItems.forEach(function(item) {
        if (isTransition(item)) {
          self.insertTransition_(item);
        }
      });
      // For changed wires, remove them and then re-insert them.
      changedItems.forEach(function(item) {
        if (isTransition(item)) {
          self.removeTransition_(item);
          self.insertTransition_(item);
        }
      });

      changeAggregator.clear();
    }
  }

  function extend(model) {
    if (model.statechartModel)
      return model.statechartModel;

    dataModels.observableModel.extend(model);
    dataModels.referencingModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.statechart = model.root;

    instance.inputMap_ = new Map();   // state -> incoming transitions
    instance.outputMap_ = new Map();  // state -> outgoing transitions
    instance.statesAndStatecharts_ = new Set();
    instance.transitions_ = new Set();

    instance.changeAggregator = dataModels.changeAggregator.attach(model);

    instance.getTransitionSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getTransitionDst = model.referencingModel.getReferenceFn('dstId');

    // Initialize states and transitions.
    visitItem(instance.statechart, function(state) {
      instance.insertState_(state);
    }, isState);
    visitItem(instance.statechart, function(transition) {
      instance.insertTransition_(transition);
    }, isTransition);

    model.statechartModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

const editingModel = (function() {
  const proto = {
    getParent: function(item) {
      return this.model.hierarchicalModel.getParent(item);
    },

    reduceSelection: function () {
      const model = this.model;
      model.selectionModel.set(model.hierarchicalModel.reduceSelection());
    },

    selectInteriorTransitions: function() {
      const model = this.model,
            selectionModel = model.selectionModel,
            graphInfo = model.statechartModel.getSubgraphInfo(selectionModel.contents());
      selectionModel.add(graphInfo.interiorTransitions);
    },

    deleteItem: function(item) {
      const model = this.model,
            hierarchicalModel = model.hierarchicalModel,
            parent = hierarchicalModel.getParent(item);
      if (parent) {
        const items = parent.items;
        for (let i = 0; i < items.length; i++) {
          const subItem = items[i];
          if (subItem === item) {
            model.observableModel.removeElement(parent, 'items', i);
            model.selectionModel.remove(item);
            break;
          }
        }
      }
    },

    deleteItems: function(items) {
      const self = this;
      // // TODO makeConsistent should
      // this.getConnectedConnections(items, true).forEach(function(item) {
      //   this.deleteItem(item);
      // }, this);
      items.forEach(function(item) {
        this.deleteItem(item);
      }, this);
    },

    copyItems: function(items, map) {
      const model = this.model,
            dataModel = model.dataModel,
            translatableModel = model.translatableModel,
            statechart = this.statechart,
            copies = model.copyPasteModel.cloneItems(items, map);

      items.forEach(function(item) {
        const copy = map.get(dataModel.getId(item));
        if (isContainable(copy)) {
          if (isState(copy)) {
            // De-palettize states.
            copy.state = 'normal';
          }
          const translation = translatableModel.getToParent(item, statechart);
          copy.x += translation.x;
          copy.y += translation.y;
        }
      });
      return copies;
    },

    // Creates a new statechart.
    createStatechart: function() {
      const statechart = {
        type: 'statechart',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        items: new Array(),
      };
      this.model.dataModel.initialize(statechart);
      return statechart;
    },

    setAttr: function(item, attr, value) {
      this.model.observableModel.changeValue(item, attr, value);
    },

    newItem: function(item) {
      const dataModel = this.model.dataModel;
      dataModel.assignId(item);
      dataModel.initialize(item);
    },

    newItems: function(items) {
      const self = this;
      items.forEach(item => self.newItem(item));
    },

    isTopLevelStatechart: function(item) {
      return isStatechart(item) &&
             !this.model.hierarchicalModel.getParent(item);
    },

    // Returns a value indicating if the item can be added to the state
    // without violating statechart constraints.
    canAddItemToStatechart: function(newItem, statechart) {
      if (isPaletted(newItem))
        return true;

      switch (newItem.type) {
        case 'state':
        case 'transition':
          return true;
        case 'start': {
          for (let item of statechart.items) {
            if (item.type == 'start' && item !== newItem)
              return false;
          }
          return true;
        }
      }
    },

    findChildStatechart: function(state, newItem) {
      if (state.items) {
        for (let i = 0; i < state.items.length; i++) {
          if (this.canAddItemToStatechart(newItem, state.items[i]))
            return i;
        }
      }
      return -1;
    },

    findOrCreateChildStatechart: function(state, newItem) {
      let i = this.findChildStatechart(state, newItem);
      if (i < 0) {
        if (!state.items)
          this.setAttr(state, 'items', new Array());
        i = state.items.length;
        const statechart = this.createStatechart();
        this.model.observableModel.insertElement(state, 'items', i, statechart);
      }
      return state.items[i];
    },

    addItem: function(item, parent) {
      const model = this.model,
            observableModel = model.observableModel,
            hierarchicalModel = model.hierarchicalModel,
            oldParent = hierarchicalModel.getParent(item);

      if (isState(parent)) {
        if (isPseudostate(parent)) return;
        parent = this.findOrCreateChildStatechart(parent, item);
      } else if (isStatechart(parent)) {
        if (!this.isTopLevelStatechart(parent) &&
            !this.canAddItemToStatechart(item, parent)) {
          const superState = hierarchicalModel.getParent(parent);
          parent = this.findOrCreateChildStatechart(superState, item);
        }
      }
      // At this point we can add item to parent.
      if (isState(item)) {
        const translatableModel = model.translatableModel,
              translation = translatableModel.getToParent(item, parent);
        this.setAttr(item, 'x', item.x + translation.x);
        this.setAttr(item, 'y', item.y + translation.y);
      }

      if (oldParent === parent)
        return;
      if (oldParent)
        this.deleteItem(item);
      observableModel.insertElement(parent, 'items', parent.items.length, item);
      return item;
    },

    addItems: function(items) {
      const model = this.model,
            statechart = this.statechart,
            statechartItems = statechart.items;
      items.forEach(function(item) {
        model.observableModel.insertElement(statechart, 'items', statechartItems.length, item);
        model.selectionModel.add(item);
      });
    },

    doDelete: function() {
      this.reduceSelection();
      this.model.copyPasteModel.doDelete(this.deleteItems.bind(this));
    },

    doCopy: function() {
      const selectionModel = this.model.selectionModel;
      selectionModel.contents().forEach(function(item) {
        if (isTransition(item))
          selectionModel.remove(item);
      });
      this.selectInteriorTransitions();
      this.reduceSelection();
      this.model.copyPasteModel.doCopy(this.copyItems.bind(this));
    },

    doCut: function() {
      this.doCopy();
      this.doDelete();
    },

    doPaste: function() {
      const copyPasteModel = this.model.copyPasteModel;
      copyPasteModel.getScrap().forEach(function(item) {
        // Offset pastes so the user can see them.
        if (isState(item)) {
          item.x += 16;
          item.y += 16;
        }
      });
      copyPasteModel.doPaste(this.copyItems.bind(this),
                             this.addItems.bind(this));
    },

    doTogglePalette: function() {
      const model = this.model;
      this.reduceSelection();
      model.transactionModel.beginTransaction('toggle master state');
      model.selectionModel.contents().forEach(function(item) {
        if (!isState(item))
          return;
        model.observableModel.changeValue(item, 'state',
          (item.state === 'palette') ? 'normal' : 'palette');
      })
      model.transactionModel.endTransaction();
    },

    makeConsistent: function () {
      const self = this, model = this.model,
            statechart = this.statechart,
            dataModel = model.dataModel,
            hierarchicalModel = model.hierarchicalModel,
            selectionModel = model.selectionModel,
            observableModel = model.observableModel,
            graphInfo = model.statechartModel.getGraphInfo();
      // Eliminate dangling transitions.
      graphInfo.transitions.forEach(function(transition) {
        const src = self.getTransitionSrc(transition),
              dst = self.getTransitionDst(transition);
        if (!src || !graphInfo.statesAndStatecharts.has(src) ||
            !dst || !graphInfo.statesAndStatecharts.has(dst)) {
          self.deleteItem(transition);
          return;
        }
        // Make sure transitions belong to lowest common statechart.
        const lca = hierarchicalModel.getLowestCommonAncestor(src, dst);
        if (self.getParent(transition) !== lca) {
          self.deleteItem(transition);
          self.addItem(transition, lca);
        }
      });
      // Delete any empty statecharts (except for the root statechart).
      graphInfo.statesAndStatecharts.forEach(function(item) {
        if (isStatechart(item) &&
            !self.isTopLevelStatechart(item) &&
            item.items.length === 0)
          self.deleteItem(item);
      });
    },
  }

  function extend(model) {
    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);
    dataModels.selectionModel.extend(model);
    dataModels.referencingModel.extend(model);
    dataModels.hierarchicalModel.extend(model);
    dataModels.translatableModel.extend(model);
    dataModels.transactionModel.extend(model);
    dataModels.transactionHistory.extend(model);
    dataModels.instancingModel.extend(model);
    dataModels.copyPasteModel.extend(model);

    const instance = Object.create(model.copyPasteModel);
    instance.prototype = Object.getPrototypeOf(instance);
    for (let prop in proto)
      instance[prop] = proto[prop];

    instance.model = model;
    instance.statechart = model.root;

    instance.getTransitionSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getTransitionDst = model.referencingModel.getReferenceFn('dstId');

    model.transactionModel.addHandler('transactionEnding',
                                      transaction => instance.makeConsistent());

    model.editingModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

const _bezier = Symbol('bezier');

const layoutModel = (function() {
  const proto = {
    initialize: function(ctx) {
      this.ctx = ctx ||
        {
          save: function() {},
          restore: function() {},
          measureText: () => { return { width: 10, height: 10 }},
        };
    },

    getSize: function(item) {
      let w, h;
      switch (item.type) {
        case 'state':
        case 'statechart':
          w = item.width;
          h = item.height;
          break;
        case 'start':
          w = h = 2 * this.theme.radius;
          break;
      }
      return { w: w, h: h };
    },

    getItemRect: function (item) {
      const size = this.getSize(item),
            translatableModel = this.model.translatableModel,
            x = translatableModel.globalX(item),
            y = translatableModel.globalY(item);

      return { x: x, y: y, w: size.w, h: size.h };
    },

    getBounds: function(items) {
      let xMin = Number.POSITIVE_INFINITY, yMin = Number.POSITIVE_INFINITY,
          xMax = -Number.POSITIVE_INFINITY, yMax = -Number.POSITIVE_INFINITY;
      for (let item of items) {
        if (isTransition(item))
          continue;
        const x = item.x, y = item.y,
              size = this.getSize(item);
        xMin = Math.min(xMin, x);
        yMin = Math.min(yMin, y);
        xMax = Math.max(xMax, x + size.w);
        yMax = Math.max(yMax, y + size.h);
      }
      return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
    },

    statePointToParam: function(state, p) {
      const r = this.theme.radius,
            rect = this.getItemRect(state);
      if (isTrueState(state))
        return diagrams.rectPointToParam(rect.x, rect.y, rect.w, rect.h, p);

      return diagrams.circlePointToParam(rect.x + r, rect.y + r, p);
    },

    stateParamToPoint: function(state, t) {
      const r = this.theme.radius,
            rect = this.getItemRect(state);
      if (isTrueState(state))
        return diagrams.roundRectParamToPoint(rect.x, rect.y, rect.w, rect.h, r, t);

      return diagrams.circleParamToPoint(rect.x + r, rect.y + r, r, t);
    },

    getStateMinSize: function(state) {
      const ctx = this.ctx, theme = this.theme,
            r = theme.radius;
      let width = theme.stateMinWidth, height = theme.stateMinHeight;
      if (state.type !== 'state')
        return;
      width = Math.max(width, ctx.measureText(state.name).width + 2 * r);
      height = Math.max(height, theme.fontSize + this.textLeading);
      return { width: width, height: height };
    },

    updateLayout: function() {
      const self = this,
            graphInfo = this.model.statechartModel.getGraphInfo();
      this.changedStates_.forEach(function(state) {
        function addTransition(transition) {
          self.changedTransitions_.add(transition);
        }
        graphInfo.iterators.forInTransitions(state, addTransition);
        graphInfo.iterators.forOutTransitions(state, addTransition);
      });
      this.changedStates_.clear();

      this.changedTransitions_.forEach(
          transition => self.layoutTransition_(transition));
      this.changedTransitions_.clear();
    },

    updateStatechartLayout: function() {
      const self = this;
      this.changedTopLevelStates_.forEach(function(state) {
        reverseVisitItem(state, state => self.layout_(state));
      });
      this.changedTopLevelStates_.clear();
    },

    // Layout a state or statechart.
    layout_: function(item) {
      if (isTrueState(item)) {
        this.layoutState_(item);
      } else if (isStatechart(item)) {
        this.layoutStatechart_(item);
      }
    },

    // Layout a state.
    layoutState_: function(state) {
      const theme = this.theme,
            observableModel = this.model.observableModel;
      let width = Math.max(state.width, theme.stateMinWidth),
          height = Math.max(state.height, theme.stateMinHeight);

      const statecharts = state.items;
      let statechartOffsetY = 0;
      if (statecharts && statecharts.length > 0) {
        // Layout the child statecharts vertically within the parent state.
        // TODO handle horizontal flow.
        statecharts.forEach(function(statechart) {
          width = Math.max(width, statechart.width);
        });
        let statechartOffsetY = 0;
        statecharts.forEach(function(statechart) {
          observableModel.changeValue(statechart, 'y', statechartOffsetY);
          observableModel.changeValue(statechart, 'width', width);
          statechartOffsetY += statechart.height;
        });

        // Expand the last statechart to fill its parent state.
        const lastStatechart = statecharts[statecharts.length - 1];
        observableModel.changeValue(lastStatechart, 'height',
              lastStatechart.height + state.height - statechartOffsetY);

        height = Math.max(height, statechartOffsetY);
      }
      width = Math.max(width, state.width);
      height = Math.max(height, state.height);
      observableModel.changeValue(state, 'width', width);
      observableModel.changeValue(state, 'height', height);
    },

    // Make sure a statechart is big enough to enclose its contents. Statecharts
    // are always sized automatically.
    layoutStatechart_: function(statechart) {
      const padding = this.theme.padding,
            items = statechart.items;
      if (items) {
        // Get extents of child states.
        const r = this.getBounds(items),
              observableModel = this.model.observableModel;
        let xMin = Math.min(0, r.x - padding),
            yMin = Math.min(0, r.y - padding),
            xMax = r.x + r.w + padding,
            yMax = r.y + r.h + padding;
        if (xMin < 0) {
          xMax -= xMin;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (isTransition(item)) continue;
            observableModel.changeValue(item, 'x', item.x - xMin);
          }
        }
        if (yMin < 0) {
          yMax -= yMin;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (isTransition(item)) continue;
            observableModel.changeValue(item, 'y', item.y - yMin);
          }
        }
        observableModel.changeValue(statechart, 'x', 0);
        observableModel.changeValue(statechart, 'y', 0);
        observableModel.changeValue(statechart, 'width', xMax - xMin);
        observableModel.changeValue(statechart, 'height', yMax - yMin);
      }
    },

    layoutTransition_: function(transition) {
      const src = this.getTransitionSrc(transition),
            dst = this.getTransitionDst(transition),
            p1 = src ? this.stateParamToPoint(src, transition.t1) : transition[_p1],
            p2 = dst ? this.stateParamToPoint(dst, transition.t2) : transition[_p2];
      if (p1 && p2) {
        transition[_bezier] = diagrams.getEdgeBezier(p1, p2);
      }
      // transition[_mid] = geometry.evaluateBezier(bezier, 0.5);
    },

    addTopLevelState_: function(item) {
      let hierarchicalModel = this.model.hierarchicalModel,
          statechart = this.statechart,
          ancestor = item;
      do {
        item = ancestor;
        ancestor = hierarchicalModel.getParent(ancestor);
      } while (ancestor && ancestor !== statechart);

      if (ancestor === statechart) {
        this.changedTopLevelStates_.add(item);
      }
    },

    update_: function (item) {
      const self = this;
      if (isTransition(item)) {
        this.changedTransitions_.add(item);
      } else if (isState(item)) {
        visitItem(item, function(state) {
          self.changedStates_.add(state);
        }, isState);
        this.addTopLevelState_(item);
      } else if (isStatechart(item)) {
        this.addTopLevelState_(item);
      }
    },

    onChanged_: function (change) {
      const item = change.item,
            attr = change.attr;
      switch (change.type) {
        case 'change':
        case 'remove': {
          this.update_(item);
          break;
        }
        case 'insert': {
          const newValue = item[attr][change.index];
          // this.update_(item);
          this.update_(newValue);
          break;
        }
      }
    },
  }

  function extend(model, theme) {
    dataModels.dataModel.extend(model);
    dataModels.observableModel.extend(model);
    dataModels.referencingModel.extend(model);
    dataModels.hierarchicalModel.extend(model);
    dataModels.translatableModel.extend(model);

    let instance = Object.create(proto);
    instance.model = model;
    instance.statechart = model.root;
    instance.theme = theme;

    instance.changedTransitions_ = new Set();
    instance.changedStates_ = new Set();
    instance.changedTopLevelStates_ = new Set();

    instance.getTransitionSrc = model.referencingModel.getReferenceFn('srcId');
    instance.getTransitionDst = model.referencingModel.getReferenceFn('dstId');

    model.observableModel.addHandler('changed',
                                     change => instance.onChanged_(change));

    // Initialize our data.
    visitItem(instance.statechart, item => instance.update_(item));

    model.layoutModel = instance;
    return instance;
  }

  return {
    extend: extend,
  }
})();

//------------------------------------------------------------------------------

const normalMode = 1,
      highlightMode = 2,
      hotTrackMode = 3;

function Renderer(theme) {
  this.theme = theme;
}

Renderer.prototype.beginDraw = function(model, ctx) {
  this.model = model;
  this.layoutModel = model.layoutModel;
  this.ctx = ctx;
  ctx.save();
  ctx.font = this.theme.font;

  this.layoutModel.updateLayout();
}

Renderer.prototype.endDraw = function() {
  this.ctx.restore();
  this.model = null;
  this.ctx = null;
}

function drawArrow(renderer, x, y) {
  const ctx = renderer.ctx;
  ctx.beginPath();
  diagrams.arrowPath({ x: x, y: y, nx: -1, ny: 0 }, ctx, renderer.theme.arrowSize);
  ctx.stroke();
}

function hitTestArrow(renderer, x, y, p, tol) {
  const d = renderer.theme.arrowSize, r = d * 0.5;
  return diagrams.hitTestRect(x - r, y - r, d, d, p, tol);
}

Renderer.prototype.drawState = function(state, mode) {
  const ctx = this.ctx, theme = this.theme, r = theme.radius,
        rect = this.layoutModel.getItemRect(state),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h,
        knobbyRadius = theme.knobbyRadius, textSize = theme.fontSize,
        lineBase = y + textSize + theme.textLeading;
  diagrams.roundRectPath(x, y, w, h, r, ctx);
  switch (mode) {
    case normalMode:
      ctx.fillStyle = state.state === 'palette' ? theme.altBgColor : theme.bgColor;
      ctx.fill();
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, lineBase);
      ctx.lineTo(x + w, lineBase);
      ctx.stroke();

      ctx.fillStyle = theme.textColor;
      ctx.fillText(state.name, x + r, y + textSize);

      const items = state.items;
      if (items) {
        let separatorY = y;
        for (var i = 0; i < items.length - 1; i++) {
          const statechart = items[i];
          separatorY += statechart.height;
          ctx.setLineDash([5]);
          ctx.beginPath();
          ctx.moveTo(x, separatorY);
          ctx.lineTo(x + w, separatorY);
          ctx.stroke();
          ctx.setLineDash([0]);
        }
      }
      // Render knobbies, faintly.
      ctx.lineWidth = 0.25;
      break;
    case highlightMode:
      ctx.strokeStyle = theme.highlightColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case hotTrackMode:
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }
  drawArrow(this, x + w + theme.arrowSize, lineBase);
}

Renderer.prototype.hitTestState = function(state, p, tol, mode) {
  const theme = this.theme, r = theme.radius,
        rect = this.layoutModel.getItemRect(state),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h;
  const lineBase = y + theme.fontSize + theme.textLeading,
        knobbyRadius = theme.knobbyRadius;
  if (hitTestArrow(this, x + w + theme.arrowSize, lineBase, p, tol))
    return { arrow: true };
  return diagrams.hitTestRect(x, y, w, h, p, tol); // TODO hitTestRoundRect
}

Renderer.prototype.drawPseudoState = function(state, mode) {
  const ctx = this.ctx, theme = this.theme, r = theme.radius,
        rect = this.layoutModel.getItemRect(state),
        x = rect.x, y = rect.y;
  // TODO handle other psuedo state types.
  diagrams.diskPath(x + r, y + r, r, ctx);
  switch (mode) {
    case normalMode:
      ctx.fillStyle = state.state === 'palette' ? theme.altBgColor : theme.strokeColor;
      ctx.fill();
      // Render knobbies, faintly.
      ctx.lineWidth = 0.25;
      ctx.stroke()
      break;
    case highlightMode:
      ctx.strokeStyle = theme.highlightColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case hotTrackMode:
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }
  drawArrow(this, x + 2 * r + theme.arrowSize, y + r);
}

Renderer.prototype.hitTestPseudoState = function(state, p, tol, mode) {
  const theme = this.theme,
        r = theme.radius,
        rect = this.layoutModel.getItemRect(state),
        x = rect.x, y = rect.y;
  if (hitTestArrow(this, x + 2 * r + theme.arrowSize, y + r, p, tol))
    return { arrow: true };

  return diagrams.hitTestDisk(x + r, y + r, r, p, tol);
}

Renderer.prototype.drawStatechart = function(statechart, mode) {
  switch (mode) {
    case normalMode:
      break;
    case highlightMode:
      break;
    case hotTrackMode:
      const ctx = this.ctx, theme = this.theme, r = theme.radius,
            rect = this.layoutModel.getItemRect(statechart),
            x = rect.x, y = rect.y, w = rect.w, h = rect.h;
      diagrams.roundRectPath(x, y, w, h, r, ctx);
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }
}

Renderer.prototype.hitTestStatechart = function(statechart, p, tol, mode) {
  const theme = this.theme,
        r = theme.radius,
        rect = this.layoutModel.getItemRect(statechart),
        x = rect.x, y = rect.y, w = rect.w, h = rect.h;
  return diagrams.hitTestRect(x, y, w, h, p, tol); // TODO hitTestRoundRect
}

Renderer.prototype.drawTransition = function(transition, mode) {
  const ctx = this.ctx,
        theme = this.theme,
        r = theme.knobbyRadius,
        bezier = transition[_bezier];
  diagrams.bezierEdgePath(bezier, ctx, theme.arrowSize);
  switch (mode) {
    case normalMode:
      ctx.strokeStyle = theme.strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      let src = getTransitionSrc(transition);
      if (src && !isPseudostate(src)) {
        diagrams.roundRectPath(bezier[0].x - theme.radius,
                               bezier[0].y - theme.radius,
                               16, 16, theme.radius, ctx);
        ctx.fillStyle = theme.bgColor;
        ctx.fill();
        ctx.lineWidth = 0.25;
        ctx.stroke();
      }
      break;
    case highlightMode:
      ctx.strokeStyle = theme.highlightColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case hotTrackMode:
      ctx.strokeStyle = theme.hotTrackColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }
}

Renderer.prototype.hitTestTransition = function(transition, p, tol, mode) {
  // TODO fix layout with viewModel
  if (!transition[_bezier])
    return;
  return diagrams.hitTestBezier(transition[_bezier], p, tol);
}

Renderer.prototype.draw = function(item, mode) {
  switch (item.type) {
    case 'state':
      this.drawState(item, mode);
      break;
    case 'start':
      this.drawPseudoState(item, mode);
      break;
    case 'transition':
      this.drawTransition(item, mode);
      break;
    case 'statechart':
      this.drawStatechart(item, mode);
      break;
  }
}

Renderer.prototype.hitTest = function(item, p, tol, mode) {
  let hitInfo;
  switch (item.type) {
    case 'state':
      hitInfo = this.hitTestState(item, p, tol, mode);
      break;
    case 'start':
      hitInfo = this.hitTestPseudoState(item, p, tol, mode);
      break;
    case 'transition':
      hitInfo = this.hitTestTransition(item, p, tol, mode);
      break;
    case 'statechart':
      hitInfo = this.hitTestStatechart(item, p, tol, mode);
      break;
  }
  if (hitInfo)
    hitInfo.item = item;
  return hitInfo;
}

Renderer.prototype.drawHoverText = function(item, p) {
  const self = this, theme = this.theme,
        props = [];
  this.model.dataModel.visitProperties(item, function(item, attr) {
    const value = item[attr];
    if (Array.isArray(value))
      return;
    props.push({ name: attr, value: value });
  });
  const textSize = theme.fontSize, gap = 16, border = 4,
        height = textSize * props.length + 2 * border,
        maxWidth = diagrams.measureNameValuePairs(props, gap, ctx) + 2 * border;
  let x = p.x, y = p.y;
  ctx.fillStyle = theme.hoverColor;
  ctx.fillRect(x, y, maxWidth, height);
  ctx.fillStyle = theme.hoverTextColor;
  props.forEach(function(prop) {
    ctx.textAlign = 'left';
    ctx.fillText(prop.name, x + border, y + textSize);
    ctx.textAlign = 'right';
    ctx.fillText(prop.value, x + maxWidth - border, y + textSize);
    y += textSize;
  });
}

//------------------------------------------------------------------------------

function createTheme(properties) {
  let theme = diagrams.theme.createDefault();
  // Assign default statechart layout and drawing parameters.
  theme = Object.assign(theme, {
    radius: 8,
    textIndent: 8,
    textLeading: 6,
    arrowSize: 8,
    knobbyRadius: 4,
    padding: 8,

    stateMinWidth: 100,
    stateMinHeight: 60,
  });
  // Assign custom properties.
  if (properties) {
    theme = Object.assign(theme, properties);
  }
  return theme;
}

function Editor(model, theme) {
  const self = this;
  this.model = model;
  this.statechart = model.root;

  this.theme = theme = createTheme(theme);
  this.renderer = new Renderer(theme);

  this.hitTolerance = 8;

  this.items = [
    {
      type: 'start',
      state: 'palette',
      x: 48,
      y: 8,
    },
    {
      type: 'state',
      state: 'palette',
      x: 8,
      y: 30,
      width: 100,
      height: 60,
      name: 'New State',
    },
  ]

  editingModel.extend(model);

  getTransitionSrc = model.referencingModel.getReferenceFn('srcId');
  getTransitionDst = model.referencingModel.getReferenceFn('dstId');

  statechartModel.extend(model);

  model.dataModel.initialize();

  layoutModel.extend(model, theme);

  function updateLayout() {
    self.model.layoutModel.updateLayout();
  }
  function updateBounds() {
    self.model.layoutModel.updateStatechartLayout();
  }
  const transactionModel = model.transactionModel;
  transactionModel.addHandler('transactionEnding', updateBounds);
  transactionModel.addHandler('didUndo', updateLayout);
  transactionModel.addHandler('didRedo', updateLayout);
}

Editor.prototype.initialize = function(canvasController) {
  this.canvasController = canvasController;
  this.canvas = canvasController.canvas;
  this.ctx = canvasController.ctx;

  const model = this.model,
        layoutModel = model.layoutModel,
        ctx = this.ctx,
        editingModel = model.editingModel,
        statechart = this.statechart;

  layoutModel.initialize(ctx, theme);

  this.items.forEach(function(item) {
    editingModel.addItem(item, statechart);
  });
}

Editor.prototype.draw = function() {
  const renderer = this.renderer, statechart = this.statechart,
        model = this.model,
        ctx = this.ctx, canvasController = this.canvasController;
  renderer.beginDraw(model, ctx);
  canvasController.applyTransform();

  visitItem(statechart, function(item) {
    renderer.draw(item, normalMode);
  }, isContainable);
  visitItem(statechart, function(transition) {
    renderer.draw(transition, normalMode);
  }, isTransition);

  model.selectionModel.forEach(function(item) {
    renderer.draw(item, highlightMode);
  });
  if (this.hotTrackInfo)
    renderer.draw(this.hotTrackInfo.item, hotTrackMode);
  renderer.endDraw();

  const hoverHitInfo = this.hoverHitInfo;
  if (hoverHitInfo) {
    renderer.beginDraw(model, ctx);
    renderer.drawHoverText(hoverHitInfo.item, hoverHitInfo.p);
    renderer.endDraw();
  }
}

Editor.prototype.hitTest = function(p) {
  const renderer = this.renderer,
        canvasController = this.canvasController,
        cp = canvasController.viewToCanvas(p),
        scale = canvasController.scale,
        zoom = Math.max(scale.x, scale.y),
        tol = this.hitTolerance, cTol = tol / zoom,
        statechart = this.statechart,
        hitList = [];
  function pushInfo(info) {
    if (info)
      hitList.push(info);
  }
  // TODO hit test selection first, in highlight, first.
  reverseVisitItem(statechart, isTransition, function(transition) {
    pushInfo(renderer.hitTest(transition, cp, cTol, normalMode));
  });
  reverseVisitItem(statechart, isContainable, function(item) {
    pushInfo(renderer.hitTest(item, cp, cTol, normalMode));
  });
  return hitList;
}

Editor.prototype.getFirstHit = function(hitList, filterFn) {
  if (hitList) {
    const model = this.model;
    for (let i = 0; i < hitList.length; i++) {
      var hitInfo = hitList[i];
      if (filterFn(hitInfo, model))
        return hitInfo;
    }
  }
  return null;
}

function isStateBorder(hitInfo, model) {
  return isState(hitInfo.item) && hitInfo.border && !hitInfo.arrow;
}

function isDraggable(hitInfo, model) {
  return !isStatechart(hitInfo.item);
}

function isContainerTarget(hitInfo, model) {
  const item = hitInfo.item;
  return isTrueStateOrStatechart(item) &&
         !model.hierarchicalModel.isItemInSelection(item);
}

Editor.prototype.onClick = function(p) {
  const model = this.model,
        selectionModel = model.selectionModel,
        shiftKeyDown = this.canvasController.shiftKeyDown,
        cmdKeyDown = this.canvasController.cmdKeyDown,
        hitList = this.hitTest(p),
        mouseHitInfo = this.mouseHitInfo = this.getFirstHit(hitList, isDraggable);
  if (mouseHitInfo) {
    const item = mouseHitInfo.item;
    if (isPaletted(item) || cmdKeyDown) {
      mouseHitInfo.moveCopy = true;
      // No transition dragging or state resizing in this mode.
      mouseHitInfo.arrow = mouseHitInfo.border = undefined;
    }
    selectionModel.select(item, shiftKeyDown);
  } else {
    if (!shiftKeyDown) {
      selectionModel.clear();
    }
  }
  return mouseHitInfo !== null;
}

const connectTransitionSrc = 1,
      connectTransitionDst = 2,
      moveSelection = 3,
      moveCopySelection = 4,
      resizeState = 5;

Editor.prototype.onBeginDrag = function(p0) {
  const mouseHitInfo = this.mouseHitInfo,
        canvasController = this.canvasController;
  if (!mouseHitInfo)
    return false;
  const model = this.model,
        editingModel = model.editingModel,
        selectionModel = model.selectionModel,
        dragItem = mouseHitInfo.item;
  let drag, newTransition;
  if (mouseHitInfo.arrow) {
    const stateId = model.dataModel.getId(dragItem),
          cp0 = canvasController.viewToCanvas(p0);
    // Start the new transition as connecting the src state to itself.
    newTransition = {
      type: 'transition',
      srcId: stateId,
      t1: 0,
      [_p2]: cp0,
    };
    drag = {
      type: connectTransitionDst,
      name: 'Add new transition',
      newItem: true,
    };
  } else {
    switch (dragItem.type) {
      case 'state':
      case 'start':
        if (mouseHitInfo.moveCopy) {
          drag = { type: moveCopySelection, name: 'Move copy of selection', newItem: true };
        } else {
          if (dragItem.type === 'state' && mouseHitInfo.border) {
            drag = { type: resizeState, name: 'Resize state' };
          } else {
            drag = { type: moveSelection, name: 'Move selection' };
          }
        }
        break;
      case 'transition':
        if (mouseHitInfo.p1)
          drag = { type: connectTransitionSrc, name: 'Edit transition' };
        else if (mouseHitInfo.p2)
          drag = { type: connectTransitionDst, name: 'Edit transition' };
        break;
    }
  }

  this.drag = drag;
  if (drag) {
    if (drag.type === moveSelection || drag.type === moveCopySelection) {
      editingModel.reduceSelection();
      // let items = selectionModel.contents();
      // drag.isSingleElement = items.length === 1 && isState(items[0]);
    }
    model.transactionModel.beginTransaction(drag.name);
    if (newTransition) {
      drag.item = newTransition;
      editingModel.newItem(newTransition);
      editingModel.addItem(newTransition, this.statechart);
      selectionModel.set(newTransition);
    } else {
      drag.item = dragItem;
      if (mouseHitInfo.moveCopy) {
        const map = new Map(),
              copies = editingModel.copyItems(selectionModel.contents(), map);
        editingModel.addItems(copies);
        selectionModel.set(copies);
      }
    }
  }
}

Editor.prototype.onDrag = function(p0, p) {
  const drag = this.drag;
  if (!drag)
    return;
  const dragItem = drag.item,
        model = this.model,
        dataModel = model.dataModel,
        observableModel = model.observableModel,
        transactionModel = model.transactionModel,
        referencingModel = model.referencingModel,
        selectionModel = model.selectionModel,
        layoutModel = model.layoutModel,
        renderer = this.renderer,
        canvasController = this.canvasController,
        cp0 = canvasController.viewToCanvas(p0),
        cp = canvasController.viewToCanvas(p),
        dx = cp.x - cp0.x, dy = cp.y - cp0.y,
        mouseHitInfo = this.mouseHitInfo,
        snapshot = transactionModel.getSnapshot(dragItem),
        hitList = this.hitTest(p);
  let hitInfo;
  switch (drag.type) {
    case moveCopySelection:
    case moveSelection:
      hitInfo = this.getFirstHit(hitList, isContainerTarget);
      selectionModel.forEach(function(item) {
        const snapshot = transactionModel.getSnapshot(item);
        if (snapshot && isContainable(item)) {
          observableModel.changeValue(item, 'x', snapshot.x + dx);
          observableModel.changeValue(item, 'y', snapshot.y + dy);
        }
      });
      break;
    case resizeState:
      if (mouseHitInfo.left) {
        observableModel.changeValue(dragItem, 'x', snapshot.x + dx);
        observableModel.changeValue(dragItem, 'width', snapshot.width - dx);
      }
      if (mouseHitInfo.top) {
        observableModel.changeValue(dragItem, 'y', snapshot.y + dy);
        observableModel.changeValue(dragItem, 'height', snapshot.height - dy);
      }
      if (mouseHitInfo.right)
        observableModel.changeValue(dragItem, 'width', snapshot.width + dx);
      if (mouseHitInfo.bottom)
        observableModel.changeValue(dragItem, 'height', snapshot.height + dy);
      break;
    case connectTransitionSrc:
      hitInfo = this.getFirstHit(hitList, isStateBorder);
      const srcId = hitInfo ? dataModel.getId(hitInfo.item) : 0;  // 0 is invalid id
      observableModel.changeValue(dragItem, 'srcId', srcId);
      const src = getTransitionSrc(dragItem);
      if (src) {
        const t1 = layoutModel.statePointToParam(src, cp);
        observableModel.changeValue(dragItem, 't1', t1);
      } else {
        dragItem[_p1] = cp;
      }
      break;
    case connectTransitionDst:
      // Adjust position on src state to track the new transition.
      if (drag.newItem) {
        const src = referencingModel.getReference(dragItem, 'srcId');
        observableModel.changeValue(dragItem, 't1', layoutModel.statePointToParam(src, cp));
      }
      hitInfo = this.getFirstHit(hitList, isStateBorder);
      const dstId = hitInfo ? dataModel.getId(hitInfo.item) : 0;  // 0 is invalid id
      observableModel.changeValue(dragItem, 'dstId', dstId);
      const dst = getTransitionDst(dragItem);
      if (dst) {
        const t2 = layoutModel.statePointToParam(dst, cp);
        observableModel.changeValue(dragItem, 't2', t2);
      } else {
        dragItem[_p2] = cp;
      }
      break;
  }

  this.hotTrackInfo = (hitInfo && hitInfo.item !== this.statechart) ? hitInfo : null;
}

Editor.prototype.onEndDrag = function(p) {
  const drag = this.drag;
  if (!drag)
    return;
  let dragItem = drag.item;
  const model = this.model,
        statechart = this.statechart,
        observableModel = model.observableModel,
        hierarchicalModel = model.hierarchicalModel,
        selectionModel = model.selectionModel,
        transactionModel = model.transactionModel,
        editingModel = model.editingModel;
  if (isTransition(dragItem)) {
    dragItem[_p1] = dragItem[_p2] = undefined;
  } else if (drag.type === moveSelection || drag.type === moveCopySelection) {
    // Find state beneath mouse.
    const hitList = this.hitTest(p),
          hitInfo = this.getFirstHit(hitList, isContainerTarget),
          parent = hitInfo ? hitInfo.item : statechart;
    // Reparent items.
    selectionModel.forEach(function(item) {
      if (isContainable(item)) {
        editingModel.addItem(item, parent);
      }
    });
  }

  model.transactionModel.endTransaction();

  this.drag = null;
  this.mouseHitInfo = null;
  this.hotTrackInfo = null;
  this.mouseHitInfo = null;

  this.canvasController.draw();
}

Editor.prototype.onBeginHover = function(p) {
  const model = this.model,
        hitList = this.hitTest(p),
        hoverHitInfo = this.getFirstHit(hitList, isDraggable);
  if (!hoverHitInfo)
    return false;
  hoverHitInfo.p = p;
  this.hoverHitInfo = hoverHitInfo;
  return true;
}

Editor.prototype.onEndHover = function(p) {
  if (this.hoverHitInfo)
    this.hoverHitInfo = null;
}

Editor.prototype.onKeyDown = function(e) {
  const model = this.model,
        statechart = this.statechart,
        selectionModel = model.selectionModel,
        editingModel = model.editingModel,
        transactionHistory = model.transactionHistory,
        keyCode = e.keyCode,
        cmdKey = e.ctrlKey || e.metaKey,
        shiftKey = e.shiftKey;

  if (keyCode === 8) {  // 'delete'
    editingModel.doDelete();
    return true;
  }
  if (cmdKey) {
    switch (keyCode) {
      case 65:  // 'a'
        statechart.items.forEach(function(v) {
          selectionModel.add(v);
        });
        return true;
      case 90:  // 'z'
        if (transactionHistory.getUndo()) {
          selectionModel.clear();
          transactionHistory.undo();
          return true;
        }
        return false;
      case 89:  // 'y'
        if (transactionHistory.getRedo()) {
          selectionModel.clear();
          transactionHistory.redo();
          return true;
        }
        return false;
      case 88:  // 'x'
        editingModel.doCut();
        return true;
      case 67:  // 'c'
        editingModel.doCopy();
        return true;
      case 86:  // 'v'
        if (model.copyPasteModel.getScrap()) {
          editingModel.doPaste();
          return true;
        }
        return false;
      case 72:  // 'h'
        editingModel.doTogglePalette();
        return true;
      case 83:  // 's'
        var text = JSON.stringify(
          statechart,
          function(key, value) {
            if (key.toString().charAt(0) === '_')
              return;
            if (value === undefined || value === null)
              return;
            return value;
          },
          2);
        // Writes statechart as JSON to console.
        console.log(text);
        return true;
    }
  }
}

return {
  editingModel: editingModel,
  layoutModel: layoutModel,
  statechartModel: statechartModel,

  Editor: Editor,
};
})();


const statechart_data = {
  "type": "statechart",
  "id": 1001,
  "x": 0,
  "y": 0,
  "width": 0,
  "height": 0,
  "name": "Example",
  "items": [
  ]
}
