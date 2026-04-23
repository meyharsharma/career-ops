#!/usr/bin/env node
import { chromium } from 'playwright';
const jobUrl = process.argv[2] || 'https://job-boards.greenhouse.io/gleanwork/jobs/4501783005';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  try { await page.locator('button:has-text("Apply")').first().click(); } catch (e) { await page.locator('a:has-text("Apply")').first().click(); }
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Find all textareas and their surrounding context
  const info = await page.evaluate(() => {
    const tas = document.querySelectorAll('textarea');
    const results = [];
    for (const ta of tas) {
      const id = ta.id || '(no id)';
      const name = ta.name || '(no name)';
      const placeholder = ta.placeholder || '(no placeholder)';

      // Walk up to find label
      let labelText = '';
      let el = ta;
      for (let i = 0; i < 5; i++) {
        el = el.parentElement;
        if (!el) break;
        const label = el.querySelector('label, legend, strong');
        if (label) { labelText = label.textContent.trim(); break; }
      }

      // Also check aria-label and aria-labelledby
      const ariaLabel = ta.getAttribute('aria-label') || '';
      const ariaLabelledBy = ta.getAttribute('aria-labelledby') || '';

      // Check preceding element
      const prev = ta.previousElementSibling;
      const prevText = prev ? prev.textContent.trim().slice(0, 100) : '';

      results.push({ id, name, placeholder, labelText, ariaLabel, ariaLabelledBy, prevText });
    }
    return results;
  });

  console.log(`\n📋 Found ${info.length} textareas:\n`);
  for (const t of info) {
    console.log(`  id: ${t.id}`);
    console.log(`  name: ${t.name}`);
    console.log(`  placeholder: ${t.placeholder}`);
    console.log(`  label: ${t.labelText}`);
    console.log(`  aria-label: ${t.ariaLabel}`);
    console.log(`  prev sibling: ${t.prevText}`);
    console.log('  ---');
  }

  // Also find all inputs that might be textareas disguised as inputs
  const inputs = await page.evaluate(() => {
    const allInputs = document.querySelectorAll('input[type="text"]');
    return Array.from(allInputs).map(inp => {
      let el = inp;
      let labelText = '';
      for (let i = 0; i < 5; i++) {
        el = el.parentElement;
        if (!el) break;
        const label = el.querySelector('label, legend, strong');
        if (label) { labelText = label.textContent.trim(); break; }
      }
      return { name: inp.name, placeholder: inp.placeholder, value: inp.value, labelText };
    }).filter(x => !x.value); // only unfilled
  });

  console.log(`\n📋 Unfilled text inputs:\n`);
  for (const inp of inputs) {
    if (inp.labelText) console.log(`  "${inp.labelText}" (name=${inp.name}, placeholder=${inp.placeholder})`);
  }

  await browser.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
