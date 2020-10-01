export namespace bb {
  export interface Plugin<T, U> {
    exec: (input: T) => Promise<U> | U;
  }

  type PluginLike<T, U> =
      | Pipeline<T, unknown, U>
      | Plugin<T, U>
      | ((u: T) => (U | Promise<U>))

  function executorOf<T, U>(pluginLike: PluginLike<T, U>): (input: T) => Promise<U> | U {
    if (pluginLike instanceof Pipeline) {
      return (input) => pluginLike.exec(input);
    } else if (typeof pluginLike === 'function') {
      return pluginLike;
    } else if (pluginLike.exec != null) {
      return (input) => pluginLike.exec(input);
    } else {
      throw new Error();
    }
  }

  class Pipeline<RootInput, StepInput, Output> {
    private next: Pipeline<unknown, Output, unknown> | undefined = undefined;

    constructor(
        private readonly executor: (t: StepInput) => Output | Promise<Output>,
        private readonly root: Pipeline<RootInput, RootInput, unknown> | undefined,
    ) {
    }

    step<NextOutput>(pluginLike: PluginLike<Output, NextOutput>): Pipeline<RootInput, Output, NextOutput> {
      if (this.next != null) {
        throw new Error('.step already called. Use bb.all to fork pipelines');
      }

      const executor = executorOf(pluginLike);
      const root = this.root || (this as Pipeline<RootInput, unknown, unknown>);
      return this.next = new Pipeline(executor, root);
    }

    exec(v: RootInput): Promise<Output> {
      const root = this.root || this as Pipeline<RootInput, unknown, Output>;
      return root.applyChain(v) as Promise<Output>;
    }

    private async applyChain(input: StepInput): Promise<unknown> {
      const result = await this.executor(input);
      return this.next != null
          ? this.next.applyChain(result)
          : result;
    }
  }

  export function pipe<U, T = void>(plugin: PluginLike<T, U>): Pipeline<T, T, U> {
    return new Pipeline(executorOf(plugin), undefined);
  }

  export function all<T, U1>(
      p1: PluginLike<T, U1>,
  ): (input: T) => Promise<[U1]>;
  export function all<T, U1, U2>(
      p1: PluginLike<T, U1>,
      p2: PluginLike<T, U2>,
  ): (input: T) => Promise<[U1, U2]>;
  export function all<T, U1, U2, U3>(
      p1: PluginLike<T, U1>,
      p2: PluginLike<T, U2>,
      p3: PluginLike<T, U3>,
  ): (input: T) => Promise<[U1, U2, U3]>;
  export function all<T, U1, U2, U3, U4>(
      p1: PluginLike<T, U1>,
      p2: PluginLike<T, U2>,
      p3: PluginLike<T, U3>,
      p4: PluginLike<T, U4>,
  ): (input: T) => Promise<[U1, U2, U3, U4]>;
  export function all<T, U1, U2, U3, U4, U5>(
      p1: PluginLike<T, U1>,
      p2: PluginLike<T, U2>,
      p3: PluginLike<T, U3>,
      p4: PluginLike<T, U4>,
      p5: PluginLike<T, U5>,
  ): (input: T) => Promise<[U1, U2, U3, U4, U5]>;
  export function all<T, U>(
      ...plugins: PluginLike<T, U>[]
  ): (input: T) => Promise<U[]> {
    const executors = plugins.map(p => executorOf(p));
    return (input: T) => Promise.all(
        executors.map(executor => executor(input)),
    );
  }

  export function allSeq<T, U1>(
      p1: PluginLike<T, U1>,
  ): (input: T) => Promise<[U1]>;
  export function allSeq<T, U1, U2>(
      p1: PluginLike<T, U1>,
      p2: PluginLike<T, U2>,
  ): (input: T) => Promise<[U1, U2]>;
  export function allSeq<T, U1, U2, U3>(
      p1: PluginLike<T, U1>,
      p2: PluginLike<T, U2>,
      p3: PluginLike<T, U3>,
  ): (input: T) => Promise<[U1, U2, U3]>;
  export function allSeq<T, U1, U2, U3, U4>(
      p1: PluginLike<T, U1>,
      p2: PluginLike<T, U2>,
      p3: PluginLike<T, U3>,
      p4: PluginLike<T, U4>,
  ): (input: T) => Promise<[U1, U2, U3, U4]>;
  export function allSeq<T, U1, U2, U3, U4, U5>(
      p1: PluginLike<T, U1>,
      p2: PluginLike<T, U2>,
      p3: PluginLike<T, U3>,
      p4: PluginLike<T, U4>,
      p5: PluginLike<T, U5>,
  ): (input: T) => Promise<[U1, U2, U3, U4, U5]>;
  export function allSeq<T, U>(
      ...plugins: PluginLike<T, U>[]
  ): (input: T) => Promise<U[]> {
    const executors = plugins.map(p => executorOf(p));
    return async (input: T) => {
      const result: U[] = [];
      for (const executor of executors) {
        result.push(await executor(input));
      }
      return result;
    };
  }
}
