import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'MFM_LAUNCH_FLYER_A4.html');
const outputPath = path.join(__dirname, 'MFM_LAUNCH_FLYER_A4.png');

// A4 at 300 DPI — standard print resolution
const A4_WIDTH = Math.round((210 / 25.4) * 300);
const A4_HEIGHT = Math.round((297 / 25.4) * 300);
// CSS layout uses 96 DPI reference (794 × 1123)
const CSS_WIDTH = Math.round((210 / 25.4) * 96);
const CSS_HEIGHT = Math.round((297 / 25.4) * 96);
const SCALE = A4_WIDTH / CSS_WIDTH;

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: CSS_WIDTH,
    height: CSS_HEIGHT,
    deviceScaleFactor: SCALE,
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));

  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: CSS_WIDTH, height: CSS_HEIGHT },
    omitBackground: false,
  });

  console.log(`Saved ${outputPath} (${A4_WIDTH}×${A4_HEIGHT}px @ 300 DPI)`);
} finally {
  await browser.close();
}
