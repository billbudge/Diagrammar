---
title: 'Diagrammar: Drawing Programs'
author: '[Bill Budge](https://twitter.com/billb)'
avatars:
  - bill budge
date: 2019-05-03 13:33:37
---
tl;dr Diagrammar is an experimental graphical programming environment. It follows the Data Flow model, with the ability to pass values and functions along graph edges. Since functions can be created and instantiated, more complex programs can be built. This introduction shows how Quicksort and some other classic algorithms can be built, and hopefully demonstrates the advantages of this approach.

## Data Flow programming review

Data flow diagrams are a graphical programming method where data processing elements, represented by graph nodes, are connected by edges that represent data transfer. The graph is like an electrical circuit, and the advantage is that data flow can more easily be visualized as a graph.

Most data flow systems model restricted domains, and have limited ability to represent abstractions. Diagrammar extends the data flow idea, allowing data and functions to flow along the graph edges.

## Building expressions and grouping

TBD

<figure>
  <img src="/resources/basic_grouping.png"  alt="" title="Basic Grouping.">
</figure>

<figure>
  <img src="/resources/basic_grouping2.png"  alt="" title="Basic Grouping (continued).">
</figure>

## Function Abstraction

TBD

## Function Creation

TBD

## Iteration

### Factorial

TBD

### Fibonacci

### Generic iteration

```js
for (let i = 0; i < n; i++) ...
```

## State

TBD

