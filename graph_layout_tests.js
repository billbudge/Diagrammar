// Graph layout tests.

const graphLayoutTests = (function() {
'use strict';

function adjacenciesToGraph(adjacencies) {
  var index = 0;
  var graph = adjacencies.map(function(adj) {
    return { index: index++, adj: adj };
  });
  graph.forEach(function(v) {
    v.adj = v.adj.map(function(index) {
      return graph[index];
    })
  })
  return graph;
}

function graphToAdjacencies(graph) {
  var adjacencies = [];
  graph.forEach(function(v) {
    adjacencies.push(v.adj.map(function(v) {
      return v.index;
    }));
  });
  return adjacencies;
}

test("graphLayout getSCCs", function() {
  var graph =
    adjacenciesToGraph([ [4], [0], [1, 3], [2], [1], [1, 4, 6], [5, 2], [3, 6, 7] ]);
  var components = graphLayout.getSCCs(graph);
  deepEqual(components.length, 4);
  deepEqual(components[0].length, 3);
  deepEqual(components[1].length, 2);
  deepEqual(components[2].length, 2);
  deepEqual(components[3].length, 1);
});

test("graphLayout makeAcyclic", function() {
  var graph =
    adjacenciesToGraph([ [4], [0], [1, 3], [2], [1], [1, 4, 6], [5, 2], [3, 6, 7] ]);
  graphLayout.makeAcyclic(graph);
  graph = adjacenciesToGraph(graphToAdjacencies(graph));
  var components = graphLayout.getSCCs(graph);
  deepEqual(components.length, 8);
});

})();
