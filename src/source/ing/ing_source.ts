import { delay } from 'base/delay';
import * as bunyan from 'bunyan';
import * as puppeteer from 'puppeteer';
import { parseTransactionsCsv } from 'source/ing/ing_csv';
import { IngLoginPage } from 'source/ing/scraper/login_page';
import { Source, Transaction } from 'source/source';

export type IngSourceConfig = {
  kind: "ing",
  credentials: {
    clientId: string,
    accessCode: string,
  },
  accounts: readonly string[],
}

export class IngSource implements Source {
  constructor(
      private readonly config: IngSourceConfig,
      private readonly log: bunyan,
      private readonly useCachedData: boolean,
  ) {
  }

  async getTransactions(): Promise<readonly Transaction[]> {
    if (!this.useCachedData) {
      this.log.info("Fetching CSVs");
      await this.fetchTransactionsCsvs();
    }

    this.log.info("Loading CSV");
    const txns: Transaction[] = [];
    for (const accountId of this.config.accounts) {
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
    await loginPage.typeClientId(this.config.credentials.clientId);
    const bankingPage = await loginPage.typeAccessCodeAndLogin(this.config.credentials.accessCode);
    await bankingPage.waitUntilReady();

    for (const accountId of this.config.accounts) {
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

