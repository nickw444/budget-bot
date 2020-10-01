import * as bunyan from 'bunyan';
import * as puppeteer from 'puppeteer';
import { delay } from '../../base/delay';
import { bb } from '../../lib/bb';
import { Transaction } from '../source';
import { parseTransactionsCsv } from './ing_csv';
import { IngLoginPage } from './scraper/login_page';


export class IngSource implements bb.Plugin<void, Transaction[]> {
  constructor(
      private readonly credentials: {
        clientId: string,
        accessCode: string,
      },
      private readonly accounts: readonly string[],
      private readonly log: bunyan,
      private readonly useCachedData: boolean,
  ) {
  }

  async exec(): Promise<Transaction[]> {
    if (!this.useCachedData) {
      this.log.info('Fetching CSVs');
      await this.fetchTransactionsCsvs();
    }

    this.log.info('Loading CSV');
    const txns: Transaction[] = [];
    for (const accountId of this.accounts) {
      const accountTxns = await parseTransactionsCsv(
          `./target/transactions/${accountId}/Transactions.csv`);
      txns.push(...accountTxns.map(txn => ({ ...txn, accountId })));
    }
    return txns;
  }

  private async fetchTransactionsCsvs() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const loginPage = await IngLoginPage.go(page);
    await loginPage.waitUntilLoginReady();
    await loginPage.typeClientId(this.credentials.clientId);
    const bankingPage = await loginPage.typeAccessCodeAndLogin(this.credentials.accessCode);
    await bankingPage.waitUntilReady();

    for (const accountId of this.accounts) {
      await bankingPage.visitAccount(accountId);
      await (page as any)._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: `./target/transactions/${accountId}/`,
      });
      await delay(500);
      await bankingPage.waitUntilReady();
      await bankingPage.clickDownloadCsv();
      await delay(1000);
      await bankingPage.returnToAccountsList();
      await bankingPage.waitUntilReady();
      await delay(1000);
    }

    await delay(2000);
    await browser.close();
  }
}

