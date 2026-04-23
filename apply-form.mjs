#!/usr/bin/env node

/**
 * apply-form.mjs — Fill ALL Greenhouse fields including React custom dropdowns
 * Uses page.evaluate() to inspect DOM structure and precise clicking.
 * STOPS before submit.
 *
 * Usage: node apply-form.mjs <job-url> <resume-pdf-path>
 */

import { chromium } from 'playwright';
import { resolve } from 'path';

const jobUrl = process.argv[2];
const resumePath = process.argv[3] ? resolve(process.argv[3]) : null;

if (!jobUrl) {
  console.error('Usage: node apply-form.mjs <job-url> [resume-pdf-path]');
  process.exit(1);
}

const candidate = {
  firstName: 'Meyhar',
  lastName: 'Sharma',
  email: 'meyharsharma@yahoo.com',
  phone: '5513714585',
  linkedin: 'https://linkedin.com/in/meyhar-sharma-b97a78211',
  github: 'https://github.com/meyharsharma',
  location: 'Jersey City, NJ',
  website: 'https://github.com/meyharsharma',
};

/**
 * Greenhouse custom dropdown filler.
 * Strategy:
 *   1. Find the label element matching the question text
 *   2. Find the closest "Select..." clickable element within the same question block
 *   3. Click it to open the dropdown menu
 *   4. Wait for options to render
 *   5. Find and click the exact matching option
 */
async function ghDropdown(page, questionText, answerText, label) {
  try {
    // Use page.evaluate to find the exact "Select..." trigger for this question
    const triggerIndex = await page.evaluate((qText) => {
      // Find all elements that contain the question text
      const allElements = document.querySelectorAll('label, legend, strong, span, div');
      for (const el of allElements) {
        const t = el.textContent.trim();
        // Match question text but skip huge containers
        if (t.length < 200 && t.includes(qText)) {
          // Walk up to find the question container
          let container = el.closest('.field') || el.closest('[class*="question"]') || el.parentElement?.parentElement;
          if (!container) container = el.parentElement;

          // Find "Select..." inside this container
          const selectTriggers = container.querySelectorAll('[class*="placeholder"], [class*="single-value"], [class*="control"], [class*="indicator"]');
          // Also try finding the div that says "Select..."
          const allDivs = container.querySelectorAll('div, span');
          for (const d of allDivs) {
            if (d.textContent.trim() === 'Select...' && d.offsetParent !== null) {
              // Mark this element for clicking
              d.setAttribute('data-gh-target', 'true');
              return true;
            }
          }
          // Try clicking any react-select control
          for (const st of selectTriggers) {
            if (st.offsetParent !== null) {
              st.setAttribute('data-gh-target', 'true');
              return true;
            }
          }
        }
      }
      return false;
    }, questionText);

    if (!triggerIndex) {
      console.log(`  ⚠️  ${label}: question not found on page`);
      return false;
    }

    // Click the marked trigger
    const trigger = page.locator('[data-gh-target="true"]').first();
    await trigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await trigger.click();
    await page.waitForTimeout(400);

    // Remove the marker
    await page.evaluate(() => {
      document.querySelectorAll('[data-gh-target]').forEach(el => el.removeAttribute('data-gh-target'));
    });

    // Now find the option in the dropdown that appeared
    // Greenhouse dropdown options are usually in a menu that appears with role="option" or in a list
    // Try multiple strategies to find and click the right option

    // Strategy 1: role="option" with matching text
    let clicked = false;
    const options = page.locator('[role="option"]');
    const optCount = await options.count();
    for (let i = 0; i < optCount; i++) {
      const opt = options.nth(i);
      const optText = (await opt.textContent()).trim();
      if (optText === answerText) {
        await opt.click();
        console.log(`  ✅ ${label}: ${answerText}`);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Strategy 2: any visible element that exactly matches the answer text in a menu/list
      const menuItems = page.locator('[class*="option"], [class*="menu"] div, [class*="list"] div, li');
      const menuCount = await menuItems.count();
      for (let i = 0; i < menuCount; i++) {
        const item = menuItems.nth(i);
        try {
          const itemText = (await item.textContent({ timeout: 200 })).trim();
          if (itemText === answerText && await item.isVisible({ timeout: 200 })) {
            await item.click();
            console.log(`  ✅ ${label}: ${answerText}`);
            clicked = true;
            break;
          }
        } catch (e) { /* continue */ }
      }
    }

    if (!clicked) {
      // Strategy 3: partial text match
      const allVisible = page.locator('[role="option"], [class*="option"]');
      const allCount = await allVisible.count();
      for (let i = 0; i < allCount; i++) {
        const el = allVisible.nth(i);
        try {
          const elText = (await el.textContent({ timeout: 200 })).trim();
          if (elText.includes(answerText) && elText.length < 100 && await el.isVisible({ timeout: 200 })) {
            await el.click();
            console.log(`  ✅ ${label}: ${elText}`);
            clicked = true;
            break;
          }
        } catch (e) { /* continue */ }
      }
    }

    if (!clicked) {
      await page.keyboard.press('Escape');
      console.log(`  ⚠️  ${label}: dropdown opened but option "${answerText}" not found`);
    }

    await page.waitForTimeout(300);
    return clicked;
  } catch (e) {
    console.log(`  ⚠️  ${label}: error - ${e.message.slice(0, 80)}`);
    return false;
  }
}

async function fillInput(page, selectors, value, label) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 })) {
        await el.fill(value);
        console.log(`  ✅ ${label}: ${value}`);
        return true;
      }
    } catch (e) { /* next */ }
  }
  // Fallback by label text
  try {
    const lbl = page.locator(`label:has-text("${label}")`).first();
    if (await lbl.isVisible({ timeout: 500 })) {
      const forAttr = await lbl.getAttribute('for');
      if (forAttr) {
        await page.locator(`#${forAttr}`).fill(value);
        console.log(`  ✅ ${label}: ${value}`);
        return true;
      }
      const input = lbl.locator('xpath=following::input[1]').first();
      if (await input.isVisible({ timeout: 300 })) {
        await input.fill(value);
        console.log(`  ✅ ${label}: ${value}`);
        return true;
      }
    }
  } catch (e) { /* silent */ }
  return false;
}

