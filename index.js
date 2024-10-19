const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const stream = require('stream');

const app = express();

// Streaming response setelah halaman siap
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

    // Akses URL dan tunggu sampai Cloudflare atau verifikasi lain selesai
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Tunggu beberapa detik tambahan jika Cloudflare membutuhkan waktu lebih
    await page.waitForTimeout(5000); // Optional, bisa disesuaikan

    // Ambil konten dari halaman (HTML)
    const content = await page.content();

    // Set header untuk HTML dan kirimkan konten ke klien
    res.setHeader('Content-Type', 'text/html');
    res.send(content);

    // Tutup browser setelah selesai
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
