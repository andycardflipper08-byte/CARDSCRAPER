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

    const searchUrl = `https://www.cardladder.com/cards/search?q=${encodeURIComponent(card + " PSA " + grade)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    const firstCard = await page.$('a[href*="/cards/"]');
    if (firstCard) {
      await firstCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    }

    const data = await page.evaluate(() => {
      const prices = [...document.querySelectorAll('[class*="price"], [class*="sale"]')]
        .map(el => el.innerText.trim())
        .filter(t => t.includes('$'))
        .slice(0, 30);

      return {
        lastSale : prices[0] || "N/A",
        avg30    : prices.slice(0, 10).join(', ') || "N/A",
        avg90    : prices.slice(0, 30).join(', ') || "N/A"
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
