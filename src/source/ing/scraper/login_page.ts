import { Page } from 'puppeteer';
import { delay } from '../../../base/delay';
import { IngBankingPage } from './banking_page';
import { PageObject } from './page_object';

export class IngLoginPage extends PageObject {
  static async go(page: Page) {
    await page.goto('https://www.ing.com.au/securebanking/', {
      waitUntil: 'networkidle0',
    });
    return new IngLoginPage(page);
  }

  async waitUntilLoginReady() {
    await this.page.waitForSelector('#spinnerContainer .spinner', { hidden: true });
  }

  async typeClientId(clientId: string) {
    await this.page.type('#cifField', clientId);
  }

  async typeAccessCodeAndLogin(accessCode: string) {
    // Enter A11Y screen-reader entry mode
    await this.page.focus('.accessibleText');
    await this.page.keyboard.press(String.fromCharCode(13));
    // Wait until ready
    await this.waitUntilLoginReady();
    // Enter pin by selecting individual elements, then choosing "Login" option
    for (const key of [...accessCode.split(''), 'Login']) {
      const selector = `input[alt="${key}"]`;
      await this.page.waitForSelector(selector);
      await this.page.evaluate(
          (selector) => document.querySelector(selector).click(),
          selector,
      );
      await delay(100);
    }

    return IngBankingPage.of(this.page);
  }
}
