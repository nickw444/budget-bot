import { bb } from '../lib/bb';


export class SortTransformer<T extends Record<string, unknown>> implements bb.Plugin<T[], T[]> {
  constructor(
      private readonly sortBy: (keyof T)[],
  ) {
  }

  private compare(t1: T, t2: T, key: keyof T) {
    const v1 = t1[key] as unknown;
    const v2 = t2[key] as unknown;

    if (typeof v1 === 'string' && typeof v2 === 'string') {
      return v1.localeCompare(v2);
    } else if (typeof v1 === 'number' && typeof v2 === 'number') {
      return v1 - v2;
    } else if (v1 instanceof Date && v2 instanceof Date) {
      return v1.getTime() - v2.getTime();
    } else {
      throw new Error(`Unknown comparison for ${typeof v1} and ${typeof v2}`);
    }
  }

  private readonly comparator = (t1: T, t2: T) => {
    for (const key of this.sortBy) {
      const result = this.compare(t1, t2, key);
      if (result != 0) {
        return result;
      }
    }
    return 0;
  };

  async exec(txns: T[]): Promise<T[]> {
    return [...txns].sort(this.comparator);
  }
}
