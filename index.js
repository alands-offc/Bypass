const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const stream = require('stream');

const app = express();

// Streaming response langsung dari halaman
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

    // Setiap kali halaman menerima data, langsung dikirim ke stream
    const bodyStream = new stream.PassThrough();
    
    page.on('response', async (response) => {
      if (response.ok()) {
        const buffer = await response.buffer();
        bodyStream.write(buffer);
      }
    });

    // Akses URL dan mulai streaming data
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Set content-type yang benar sesuai respons halaman
    const contentType = await page.evaluate(() => document.contentType);
    res.setHeader('Content-Type', contentType || 'text/html');

    // Tutup aliran setelah selesai
    page.on('load', () => {
      bodyStream.end();
      browser.close();
    });

    // Pipe aliran ke respons Express
    bodyStream.pipe(res);

  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Menjalankan server pada port 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
      
