const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const app = express();

// Fungsi untuk menentukan response type dan mengembalikan konten dengan benar
const handleResponse = async (page) => {
  // Coba kembalikan data dalam beberapa format
  const contentType = await page.evaluate(() => {
    return document.contentType || 'text/html';
  });

  if (contentType.includes('application/json')) {
    const content = await page.evaluate(() => JSON.parse(document.body.innerText));
    return { type: 'json', content };
  } else if (contentType.includes('image') || contentType.includes('application/octet-stream')) {
    const buffer = await page.screenshot();
    return { type: 'buffer', content: buffer };
  } else {
    const content = await page.content();
    return { type: 'html', content };
  }
};

// Route untuk mendapatkan konten dari URL yang diberikan
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

    // Akses URL dan tunggu sampai halaman selesai dimuat
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Handle berbagai tipe respons dari halaman
    const result = await handleResponse(page);

    // Kembalikan hasil ke klien
    if (result.type === 'json') {
      res.json(result.content);
    } else if (result.type === 'buffer') {
      res.setHeader('Content-Type', 'image/png');
      res.send(result.content);
    } else {
      res.send(result.content);
    }

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
  
