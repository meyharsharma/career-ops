---
name: Scan speed — keep it fast
description: Portal scans must be fast; the full 28-API + 7-WebSearch subagent approach took over 1 hour
type: feedback
---

Full portal scan with a single subagent covering 28 Greenhouse APIs + 7 WebSearch queries took over 1 hour. Unacceptable.

**Why:** User expects scans to complete in minutes, not hours.

**How to apply:** Break scans into small batches (5-8 APIs at a time) using parallel WebFetch calls directly in the main conversation, or limit to a subset of highest-priority companies. Avoid delegating the entire scan to a single subagent. Greenhouse APIs are fast JSON — fetch them directly. Skip WebSearch queries unless specifically asked.
