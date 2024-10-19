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
    // Luncurkan browser menggunakan Chromium dari @sparticuz
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Mengurangi masalah memori
        '--disable-gpu' // Nonaktifkan GPU
      ]
    });
    const page = await browser.newPage();

    // Akses halaman yang diminta
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000 // Atur timeout agar lebih lama jika perlu
    });

    // Ambil tipe konten dari halaman
    const contentType = await page.evaluate(() => document.contentType);

    // Set header Content-Type sesuai dengan tipe konten halaman
    res.setHeader('Content-Type', contentType);

    // Buat stream PassThrough untuk streaming respons
    const bodyStream = new stream.PassThrough();
    bodyStream.pipe(res);

    // Ambil konten halaman secara dinamis berdasarkan tipenya
    if (contentType.includes('application/json')) {
      const jsonContent = await page.evaluate(() => JSON.parse(document.body.innerText));
      bodyStream.write(JSON.stringify({ results: jsonContent }));
    } else {
      const htmlContent = await page.content();
      bodyStream.write(JSON.stringify({ results: htmlContent }));
    }

    // Akhiri stream setelah data dikirim
    bodyStream.end();

    // Tutup browser
    await browser.close();

  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Menjalankan server di port 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
