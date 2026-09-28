const assert = require('node:assert/strict');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = playwright.chromium;

// 检查课程视频在不同屏幕宽度下的封面、播放、拖动和错误恢复。
async function verifyCourseVideo() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const widths = [1440, 375];
    for (let widthIndex = 0; widthIndex < widths.length; widthIndex += 1) {
      const width = widths[widthIndex];
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.addInitScript(function disableOpeningAnimation() {
        localStorage.setItem('niyun-opening-animation-enabled', 'false');
      });
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3187/');
      await page.waitForFunction(function waitForVideoReady() {
        return document.querySelector('#courseRecapVideo').readyState >= 1;
      });
      const video = page.locator('#courseRecapVideo');
      const poster = await video.getAttribute('poster');
      const response = await page.request.get(poster);
      assert.equal(response.status(), 200);
      assert.match(response.headers()['content-type'], /^image\//);
      await video.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `docs/qa/course-video-${width}.png` });
      await video.evaluate(async function playVideo(element) {
        element.muted = true;
        await element.play();
      });
      await page.waitForFunction(function waitForPlayback() {
        return document.querySelector('#courseRecapVideo').currentTime > 0.5;
      });
      await video.evaluate(function seekVideo(element) {
        element.currentTime = 120;
      });
      await page.waitForFunction(function waitForSeek() {
        const element = document.querySelector('#courseRecapVideo');
        return !element.seeking && element.currentTime >= 120 && element.readyState >= 2;
      });
      assert.equal(await page.locator('#courseRecapError').isVisible(), false);
      await video.evaluate(function pauseVideo(element) {
        element.pause();
      });
      await page.route('**/assets/courses/course-recap.mp4*', function mockMissingVideo(route) {
        return route.fulfill({ status: 404 });
      });
      await video.evaluate(function loadMissingVideo(element) {
        element.src += '?missing';
        element.load();
      });
      await page.locator('#courseRecapError').waitFor({ state: 'visible' });
      await page.unroute('**/assets/courses/course-recap.mp4*');
      await video.evaluate(function restoreVideo(element) {
        element.src = element.src.split('?')[0];
        element.load();
      });
      await page.waitForFunction(function waitForRestoredVideo() {
        return document.querySelector('#courseRecapVideo').readyState >= 1;
      });
      assert.equal(await page.locator('#courseRecapError').isVisible(), false);
      console.log(`${width}px: poster, playback, seeking, error and recovery passed`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

verifyCourseVideo().catch(function reportCourseVideoFailure(error) {
  console.error(error);
  process.exitCode = 1;
});
