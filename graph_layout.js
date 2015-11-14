// Graph layout module.

'use strict';

var graphLayout = (function() {
  // graph format is:
  // var graph = [
  //   {
  //     adj: [ obj-ref-vert0, obj-ref-vert1, ... ],
  //   }
  // ],

  // Tarjan's strongly connected component algorithm. Adapted from Wikipedia:
  // http://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
  function getSCCs(graph) {
    var index = 0;
    var stack = [];
    var components = [];

    function connect(v) {
      v._index = index;
      v._lowLink = index;
      index++;
      stack.push(v);
      v._onStack = true;
      v.adj.forEach(function(w) {
        if (w._index === undefined) {
          // w has not yet been visited; recurse on it.
          connect(w);
          v._lowLink = Math.min(v._lowLink, w._lowLink);
        } else if (w._onStack) {
          // w is in stack S and hence in the current SCC.
          v._lowLink = Math.min(v._lowLink, w._index)
        }
      });
      // If v is a root node, pop the stack and generate an SCC.
      if (v._lowLink == v._index) {
        var component = [];
        do {
          var w = stack.pop();
          w._onStack = false;
          component.push(w);
        } while (w !== v);
// if (component.length > 1) {
// var labels = component.map(function(v) { return v.label; });
// console.log(labels);
// }
        components.push(component);
      }
    }

    graph.forEach(function(v) {
      if (v._index === undefined)
        connect(v);
    });
    return components;
  }

  function makeAcyclic(graph) {
    function traverse(v) {
      if (v._marked)
        return;
      v._marked = true;
      v._onStack = true;
      var node = v._adjList.front;
      while (node) {
        var next = node.next;
        var w = node.value;
        if (w._onStack) {
          // Reverse edge by removing from v's list and adding it to w's list,
          // unless it would duplicate an existing edge.
          v._adjList.remove(node);
          var dup = false;
          w._adjList.forEach(function(x) {
            if (v === x)
              dup = true;
          });
          if (!dup)
            w._adjList.pushBack(v);
        } else {
          if (!w._marked)
            traverse(w);
        }
        node = next;
      }
      v._onStack = false;
    }

    // Create adjacency lists from arrays.
    graph.forEach(function(v) {
      v._adjList = new diagrammar.collections.LinkedList();
      v.adj.forEach(function(w) {
        v._adjList.pushBack(w);
      });
    });
    // Get strongly connected components, in topologically sorted order.
    var components = getSCCs(graph);
    // Reverse edges to make each SCC acyclic.
    components.forEach(function(component) {
      component.forEach(function(v) { v._marked = false; });
      component.forEach(traverse);
    });
    // Convert adjacency lists back to arrays.
    graph.forEach(function(v) {
      v.adj = [];
      v._adjList.forEach(function(w) {
        v.adj.push(w);
      });
    });

    return graph;
  }

  function rankVertices(graph) {
    var queue = new diagrammar.collections.LinkedList();
    graph.forEach(function(v) {
      v._rank = 0;
      queue.pushBack(v);
      v._onQueue = 1;
    });
    var rankLen = queue.length;
    var rank = 0;
    while (queue.length) {
      var v = queue.popFront().value;
      v._onQueue--;
      v._rank = rank;
      v.adj.forEach(function(v) {
        queue.pushBack(v);
        v._onQueue++;
      });
      rankLen--;
      if (!rankLen) {
        rankLen = queue.length;
        rank++;
      }
    }
    var ranking = [];
    graph.forEach(function(v) {
      var rank = v._rank;
      if (!ranking[rank])
        ranking[rank] = [];
      ranking[rank].push(v);
    });
    // console.log(ranking);
    return ranking;
  }

  function alignVertices(graph, ranking) {
    graph.forEach(function(v) { v._x = 0; });
    if (!ranking)
      ranking = rankVertices(graph);
    ranking.forEach(function(rank) {
      var column = 0;
      rank.forEach(function(v) {
        var x = column++;
        var adjInverted = v.adjInverted;
        if (adjInverted.length) {
          adjInverted.forEach(function(w) {
            x += w._x;
          });
          v._x = x / adjInverted.length;
        }
      });
    });
    ranking.forEach(function(rank) {
      rank.sort(function(a, b) {
        if (a._x < b._x)
          return -1;
        else if (a._x > b._x)
          return 1;
        else
          return 0;
      });
    });
    return ranking;
  }

  return {
    getSCCs: getSCCs,
    makeAcyclic: makeAcyclic,
    rankVertices: rankVertices,
    alignVertices: alignVertices,
  }
})();
