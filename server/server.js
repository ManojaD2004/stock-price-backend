const express = require("express");
const puppeteer = require("puppeteer");
const os = require("os");
const app = express();
const cors = require("cors");
const fs = require("fs");
const chalk = require("chalk");
const port = 4000;
async function main() {
  app.use(cors());
  app.use(express.static("public"));

  // Function to get Chrome executable path dynamically based on OS
  const getChromePath = () => {
    switch (os.platform()) {
      case "darwin": // macOS
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
      case "win32": // Windows
        return "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
      case "linux": // Linux
        return "/usr/bin/google-chrome";
      default:
        throw new Error("Unsupported OS for Chrome executable path");
    }
  };
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: getChromePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const STOCK_PRICE_FILE = "./data/stock-prices.json";
  const getStockPrice = async (ticker, exchange, page) => {
    const url = `https://www.google.com/finance/quote/${ticker}:${exchange}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Price
      const selector = ".YMlKec.fxKbKc";
      // "YMlKec fxKbKc"
      await page.waitForSelector(selector);

      // Previous Close
      let selector2 = ".P6K39c";
      // "P6K39c"
      await page.waitForSelector(selector2);

      const priceText = await page.$eval(selector, (el) => el.textContent);
      const prePriceText = await page.$eval(selector2, (el) => el.textContent);
      const curPrice = parseFloat(priceText.replace(/₹|,|\$/g, ""));
      const prePrice = parseFloat(prePriceText.replace(/₹|,|\$/g, ""));
      const diff = curPrice - prePrice;
      const percent = ((diff / prePrice) * 100).toFixed(2) + "%";
      console.log(chalk.yellow(ticker, ": "));
      const stockData = {
        symbol: ticker,
        curPrice: curPrice,
        prePrice: prePrice,
        percent: percent,
        currency: priceText[0],
        diff: diff.toFixed(2),
        direction: "",
      };
      if (diff === 0) {
        stockData.direction = "no-change";
        console.log(chalk.white(priceText, prePriceText, percent));
      } else if (stockData.diff > 0) {
        stockData.direction = "up";
        console.log(chalk.green(priceText, prePriceText, percent));
      } else {
        stockData.direction = "down";
        console.log(chalk.red(priceText, prePriceText, percent));
      }
      return stockData;
    } catch (error) {
      console.error("Error fetching stock price:", ticker, error.message);
      return null;
    }
  };

  const fetchStockPrices = async (stocks, page) => {
    const stockPrices = [];
    for (const { ticker, exchange } of stocks) {
      const stockData = await getStockPrice(ticker, exchange, page);
      stockPrices.push(stockData);
    }
    return stockPrices;
  };

  const intervalFun = async () => {
    const startTime = Date.now();
    console.log("Start Time!");
    const group1 = [
      { ticker: "AAPL", exchange: "NASDAQ" },
      { ticker: "MSFT", exchange: "NASDAQ" },
      { ticker: "GOOGL", exchange: "NASDAQ" },
      { ticker: "TSLA", exchange: "NASDAQ" },
      { ticker: "AMZN", exchange: "NASDAQ" },
    ];
    const group3 = [
      { ticker: "META", exchange: "NASDAQ" },
      { ticker: "NVDA", exchange: "NASDAQ" },
      { ticker: "NFLX", exchange: "NASDAQ" },
      { ticker: "DIS", exchange: "NYSE" },
      { ticker: "BRK.B", exchange: "NYSE" },
    ];

    const group2 = [
      { ticker: "RELIANCE", exchange: "NSE" },
      { ticker: "INFY", exchange: "NSE" },
      { ticker: "TCS", exchange: "NSE" },
      { ticker: "HDFCBANK", exchange: "NSE" },
      { ticker: "BHARTIARTL", exchange: "NSE" },
    ];

    const group4 = [
      { ticker: "ITC", exchange: "NSE" },
      { ticker: "ICICIBANK", exchange: "NSE" },
      { ticker: "KOTAKBANK", exchange: "NSE" },
      { ticker: "LT", exchange: "NSE" },
      { ticker: "ADANIENT", exchange: "NSE" },
    ];

    try {
      const allPrices = [];
      const page1 = await browser.newPage();
      await page1.waitForNetworkIdle({ idleTime: 500 });
      const page2 = await browser.newPage();
      await page2.waitForNetworkIdle({ idleTime: 500 });
      const page3 = await browser.newPage();
      await page3.waitForNetworkIdle({ idleTime: 500 });
      const page4 = await browser.newPage();
      await page4.waitForNetworkIdle({ idleTime: 500 });
      const allPrices1 = await Promise.all([
        fetchStockPrices(group1, page1),
        fetchStockPrices(group2, page2),
        fetchStockPrices(group3, page3),
        fetchStockPrices(group4, page4),
      ]);
      await page1.close();
      await page2.close();
      await page3.close();
      await page4.close();
      for (const prices of allPrices1) {
        allPrices.push(...prices);
      }
      fs.writeFileSync(STOCK_PRICE_FILE, JSON.stringify(allPrices, null, 4), {
        encoding: "utf-8",
      });

      console.log("End!", (Date.now() - startTime) / 1000, "Time");
    } catch (error) {
      console.error("Error fetching stock prices:", error);
    }
  };
  app.get("/stock-prices", async (req, res) => {
    const startTime = Date.now();
    console.log("Start Time!");
    try {
      const allPrices = JSON.parse(
        fs.readFileSync(STOCK_PRICE_FILE, { encoding: "utf-8" })
      );
      res.status(200).send({ stocks: allPrices });
      console.log("End!", (Date.now() - startTime) / 1000, "Time");
    } catch (error) {
      console.error("Error fetching stock prices:", error);
      return res.status(500).send({ error: "Unable to fetch stock prices" });
    }
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    intervalFun();
    setInterval(intervalFun, 1000 * 60 * 5);
    // Every Five Minutes
  });
}
main();
