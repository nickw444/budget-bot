import { UnreachableError } from 'base/preconditions';
import * as bunyan from 'bunyan';
import { Transaction } from "source/source";
import {
  DateFilterTransformer,
  DateFilterTransformerConfig,
} from 'transformer/date_filter_transformer';
import {
  RegexpCategoriserTransformer,
  RegexpCategoriserTransformerConfig,
} from './regexp_categoriser_transformer';

export type TransformerConfig =
    | DateFilterTransformerConfig
    | CategoriserTransformerConfig
    | RegexpCategoriserTransformerConfig;

export interface Transformer {
  transform(txns: readonly Transaction[]): Promise<readonly Transaction[]>;
}

export const Transformer = {
  of(config: TransformerConfig, log: bunyan) {
    const childLogger = log.child({ transformer: config.kind });
    switch (config.kind) {
      case 'categoriser':
        return new CategoriserTransformer(config, childLogger);
      case 'regexp-categoriser':
        return new RegexpCategoriserTransformer(config, childLogger);
      case 'date-filter':
        return new DateFilterTransformer(config, childLogger);
      default:
        throw new UnreachableError(config);
    }
  },
};


export type CategoriserTransformerConfig = {
  kind: "categoriser",
  accounts: readonly string[],
  categories: readonly string[],
}

export class CategoriserTransformer implements Transformer {
  constructor(
      private readonly config: CategoriserTransformerConfig,
      private readonly log: bunyan,
  ) {
  }

  transform(txns: readonly Transaction[]): Promise<readonly Transaction[]> {
    return Promise.resolve(txns);
  }
}
