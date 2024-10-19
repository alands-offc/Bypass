const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const stream = require('stream');

const app = express();

// Streaming response langsung dari intercept request
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

    const bodyStream = new stream.PassThrough();

    // Handle every request
    page.on('request', (request) => {
      // Bypass requests like images, CSS, etc., to improve performance
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Handle every response
    page.on('response', async (response) => {
      if (response.ok() && response.url() === url) {
        const buffer = await response.buffer();
        bodyStream.write(buffer);
      }
    });

    // Go to the URL
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Set content type (default to HTML if not determined)
    const contentType = await page.evaluate(() => document.contentType || 'text/html');
    res.setHeader('Content-Type', contentType);

    // Stream data from the response
    bodyStream.pipe(res);

    // Close the browser once done
    await page.waitForTimeout(5000); // Small delay to ensure all data is streamed
    bodyStream.end();
    await browser.close();

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
