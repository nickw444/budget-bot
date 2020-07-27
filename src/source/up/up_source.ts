import * as bunyan from 'bunyan';
import * as moment from 'moment';
import { Source, Transaction } from 'source/source';
import { GetTransactionsResponse, TransactionResource, UpApiClient } from './up_api_client';

export type UpSourceConfig = {
  kind: 'up',
  personalAccessToken: string,
  accounts: readonly string[],
}

export class UpSource implements Source {

  constructor(
      private readonly config: UpSourceConfig,
      private readonly log: bunyan,
      private readonly client: UpApiClient,
  ) {
  }

  static create(config: UpSourceConfig, log: bunyan) {
    const client = UpApiClient.create(config.personalAccessToken);
    return new UpSource(config, log, client);
  }

  async getTransactions(): Promise<readonly Transaction[]> {
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
        .filter(txn => this.config.accounts.includes(txn.relationships.account.data.id))
        .filter(txn => txn.attributes.status === 'SETTLED')
        .map((txn, index) => {
          const value = txn.attributes.amount.valueInBaseUnits / 100;
          return {
            index,
            date: moment(txn.attributes.settledAt).toDate(),
            inflow: value > 0 ? Math.abs(value) : 0,
            outflow: value < 0 ? Math.abs(value) : 0,
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
