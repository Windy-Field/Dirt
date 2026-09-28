const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = playwright.chromium;
const assert = require('node:assert/strict');
const path = require('node:path');

async function verifyCursorDebris() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const motionPreferences = ['no-preference', 'reduce'];
    for (let motionIndex = 0; motionIndex < motionPreferences.length; motionIndex += 1) {
      const reducedMotion = motionPreferences[motionIndex];
      const page = await browser.newPage({ reducedMotion });
      await page.setContent('<html data-motion="60"><body style="height:100vh;background:#eee"><div id="openingLoader" style="position:fixed;inset:0;z-index:9999;background:#202020"></div><button>Test</button></body></html>');
      await page.addStyleTag({ path: path.resolve('css/06-enhancements.css') });
      await page.addScriptTag({ path: path.resolve('.runtime/js/cursor-debris.js') });
      await page.mouse.move(120, 120);
      await page.waitForTimeout(35);
      await page.mouse.move(140, 125);
      const count = await page.locator('.cursor-clay-debris').count();
      assert.equal(count, reducedMotion === 'reduce' ? 0 : 4);
      if (count) {
        const sizes = await page.locator('.cursor-clay-debris').evaluateAll(function readParticleSizes(elements) {
          const result = [];
          for (let index = 0; index < elements.length; index += 1) {
            result.push(parseFloat(elements[index].style.width));
          }
          return result;
        });
        for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex += 1) {
          assert.ok(sizes[sizeIndex] >= 6 && sizes[sizeIndex] <= 8);
        }
        assert.equal(await page.locator('.cursor-clay-debris').first().evaluate(function readPointerEvents(element) {
          return getComputedStyle(element).pointerEvents;
        }), 'none');
        assert.ok(Number(await page.locator('.cursor-clay-debris').first().evaluate(function readZIndex(element) {
          return getComputedStyle(element).zIndex;
        })) > 9999);
        await page.screenshot({ path: path.join(process.env.TEMP, 'cursor-debris-check.png') });
      }
      await page.waitForTimeout(850);
      assert.equal(await page.locator('.cursor-clay-debris').count(), 0);
      await page.evaluate(function disableMotion() {
        document.documentElement.dataset.motion = '0';
      });
      await page.mouse.move(180, 160);
      assert.equal(await page.locator('.cursor-clay-debris').count(), 0);
      await page.close();
    }
    const touchSettings = [false, true];
    for (let touchIndex = 0; touchIndex < touchSettings.length; touchIndex += 1) {
      const hasTouch = touchSettings[touchIndex];
      const page = await browser.newPage({ hasTouch });
      await page.setContent('<html data-motion="60"><body><input id="cursorTrailEnabled" type="checkbox"><input id="cursorTrailSize" type="range" min="2" max="8"><input id="cursorTrailDensity" type="range" min="1" max="4"><output id="cursorTrailSizeValue"></output><output id="cursorTrailDensityValue"></output><p id="cursorTrailLockNote" hidden></p></body></html>');
      await page.addScriptTag({ path: path.resolve('.runtime/js/cursor-debris.js') });
      assert.equal(await page.locator('#cursorTrailEnabled').isDisabled(), hasTouch);
      assert.equal(await page.locator('#cursorTrailEnabled').isChecked(), !hasTouch);
      if (!hasTouch) {
        await page.locator('#cursorTrailSize').evaluate(function changeTrailSize(input) {
          input.value = '7';
          input.dispatchEvent(new Event('input'));
        });
        assert.equal(await page.locator('#cursorTrailSizeValue').textContent(), '7～9 px');
        await page.locator('#cursorTrailEnabled').uncheck();
        assert.equal(await page.locator('#cursorTrailDensity').isDisabled(), true);
        await page.evaluate(function resetMediaSettings() {
          window.dispatchEvent(new Event('media-settings-reset'));
        });
        assert.equal(await page.locator('#cursorTrailEnabled').isChecked(), true);
        assert.equal(await page.locator('#cursorTrailSize').inputValue(), '6');
        assert.equal(await page.locator('#cursorTrailDensity').inputValue(), '4');
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#cursorTrailEnabled').isDisabled(), true);
        assert.equal(await page.locator('#cursorTrailEnabled').isChecked(), false);
      }
      await page.close();
    }
    console.log('Cursor emission, cleanup, click-through and reduced motion passed.');
  } finally {
    await browser.close();
  }
}
verifyCursorDebris().catch(function reportFailure(error) { console.error(error); process.exitCode = 1; });
