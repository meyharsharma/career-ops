# Application Lessons & Question Bank

Reference file for auto-filling application form questions. The form filler reads this to answer textareas and free-text fields.

## Standard Answers

### Years of experience (relevant)
**Q patterns:** "total years of experience", "years of relevant experience", "how many years"
**A:** 2

### Years of full-time work experience after graduation
**Q patterns:** "years of full-time work experience", "years after graduation", "post-grad experience"
**A:** 0-1 years (Master's graduated Dec 2025, currently in early-career roles)

### AI tools currently using
**Q patterns:** "AI tools", "what tools are you using", "AI tools currently"
**A:** I use LangChain and Pinecone daily for building multi-agent AI systems at mcSquared AI, where I'm architecting a compliance monitoring system on GCP. I work with LLMs including Ollama and Gemma for text extraction and synthesis, and use ChromaDB for vector retrieval. For ML work I use PyTorch, TensorFlow, and Scikit-Learn for model development. I also use Claude and ChatGPT for code review and research acceleration.

### Python experience (years)
**Q patterns:** "years of experience with Python", "Python experience"
**A:** 4+ years. Used Python across all roles — ML pipelines at NYC ACS, LLM-powered data engineering at Columbia, multi-agent AI systems at mcSquared AI, and multiple personal projects.

### Why this company
**Q patterns:** "why do you want to work", "what interests you about", "why are you applying"
**A:** [Customize per company — reference specific product/mission from JD]

### Why this role
**Q patterns:** "why this role", "what excites you about this position"
**A:** [Customize per role — map JD responsibilities to my experience]

### Work authorization
**Q patterns:** "authorized to work", "work authorization", "right to work"
**A:** Yes, I am authorized to work in the United States on OPT (F-1 visa extension) with eligibility for a 24-month STEM OPT extension.

### Sponsorship
**Q patterns:** "require sponsorship", "visa sponsorship", "immigration sponsorship"
**A:** Yes, I will require sponsorship in the future.

### Salary expectations
**Q patterns:** "salary expectation", "compensation expectation", "desired salary"
**A:** $80,000 - $120,000 depending on total compensation package and location.

### Willingness to relocate
**Q patterns:** "willing to relocate", "relocation", "open to relocation"
**A:** Yes, open to relocation anywhere in the United States.

### Hybrid/on-site commitment
**Q patterns:** "hybrid policy", "in-office", "on-site requirement", "commit to hybrid"
**A:** Yes

### How did you hear about us
**Q patterns:** "how did you hear", "where did you find", "source"
**A:** Job Board

### Start date / availability
**Q patterns:** "start date", "when can you start", "earliest available"
**A:** Available to start within 2 weeks of offer acceptance.

### Cover letter / additional info
**Q patterns:** "cover letter", "additional information", "anything else"
**A:** [Generate from CV + JD match — highlight multi-agent AI work, ML pipeline deployment at NYC ACS, Columbia research]

## CV Tailoring Rules

For every application, tailor the following to match the JD:
1. **Summary** — rewrite 2-3 lines to lead with the most relevant experience for the role
2. **Skills order** — list the skills most relevant to the JD first
3. **Bullet emphasis** — reorder bullets within each job so the most JD-relevant ones come first
4. **Bullet format** — use Google's X-Y-Z approach: "Accomplished [X] as measured by [Y], by doing [Z]"
   - Example: "Reduced model inference time by 40% by implementing batch prediction pipelines using Docker and MongoDB"
   - Not every bullet needs a metric, but lead with impact where possible

## Cover Letter Template

When a form has a cover letter or "additional info" field, generate a customized 3-4 paragraph cover letter:
- Para 1: What draws me to [Company] specifically (reference their product/mission)
- Para 2: My most relevant experience mapped to the JD (cite specific projects + metrics)
- Para 3: What I'd bring on day one — connect my current work to their open problems
- Para 4: One line close

Tone: conversational but professional. No corporate-speak. Sound like a real person who's excited about the role.

## Lessons Learned

- Greenhouse forms use custom React dropdowns — standard `<select>` selectors don't work
- Disability option exact text: "No, I do not have a disability and have not had one in the past"
- Race question only appears AFTER answering "No" to Hispanic/Latino
- Country dropdown also contains phone codes — match "United States" carefully
- Some forms have required textareas (Glean asks about AI tools and years of experience)
- Always scroll to bottom of form before filling to trigger lazy-loaded sections
- Glean has a "Cover Letter" section with Attach/Dropbox/Google Drive/Enter manually options — click "Enter manually" to get a textarea, then fill it
- Cover letters should be customized per role, not generic
- "Years of experience" on Glean is a text INPUT, not a textarea — the script must handle both
- ALWAYS verify the job location is US-based before launching an application — Celonis "Applied AI Engineer" was Bangalore, India
- Fetch the JD page and check location BEFORE running the form filler
- Phone number: use 5513714585 WITHOUT +1 — the country code dropdown is separate on most forms
- Location: Jersey City, NJ (not New York)
- Cover letter: click "Enter manually", count textareas before/after, fill the NEW one that appeared
- Location field: type "Jersey City" with delay, wait 1s for autocomplete dropdown, click the suggestion
- Airtable has company-specific questions: why excited, used Airtable before, how using AI today
- Always handle relocation questions (answer: Yes) and visa sponsorship questions (answer: Yes)
- Every form may have unique questions — the textarea filler must scan ALL textareas and inputs, not just known patterns
