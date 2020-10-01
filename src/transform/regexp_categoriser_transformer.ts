import { bb } from '../lib/bb';

type Rule<T> = {
  pattern: string | RegExp,
  category: string,
  match: (t: T) => boolean,
}

type Categorised<T> = T & ({ category: string | undefined })

export class RegexpCategoriserTransformer<T extends { memo: string | undefined }> implements bb.Plugin<T[], Categorised<T>[]> {
  constructor(
      private readonly rules: readonly Rule<T>[],
  ) {
  }

  async exec(txns: T[]): Promise<Categorised<T>[]> {
    const resultTxns = [] as Categorised<T>[];
    for (const txn of txns) {
      for (const rule of this.rules) {
        const isMatch = rule.match(txn);
        if (isMatch && txn.memo?.match(rule.pattern)) {
          resultTxns.push({
            ...txn,
            category: rule.category,
          });
          break;
        }
      }
    }
    return resultTxns;
  }
}


export namespace Match {
  export function isDebit<T>() {
    return (txn: T & { debit: number }) => txn.debit > 0;
  }

  export function isCredit<T>() {
    return (txn: T & { credit: number }) => txn.credit > 0;
  }

  export function isAccount<T>(acc: string | string[]) {
    return (txn: T & { accountId: string }) => {
      return Array.isArray(acc)
          ? acc.includes(txn.accountId)
          : acc === txn.accountId;
    };
  }

  export function all<T>(...pred: ((t: T) => boolean)[]) {
    return (txn: T) => pred.every(p => p(txn));
  }
}
