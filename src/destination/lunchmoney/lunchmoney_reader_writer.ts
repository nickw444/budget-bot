import axios, { AxiosInstance } from 'axios';
import { LunchmoneyDestinationConfig } from 'destination/lunchmoney/lunchmoney_destination';

const LUNCHMONEY_API_URL = 'https://dev.lunchmoney.app/v1/';

type LunchmoneyTag = {
  id: number;
  name: string;
  description: string;
};

export type LunchmoneyTransaction = {
  id: number;
  date: string;
  payee: string;
  amount: string;
  currency: string;
  notes: string;
  categoryId: number;
  assetId: number;
  plaidAccountId: number;
  status: string;
  parentId: number;
  isGroup: boolean;
  groupId: number;
  tags: LunchmoneyTag[];
  externalId: string;
}

export class LunchmoneyReaderWriter {
  private readonly axiosInstance?: AxiosInstance;

  constructor(private readonly personalAccessToken: string) {
    this.axiosInstance = axios.create({
      baseURL: LUNCHMONEY_API_URL,
      headers: {
        'Authorization': `Bearer ${this.personalAccessToken}`
      }
    });
  }

  static of(config: LunchmoneyDestinationConfig) {
    return new LunchmoneyReaderWriter(config.personalAccessToken);
  }

  async loadTransactions() {
    if (!this.axiosInstance) {
      return;
    }

    const transactions = await this.axiosInstance.get('transactions');
    return transactions;
  }
}
