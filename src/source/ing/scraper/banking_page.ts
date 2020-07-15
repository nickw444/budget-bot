import { Page } from 'puppeteer';
import { PageObject } from 'source/ing/scraper/page_object';

export class IngBankingPage extends PageObject {
  static of(page: Page) {
    return new IngBankingPage(page);
  }

  async waitUntilReady() {
    await this.page.waitForSelector('#spinnerContainer .spinner', { hidden: true });
  }

  async visitAccount(accountNumber: string) {
    const selector = `[accountno="${accountNumber}"]`;
    await this.page.waitForSelector(selector, { visible: true });
    await this.page.evaluate(
        (selector) => document.querySelector(selector).click(),
        selector,
    );
  }

  async clickDownloadCsv() {
    await this.page.waitForSelector('#accountDetailsPage [data-id="csv"]');
    await this.page.evaluate(() => (document.querySelector('#accountDetailsPage [data-id="csv"]') as any).click());
  }

  async returnToAccountsList() {
    await this.page.evaluate(() =>
        (document.querySelector('[data-element="ing-all-accounts-summary"]') as any).click());
  }
}
