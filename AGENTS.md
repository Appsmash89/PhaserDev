<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# MANDATORY: Read MASTER_DOCS.md First

> **Before writing a single line of code, read `MASTER_DOCS.md` in the project root.**

`MASTER_DOCS.md` is the living source of truth for this project. It contains:
- The complete architecture of Studio Color
- Every design decision and WHY it was made
- Critical rules and pitfalls you MUST NOT violate
- The full file map with explanations
- The React ↔ Phaser communication pattern
- The data flow for a complete user session
- What has been done and what is still to do

**If you skip reading MASTER_DOCS.md, you will break things that are already working.**

---

# Workflow Rule: Update MASTER_DOCS.md After Every Task

When you complete a task (any prompt from the user), you MUST update `MASTER_DOCS.md`:

1. Add a row to **Section 11 (Update Log)**
2. Update **Section 7 (Completed Features)** if you finished something new
3. Update **Section 8 (Known Limitations)** if the task revealed or resolved something
4. Update **Section 4 (Architecture)** if you changed how something works

Do not skip this step. The documentation is as important as the code.
