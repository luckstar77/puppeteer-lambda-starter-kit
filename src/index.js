const setup = require('./starter-kit/setup');
const {request} = require('graphql-request');

const endpoint = process.env.GRAPHQL_ENDPOINT || 'http://localhost:7001/graphql';

async function upsertStocks(stocks) {
  try {
    for (const arrarOfStock of stocks) {
      await Promise.all(arrarOfStock.map(async (stock) => {
        const query = /* GraphQL */ `
            mutation {
                upsertStock(${Object
    .keys(stock)
    .map((key) => `${key}:${key !== 'symbol' && key !== 'company' ? stock[key] : JSON.stringify(stock[key])}`)
    .join(',')}) {
                    symbol
                    company
                }
            }
          `;

          // console.log(query)

        return await request(endpoint, query);
      }));
    }
  } catch (err) {
    console.log(err);
  }
}

exports.handler = async (event, context, callback) => {
  // For keeping the browser launch
  context.callbackWaitsForEmptyEventLoop = false;
  const browser = await setup.getBrowser();
  try {
    const result = await exports.run(browser);
    callback(null, result);
  } catch (e) {
    callback(e);
  }
};

exports.run = async (browser) => {
  // implement here
  // this is sample
  const page = await browser.newPage();
  await page.goto('https://stock.wespai.com/rate108',
    {
      timeout: 60000,
    //  waitUntil: ['domcontentloaded', 'networkidle0']
    }
  );

  const stocks = await page.$$eval('#example tbody tr', (result)=>result.reduce((accum, stock, index)=>{
    const [
      {innerText: symbol},
      {innerText: company},
      {innerText: _1},
      {innerText: _2},
      {innerText: _3},
      {innerText: _5},
      {innerText: price},
      {innerText: _4},
      {innerText: dividend},
    ] = stock.querySelectorAll('td');
    const accumIndex = parseInt(index / 1000);

    if (!accum[accumIndex]) {
      accum[accumIndex] = [];
    }

    accum[accumIndex].push({
      symbol,
      company,
      price,
      dividend: parseFloat(dividend),
    });

    return accum;
  }, []));

  await upsertStocks(stocks);

  await page.close();
  return 'done';
};
