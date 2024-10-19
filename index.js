const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const stream = require('stream');

const app = express();

app.get('/getcontent', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Luncurkan browser menggunakan Puppeteer dan Chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true, // Set to false if you want to see the browser
    });

    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);

    // Buat stream untuk respons
    const bodyStream = new stream.PassThrough();

    // Tulis data ke client secara langsung
    bodyStream.pipe(res);

    // Intercept semua request dan respons
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();  // Batalkan resource yang tidak diperlukan
      } else {
        request.continue();  // Lanjutkan request yang diperlukan
      }
    });

    page.on('response', async (response) => {
      if (response.url() === url) {
        try {
          const buffer = await response.buffer();
          bodyStream.write(buffer);  // Tulis buffer ke stream
        } catch (err) {
          console.error('Error streaming response:', err);
        }
      }
    });

    // Pergi ke halaman target
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Setelah beberapa saat, akhiri stream
    setTimeout(async () => {
      bodyStream.end();
      await browser.close();
    }, 10000);  // Batasi waktu untuk mencegah timeout, sesuaikan sesuai kebutuhan

  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
          
