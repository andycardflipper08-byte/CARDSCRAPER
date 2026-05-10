const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/sales', async (req, res) => {
  const card  = req.query.card;
  const grade = req.query.grade;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    await page.setViewport({ width: 1280, height: 800 });

    const searchUrl = `https://www.cardladder.com/cards/search?q=${encodeURIComponent(card + " PSA " + grade)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });

    // Wait for results to load
    await new Promise(r => setTimeout(r, 3000));

    // Click first card result
    const firstCard = await page.$('a[href*="/cards/"]');
    if (firstCard) {
      await firstCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 3000));
    }

    // Dump all text containing $ signs
    const data = await page.evaluate(() => {
      const allText = document.body.innerText;
      const priceMatches = allText.match(/\$[\d,]+\.?\d*/g) || [];
      const prices = priceMatches
        .map(p => parseFloat(p.replace(/[$,]/g, '')))
        .filter(p => p > 1 && p < 500000);

      return {
        lastSale : prices.length > 0 ? "$" + prices[0].toFixed(2) : "N/A",
        avg30    : prices.length > 0 ? "$" + (prices.slice(0,10).reduce((a,b)=>a+b,0)/Math.min(prices.length,10)).toFixed(2) : "N/A",
        avg90    : prices.length > 0 ? "$" + (prices.slice(0,30).reduce((a,b)=>a+b,0)/Math.min(prices.length,30)).toFixed(2) : "N/A",
        raw      : priceMatches.slice(0, 10)
      };
    });

    await browser.close();
    res.json(data);

  } catch (err) {
    if (browser) await browser.close();
    res.json({ error: err.message, lastSale: "N/A", avg30: "N/A", avg90: "N/A" });
  }
});

app.listen(8080, () => console.log("✅ Running on port 8080"));
