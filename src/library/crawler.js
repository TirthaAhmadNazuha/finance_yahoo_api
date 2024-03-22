import { launch } from 'puppeteer';

class Crawler {
  constructor() {
    this.jobs = [];
  }

  async handler() { }

  async worker(useAbort, opt = {}, launchOpt = { headless: 'new' }) {
    const browser = await launch(launchOpt);
    const page = await browser.newPage();
    if (useAbort) {
      await page.setRequestInterception(true);
      page.on('request', async (req) => {
        if (['stylesheet', 'image', 'media', 'font'].includes(req.resourceType())) return await req.abort();
        if (typeof opt.onRequest === 'function') await opt.onRequest(req);
        return await req.continue();
      });
    }
    try {
      for (const job of this.jobs) {
        await this.handler(page, job);
      }
    } catch (error) {
      console.log(error);
    } finally {
      await page.close();
      await browser.close();
    }
  }
}

export default Crawler;
