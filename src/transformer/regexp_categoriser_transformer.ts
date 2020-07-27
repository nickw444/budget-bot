import * as bunyan from 'bunyan';
import { Transaction } from 'source/source';
import { Transformer } from 'transformer/transformer';

type Rule = {
  pattern: string,
  debit?: boolean,
  credit?: boolean,
  account: string[] | string,
  category: string,
}

export type RegexpCategoriserTransformerConfig = {
  kind: 'regexp-categoriser',
  rules: readonly Rule[],
}

export class RegexpCategoriserTransformer implements Transformer {
  constructor(
      private readonly config: RegexpCategoriserTransformerConfig,
      private readonly log: bunyan,
  ) {
  }

  async transform(txns: readonly Transaction[]): Promise<readonly Transaction[]> {
    const resultTxns = [];
    for (const origTxn of txns) {
      const txn = { ...origTxn };
      for (const rule of this.config.rules) {
        const isAccount = typeof rule.account === 'string'
            ? rule.account == txn.accountId
            : rule.account.includes(txn.accountId);
        if (isAccount &&
            txn.memo?.match(rule.pattern) &&
            (!rule.debit || txn.outflow > 0) &&
            (!rule.credit || txn.inflow > 0)
        ) {
          txn.category = rule.category;
        }
      }
      resultTxns.push(txn);
    }
    return resultTxns;
  }
}
