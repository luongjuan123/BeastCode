import { chromium } from 'playwright';
import fs from 'fs';

async function generateAssets() {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage();

  // 1. Generate BeastCode Hexagon Icon (512x512)
  const iconHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 512px;
            height: 512px;
          }
          svg {
            width: 480px;
            height: 480px;
          }
        </style>
      </head>
      <body>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon
            points="50,8 88,29 88,71 50,92 12,71 12,29"
            stroke="#22c55e"
            stroke-width="5.5"
            stroke-linejoin="round"
            fill="#0f1210"
          />
          <path
            d="M 38,34 L 24,50 L 38,66"
            stroke="#f1f3ef"
            stroke-width="6.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M 62,34 L 76,50 L 62,66"
            stroke="#f1f3ef"
            stroke-width="6.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M 56,28 L 44,72"
            stroke="#22c55e"
            stroke-width="7"
            stroke-linecap="round"
          />
        </svg>
      </body>
    </html>
  `;

  await page.setContent(iconHtml);
  await page.setViewportSize({ width: 512, height: 512 });
  const iconBuffer = await page.screenshot({ omitBackground: true });

  fs.writeFileSync('public/beastcode-icon.png', iconBuffer);
  fs.writeFileSync('public/logo.png', iconBuffer);
  console.log('Generated public/beastcode-icon.png and updated public/logo.png (512x512)');

  // 2. Generate BeastCode Horizontal Full Logo (Hexagon + Wordmark)
  const fullLogoHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&display=swap');
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            display: inline-flex;
            align-items: center;
            height: 120px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .container {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 10px 16px;
          }
          svg {
            width: 80px;
            height: 80px;
            flex-shrink: 0;
          }
          .brand-text {
            font-size: 58px;
            font-weight: 800;
            letter-spacing: -1.5px;
            line-height: 1;
            color: #f1f3ef;
          }
          .brand-accent {
            color: #22c55e;
          }
        </style>
      </head>
      <body>
        <div class="container" id="logo-root">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon
              points="50,8 88,29 88,71 50,92 12,71 12,29"
              stroke="#22c55e"
              stroke-width="5.5"
              stroke-linejoin="round"
              fill="#0f1210"
            />
            <path
              d="M 38,34 L 24,50 L 38,66"
              stroke="#f1f3ef"
              stroke-width="6.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M 62,34 L 76,50 L 62,66"
              stroke="#f1f3ef"
              stroke-width="6.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M 56,28 L 44,72"
              stroke="#22c55e"
              stroke-width="7"
              stroke-linecap="round"
            />
          </svg>
          <div class="brand-text">
            Beast<span class="brand-accent">Code</span>
          </div>
        </div>
      </body>
    </html>
  `;

  await page.setContent(fullLogoHtml);
  await page.setViewportSize({ width: 600, height: 160 });
  await page.waitForTimeout(1000); // Allow fonts to render
  const logoRoot = await page.$('#logo-root');
  const fullLogoBuffer = await logoRoot.screenshot({ omitBackground: true });

  fs.writeFileSync('public/beastcode-logo.png', fullLogoBuffer);
  fs.writeFileSync('public/logo-full.png', fullLogoBuffer);
  console.log('Generated public/beastcode-logo.png and updated public/logo-full.png');

  await browser.close();
}

generateAssets().catch(err => {
  console.error(err);
  process.exit(1);
});
