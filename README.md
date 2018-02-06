# 🐍 enso
Compose and run task graphs. In part, this is a study in Typescript's type-checking.

## Results
### `type` can be preferable to `interface`
Consider a graph parameterized by a manifest of the nodes it can contain:

```typescript
interface BasicNodeManifest {
  [nodeId: string]: Task<anyInput, anyOutput>;
}

class Graph<M extends BasicNodeManifest> {
  addNode<K extends keyof M>(nodeId: K, node: M[K]) {...}
}
```

A graph parameterized with the `BasicNodeManifest` will accept nodes with any (string) ID, as the type argument does not constrain `keyof M`.

If we wanted to constrain the acceptable node IDs, we might try writing a manifest like

```typescript
interface StricterManifest extends BasicNodeManifest {
  onlyThisNode: Task<SomeFoo, SomeBar>;
  andThatNode: Task<SomeBaz, SomeQuux>;
}
```

Unfortunately, `StricterManifest` would not actually constrain our valid node IDs, since it inherits the index signature from `BasicNodeManifest`. Moreover, we couldn't remove the supertype, because then TypeScript would complain that `StricterManifest` is missing an index signature.

We have a nifty escape hatch, however: currently, TypeScript exempts type aliases from the need to declare index signatures in this scenario ([*cf.* this issue](https://github.com/Microsoft/TypeScript/issues/15300)):

```typescript
type StrictestManifest = {
  onlyThisNode: Task<SomeFoo, SomeBar>;
  andThatNode: Task<SomeBaz, SomeQuux>;
}
const g: Graph<StrictestManifest> = new Graph(); // `g` only wants specific node IDs!
g.addNode('SomeRandomNode', node); // Error: Argument of type '"SomeRandomNode"' is not assignable...
```

Of course, in the event of a graph whose nodes will only be known at runtime, we can fall back to the `BasicNodeManifest` without losing our ability to compile code.

```typescript
const g = new Graph();
g.addNode('SomeRandomNode', node);
```

### Intersection types
`addNode` could be taken a step further with some functional magic. By making the method construct a new graph, parameterized with the union of the current graph's node manifest and a new node manifest, we would get some pleasantly pure and functional powers:

```typescript
class Graph<M extends {}> {
  constructor(public nodes: M) { }
  addNode<K extends string, I, O>(
    id: K, node: Task<I, O>
  ) {
    const nodes = Object.assign({ [id]: node }, this.nodes);
    const g = new Graph(
      nodes as M & {[P in K]: Task<I, O>}
    );
    return g;
  }
}

const g = new Graph({});
// g.getNode('foo') // Error! Typescript knows this doesn't exist on g.
const g1 = g.addNode('foo', someTask as Task<number, string>);
g1.getNode('foo'); // Typescript knows this is a Task<number, string>!
```
