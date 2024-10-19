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

    // Stream yang akan mengirim data ke respons
    const bodyStream = new stream.PassThrough();

    // Event listener untuk mendapatkan data setiap kali respons diterima
    page.on('response', async (response) => {
      if (response.ok() && response.url() === url) {
        const buffer = await response.buffer();
        bodyStream.write(buffer);
      }
    });

    // Akses URL dan tunggu hingga halaman siap setelah verifikasi Cloudflare
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Deteksi konten halaman, jika ada perubahan setelah verifikasi
    const contentType = await page.evaluate(() => document.contentType || 'text/html');
    res.setHeader('Content-Type', contentType);

    // Teruskan aliran stream ke respons Express
    bodyStream.pipe(res);

    // Tunggu sampai DOM benar-benar terupdate untuk memastikan halaman asli terbuka
    await page.waitForTimeout(5000); // Tambahkan penundaan 5 detik atau sesuai dengan kondisi halaman

    // Tutup stream dan browser setelah halaman selesai dimuat
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
  
