import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The file owns one fixed-port server, so keep its tests in one worker even
// under the fully parallel release matrix (parallel workers would collide).
test.describe.configure({ mode: 'default' });
let server: ChildProcess;
const url = 'http://127.0.0.1:4189';
test.beforeAll(async () => {
  server = spawn(process.execPath, ['scripts/serve-demo.mjs'], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: { ...process.env, HOST: '127.0.0.1', PORT: '4189' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Demo startup timeout')), 15000);
    server.once('error', reject);
    server.once('exit', () => { clearTimeout(timeout); reject(new Error('Demo exited during startup')); });
    server.stdout!.once('data', () => { clearTimeout(timeout); resolve(); });
  });
});
test.afterAll(async () => {
  if (!server || server.exitCode !== null) return;
  await new Promise<void>((resolve) => { server.once('exit', () => resolve()); server.kill(); });
});

for (const width of [320, 375, 768, 1440]) {
  for (const locale of ['en', 'pt-BR']) {
    test(`language selector fits at ${width}px in ${locale}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(url + '/#/patterns/forms');
      await page.locator('#language').selectOption(locale);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page).toHaveURL(/#\/patterns\/forms$/);
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.locator('#language').evaluate((select: HTMLSelectElement) => {
        const bounds = select.getBoundingClientRect();
        const style = getComputedStyle(select);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return {
          left: bounds.left, right: bounds.right,
          available: select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 20,
          text: ctx.measureText(select.selectedOptions[0]?.text ?? "").width,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(metrics.left).toBeGreaterThanOrEqual(0);
      expect(metrics.right).toBeLessThanOrEqual(width);
      expect(metrics.overflow).toBe(false);
      expect(metrics.available).toBeGreaterThanOrEqual(metrics.text);
      await page.locator('#language').focus();
      await expect(page.locator('#language')).toBeFocused();
      if (width === 320 && locale === 'pt-BR') await page.screenshot({ path: testInfo.outputPath('mobile-pt-BR.png') });
    });
  }
}
