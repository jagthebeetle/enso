/**
 * @fileOverview The injection framework that composes nodes together on the
 * basis of their dependencies.
 */
import { IInputMap, InputKey, Task } from "./Task";

export interface INodeManifest {
  [nodeId: string]: Task<any, any>;
}

type ResultsMap<M extends INodeManifest> = { [K in keyof M]?: Promise<any> };

export class BaseTaskGraphError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class MissingNodeError extends BaseTaskGraphError {
  constructor(nodeId: string) {
    super(`Requested node ${nodeId} not found in graph.`);
  }
}

export class TaskGraph<M extends INodeManifest> {
  public results: ResultsMap<M> = {};
  constructor(public nodes: Partial<M> = {}) {}

  public addNode<I extends IInputMap, O, K extends keyof M>(
    id: K,
    node: Task<I, O> & M[K],
  ) {
    this.nodes[id] = node;
  }

  public getNode<K extends keyof M>(nodeId: K): M[K] {
    const task = this.nodes[nodeId];
    if (task) {
      return task;
    } else {
      throw new MissingNodeError(nodeId);
    }
  }

  /**
   * Memoizes and returns the result of computing a task graph up to a
   * particular node (that is, the evaluation of a node and its transitive
   * inputs). This result is returned as a promise. Failure may occur while:
   * evaluating this node, fetching an input node, or evaluating an input node.
   * TODO: Cycle detection should fix another class of invalid graph problems.
   * @param nodeId The node to evaluate fully.
   */
  public getNodeOutput<I, O, K extends keyof M>(nodeId: K): Promise<O> {
    if (!this.results[nodeId]) {
      this.results[nodeId] = this.runNode<I, O, K>(nodeId);
    }
    return this.results[nodeId] as Promise<O>;
  }

  /**
   * Returns an array of promises wrapping each input for a given node. These
   * are returned in the same order as the node's `inputs` field. If any node
   * providing an input cannot be found, a rejection will be placed into the
   * corresponding slot.
   * @param nodeId The node for which to get inputs.
   */
  public getNodeInputs<K extends keyof M>(nodeId: K) {
    const task = this.getNode(nodeId);
    return task.inputs.map(inputId => {
      if (this.nodes[inputId]) {
        return this.getNodeOutput(inputId);
      } else {
        return Promise.reject(new MissingNodeError(inputId));
      }
    });
  }

  private runNode<I extends IInputMap, O, K extends keyof M>(
    nodeId: K,
  ): Promise<O> {
    const nodeInputs = this.getNodeInputs(nodeId);
    return Promise.all(nodeInputs)
      .then(inputs => {
        const inputsMap = this.prepareInputs<I, K>(nodeId, inputs);
        return this.getNode(nodeId).run(inputsMap);
      });
    // TODO: Handle failure (due to .run() error or MissingNodeError).
  }

  private prepareInputs<I extends IInputMap, K extends keyof M>(
    nodeId: K,
    outputs: any[],
  ): I {
    const inputsMap: Partial<I> = {};
    const inputKeys = this.getNode(nodeId).inputs;
    for (let i = 0; i < inputKeys.length; ++i) {
      inputsMap[inputKeys[i]] = outputs[i];
    }
    return inputsMap as I;
  }
}
