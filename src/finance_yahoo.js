import { launch } from "puppeteer";
import { getJson, uploadJson } from "./library/upload-s3.js";
import fetch from "node-fetch";
import { writeFile } from 'fs/promises';
import { error } from "console";

class FinanceYahoo {
  root_path = 'data/data_raw/finance_yahoo';

  async fetchAlticles(marketCode) {
    const browser = await launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });
    const page = (await browser.pages())[0];
    try {
      // const ua =
      //   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
      // await page.setUserAgent(ua);
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (new Set(['image', 'font', 'media']).has(req.resourceType())) {
          req.abort();
        } else req.continue();
      });
      const newsLinks = [];
      const video_sources = {};
      let scrolling = true;
      page.on('response', async (res) => {
        const url = res.url();
        if (url.startsWith('https://finance.yahoo.com/_finance_doubledown/api/resource')) {
          try {
            const body = await res.json();
            if (body?.g0?.data?.stream_items instanceof Array) {
              body.g0.data.stream_items.forEach((i) => {
                if (i.url != undefined) {
                  const { id, url, title, summary, publisher, pubtime, type, images, finance } = i;
                  newsLinks.push({
                    id,
                    url,
                    title,
                    summary,
                    publisher,
                    pubtime,
                    type,
                    images,
                  });
                }
              });
              if (!body.g0.data?.stream_pagination) scrolling = false;
            }
          } catch (_) { }
        } else if (url.startsWith('https://finance.yahoo.com/caas/content/article/')) {
          try {
            const body = await res.json();
            if (body?.items[0]?.data?.partnerData?.url) {
              body.items.forEach((a) => {
                const i = a.data.partnerData;
                const { uuid, url, type, title, summary, publisher, publishDate, preload } = i;
                const res = {
                  id: uuid,
                  url,
                  title,
                  summary,
                  publisher,
                  pubtime: new Date(publishDate).getTime(),
                  type,
                  images: null
                };
                if (preload[0]?.as == 'image') {
                  res.images = {
                    original: preload[0].href
                  };
                }
                newsLinks.push(res);
              });
            }
          } catch (_) { }
        } else if (url.startsWith('https://edge-auth.api.brightcove.com/playback/v1/accounts/')) {
          try {
            const body = await res.json();
            if (body?.reference_id && body?.sources) {
              video_sources[body.reference_id] = body.sources;
            }
          } catch (_) { }
        }
      });
      try {
        await page.goto(`https://finance.yahoo.com/quote/${marketCode}`, { timeout: 120000, waitUntil: 'load' });
      } catch (_) { }
      let outScrollStack = 0;
      while (scrolling) {
        try {
          const stack = await page.evaluate(() => {
            const a = window.scrollY;
            window.scrollTo(0, window.scrollY + 10000);
            return a == window.scrollY ? 1 : 0;
          });
          if (stack) {
            outScrollStack += stack;
          } else outScrollStack = 0;
          if (outScrollStack > 7) break;
        } catch (_) { }
        await new Promise((r) => setTimeout(r, 1000));
      }


      newsLinks.forEach((_, index) => {
        if (video_sources[newsLinks[index].id] != undefined) {
          newsLinks[index].video_sources = video_sources[newsLinks[index].id];
        }
      });
      if (newsLinks.length > 0) {
        const fromS3 = await getJson(`${this.root_path}/quote/${marketCode}/summary_news.json`);
        if (fromS3) {
          const merging = {};
          fromS3.Body.concat(newsLinks).forEach((item) => {
            merging[item.id] = item;
          });
          const res = Object.values(merging);
          await uploadJson(`${this.root_path}/quote/${marketCode}/summary_news.json`, res);
          return res;
        }
        await uploadJson(`${this.root_path}/quote/${marketCode}/summary_news.json`, newsLinks);
      }
      return newsLinks;
    } catch (error) {
      console.log(error);
    } finally {
      await browser.close();
    }
  }

  async fetchMarketSybols() {
    const browser = await launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });
    const page = (await browser.pages())[0];
    try {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (new Set(['image', 'font', 'media']).has(req.resourceType())) {
          req.abort();
        } else req.continue();
      });

      let s = 0;
      const market_symbols = [];
      while (true) {
        try {
          await page.goto(`https://finance.yahoo.com/lookup/all?s=1&t=A&b=${s}&c=10000`, { waitUntil: 'domcontentloaded' });
          const res = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#lookup-page table tbody tr td:first-child > a'))
              .map(a => a.dataset.symbol);
          });
          if (res.length == 0) break;
          market_symbols.push(...res);
          s += 10000;
        } catch (error) {
          console.log(error);
        }
      }

      await uploadJson(`${this.root_path}/market_symbols.json`, market_symbols);

      return market_symbols;
    } catch (err) {
      console.log(err);
    } finally {
      await browser.close();
    }
  }
}

export default FinanceYahoo;