// Question -> Answer map. Patterns are checked with case-insensitive includes.
const QA_BANK = [
  {
    keywords: ['years of full-time work experience', 'years after graduation', 'post-grad experience', 'years post graduation'],
    answer: '0-1 years',
  },
  {
    keywords: ['total years of experience', 'years of relevant experience', 'years of experience that are relevant'],
    answer: '2',
  },
  {
    keywords: ['ai tools are you currently using', 'what ai tools', 'ai tools today', 'how are you using ai', 'using ai today', 'ai in your current role', 'last ai experiment', 'current use of ai'],
    answer: 'At mcSquared AI, I\'m architecting a multi-agent AI compliance monitoring system on GCP with Pinecone. The system uses LLMs (Ollama, Gemma) for contract ingestion and SLA extraction, vector embeddings for semantic search across legal documents, and autonomous agents for violation detection. My most recent personal project is FrostMail — a cold email generator using Llama 3.3 and ChromaDB for vector-based retrieval. I also use Claude and ChatGPT daily for code review and research. GitHub: https://github.com/meyharsharma',
  },
  {
    keywords: ['years of experience with python', 'python experience'],
    answer: '4',
  },
  {
    keywords: ['salary expectation', 'compensation expectation', 'desired salary', 'salary range'],
    answer: '$80,000 - $120,000',
  },
  {
    keywords: ['when can you start', 'start date', 'earliest available', 'preferred start date'],
    answer: 'Within 2 weeks of offer acceptance',
  },
  {
    keywords: ['cover letter', 'letter of interest'],
    answer: 'I\'m drawn to this role because it sits at the intersection of building and shipping AI systems — which is exactly what I do.\n\nAt mcSquared AI, I\'m architecting a multi-agent compliance monitoring system on GCP with Pinecone, handling the full pipeline from document ingestion to autonomous violation detection. Before that, at NYC Administration for Children\'s Services, I built ML pipelines that predict severe harm risk in child welfare cases — my model was selected for firm-wide deployment. At Columbia, I used LLMs (Ollama, Gemma) for geopolitical data mining research.\n\nI ship things, learn from them, and make them better. My MS in Data Science from Columbia gave me depth in deep learning, NLP, and reinforcement learning. The real-world roles gave me the pragmatism. I\'d love to bring both to your team.\n\nI\'m available to start within 2 weeks and am open to relocation anywhere in the US.',
  },
  {
    keywords: ['know anyone', 'do you know anyone', 'referred by'],
    answer: 'No',
  },
  {
    keywords: ['why you\'re excited', 'why are you excited', 'reasons why you', 'why are you interested', 'why do you want to work', 'why this role', 'why are you applying', 'excited to apply'],
    answer: 'I\'m excited about this role because it sits at the intersection of building AI systems and shipping them to real users. My current work at mcSquared AI involves architecting a multi-agent compliance system on GCP with Pinecone — building, evaluating, and deploying AI systems end-to-end. At NYC ACS, my ML pipelines were selected for firm-wide deployment, so I know what it takes to ship models that people rely on. I want to bring this hands-on building mindset to a company that\'s using AI to solve real product problems, not just experimenting with it.',
  },
  {
    keywords: ['used airtable', 'experience with airtable'],
    answer: 'Yes, I\'ve used Airtable for project tracking and structured data management in personal projects. I appreciate how it bridges the gap between spreadsheets and databases, making structured data accessible to non-technical users. The AI-powered features are what excite me most about where the product is heading.',
  },
  {
    keywords: ['relocate', 'relocation', 'currently located near', 'plan to relocate', 'office locations'],
    answer: 'Yes, I am open to relocation to any of your office locations',
  },
  {
    keywords: ['visa sponsorship', 'require sponsorship', 'need sponsorship', 'require visa', 'sponsorship for employment'],
    answer: 'Yes',
  },
  {
    keywords: ['authorized to work', 'work authorization', 'legally authorized'],
    answer: 'Yes',
  },
  // Orchard Robotics specific
  {
    keywords: ['exceptional work', 'what exceptional work have you done'],
    answer: 'At NYC Administration for Children\'s Services, I built ML pipelines that predict severe harm risk in child welfare cases. My model and configuration were selected for firm-wide deployment — meaning the system I built now helps caseworkers across the city make better decisions about child safety. I owned the entire pipeline from feature engineering to hyperparameter tuning to deployment in Docker + MongoDB. Currently at mcSquared AI, I\'m architecting a multi-agent AI compliance system on GCP with Pinecone from scratch — no templates, no existing codebase, just a problem and the freedom to solve it.',
  },
  {
    keywords: ['traditional industry', 'customers are farmers', 'non-tech background'],
    answer: 'My background spans consulting at Deloitte (operations analytics for FedEx), government services (ML for child welfare at NYC ACS), and academic research (geopolitical data mining at Columbia). I\'ve consistently worked in domains where the end users aren\'t engineers — caseworkers, business analysts, researchers. This taught me to build systems that are robust, interpretable, and actually useful to people who don\'t care about the model architecture, they care about the output.',
  },
  {
    keywords: ['current/most recent company', 'company name'],
    answer: 'mcSquared AI',
  },
  {
    keywords: ['current/most recent job title', 'job title'],
    answer: 'AI Engineer Trainee',
  },
  {
    keywords: ['favorite fruit'],
    answer: 'Mango',
  },
  {
    keywords: ['name'],
    answer: 'Meyhar Sharma',
  },
  {
    keywords: ['twitter', 'x profile'],
    answer: 'N/A',
  },
  {
    keywords: ['decode the following', 'decode', 'base64'],
    answer: '__DECODE_BASE64__',  // special marker — script will extract and decode the base64 string
  },
  // Anthropic STEM Fellow specific
  {
    keywords: ['stem field', 'most expertise', 'depth of knowledge'],
    answer: 'Data Science and Applied Machine Learning. My MS in Data Science from Columbia University (GPA 3.3/4) covered Applied ML, Deep Learning, Reinforcement Learning, and Data Visualization. My undergrad at NMIMS was in Applied Statistics & Analytics (CGPA 3.84/4). I have depth in NLP (BERT, LLMs, embeddings), ML pipeline design (feature engineering, hyperparameter tuning, model evaluation), and multi-agent AI systems. My research at Columbia used LLMs for geopolitical data mining, and my NLP project involved comparative evaluation of BERT, RNN, LSTM, and classical classifiers for sarcasm detection.',
  },
  {
    keywords: ['experience you have with ml', 'experience with ml/ai', 'training custom model'],
    answer: 'At mcSquared AI, I\'m architecting a multi-agent AI compliance monitoring system on GCP with Pinecone — using LLMs for contract ingestion and SLA extraction, vector embeddings for semantic search, and autonomous agents for violation detection. At NYC Administration for Children\'s Services, I built end-to-end ML pipelines with Random Forest models for harm prediction — my model was selected for firm-wide deployment. I trained and evaluated models using feature importance analysis, hyperparameter tuning, and deployed via Docker + MongoDB. At Columbia, I worked with LLMs (Ollama, Gemma, Perplexity) for data mining and built NLP models using BERT and OpenAI embeddings. Personal projects include FrostMail (Llama 3.3 + ChromaDB for cold email generation).',
  },
  {
    keywords: ['claude code', 'agentic coding', 'similar agentic'],
    answer: 'I use Claude Code as my primary development tool for the multi-agent compliance system I\'m building at mcSquared AI. I use it for architecture design, writing GCP Cloud Functions, debugging Pinecone integrations, and iterating on agent workflows. I also use it for research — exploring LangChain patterns, prompt engineering, and evaluation framework design. Beyond Claude Code, I\'ve built agentic systems using LangChain and have experience with LLM orchestration, tool use, and multi-step reasoning pipelines. I\'m comfortable working in fast iteration loops with AI coding tools and understand both their capabilities and limitations.',
  },
  {
    keywords: ['propose one or two concrete ideas', 'evaluating, improving', 'applying claude'],
    answer: 'Idea 1: Evaluate Claude\'s ability to extract structured data from messy real-world documents (legal contracts, medical records, research papers). I\'d design an eval framework that measures extraction accuracy, hallucination rates, and consistency across document types — building on my experience extracting SLAs from legal contracts at mcSquared AI. The goal would be to identify where Claude fails on edge cases and propose targeted improvements.\n\nIdea 2: Build an evaluation pipeline for Claude\'s performance as a coding agent in data science workflows — specifically measuring how well it handles end-to-end ML tasks (data cleaning, feature engineering, model selection, evaluation). I\'d benchmark against real Kaggle datasets and compare Claude-generated pipelines to human-written baselines, measuring code quality, model performance, and iteration efficiency.',
  },
  {
    keywords: ['provide two references', 'references that can speak', 'past work and experience'],
    answer: 'I can provide references upon request from my supervisors at mcSquared AI and NYC Administration for Children\'s Services.',
  },
];

