import { Preconditions } from 'base/preconditions';
import * as bunyan from 'bunyan';
import { AspireReaderWriter, AspireTransaction } from 'destination/aspire/aspire_reader_writer';
import { Destination, hashKeyOf } from 'destination/destination';
import * as fs from 'fs';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { Transaction } from 'source/source';


type AccountConfig = {
  accountId: string,
  accountName: string,
}

export type AspireBudgetDestinationConfig = {
  kind: 'aspire-budget',
  credentials: string,
  spreadsheetId: string,
  accounts: readonly AccountConfig[],
}

export class AspireDestination implements Destination {
  private readonly nameOfAccountId: Map<string, string>;
  private readonly accountIdOfName: Map<string, string>;

  constructor(
      private readonly config: AspireBudgetDestinationConfig,
      private readonly readerWriter: AspireReaderWriter,
      private readonly log: bunyan,
      private readonly dryrun: boolean,
  ) {
    this.nameOfAccountId = new Map(config.accounts.map(accountConfig =>
        [accountConfig.accountId, accountConfig.accountName]));
    this.accountIdOfName = new Map(config.accounts.map(accountConfig =>
        [accountConfig.accountName, accountConfig.accountId]));
  }

  static async create(config: AspireBudgetDestinationConfig, log: bunyan, dryrun: boolean) {
    const doc = new GoogleSpreadsheet(config.spreadsheetId);
    const creds = JSON.parse(fs.readFileSync(config.credentials, { encoding: 'utf-8' }));
    await doc.useServiceAccountAuth(creds);
    const readerWriter = await AspireReaderWriter.of(doc);
    return new AspireDestination(config, readerWriter, log, dryrun);
  }

  private txnOfAspireTxn(aspireTxn: AspireTransaction): Transaction {
    return {
      ...aspireTxn,
      index: 0,
      accountId: this.accountIdOfName.get(aspireTxn.accountName) || 'unknown-account',
    };
  }

  private aspireTxnOfTxn(txn: Transaction): AspireTransaction {
    return {
      ...txn,
      status: undefined,
      category: txn.category,
      accountName: Preconditions.checkExists(this.nameOfAccountId.get(txn.accountId)),
    };
  }

  async writeTransactions(txns: readonly Transaction[]): Promise<void> {
    const existingTxns = this.readerWriter.loadTransactions();
    const existingTxnsMap = new Map(existingTxns.map(txn => [hashKeyOf(this.txnOfAspireTxn(txn)),
      txn]));

    const newTxns = txns.filter(txn => !existingTxnsMap.has(hashKeyOf(txn)))
        .filter(txn => this.nameOfAccountId.has(txn.accountId))
        .map(txn => this.aspireTxnOfTxn(txn))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    this.log.debug('Writing transactions not found in spreadsheet: ', { newTxns });
    if (!this.dryrun) {
      await this.readerWriter.writeTransactions(newTxns);
      await this.readerWriter.commit();
    }

    // TODO(NW): Re-write existing transaction rows with updated data (i.e category matches)
  }
}
