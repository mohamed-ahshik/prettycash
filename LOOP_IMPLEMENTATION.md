# Loop Engineering Implementation for PrettyCash

This document outlines how to implement **Loop Engineering** for the PrettyCash project, replacing manual prompting with an automated cycle that discovers, implements, and verifies tasks.

Based on Addy Osmani's article, a complete loop engineering system requires five key pieces, plus a persistent state file.

## The 5 Pieces of our Loop

### 1. State Memory (The Spine)
*   **Location:** `AGENTS.md`, `docs/superpowers/specs/`, and `docs/superpowers/plans/`.
*   **Role:** The agent is stateless between runs. The repo stores the state. The files contain `Implementation status: Not started` or `In progress`, and the plans contain `- [ ]` checkboxes for tasks.

### 2. Automation (The Heartbeat)
*   **Command:** `node scripts/loop-runner.js`
*   **Role:** A script that runs on a schedule (e.g., every 5 minutes or via cron/hooks). It performs **discovery and triage**: it scans the specs and plans to find the next pending task.

### 3. Skills (The Project Context)
*   **Location:** `docs/superpowers/specs/` and `AGENTS.md`
*   **Role:** Defines the name ("Ahshik"), the role (every 5 minutes, implement pending plans), the design tokens, and constraints. This keeps the agent from guessing.

### 4. Sub-Agents (The Maker vs. The Checker)
*   **Maker:** A subagent launched via OpenCode `task` tool with `subagent_type: "general"` to write the code.
*   **Checker:** The runner script or a verifier subagent that runs static analysis/tests to grade the work before marking it complete.

### 5. Plugins/Connectors (The Environment)
*   **Role:** Integration with the local CLI toolchain (`npx tsc --noEmit`, Expo bundler) and local git state.

---

## The Loop Workflow

```
+-------------------------------------------------------+
|                                                       |
|   1. DISCOVERY & TRIAGE (loop-runner.js)             |
|   - Scan specs for "Implementation status: Not started"|
|   - Parse corresponding plan to find first "- [ ]"    |
|                                                       |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|                                                       |
|   2. EXECUTION (Maker Subagent)                      |
|   - Spawn subagent to implement the specific task     |
|   - Write the code files defined in the task          |
|                                                       |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|                                                       |
|   3. VERIFICATION (Checker)                           |
|   - Run `npx tsc --noEmit` and check for errors       |
|                                                       |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|                                                       |
|   4. STATE UPDATE                                     |
|   - Mark plan task as "- [x]"                         |
|   - If all tasks are done, update spec status to       |
|     "Implemented"                                     |
|                                                       |
+-------------------------------------------------------+
```

---

## Implementing the Loop Runner

We will write `scripts/loop-runner.js` in Node.js. Since we are running within the OpenCode context, this script will:
1.  Parse the directories.
2.  Find the current pending task.
3.  Perform the verification checks.
4.  If a task is ready to be marked complete (and was successfully implemented/verified), it updates the markdown files on disk.
5.  If a task is pending, it outputs the exact subagent execution prompt so the agent or harness can immediately launch it.

This implements the "Loop Engineering" paradigm by moving the cognitive burden of finding what to do next from the human to the codebase state.
