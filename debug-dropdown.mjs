#!/usr/bin/env node
import { chromium } from 'playwright';

const jobUrl = process.argv[2] || 'https://job-boards.greenhouse.io/gleanwork/jobs/4501783005';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Apply
  try {
    await page.locator('button:has-text("Apply")').first().click();
  } catch (e) {
    await page.locator('a:has-text("Apply")').first().click();
  }
  await page.waitForTimeout(3000);

  // Scroll to bottom to load all fields
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Find the Disability Status dropdown and click it
  const found = await page.evaluate(() => {
    const allElements = document.querySelectorAll('label, legend, strong, span, div');
    for (const el of allElements) {
      const t = el.textContent.trim();
      if (t === 'Disability Status' || t === 'Disability Status\nSelect...') {
        let container = el.closest('.field') || el.parentElement;
        const divs = container.querySelectorAll('div, span');
        for (const d of divs) {
          if (d.textContent.trim() === 'Select...' && d.offsetParent !== null) {
            d.setAttribute('data-gh-target', 'true');
            return true;
          }
        }
      }
    }
    return false;
  });

  if (found) {
    await page.locator('[data-gh-target="true"]').first().click();
    await page.waitForTimeout(500);

    // Read all options
    const options = await page.evaluate(() => {
      const opts = document.querySelectorAll('[role="option"], [class*="option"] div, [class*="menu"] div');
      return Array.from(opts).map(o => o.textContent.trim()).filter(t => t.length > 0 && t.length < 200);
    });

    console.log('\n📋 Disability Status dropdown options:');
    for (const opt of options) {
      console.log(`  "${opt}"`);
    }
  } else {
    console.log('Could not find Disability Status dropdown');
  }

  // Also read ALL dropdown labels and their current values
  console.log('\n📋 All "Select..." dropdowns on page:');
  const dropdowns = await page.evaluate(() => {
    const results = [];
    const selectTexts = document.querySelectorAll('div, span');
    for (const el of selectTexts) {
      if (el.textContent.trim() === 'Select...' && el.offsetParent !== null) {
        let container = el.closest('.field') || el.parentElement?.parentElement;
        if (container) {
          const label = container.querySelector('label, legend, strong');
          if (label) {
            results.push(label.textContent.trim());
          }
        }
      }
    }
    return results;
  });
  for (const d of dropdowns) {
    console.log(`  Still unfilled: "${d}"`);
  }

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
