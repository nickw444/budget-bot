export function flatten<T>(args: T[][]): T[] {
  return args.reduce((acc, curr) => acc.concat(curr), [] as T[]);
}
