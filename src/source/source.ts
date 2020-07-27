import { UnreachableError } from 'base/preconditions';
import * as bunyan from 'bunyan';
import { IngSource, IngSourceConfig } from 'source/ing/ing_source';
import { UpSource, UpSourceConfig } from 'source/up/up_source';

export type Transaction = {
  index: number;
  date: Date;
  inflow: number;
  outflow: number;
  memo: string | undefined;
  category: string | undefined;
  accountId: string;
}

export type SourceConfig =
    | IngSourceConfig
    | UpSourceConfig;

export interface Source {
  getTransactions(): Promise<readonly Transaction[]>;
}

export const Source = {
  of(config: SourceConfig, log: bunyan, useCachedData: boolean) {
    const childLogger = log.child({ source: config.kind });
    switch (config.kind) {
      case 'ing':
        return new IngSource(config, childLogger, useCachedData);
      case 'up':
        return UpSource.create(config, childLogger);
      default:
        throw new UnreachableError(config);
    }
  },
};
