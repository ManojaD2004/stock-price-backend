const express = require("express");
const puppeteer = require("puppeteer");
const os = require("os");
const app = express();
const cors = require("cors");
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

  const getStockPrice = async (ticker, exchange, page) => {
    const url = `https://www.google.com/finance/quote/${ticker}:${exchange}`;

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      const selector = ".YMlKec.fxKbKc";
      await page.waitForSelector(selector);

      const priceText = await page.$eval(selector, (el) => el.textContent);
      return priceText;
    } catch (error) {
      console.error("Error fetching stock price:", error.message);
      return null;
    }
  };

  let lastPrices = {
    AAPL: 175.65, // Apple
    MSFT: 320.15, // Microsoft
    GOOGL: 138.75, // Google
    TSLA: 245.85, // Tesla
    AMZN: 135.4, // Amazon
    META: 310.5, // Meta (Facebook)
    NVDA: 495.2, // NVIDIA
    NFLX: 410.0, // Netflix
    DIS: 89.35, // Disney
    "BRK.B": 350.45, // Berkshire Hathaway
    RELIANCE: 2400.25, // Reliance Industries
    INFY: 1485.15, // Infosys
    TCS: 3645.8, // Tata Consultancy Services
    HDFCBANK: 1570.0, // HDFC Bank
    BHARTIARTL: 875.5, // Bharti Airtel
    ITC: 450.3, // ITC Limited
    ICICIBANK: 980.75, // ICICI Bank
    KOTAKBANK: 1785.45, // Kotak Mahindra Bank
    LT: 2500.9, // Larsen & Toubro
    ADANIENT: 2275.6, // Adani Enterprises
  };

  const fetchStockPrices = async (stocks) => {
    const stockPrices = [];
    const page = await browser.newPage();
    await page.waitForNetworkIdle({ idleTime: 500 });
    for (const { ticker, exchange } of stocks) {
      const priceText = await getStockPrice(ticker, exchange, page);

      if (priceText !== null) {
        const currentPrice = parseFloat(priceText.replace(/₹|,|\$/g, ""));
        let direction = "no-change";

        if (lastPrices[ticker] !== undefined) {
          const lastPrice = lastPrices[ticker];

          if (currentPrice > lastPrice) direction = "up";
          else if (currentPrice < lastPrice) direction = "down";
        }

        lastPrices[ticker] = currentPrice; // Update last price
        stockPrices.push({ symbol: ticker, price: priceText, direction });
      } else {
        stockPrices.push({
          symbol: ticker,
          price: "Price unavailable",
          direction: "no-change",
        });
      }
    }

    return stockPrices;
  };

  app.get("/get-stock-prices", async (req, res) => {
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
      const allPrices1 = await Promise.all([
        fetchStockPrices(group1),
        fetchStockPrices(group2),
        fetchStockPrices(group3),
        fetchStockPrices(group4),
      ]);
      const allPrices = [];
      for (const prices of allPrices1) {
        allPrices.push(...prices);
      }

      res.json({ stocks: allPrices });
      console.log("End!", (Date.now() - startTime) / 1000, "Time");
    } catch (error) {
      console.error("Error fetching stock prices:", error);
      return res.status(500).json({ error: "Unable to fetch stock prices" });
    }
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}
main();
