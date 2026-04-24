# Career-Ops

> AI-powered job search pipeline built on Claude Code. Evaluate offers, generate tailored CVs, scan portals, auto-fill applications, track everything.

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## What This Is

Claude Code drives end-to-end job search pipeline:

- **Evaluate offers** — A-F scoring, 10 weighted dimensions
- **Generate tailored CVs** — 1-page ATS PDFs, X-Y-Z bullets, per-JD customization
- **Scan portals** — fresh listings across Greenhouse, Ashby, Lever, Wellfound
- **Auto-fill applications** — Playwright drives Greenhouse + Ashby forms; stops before Submit
- **Track everything** — `data/applications.md` with integrity checks

Filter, not spray. System flags anything below 4.0/5 and recommends skipping.

## Setup

```bash
git clone git@github.com:meyharsharma/career-ops.git
cd career-ops && npm install
npx playwright install chromium
npm run doctor
```

Then:

1. Copy `config/profile.example.yml` → `config/profile.yml`, fill in your details
2. Create `cv.md` in project root (markdown CV)
3. Copy `templates/portals.example.yml` → `portals.yml`, edit company list + search keywords
4. Open Claude Code: `claude`
5. Paste a job URL or run `/career-ops`

Full setup guide in `docs/SETUP.md`.

## Commands

```
/career-ops                → Show all modes
/career-ops {paste a JD}   → Full auto-pipeline (evaluate + PDF + tracker)
/career-ops scan           → Scan portals for new offers
/career-ops pdf            → Generate ATS-optimized CV
/career-ops apply          → Playwright form auto-fill (no submit)
/career-ops pipeline       → Process pending URLs
/career-ops batch          → Batch evaluate in parallel
/career-ops tracker        → Application status overview
/career-ops deep           → Deep company research
/career-ops contacto       → LinkedIn outreach
/career-ops training       → Evaluate course/cert
/career-ops project        → Evaluate portfolio project
```

## Changes From Upstream

Forked from [santifer/career-ops](https://github.com/santifer/career-ops). Deltas:

### `apply-form.mjs` (form auto-fill)

- **Greenhouse custom dropdowns** — `ghDropdown()` handles React-based selectors (standard `<select>` queries fail on GH)
- **Ashby ATS patterns** — added selectors for Ashby's custom field structure
- **Cover letter targeting** — clicks "Enter manually" inside the Cover Letter container specifically (fixes misclick onto Attach button when multiple upload widgets share the page)
- **DOM-scan textarea filler** — `fillTextareas()` rewritten to enumerate every visible empty textarea/input via `page.evaluate`, mark with `data-gh-fill`, match against `QA_BANK`. Replaces the old pattern-only approach that missed company-specific custom questions
- **Location autocomplete** — types city with delay, waits 1s for dropdown, clicks suggestion (required for Greenhouse location fields)
- **Phone handling** — passes raw digits when country code dropdown is separate; adds `+1` only when single combined field
- **Never clicks Submit** — always stops for manual review

### `data/lessons.md`

- New file — Q&A bank keyed on question-text keywords, mapped to canned answers for textarea/free-text fields
- Also logs ATS edge cases discovered during runs (Greenhouse race question only appears after answering "No" to Hispanic/Latino; country dropdown includes phone codes; disability exact-text match required; etc.)

### `config/profile.yml`

- Added `demographics` block (gender, pronouns, veteran, disability, ethnicity, phone variants)
- Added `application_rules` block (`cv_max_pages`, `years_after_graduation`, `always_fill_all_fields`)
- Added `narrative` block (about_me, what_makes_you_unique, best_achievement, superpowers) — read by CV generator and cover letter drafter

### CV tailoring rules

1. Summary rewritten per JD, lead with most-relevant experience
2. Skills reordered by JD relevance
3. Bullets reordered within each role by JD relevance
4. Bullet format: Google X-Y-Z — "Accomplished [X] as measured by [Y], by doing [Z]"
5. 1 page max, 90-95% filled, black text only, centered header + contact
6. Cover letter customized per role when field available

### Pipeline rules

- **Verify JD location before launching form filler** — `scan` mode now fetches JD page first and confirms US-based before queuing. Prevents wasted runs on non-US postings.
- Merge-tracker + dedup scripts run after every batch to keep `data/applications.md` clean

## Project Structure

```
career-ops/
├── CLAUDE.md                    # Agent instructions (system behavior)
├── cv.md                        # Canonical CV
├── config/profile.yml           # Candidate profile (gitignored)
├── data/
│   ├── applications.md          # Submitted tracker
│   ├── pipeline.md              # Pending URLs inbox
│   ├── lessons.md               # Q&A bank + form edge cases
│   └── scan-history.tsv         # Scanner dedup
├── modes/                       # Skill modes (scan, apply, evaluate, pdf, batch, ...)
├── templates/
│   ├── cv-template.html         # ATS CV template
│   ├── portals.example.yml      # Scanner config template
│   └── states.yml               # Canonical statuses
├── apply-form.mjs               # Playwright form filler
├── generate-pdf.mjs             # HTML → PDF
├── output/                      # Generated PDFs (gitignored)
└── reports/                     # Evaluation reports
```

## Stack

- **Agent:** Claude Code with custom skills and modes
- **Automation:** Playwright (form fill + PDF generation)
- **Scanner:** Playwright + Greenhouse Boards API + WebFetch
- **Data:** Markdown tables + YAML config + TSV batch files
- **Runtime:** Node.js (mjs modules)

## Ethical Use

- Never auto-submits. Playwright fills fields; you click Submit.
- Don't apply below 4.0/5. System flags low-fit roles.
- Verify JD location before applying. Scanner now enforces this pre-queue.
- Review AI-generated cover letters before sending. Models hallucinate.

## License

MIT