// Backwards-compat alias
const textareaAnswers = QA_BANK.map(qa => ({ patterns: qa.keywords, answer: qa.answer }));

async function fillTextareas(page) {
  // Scan ALL textareas and text inputs, find their question label, match against QA_BANK
  try {
    // Mark every empty textarea and text input with a unique data attribute
    // and capture its label text
    const fieldsToFill = await page.evaluate(() => {
      const results = [];
      let counter = 0;

      // Helper to find the question label for a field
      function findLabel(field) {
        // Try aria-label first
        const aria = field.getAttribute('aria-label');
        if (aria && aria.trim()) return aria.trim();

        // Try aria-labelledby
        const labelledBy = field.getAttribute('aria-labelledby');
        if (labelledBy) {
          const labelEl = document.getElementById(labelledBy);
          if (labelEl) return labelEl.textContent.trim();
        }

        // Try associated <label for=>
        if (field.id) {
          const lbl = document.querySelector(`label[for="${field.id}"]`);
          if (lbl) return lbl.textContent.trim();
        }

        // Walk up parents looking for a label/legend/strong
        let el = field;
        for (let i = 0; i < 6; i++) {
          el = el.parentElement;
          if (!el) break;
          // Look for direct label child first
          for (const child of el.children) {
            if (['LABEL', 'LEGEND', 'STRONG'].includes(child.tagName)) {
              const t = child.textContent.trim();
              if (t && t.length < 300) return t;
            }
          }
          // Look for any descendant label
          const lbl = el.querySelector('label, legend, strong');
          if (lbl) {
            const t = lbl.textContent.trim();
            if (t && t.length < 300) return t;
          }
        }
        return '';
      }

      // Process textareas
      const tas = document.querySelectorAll('textarea:not([name="g-recaptcha-response"])');
      for (const ta of tas) {
        if (ta.offsetParent === null) continue; // hidden
        if (ta.value && ta.value.trim()) continue; // already filled
        const label = findLabel(ta);
        if (!label) continue;
        const marker = `gh-fill-${counter++}`;
        ta.setAttribute('data-gh-fill', marker);
        results.push({ marker, label, type: 'textarea' });
      }

      // Process text inputs
      const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
      for (const inp of inputs) {
        if (inp.offsetParent === null) continue;
        if (inp.value && inp.value.trim()) continue;
        // Skip name/email/phone/location/linkedin/website (already handled)
        const skipNames = ['first_name', 'last_name', 'email', 'phone', 'location', 'city', 'linkedin', 'website', 'portfolio', 'github'];
        const inpName = (inp.name || inp.id || inp.placeholder || '').toLowerCase();
        if (skipNames.some(s => inpName.includes(s))) continue;
        const label = findLabel(inp);
        if (!label) continue;
        // Skip basic fields by label too
        const labelLower = label.toLowerCase();
        if (skipNames.some(s => labelLower.includes(s)) && !labelLower.includes('experience') && !labelLower.includes('year')) continue;
        const marker = `gh-fill-${counter++}`;
        inp.setAttribute('data-gh-fill', marker);
        results.push({ marker, label, type: 'input' });
      }

      return results;
    });

    // Now match each field against QA_BANK and fill via Playwright
    for (const field of fieldsToFill) {
      const labelLower = field.label.toLowerCase();
      let matched = null;
      for (const qa of QA_BANK) {
        if (qa.keywords.some(k => labelLower.includes(k.toLowerCase()))) {
          matched = qa;
          break;
        }
      }
      if (matched) {
        try {
          await page.locator(`[data-gh-fill="${field.marker}"]`).fill(matched.answer);
          console.log(`  ✅ "${field.label.slice(0, 70)}": filled`);
        } catch (e) {
          console.log(`  ⚠️  "${field.label.slice(0, 70)}": fill failed - ${e.message.slice(0, 40)}`);
        }
      } else {
        console.log(`  ⚠️  "${field.label.slice(0, 70)}": no QA match`);
      }
    }

    // Clean up markers
    await page.evaluate(() => {
      document.querySelectorAll('[data-gh-fill]').forEach(el => el.removeAttribute('data-gh-fill'));
    });
  } catch (e) {
    console.log(`  ⚠️  Question fill error: ${e.message.slice(0, 80)}`);
  }
}

