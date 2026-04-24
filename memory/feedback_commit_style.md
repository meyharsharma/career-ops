---
name: Commit style
description: Commit messages must be 1-2 lines max and never include Co-Authored-By Claude/Anthropic
type: feedback
---

Commit messages: 1-2 lines only. Never add `Co-Authored-By: Claude ...` or any Anthropic trailer.

**Why:** User owns the repo and does not want AI attribution in history. Also prefers terse log output — long multi-paragraph commit bodies add noise.

**How to apply:** When running `git commit`, keep the message to a single short subject line (or subject + one brief body line max). Omit the Co-Authored-By trailer entirely. This overrides the default Claude Code commit template.
