# Loop Engineering Implementation for PrettyCash

This document outlines how to implement **Loop Engineering** for the PrettyCash project, replacing manual prompting with an automated cycle that discovers, implements, and verifies tasks.

Based on Addy Osmani's article (*Loop Engineering*), a complete loop engineering architecture moves beyond single-turn prompt-and-response into recursive, goal-directed systems that iterate until complete. It requires five core primitives plus persistent state memory, with strong guardrails against failure modes.

---

## The Core Primitives of Loop Engineering

### 1. Automations (The Heartbeat)
*   **Purpose:** Discovery and triage on a schedule without human initiation.
*   **Implementation in PrettyCash:** `scripts/loop-runner.js` executed on a cadence (via cron, file-watch, or periodic CLI runner).
*   **Stopping & Progression Logic:** Distinguishes between fixed-interval cadence (`/loop`) and recursive run-until-done stop conditions (`/goal`), where a separate evaluation step verifies whether exit criteria have been met before stopping.

### 2. State Memory (The Spine)
*   **Purpose:** Persistent repository state across stateless runs. The agent forgets between sessions; the repo does not.
*   **Location:** `AGENTS.md`, `docs/superpowers/specs/`, and `docs/superpowers/plans/`.
*   **Mechanism:** Markdown-backed task lists (`- [ ]` / `- [x]`) and explicit implementation status metadata (`Implementation status: Not started`, `In progress`, `Implemented`). Prevents context window bloat and retains history across restarts.

### 3. Worktrees (Isolation Against Chaos)
*   **Purpose:** Parallel task execution without file collisions or merge contention.
*   **Implementation in PrettyCash:** Git worktrees (`git worktree add ...`) when running multiple concurrent tasks or subagents. Each task or feature branch executes in its own clean working tree, avoiding shared working directory pollution and allowing safe rollback if a run fails verification.

### 4. Skills (Codified Project Context & Intent)
*   **Purpose:** Codify conventions, design tokens, architectural decisions, and domain rules so agents don't guess cold every turn.
*   **Location:** `docs/superpowers/specs/`, `AGENTS.md`, and skill definitions (`SKILL.md`).
*   **Mechanism:** Eliminates "intent debt" by documenting strict constraints, styling tokens, and forbidden patterns once, invoked deterministically during execution.

### 5. Sub-Agents (Maker vs. Checker Separation)
*   **Purpose:** Split the one who writes code from the one who reviews and grades it. The model that wrote the code is too lenient when grading its own homework.
*   **Maker:** General-purpose subagent tasked with implementing discrete plan tasks (`task` tool / code generation).
*   **Checker:** Independent verifier subagent running static analysis, test suites, and spec-conformance reviews before approving task completion.
*   **Token Efficiency:** Differentiates model profiles (e.g., faster, lower-cost models for discovery/triage; high-reasoning models for implementation and review).

### 6. Plugins & Connectors (Tooling Integration)
*   **Purpose:** Connect the loop to real execution environments and feedback channels.
*   **Implementation:** Expo CLI, TypeScript compiler (`npx tsc --noEmit`), test runner (`npm test`), Git CLI, and MCP servers (e.g., GitHub PR creation, issue tracking).

---

## The Loop Workflow

```
+-------------------------------------------------------------+
|                                                             |
|   1. DISCOVERY & TRIAGE (Heartbeat / Automation)            |
|   - Scan specs for "Implementation status: Not started"     |
|   - Parse plan markdown for first unchecked task "- [ ]"    |
|   - Prepare isolated worktree if running in parallel        |
|                                                             |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                                                             |
|   2. EXECUTION (Maker Sub-Agent + Skills)                   |
|   - Inject project context & skill rules                    |
|   - Implement specific task files                           |
|                                                             |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                                                             |
|   3. VERIFICATION (Checker Sub-Agent & Goal Condition)      |
|   - Run `npx tsc --noEmit` and relevant tests               |
|   - Independent model checks output against spec criteria   |
|   - If failing: feed diagnostics back into Maker loop       |
|                                                             |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                                                             |
|   4. STATE UPDATE & SYNCHRONIZATION (The Spine)             |
|   - Mark plan checkbox as "- [x]"                           |
|   - Update spec status ("In progress" -> "Implemented")     |
|   - Commit changes / clean worktree                         |
|                                                             |
+-------------------------------------------------------------+
```

---

## Critical Loop Engineering Traps & Mitigation

To prevent degrading code quality, the PrettyCash loop accounts for the three major pitfalls identified in loop engineering:

1. **Verification is Still on the Engineer (Claims vs. Proofs):**
   An agent stating "Task complete" is an unverified assertion. The loop requires concrete programmatic evidence (clean `tsc`, passing unit/integration tests, zero unhandled errors) before marking tasks complete.

2. **Comprehension Debt:**
   When loops ship code unattended, developer understanding diverges from the codebase. All automated loops must generate clean atomic commits, diff summaries, and run logs that can be reviewed quickly.

3. **Cognitive Surrender & Orchestration Tax:**
   Avoid passive acceptance of generated outputs or running too many parallel agents simultaneously. Human review capacity remains the true bottleneck.

---

## Implementing the Loop Runner

`scripts/loop-runner.js` orchestrates this lifecycle:
1. **Discover:** Parse `docs/superpowers/specs/` and `docs/superpowers/plans/` to extract pending tasks.
2. **Setup Worktree / Context:** Prepare isolated workspace if concurrent branches are requested.
3. **Dispatch Maker:** Supply exact instructions and skill context to the implementation subagent.
4. **Run Checker:** Execute linting, type-checking, and test verification.
5. **Update State:** Record progress on disk (`- [x]`, status transitions in markdown files).