async function main() {
  console.log('🌐 Opening browser...');
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  console.log(`📄 Navigating to: ${jobUrl}`);
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Apply
  for (const sel of ['button:has-text("Apply")', 'a:has-text("Apply")']) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); console.log('✅ Clicked Apply\n'); break; }
    } catch (e) { /* next */ }
  }
  await page.waitForTimeout(3000);

  // Scroll full page to trigger lazy-loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  console.log('📝 Filling text fields...\n');

  await fillInput(page, ['#first_name', 'input[name="first_name"]'], candidate.firstName, 'First Name');
  await fillInput(page, ['#last_name', 'input[name="last_name"]'], candidate.lastName, 'Last Name');
  await fillInput(page, ['#email', 'input[name="email"]', 'input[type="email"]'], candidate.email, 'Email');
  await fillInput(page, ['#phone', 'input[name="phone"]', 'input[type="tel"]'], candidate.phone, 'Phone');
  // Location — type and wait for autocomplete dropdown, then select
  try {
    const locSelectors = ['input[name*="location"]', 'input[placeholder*="Location"]', 'input[placeholder*="City"]', 'input[id*="location"]'];
    for (const sel of locSelectors) {
      const locInput = page.locator(sel).first();
      if (await locInput.isVisible({ timeout: 800 }).catch(() => false)) {
        await locInput.click();
        await locInput.fill('');
        await locInput.type('Jersey City', { delay: 50 });
        await page.waitForTimeout(1000);
        // Click the first autocomplete suggestion
        const suggestion = page.locator('[role="option"], [class*="suggestion"], [class*="autocomplete"] div, [class*="dropdown"] div, li').filter({ hasText: 'Jersey City' }).first();
        if (await suggestion.isVisible({ timeout: 1500 }).catch(() => false)) {
          await suggestion.click();
          console.log('  ✅ Location: Jersey City, NJ (from dropdown)');
        } else {
          console.log('  ✅ Location: Jersey City, NJ (typed)');
        }
        break;
      }
    }
    // Fallback: try by label
    if (true) {
      const locLabel = page.locator('label:has-text("Location"), label:has-text("City")').first();
      if (await locLabel.isVisible({ timeout: 500 }).catch(() => false)) {
        const forAttr = await locLabel.getAttribute('for');
        if (forAttr) {
          const locField = page.locator(`#${forAttr}`);
          const val = await locField.inputValue().catch(() => '');
          if (!val) {
            await locField.click();
            await locField.type('Jersey City', { delay: 50 });
            await page.waitForTimeout(1000);
            const sugg = page.locator('[role="option"], li').filter({ hasText: 'Jersey City' }).first();
            if (await sugg.isVisible({ timeout: 1000 }).catch(() => false)) {
              await sugg.click();
              console.log('  ✅ Location: Jersey City, NJ (from dropdown, label fallback)');
            }
          }
        }
      }
    }
  } catch (e) { console.log(`  ⚠️  Location: ${e.message.slice(0, 50)}`); }
  await fillInput(page, ['input[name*="linkedin"]', 'input[placeholder*="LinkedIn"]'], candidate.linkedin, 'LinkedIn Profile');
  await fillInput(page, ['input[name*="website"]', 'input[placeholder*="Website"]'], candidate.website, 'Website');

  // Upload resume
  if (resumePath) {
    console.log('\n📎 Uploading resume...');
    try {
      const fi = page.locator('input[type="file"]');
      if (await fi.count() > 0) { await fi.first().setInputFiles(resumePath); console.log('  ✅ Resume uploaded'); }
    } catch (e) { console.log('  ⚠️  Upload manually'); }
  }

  // === TEXTAREAS ===
  console.log('\n📝 Filling text questions...\n');
  await fillTextareas(page);

  console.log('\n📋 Filling dropdowns...\n');

  // Country
  await ghDropdown(page, 'Country', 'United States', 'Country');

  // Sponsorship
  await ghDropdown(page, 'require sponsorship', 'Yes', 'Sponsorship');

  // Work authorization
  await ghDropdown(page, 'legally authorized to work', 'Yes', 'Work Authorization');

  // Pronouns
  await ghDropdown(page, 'pronouns do you use', 'She/Her/Hers', 'Pronouns');

  // Hybrid policy (Glean-specific)
  await ghDropdown(page, 'hybrid policy', 'Yes', 'Hybrid Policy');

  // How did you hear (common question)
  await ghDropdown(page, 'How did you hear', 'Company Career Page', 'How did you hear');
  await ghDropdown(page, 'How did you hear', 'Job Board', 'How did you hear');
  await ghDropdown(page, 'How did you hear', 'Other', 'How did you hear');

  // Gender (Voluntary section)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await ghDropdown(page, 'Gender', 'Female', 'Gender');

  // Hispanic/Latino
  await ghDropdown(page, 'Hispanic/Latino', 'No', 'Hispanic/Latino');

  // Wait for race question to appear after Hispanic = No
  await page.waitForTimeout(500);

  // Race
  await ghDropdown(page, 'race', 'Asian', 'Race');
  await ghDropdown(page, 'identify your race', 'Asian', 'Race (specific)');

  // Veteran
  await ghDropdown(page, 'Veteran', 'I am not a protected veteran', 'Veteran Status');

  // Disability
  await ghDropdown(page, 'Disability', 'No, I do not have a disability and have not had one in the past', 'Disability');

  // Relocation
  await ghDropdown(page, 'relocat', 'Yes', 'Relocation');
  await ghDropdown(page, 'plan to relocate', 'Yes', 'Plan to relocate');

  // Visa sponsorship (if dropdown)
  await ghDropdown(page, 'visa sponsorship', 'Yes', 'Visa Sponsorship');

  // Years of full-time work experience after graduation
  await ghDropdown(page, 'years of full-time work experience', '0-1', 'Years post-grad');
  await ghDropdown(page, 'years of full-time work experience', '0-1 years', 'Years post-grad');
  await ghDropdown(page, 'years of full-time work experience', 'Less than 1 year', 'Years post-grad');
  await ghDropdown(page, 'years of full-time work experience', '1 year', 'Years post-grad');

  // === COVER LETTER ===
  console.log('\n📝 Checking for cover letter field...\n');
  try {
    // Scroll to find cover letter section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Count textareas BEFORE clicking "Enter manually"
    const tasBefore = await page.locator('textarea:not([name="g-recaptcha-response"])').count();

    // Find the "Enter manually" button in the COVER LETTER section
    // Structure: div contains "Cover Letter" label + div.file-upload__wrapper with 4 buttons
    // We need the button whose text is exactly "Enter manually" inside the Cover Letter wrapper
    const found = await page.evaluate(() => {
      // Find all elements that say "Cover Letter" exactly
      const allEls = document.querySelectorAll('div, label, strong, span');
      for (const el of allEls) {
        const t = el.textContent.trim();
        if (t === 'Cover Letter' && el.children.length === 0) {
          // Found the label. Now find sibling/parent container with buttons
          const container = el.parentElement;
          if (!container) continue;
          // Look for all buttons in the sibling wrapper
          const wrapper = container.nextElementSibling || container.parentElement;
          const buttons = (wrapper || container).querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.trim() === 'Enter manually' && btn.offsetParent !== null) {
              btn.setAttribute('data-cl-enter', 'true');
              return true;
            }
          }
          // Also check parent's children
          const parentButtons = container.parentElement?.querySelectorAll('button') || [];
          for (const btn of parentButtons) {
            if (btn.textContent.trim() === 'Enter manually' && btn.offsetParent !== null) {
              // Make sure this isn't the Resume section's button
              // Check if this button is AFTER the Cover Letter label in DOM order
              const labelRect = el.getBoundingClientRect();
              const btnRect = btn.getBoundingClientRect();
              if (btnRect.top > labelRect.top) {
                btn.setAttribute('data-cl-enter', 'true');
                return true;
              }
            }
          }
        }
      }
      return false;
    });

    let enterManually;
    if (found) {
      enterManually = page.locator('[data-cl-enter="true"]').first();
    } else {
      // Fallback: get the LAST "Enter manually" button on the page
      const allBtns = page.locator('button').filter({ hasText: /^Enter manually$/ });
      const count = await allBtns.count();
      enterManually = count > 1 ? allBtns.nth(count - 1) : allBtns.first();
    }
    if (await enterManually.isVisible({ timeout: 2000 })) {
      await enterManually.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await enterManually.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await enterManually.click();
      await page.evaluate(() => document.querySelectorAll('[data-cl-enter]').forEach(el => el.removeAttribute('data-cl-enter')));
      console.log('  ✅ Clicked "Enter manually" for Cover Letter');
      await page.waitForTimeout(1500);

      // Find the textarea that's INSIDE the Cover Letter section (sibling of Attach/Dropbox/etc)
      const clAnswer = textareaAnswers.find(qa => qa.patterns.includes('cover letter'));
      if (clAnswer) {
        const found = await page.evaluate(() => {
          // Find the "Cover Letter" label
          const allEls = document.querySelectorAll('div, label, strong, span');
          for (const el of allEls) {
            if (el.textContent.trim() === 'Cover Letter' && el.children.length === 0) {
              // Walk up to find a container that has a textarea
              let container = el.parentElement;
              for (let i = 0; i < 5 && container; i++) {
                const ta = container.querySelector('textarea:not([name="g-recaptcha-response"])');
                if (ta && ta.offsetParent !== null) {
                  ta.setAttribute('data-cl-textarea', 'true');
                  return true;
                }
                container = container.parentElement;
              }
            }
          }
          return false;
        });

        if (found) {
          await page.locator('[data-cl-textarea="true"]').fill(clAnswer.answer);
          await page.evaluate(() => document.querySelectorAll('[data-cl-textarea]').forEach(el => el.removeAttribute('data-cl-textarea')));
          console.log('  ✅ Cover letter: filled (Cover Letter section textarea)');
        } else {
          // Fallback: any empty visible textarea on the page
          const allTas = page.locator('textarea:not([name="g-recaptcha-response"])');
          const count = await allTas.count();
          for (let i = count - 1; i >= 0; i--) {
            const ta = allTas.nth(i);
            if (!await ta.isVisible({ timeout: 300 }).catch(() => false)) continue;
            const val = await ta.inputValue();
            if (!val || val.trim() === '') {
              await ta.fill(clAnswer.answer);
              console.log('  ✅ Cover letter: filled (fallback empty textarea)');
              break;
            }
          }
        }
      }
    } else {
      console.log('  ℹ️  No "Enter manually" button found for cover letter');
    }
  } catch (e) { console.log(`  ⚠️  Cover letter error: ${e.message.slice(0, 60)}`); }

  // Scroll to top for final review
  await page.evaluate(() => window.scrollTo(0, 0));

  console.log('\n' + '='.repeat(60));
  console.log('🛑 ALL FIELDS FILLED. Review in browser, then click Submit.');
  console.log('   Press Ctrl+C when done to move to next role.');
  console.log('='.repeat(60));

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
