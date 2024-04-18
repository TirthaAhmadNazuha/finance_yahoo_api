import FinanceYahoo from './finance_yahoo.js';
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import swagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import CreateCluster from './library/clustering.js';
import { getJson } from './library/upload-s3.js';


async function main() {
  const app = fastify();
  app.register(fastifyCors);

  app.register(swagger, {
    prefix: '/docs',
    swagger: {
      info: {
        title: 'API Finance Yahoo',
        version: '1.0',
        description: 'Get data news of stock markets\nSource: https://finance.yahoo.com/\n\n Contact the creator on Telegram @tirthaahmadnazuha'
      },
      tags: [
        { name: 'Market' },
      ]
    },
  });
  app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    exposeRoute: true
  });
  const financeYahoo = new FinanceYahoo();

  app.register((app, opts, done) => {
    app.get('/market_news/:market_symbol', {
      schema: {
        tags: ['Market'],
        description: 'Get news the market',
        params: {
          market_symbol: { type: 'string' }
        }
      }
    }, async (req, res) => {
      const { market_symbol } = req.params;
      const fromS3 = await getJson(`${financeYahoo.root_path}/quote/${market_symbol}/summary_news.json`);
      if (fromS3) {
        const days_difference = Math.floor((new Date().getTime() - fromS3.LastModified.getTime()) / (1000 * 60 * 60 * 24));
        if (days_difference == 0) {
          console.log(fromS3.Body)
          return fromS3.Body
        }
      }
      const fromFetch = await financeYahoo.fetchAlticles(market_symbol);
      return fromFetch
    });

    app.get('/market_symbols', {
      schema: {
        tags: ['Market'],
        description: 'Get list symbols of market'
      }
    }, async () => {
      const fromS3 = await getJson(`${financeYahoo.root_path}/market_symbols.json`);
      if (fromS3) {
        const days_difference = Math.floor((new Date().getTime() - fromS3.LastModified.getTime()) / (1000 * 60 * 60 * 24));
        if (days_difference <= 3) return fromS3.Body;
      }
      return await financeYahoo.fetchMarketSybols();
    });

    done();
  });

  app.ready(() => {
    setTimeout(() => {
      app.swagger();
    }, 10);
  });

  app.listen({ host: 'localhost', port: 5721 }, (err, address) => {
  // app.listen({ host: '0.0.0.0', port: 5721 }, (err, address) => {
    if (err) throw err;
    console.log(`Server running on ${address}`);
    console.log(`Swagger api on ${address}/docs`);
  });
}

main();
// new CreateCluster(main, 6).start();
