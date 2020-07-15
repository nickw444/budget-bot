export const Preconditions = {
  checkExists<T>(v: T | null | undefined): T {
    if (v == null) {
      throw new Error('Expected value');
    }
    return v;
  },
};

export class UnreachableError extends Error {
  constructor(v: never) {
    super(`unhandled case: ${JSON.stringify(v)}`);
  }
}
