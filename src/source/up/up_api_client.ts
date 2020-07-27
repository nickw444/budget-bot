import axios, { AxiosInstance } from 'axios';

export type AccountType = 'SAVER' | 'TRANSACTIONAL';

export type TransactionStatus = 'HELD' | 'SETTLED';

export type MoneyObject = {
  currencyCode: string,
  value: string,
  valueInBaseUnits: number,
}

export type AccountResource = {
  id: string,
  type: 'accounts',
  attributes: {
    displayName: string,
    accountType: AccountType,
    balance: MoneyObject,
    createdAt: string,
  },
  links: {
    self: string,
  }
}

export type TransactionResource = {
  id: string,
  type: 'transactions',
  attributes: {
    status: TransactionStatus,
    rawText?: string,
    description: string,
    message?: string,
    holdInfo?: {
      amount: MoneyObject,
      foreignAmount?: MoneyObject,
    },
    roundUp: any,
    cashback: any,
    amount: MoneyObject,
    foreignAmount?: MoneyObject,
    settledAt: string,
    createdAt: string,
  },
  links: {
    self: string,
  },
  relationships: {
    account: {
      links?: {
        related: string,
      },
      data: {
        type: string,
        id: string,
      }
    }
  },
}

export type GetAccountsResponse = {
  data: AccountResource[],
  links: {
    prev: string,
    next: string,
  }
}

export type GetTransactionsResponse = {
  data: TransactionResource[],
  links: {
    prev: string,
    next: string,
  }
}

export class UpApiClient {
  constructor(
      private readonly axios: AxiosInstance,
  ) {
  }

  static create(personalAccessToken: string): UpApiClient {
    const client = axios.create({
      baseURL: 'https://api.up.com.au/api/v1',
      headers: {
        ['Authorization']: `Bearer ${personalAccessToken}`,
      },
    });
    return new UpApiClient(client);
  }

  async getTransactions(opts: {
    accountId?: string
    pageSize?: number,
    filterUntil?: string,
    filterSince?: string,
    continuationToken?: string,
  } = {}): Promise<GetTransactionsResponse> {
    if (opts.continuationToken) {
      const resp = await this.axios.get(opts.continuationToken);
      return resp.data;
    }

    const endpoint = opts.accountId != null
        ? `/accounts/${opts.accountId}/transactions`
        : '/transactions';
    const resp = await this.axios.get(endpoint, {
      params: {
        'page[size]': opts.pageSize,
        'filter[since]': opts.filterSince,
        'filter[until]': opts.filterUntil,
      },
    });
    return resp.data;
  }

  async getAccounts(): Promise<GetAccountsResponse> {
    const resp = await this.axios.get('/accounts', { params: { 'page[size]': 10 } });
    return resp.data;
  }
}
