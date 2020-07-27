import { UnreachableError } from 'base/preconditions';
import * as bunyan from 'bunyan';
import {
  AspireBudgetDestinationConfig,
  AspireDestination,
} from 'destination/aspire/aspire_destination';
import * as moment from 'moment';
import { Transaction } from 'source/source';

/**
 * H(date, outflow, inflow, account name)
 */
export function hashKeyOf(txn: Transaction) {
  return [
    moment(txn.date).format('DD-MM-YY'),
    txn.accountId,
    `${txn.inflow}`,
    `${txn.outflow}`,
  ].join('+');
}

export type DestinationConfig =
    | AspireBudgetDestinationConfig;

export interface Destination {
  writeTransactions(txns: readonly Transaction[]): Promise<void>
}

export const Destinaton = {
  of(config: DestinationConfig, log: bunyan, dryrun: boolean) {
    const childLogger = log.child({ destination: config.kind });
    switch (config.kind) {
      case 'aspire-budget':
        return AspireDestination.create(config, childLogger, dryrun);
      default:
        throw new UnreachableError(config.kind);
    }
  },
};
