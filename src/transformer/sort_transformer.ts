import * as bunyan from 'bunyan';
import { Transaction } from 'source/source';
import { Transformer } from 'transformer/transformer';

const SUPPORTED_FIELDS = ['accountId', 'date', 'index'] as const;
type SupportedField = keyof Pick<Transaction, typeof SUPPORTED_FIELDS[number]>

export type SortTransformerConfig = {
  kind: "sort",
  sortBy: SupportedField[],
}

export class SortTransformer implements Transformer {
  constructor(
      private readonly config: SortTransformerConfig,
      private readonly log: bunyan,
  ) {
    config.sortBy.forEach(field => {
      if (!SUPPORTED_FIELDS.includes(field)) {
        throw new Error(`Field ${field} cannot be used for sorting`);
      }
    });
  }

  private static compare(tx1: Transaction, tx2: Transaction, key: SupportedField) {
    const v1 = tx1[key];
    const v2 = tx2[key];

    if (typeof v1 === 'string' && typeof v2 === 'string') {
      return v1.localeCompare(v2);
    } else if (typeof v1 === 'number' && typeof v2 === 'number') {
      return v1 - v2;
    } else if (v1 instanceof Date && v2 instanceof Date) {
      return v1.getTime() - v2.getTime();
    } else {
      throw new Error(`Unknown comparison for ${typeof v1} and ${typeof v2}`)
    }
  }

  private readonly comparator = (tx1: Transaction, tx2: Transaction) => {
    for (const key of this.config.sortBy) {
      const result = SortTransformer.compare(tx1, tx2, key);
      if (result != 0) {
        return result;
      }
    }
    return 0;
  };

  async transform(txns: readonly Transaction[]): Promise<readonly Transaction[]> {
    return [...txns].sort(this.comparator);
  }
}
