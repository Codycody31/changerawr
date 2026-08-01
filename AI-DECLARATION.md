---
version: "0.1.2"
level: assist
processes:
  design: pair
  implementation: assist
  testing: assist
  documentation: copilot
  review: hint
  deployment: none
---

This format is based on [AI-DECLARATION.md](https://ai-declaration.md/en/0.1.2).

## Notes

- AI is used for targeted pieces of implementation, testing, and documentation when prompted — it acts on a part of the task, not the whole thing, with the human writing and integrating the rest.
- Design decisions (architecture, feature approach, tradeoffs) are made collaboratively between human and AI.
- Documentation (README, docs) is often drafted end-to-end by AI, then corrected and redirected by the human through review rounds before being accepted.
- Code review is human-driven; AI may passively surface issues, but the human is the one deciding what's actually correct.
- Integration and all deployment/release actions (commits, pushes, releases, publishing) remain entirely human-driven — AI never commits, pushes, or ships without explicit human action.
