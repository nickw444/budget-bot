import { UnreachableError } from 'base/preconditions';
import {
  AspireDestination,
  AspireBudgetDestinationConfig,
} from 'destination/aspire/aspire_destination';
import { Transaction } from 'source/source';
import * as moment from 'moment';
import * as bunyan from 'bunyan';

/**
 * H(date, outflow, inflow, account name)
 */
export function hashKeyOf(txn: Transaction) {
  return [
    moment(txn.date).format("DD-MM-YY"),
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
