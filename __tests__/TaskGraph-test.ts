import { IInputMap, Task } from "../src/Task";
import { INodeManifest, MissingNodeError, TaskGraph } from "../src/TaskGraph";

type SimpleGraph = {
  MakeNums: Task<{}, number[]>;
  Nums2Str: Task<{MakeNums: number[]}, string[]>;
};

type ComplexGraph = {
  MakeNums1: Task<{}, number[]>;
  MakeNums2: Task<{}, number[]>;
  ConcatNums: Task<{MakeNums1: number[], MakeNums2: number[]}, number[]>;
  DoubleNums: Task<{MakeNums2: number[]}, number[]>;
  ReduceNums: Task<{DoubleNums: number[], ConcatNums: number[]}, number>;
};

describe("TaskGraph", () => {

  it("should support typed node addition and retrieval.", () => {
    // A typed graph only allows addition of nodes whose IDs are in the
    // INodeManifest type argument. This is a compile-time convenience for task
    // authors.
    const g = new TaskGraph<SimpleGraph>();
    g.addNode("MakeNums", Task.from("MyOwnId", {}, () => [1, 2, 3]));
    const t2 = g.getNode("MakeNums");
  });

  it("should throw MissingNodeError if an unadded Task is requested.", () => {
    // Currently, type-checking does not go so far as to prevent attempts at
    // retrieving unadded nodes.
    const g = new TaskGraph<SimpleGraph>();
    expect(() => g.getNode("Nums2Str")).toThrowError(MissingNodeError);
  });

  describe('getNodeOutput()', () => {
    it('should run task graphs.', (done) => {
      const g = new TaskGraph<ComplexGraph>();
      g.addNode('MakeNums1', Task.from('a', {}, () => [1, 2, 3]));
      g.addNode('MakeNums2', Task.from('b', {}, () => [3, 4, 5]));
      g.addNode('ConcatNums', Task.from(
        'c',
        {MakeNums1: [123], MakeNums2: [123]},
        ({MakeNums1, MakeNums2}) => MakeNums1.concat(MakeNums2),
      ));
      g.addNode('DoubleNums', Task.from(
        'd',
        {MakeNums2: [123]},
        ({MakeNums2}) => MakeNums2.map(n => 2 * n),
      ));
      g.addNode('ReduceNums', Task.from(
        'e',
        {DoubleNums: [123], ConcatNums: [123]},
        ({DoubleNums, ConcatNums}) => DoubleNums.concat(ConcatNums)
                                                .reduce((a, b) => a + b),
      ));
      g.getNodeOutput('ReduceNums').then(result => {
        // A = (1, 2, 3), B = (3, 4, 5), C = A.B, D = 2*B, E = SUM(...C, ...D)
        expect(result).toBe(42);
        done();
      });
    });
  });
});
