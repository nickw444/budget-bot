import { Page } from "puppeteer";

export class PageObject {
  constructor(protected readonly page: Page) {
  }
}
