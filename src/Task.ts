/**
 * @fileOverview The basic unit of computation, corresponding to a node in a
 * directed acyclic graph.
 */

export interface IInputMap {
  [nodeId: string]: any;
}

export type InputKey<I extends IInputMap> = keyof I;

export abstract class Task<I extends IInputMap, O> {
  public static from<J extends IInputMap, P>(
    id: string,
    inputs: J,
    run: (inputs: J) => P | Promise<P>,
  ) {
    return new SimpleTask(id, Object.keys(inputs), run);
  }
  public abstract id: string;
  public abstract inputs: Array<InputKey<I>>;
  public abstract run: (inputs: I) => O | Promise<O>;
}

export class SimpleTask<I, O> extends Task<I, O> {
  constructor(
    public id: string,
    public inputs: Array<keyof I>,
    public run: (inputs: I) => O | Promise<O>,
  ) {
    super();
  }
}
