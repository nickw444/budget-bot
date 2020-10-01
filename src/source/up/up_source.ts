import * as bunyan from 'bunyan';
import { DateTime } from 'luxon';
import { bb } from '../../lib/bb';
import { Transaction } from '../source';
import { GetTransactionsResponse, TransactionResource, UpApiClient } from './up_api_client';

export class UpSource implements bb.Plugin<void, Transaction[]> {
  constructor(
      private readonly accounts: readonly string[],
      private readonly log: bunyan,
      private readonly client: UpApiClient,
  ) {
  }

  static create(
      personalAccessToken: string,
      accounts: readonly string[],
      log: bunyan,
  ): UpSource {
    const client = UpApiClient.create(personalAccessToken);
    return new UpSource(accounts, log, client);
  }

  async exec(): Promise<Transaction[]> {
    const transactions: TransactionResource[] = [];
    let continuationToken: string | undefined = undefined;
    do {
      const resp: GetTransactionsResponse = await this.client.getTransactions({
        pageSize: 100,
        continuationToken,
      });
      continuationToken = resp.links.next;
      transactions.push(...resp.data);
    } while (continuationToken != null);

    return transactions
        .reverse()
        .filter(txn => this.accounts.includes(txn.relationships.account.data.id))
        .filter(txn => txn.attributes.status === 'SETTLED')
        .map((txn, index) => {
          const value = txn.attributes.amount.valueInBaseUnits / 100;
          return {
            index,
            date: DateTime.fromISO(txn.attributes.settledAt).toJSDate(),
            credit: value > 0 ? Math.abs(value) : 0,
            debit: value < 0 ? Math.abs(value) : 0,
            memo: [txn.attributes.message, txn.attributes.description, txn.attributes.rawText]
                .map(x => x?.trim())
                .filter(x => x != null && x.length > 0)
                .join(' – '),
            category: undefined,
            accountId: txn.relationships.account.data.id,
          };
        });
  }
}
