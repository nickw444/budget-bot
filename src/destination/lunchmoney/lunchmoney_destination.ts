import { Destination } from 'destination/destination';
import * as bunyan from 'bunyan';
import { Transaction } from 'source/source';
import { LunchmoneyReaderWriter } from 'destination/lunchmoney/lunchmoney_reader_writer';

type AccountConfig = {
  accountId: string,
  accountName: string,
}

export type LunchmoneyDestinationConfig = {
  kind: 'lunchmoney',
  personalAccessToken: string;
}

export class LunchmoneyDestination implements Destination {
  constructor(
    private readonly config: LunchmoneyDestinationConfig,
    private readonly readerWriter: LunchmoneyReaderWriter,
    private readonly log: bunyan,
    private readonly dryrun: boolean,
  ) {
    readerWriter.loadTransactions().then(transactions => console.log(transactions));
  }

  static async create(config: LunchmoneyDestinationConfig, log: bunyan, dryrun: boolean) {
    return new LunchmoneyDestination(config, LunchmoneyReaderWriter.of(config), log, dryrun);
  }

  async writeTransactions(txns: readonly Transaction[]): Promise<void> {
    console.log(txns);
  }
}