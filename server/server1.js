const express = require("express");
const puppeteer = require("puppeteer");
const os = require("os");
const app = express();
const cors = require("cors");
const port = 3000;

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

const getStockPrice = async (ticker, exchange) => {
  const url = `https://www.google.com/finance/quote/${ticker}:${exchange}`;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: getChromePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForNetworkIdle({ idleTime: 500 });

    const selector = ".YMlKec.fxKbKc";
    await page.waitForSelector(selector);

    const priceText = await page.$eval(selector, (el) => el.textContent);
    await browser.close();
    return priceText;
  } catch (error) {
    console.error("Error fetching stock price:", error.message);
    return null;
  }
};

let lastPrices = {};

const fetchStockPrices = async (stocks) => {
  const stockPrices = [];

  for (const { ticker, exchange } of stocks) {
    const priceText = await getStockPrice(ticker, exchange);

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
    { ticker: "ITC", exchange: "NSE" },
    { ticker: "ICICIBANK", exchange: "NSE" },
    { ticker: "KOTAKBANK", exchange: "NSE" },
    { ticker: "LT", exchange: "NSE" },
    { ticker: "ADANIENT", exchange: "NSE" },
  ];

  try {
    // Fetch prices for both groups concurrently
    const [group1Prices, group2Prices] = await Promise.all([
      fetchStockPrices(group1),
      fetchStockPrices(group2),
    ]);

    // Combine both groups into a single result
    const allPrices = [...group1Prices, ...group2Prices];

    res.json({ stocks: allPrices });
    console.log("End!", (Date.now() - startTime) / 1000, "Time");
    return;
  } catch (error) {
    console.error("Error fetching stock prices:", error);
    return res.status(500).json({ error: "Unable to fetch stock prices" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
