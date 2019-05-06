# Diagrammar: Graphical Programming Environment

tl;dr Diagrammar is an experimental graphical programming environment. It follows the Data Flow model, with the ability to pass values and functions along graph edges. Since functions can be created and instantiated, more complex programs can be built. This introduction shows how Quicksort and some other classic algorithms can be built, and hopefully demonstrates the advantages of this approach.

## Data Flow programming review

Data flow diagrams are a graphical programming method where data processing elements, represented by graph nodes, are connected by edges that represent data transfer. The graph is like an electrical circuit, and the advantage is that data flow can more easily be visualized as a graph.

Most data flow systems model restricted domains, and have limited ability to represent abstractions. Diagrammar extends the data flow idea, allowing data and functions to flow along the graph edges.

## Building expressions and grouping

Circuit elements for built-in operations can be combined to form useful expressions. Input and Output pins are used to specify imports and exports, assign labels, and connect common imports.

In the diagram below, we are creating:

1. An increment-by-1 function.
2. A decrement-by-1 function.
3. A binary minimum out of the less-than relational operator and the trinary conditional operator.
4. A 4-ary addition operator by cascading binary addition operators
5. A function to evaluate a general quadratic polynomial at a given x.

<figure>
  <img src="/resources/basic_grouping.png"  alt="" title="Basic Grouping">
</figure>

Note that there is fan-out but no fan-in in the graph. There are no cycles allowed, so the graph is technically a directed acyclic graph (DAG). Each circuit element is conceptually a function and wires connect outputs of one function to inputs of another. Evaluation proceeds left-to-right, since inputs must be evaluated before producing outputs. The evaluation order of the graph is only partially ordered (by topologically sorting) so we have to take extra care when a specific sequential evaluation order is required.

After grouping, the new expressions can be used just like built-in functions.

<figure>
  <img src="/resources/basic_grouping2.png"  alt="" title="Basic Grouping (continued)">
</figure>

## Function Abstraction

This representation lacks expressive power. We have to rebuild these graphs every time we want to create a similar function, for example cascading multiplication or logical operations instead of addition. To make the graph representation more powerful, any function can be abstracted. This adds an input value, of the same type as the function, to indicate that the function operation is imported. This operation is called "opening" the function. This allows us to create a function that takes another function as input.

<figure>
  <img src="/resources/function_abstraction.png"  alt="" title="Function Abstraction">
</figure>

## Function Creation

Now we need a way to create functions that can be imported. The mechanism is function closure. Any function element can be closed, which creates a function output whose type is all disconnected inputs, and all outputs. This is exactly analogous to function closure in regular programming languages. In the diagram below, we can create an incrementing function by grouping as before, or by applying addition to a literal 1 value and closing to get a unary incrementing function.

<figure>
  <img src="/resources/function_creation.png"  alt="" title="Function Creation">
</figure>

Using closure, we can take our abstract 4-ary cascading function from before, and specialize it for addition. We combine it with an addition with no inputs which we close to get a binary output function. We connect it and add pins for the 4 inputs and 1 output.

<figure>
  <img src="/resources/function_creation3.png"  alt="" title="Function Creation (continued)">
</figure>

Function closing is a powerful graph simplification mechanism. Imagine we wanted to apply our quadratic polynomial evaluation function to one polynomial at 4 different x values. Using the grouped expression 4 times leads to a complex graph that is becoming unwieldy. Applying the function to the polynomial coefficients and closing gives a simple unary function that we can apply 4 times, which is easier to understand.

<figure>
  <img src="/resources/function_creation2.png"  alt="" title="Function Creation (continued)">
</figure>

## Iteration

Iteration can be challenging in a data flow system. Let's start with everyone's favorite toy example, the factorial function.

### Factorial

We can create most of this with simple operations, but we get stuck at the recursive part. We need to use the function that we're in the middle of creating. The solution is to provide a special proto-function operation. A part of the graph can be selected, and a proto-function element will be created that matches what would be created from the selection by the normal grouping operation. This proto-function element can then be used in the graph to represent recursion. This will also be our mechanism for iteration a little later on.

<figure>
  <img src="/resources/factorial.png"  alt="" title="Iteration with Factorials">
</figure>

### Fibonacci

Similarly, we can implement a Fibonacci function that returns the i'th number in the sequence with a slightly more complex recursion.

<figure>
  <img src="/resources/fibonacci.png"  alt="" title="Iteration with Fibonacci Numbers">
</figure>


### Generic iteration

Let's try a more typical iteration, equivalent to the following for loop in Javascript. Let's try to add the numbers in the range [0..n].

```js
    for (let i = 0; i < n; i++) ...
```

<figure>
  <img src="/resources/iteration.png"  alt="" title="Iteration to add numbers from i to n">
</figure>

It would be cumbersome to have to create this graph every time we wanted to iterate over a range of integers. But we can abstract the binary operation at the heart of this to create a generic iteration that is more useful.

<figure>
  <img src="/resources/iteration2.png"  alt="" title="Iteration to apply binary op to range">
</figure>

Using this more generic function, we can easily create a factorial function.

<figure>
  <img src="/resources/iteration3.png"  alt="" title="Iteration adapted to compute factorial">
</figure>

## State

Without state, we are limited to pure functional programming. One of our goals is to map directly to hardware, where we also have state. Let's introduce two new stateful functions, which allow us to "open up" values as objects or arrays.

1. On the left is the "object" function, which takes a value as input and returns two functions. The first is the "getter" which takes a key value as input and returns a value. The second is the "setter" which takes a key and value, updates that field of the object and returns the previous value.
2. On the right is the "array" function, which takes an object and returns the length, a "getter" function which takes an index and returns the value at that index, and a setter function which takes an index and value, updates the array at that index and returns the previous value.

<figure>
  <img src="/resources/state.png"  alt="" title="Stateful objects">
</figure>

State allows us to perform more complex computations. Let's sum the elements of an array. To do this, we need to define a binary function similar to the one we created to sum integers in a range. This time, the function will use the iteration index to access the array value at the ith position.

<figure>
  <img src="/resources/state_and_iteration.png"  alt="" title="Iteration over stateful object">
</figure>

In the top left, we apply the array getter, and pass it as the first operand of an addition. This can be grouped and closed to create a function import for our iteration. We only need to set the range to [0..n-1] and pass an initial value of 0.

## Quicksort

```js
function partition(a, i, j) {
  let p = a[i];
  while (1) {
    while (a[i] < p) i++;
    while (a[j] > p) j--;
    if (i >= j) return j;
    [a[i], a[j]] = [a[j], a[i]];
    i++; j--;
  }
}
function qsort(a, i, j) {
  if (i >= j) return;
  let k = partition(a, i, j);
  qsort(a, i, k);
  qsort(a, k + 1, j);
}
```

## Semantic Details

