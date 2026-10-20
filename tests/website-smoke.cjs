const assert = require('node:assert/strict');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = playwright.chromium;

async function verifyWebsite() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const widths = [1440, 375];
    for (let widthIndex = 0; widthIndex < widths.length; widthIndex += 1) {
      const width = widths[widthIndex];
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', function recordPageError(error) {
        errors.push(error.message);
      });
      await page.addInitScript(function disableOpeningForSmokeTest() {
        localStorage.setItem('niyun-opening-animation-enabled', 'false');
      });
      // 使用模拟响应测试 AI 界面
      await page.route('**/api/ai/**', async function mockAiResponse(route) {
        const statusRequest = route.request().url().endsWith('/status');
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(statusRequest
            ? { connected: true, configured: true, verified: true }
            : { reply: 'Smoke test response', sessionId: 'smoke-session' }),
        });
      });
      await page.goto('http://127.0.0.1:5173/');
      await page.waitForFunction(function waitForMapMarkers() {
        return document.querySelectorAll('.map-marker').length > 0;
      });
      await page.waitForFunction(function waitForQuizOptions() {
        return document.querySelectorAll('.quiz-option').length === 4;
      });
      await page.locator('#openSearch').click();
      await page.locator('#searchInput').fill('临淄');
      await page.locator('#doSearch').click();
      await page.locator('[data-search-id]').first().waitFor();
      await page.locator('#closeSearch').click();
      await page.waitForFunction(function waitForSearchClose() {
        return !document.querySelector('#searchDialog').open;
      });
      await page.locator('#openSettings').click();
      await page.locator('input[name="themeMode"][value="light"]').check();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      await page.locator('#doneSettings').click();
      await page.waitForFunction(function waitForSettingsClose() {
        return !document.querySelector('#settingsDialog').open;
      });
      await page.locator('[data-course-id="COURSE-02"]').click();
      await page.waitForFunction(function waitForCourseChange() {
        return document.querySelector('#courseMeta').textContent.includes('2');
      });
      await page.locator('.quiz-option').first().click();
      await page.locator('.quiz-form button[type="submit"]').click();
      await page.locator('.quiz-explanation').waitFor();
      await page.locator('#aiQuestion').fill('test');
      await page.locator('#chatForm button[type="submit"]').click();
      await page.getByText('Smoke test response', { exact: true }).waitFor();
      assert.deepEqual(errors, [], 'page must have no uncaught script errors');
      console.log(`${width}px: initialization, search, settings, courses, quiz and AI passed`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

verifyWebsite().catch(function reportSmokeFailure(error) {
  console.error(error);
  process.exitCode = 1;
});
