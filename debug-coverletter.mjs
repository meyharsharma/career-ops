#!/usr/bin/env node
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://job-boards.greenhouse.io/arizeai/jobs/5797408004', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  try { await page.locator('button:has-text("Apply")').first().click(); } catch (e) { await page.locator('a:has-text("Apply")').first().click(); }
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Find all elements containing "Enter manually"
  const info = await page.evaluate(() => {
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.textContent.trim() === 'Enter manually' && el.children.length === 0) {
        results.push({
          tag: el.tagName,
          classes: el.className,
          id: el.id,
          role: el.getAttribute('role'),
          href: el.getAttribute('href'),
          type: el.getAttribute('type'),
          parentTag: el.parentElement?.tagName,
          parentClass: el.parentElement?.className,
          grandparentTag: el.parentElement?.parentElement?.tagName,
          grandparentClass: el.parentElement?.parentElement?.className,
          visible: el.offsetParent !== null,
          text: el.textContent.trim(),
        });
      }
    }
    return results;
  });

  console.log(`\nFound ${info.length} "Enter manually" elements:\n`);
  for (const el of info) {
    console.log(JSON.stringify(el, null, 2));
    console.log('---');
  }

  // Also find anything near "Cover Letter" text
  const coverLetterInfo = await page.evaluate(() => {
    const results = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.textContent.trim() === 'Cover Letter' && el.children.length === 0) {
        const parent = el.parentElement;
        const siblings = parent ? Array.from(parent.children).map(c => ({
          tag: c.tagName,
          text: c.textContent.trim().slice(0, 50),
          class: c.className,
        })) : [];
        results.push({ tag: el.tagName, class: el.className, siblings });
      }
    }
    return results;
  });

  console.log('\n"Cover Letter" label context:\n');
  for (const cl of coverLetterInfo) {
    console.log(JSON.stringify(cl, null, 2));
  }

  await browser.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
