
# EvalTape

**Do the task once. Test any agent against the outcome.**

EvalTape turns a successful human demonstration into a reusable, deterministic acceptance test for agents.

Instead of forcing every agent to follow the same clicks or procedure, EvalTape focuses primarily on **what must be true when the task is finished**.

A human can perform a task manually. EvalTape captures the state before and after, proposes a success contract, asks the human to approve it, and saves that contract.

Later, another agent can attempt the same task through a completely different path.

EvalTape evaluates the result and returns:

```text
PASS ✓
```

or:

```text
FAIL ✗
```

with the exact condition that failed.

---

## Why EvalTape?

Most agent tests start by manually writing assertions.

But often the easiest way to explain what success looks like is simply to **do the task once**.

EvalTape explores this workflow:

```text
HUMAN DEMONSTRATION
        ↓
TASK INTENT
        +
BEFORE STATE
        +
AFTER STATE
        ↓
STATE DIFF
        ↓
SUCCESS CONTRACT
        ↓
HUMAN APPROVAL
        ↓
SAVED EVAL
        ↓
DIFFERENT AGENT EXECUTION
        ↓
PASS / FAIL
```

The key idea is:

> **The demonstration provides evidence. The approved contract defines success.**

The demonstration is not blindly replayed.

---

# Current V0

EvalTape is currently a **working V0 / research prototype**.

The complete end-to-end flow has been proven against real GitHub Issues.

V0 currently supports:

- GitHub Issues as the main real product integration
- automatic before-state capture
- automatic after-state capture
- natural-language task authoring for one narrow GitHub issue task family
- state diffing
- candidate outcome-contract generation
- human contract approval
- saved eval artifacts
- deterministic outcome evaluation
- alternate execution paths
- explicit PASS / FAIL explanations
- prevention of overlapping human-recording and agent-run sessions
- preserved run evidence
- runtime validation of GitHub API data
- fail-closed behavior when the demonstration contradicts task intent

EvalTape does **not** yet claim to support arbitrary websites, arbitrary natural-language tasks, or arbitrary agent workflows.

That restriction is intentional.

---

# Core Principle

EvalTape distinguishes between:

## Procedure

How the task was completed.

For example:

```text
Open GitHub
→ click Issues
→ click New Issue
→ enter title
→ choose assignee
→ click Create
```

and:

## Outcome

What must be true afterward.

For example:

```text
An issue exists
title = "Payment timeout"
state = "open"
assignees = ["AidaMichel"]
the matching issue did not already exist before the run
```

EvalTape V0 primarily evaluates the **outcome**.

That means two trajectories can be different while still producing the same valid result.

For example:

```text
Human:
Browser UI
→ Create issue
→ Assign user

Agent:
GitHub API / CLI / connector
→ Create already-assigned issue
```

If both satisfy the approved contract:

```text
PASS ✓
```

---

# Requirements

Before running EvalTape locally, install:

- Node.js
- npm
- Git
- GitHub CLI (`gh`)

You must also authenticate GitHub CLI:

```bash
gh auth login
```

Verify authentication:

```bash
gh auth status
```

EvalTape V0 expects access to a GitHub repository where you are allowed to create and modify issues.

For testing, use a sandbox or non-production repository.

---

# Installation

Clone this repository and enter the project directory.

Then install dependencies:

```bash
npm install
```

Create the local `evaltape` command:

```bash
npm link
```

Verify:

```bash
evaltape
```

You should see the EvalTape CLI help.

Check the available adapters:

```bash
evaltape adapters
```

Current output includes:

```text
AVAILABLE ADAPTERS:
- github-issues
- shop
```

The complete user-facing V0 lifecycle currently targets `github-issues`.

---

# Run the Test Suite

Run:

```bash
npm test
```

The current suite protects important invariants including:

- the compiler cannot silently weaken explicit task intent
- correct outcomes pass
- incorrect required values fail
- a pre-existing correct state does not receive fake credit
- GitHub data is normalized correctly
- pull requests returned through the GitHub Issues API are filtered out
- malformed external GitHub data is rejected
- supported natural-language task instructions are converted into structured task requirements
- unsupported task instructions fail instead of being guessed

---

# Workflow 1 — Author an Eval

The first workflow creates a reusable eval from a human demonstration.

## Step 1 — Start Recording

Example:

```bash
evaltape record \
  --adapter github-issues \
  --repo AidaMichel/agile-final-project \
  --task "Create an open issue titled 'Payment timeout' assigned to AidaMichel"
```

EvalTape captures the current GitHub state before the task.

Example output:

```text
CAPTURING BEFORE STATE...

✓ RECORDING STARTED
Adapter: github-issues
Repo: AidaMichel/agile-final-project
Task: Create an open issue titled 'Payment timeout' assigned to AidaMichel
Captured entities: 10
Before snapshot: .../.evaltape/recordings/.../before.json

Now perform the task manually in GitHub.
When finished, run: evaltape finish
```

At this point, perform the task yourself.

For this example:

1. Open the repository in GitHub.
2. Create a new issue.
3. Set the title to:

```text
Payment timeout
```

4. Assign:

```text
AidaMichel
```

5. Leave the issue open.

---

## Step 2 — Finish the Demonstration

Run:

```bash
evaltape finish
```

EvalTape captures the new state and compares it with the original state.

A successful diff may look like:

```text
DIFFING DEMONSTRATION...

[
  {
    kind: 'entity_added',
    entityType: 'issue',
    ...
  }
]
```

EvalTape then proposes a contract:

```text
EVALTAPE PROPOSED CONTRACT

Entity type: issue
Proposed selector: title

MUST:
✓ [after] target must exist
✓ [after] state equals task.state
✓ [after] assignees equals task.assignees

MUST NOT:
✓ [before] target must not exist
```

It also shows known V0 limitations:

```text
WARNINGS:
! Selector was inferred heuristically and requires human confirmation.
! V0 compiler only supports a single added entity.
! Matching currently requires task-variable names to match entity field names.
```

EvalTape then asks:

```text
Approve this contract? [y/n]:
```

Approve with:

```text
y
```

EvalTape saves the approved eval:

```text
✓ APPROVED EVAL SAVED
.../.evaltape/evals/<eval-file>.json

✓ RECORDING COMPLETE
```

---

# Why Human Approval Exists

The demonstration is evidence.

It is **not automatically authoritative**.

EvalTape proposes the contract, but the human remains the authority on what success means.

This protects against cases where the demonstration contains incidental details that should not become requirements.

For example, suppose the task is:

```text
Create an open issue titled "Payment timeout" assigned to AidaMichel
```

but the human also writes this issue body:

```text
Found during checkout testing.
```

The body is not part of the task intent.

EvalTape should not automatically require every future agent to reproduce that exact body.

The goal is the **smallest correct success contract**, not an exact copy of every observed detail.

---

# Fail-Closed Demonstration Validation

EvalTape refuses to generate a weaker contract when the demonstration contradicts explicit task intent.

For example:

```text
Task:
Assign AidaMichel

Demonstration:
assignees = []
```

EvalTape rejects the demonstration:

```text
EVALTAPE ERROR
Demonstration does not satisfy the current task intent.

- assignees: expected ["AidaMichel"], observed []

EvalTape refused to generate a weaker contract.
```

This is an important design rule:

> **Missing evidence must not silently become a weaker eval.**

---

# Cancel a Human Recording

If you started a recording but do not want to complete it:

```bash
evaltape cancel
```

EvalTape removes the active-session marker while preserving the captured evidence directory.

Example:

```text
✓ RECORDING CANCELLED
Repo: AidaMichel/agile-final-project
Evidence preserved at: .../.evaltape/recordings/...
```

---

# Workflow 2 — Test Another Execution

Once an eval exists, EvalTape can evaluate another attempt.

The other execution does **not** need to reproduce the human demonstration path.

It can use:

- another browser agent
- GitHub CLI
- GitHub API
- an MCP / connector integration
- another automation system
- another future agent runtime

What matters is whether the approved contract is satisfied.

---

## Step 1 — Start an Agent Run

Use an approved eval file.

For the included real GitHub example:

```bash
evaltape run \
  --eval examples/github-real/approved-eval.json \
  --repo AidaMichel/agile-final-project
```

Example output:

```text
CAPTURING AGENT-RUN BASELINE...

✓ AGENT RUN STARTED
Repo: AidaMichel/agile-final-project
Task: Create an open GitHub issue titled "EvalTape real adapter test 001" assigned to AidaMichel.
Captured entities: 10
Before snapshot: .../.evaltape/runs/.../before.json

Now let the other agent perform the task.
When it is finished, run: evaltape check
```

EvalTape freezes:

- the before state
- the exact approved eval used for the run
- the task being evaluated

The eval is copied into the run evidence directory so changing the original file later does not silently change an active evaluation.

---

## Step 2 — Let Another Agent Perform the Task

The alternate agent can use a different trajectory.

For example, the human demonstration may have used the GitHub website while another agent creates the issue through an API integration.

EvalTape does not require matching clicks.

---

## Step 3 — Check the Result

Run:

```bash
evaltape check
```

A successful result looks like:

```text
EVAL RESULT

✓ target-exists-after [after]
✓ after-state-matches [after]
✓ after-assignees-matches [after]
✓ target-did-not-exist-before [before]

PASS ✓
```

EvalTape also stores the evidence:

```text
Evidence: .../.evaltape/runs/<run-id>
Result: .../.evaltape/runs/<run-id>/result.json

✓ AGENT RUN COMPLETE
```

---

# Example Failure

If the agent does not create the required issue, EvalTape can return:

```text
EVAL RESULT

✗ target-exists-after [after]
  observed: "0 matching entity/entities"

✗ after-state-matches [after]
  observed: "No matching entity"

✗ after-assignees-matches [after]
  observed: "No matching entity"

✓ target-did-not-exist-before [before]

FAIL ✗
```

If the issue exists but the assignee is wrong:

```text
✗ after-assignees-matches
  expected: ["AidaMichel"]
  observed: []
```

This is intentionally more useful than a single opaque score.

The user can see **why** the execution failed.

---

# No-Op Protection

EvalTape also distinguishes:

```text
"The required state exists"
```

from:

```text
"The agent actually caused the required transition"
```

Suppose the target issue already existed before the run.

If the agent does nothing, the final state may look correct.

But the contract can include:

```text
MUST NOT:
target existed before
```

So:

```text
BEFORE:
matching issue exists

AFTER:
same matching issue exists
```

returns:

```text
FAIL ✗
```

This prevents agents from receiving credit for pre-existing success.

---

# Cancel an Agent Run

If an agent evaluation is active and you want to abandon it:

```bash
evaltape cancel-run
```

This is different from:

```bash
evaltape cancel
```

The commands manage separate session types:

```text
evaltape record
→ start human demonstration

evaltape finish
→ complete human demonstration

evaltape cancel
→ cancel human demonstration


evaltape run --eval ...
→ start agent evaluation

evaltape check
→ complete agent evaluation

evaltape cancel-run
→ cancel agent evaluation
```

EvalTape prevents a human recording and agent evaluation from running at the same time.

---

# Evidence

Runtime evidence is stored locally under:

```text
.evaltape/
```

Important directories include:

```text
.evaltape/recordings/
.evaltape/runs/
.evaltape/evals/
```

These are runtime artifacts and are ignored by Git.

A deliberate example eval is tracked separately at:

```text
examples/github-real/approved-eval.json
```

This keeps generated local state separate from reproducible repository fixtures.

---

# Architecture

The current architecture is:

```text
EXTERNAL PRODUCT
      ↓
PRODUCT ADAPTER
      ↓
NORMALIZED ENVIRONMENT SNAPSHOT
      ↓

TASK INTENT
      +
BEFORE STATE
      +
AFTER STATE
      ↓
STATE DIFF
      ↓
CONTRACT COMPILER
      ↓
PROPOSED OUTCOME CONTRACT
      ↓
HUMAN CONFIRMATION
      ↓
APPROVED EVAL
      ↓

OTHER AGENT EXECUTION
      ↓
NEW BEFORE / AFTER STATES
      ↓
DETERMINISTIC EVALUATOR
      ↓
PASS / FAIL + WHY
```

---

# Product Adapter Boundary

EvalTape core does not directly depend on GitHub's raw API schema.

Instead:

```text
GitHub API
    ↓
GitHub Issues Adapter
    ↓
EnvironmentSnapshot
    ↓
EvalTape Core
```

A normalized entity looks conceptually like:

```json
{
  "key": "github-issue:42",
  "type": "issue",
  "id": 42,
  "data": {
    "number": 42,
    "title": "Payment timeout",
    "state": "open",
    "assignees": [
      "AidaMichel"
    ],
    "labels": []
  }
}
```

This dependency direction is intentional.

EvalTape core should reason about normalized evidence rather than knowing every product's raw API structure.

---

# Runtime Validation

External product data is treated as untrusted.

The GitHub adapter validates raw input at runtime before converting it into EvalTape state.

Malformed data fails closed.

For example, an issue number arriving as a string instead of a number is rejected instead of being quietly interpreted.

This protects the evaluator from making decisions on malformed evidence.

---

# GitHub Issues API Nuance

GitHub's Issues API can also return pull requests.

EvalTape explicitly filters objects containing:

```text
pull_request
```

so pull requests are not accidentally treated as issues.

---

# Current Natural-Language Task Support

Natural-language authoring in V0 is intentionally narrow.

Currently supported:

```text
Create an open issue titled 'Payment timeout' assigned to AidaMichel
```

Double-quoted titles are also supported:

```text
Create an open issue titled "Payment timeout" assigned to AidaMichel
```

EvalTape extracts structured task variables such as:

```text
title
state
assignees
```

Unsupported language fails instead of being guessed.

For example:

```text
Please make some GitHub ticket about payments
```

is rejected.

This is deliberate.

V0 prioritizes trustworthy behavior over pretending to understand arbitrary instructions.

---

# Deterministic Evaluation

The final contract evaluation is deterministic.

An LLM is not currently deciding whether the run passed.

The evaluator checks structured state against explicit contract assertions.

This distinction matters:

```text
semantic interpretation / contract inference
→ may eventually benefit from models

final invariant checking
→ deterministic where possible
```

EvalTape aims to keep the final verdict inspectable and reproducible.

---

# Current Contract Model

Contracts can contain:

```text
MUST
```

and:

```text
MUST NOT
```

assertions.

Assertions currently support operators including:

```text
equals
not_equals
exists
contains
```

Assertions can target:

```text
before
```

or:

```text
after
```

snapshots.

Expected values can be:

```text
literal values
```

or dynamic references to:

```text
task variables
```

This means a contract can remain reusable even when task-specific values change.

---

# Dynamic Task Values

EvalTape separates:

```text
Task Intent
Product State
Eval Contract
```

This matters when task requirements change.

For example:

```text
Original:
Assign Sarah

Correction:
Actually assign Bob
```

The evaluator should not keep validating against stale `Sarah`.

The current task specification is the source of truth.

Contracts reference dynamic task variables rather than unnecessarily hard-coding old demonstration values.

---

# What EvalTape V0 Has Proven

The project has demonstrated the following behaviors:

1. Generic normalized entity state.
2. Generic state diffing.
3. Dynamic task variables.
4. Versioned task specifications.
5. Dynamic contract values.
6. Deterministic contract evaluation.
7. Before / after transition checks.
8. Candidate contract compilation.
9. Human contract approval.
10. Approved eval persistence.
11. Alternate trajectory PASS behavior.
12. Incorrect outcome FAIL behavior.
13. No-op / pre-existing-state failure behavior.
14. CLI-based authoring.
15. Product adapter boundary.
16. Adapter registry.
17. Runtime validation.
18. Real GitHub Issues integration.
19. Real human browser demonstration.
20. Compiler rejection of contradictory demonstrations.
21. Automatic human-demo before / after capture.
22. Natural-language task persistence.
23. Automatic agent-run baseline / result capture.
24. Real alternate-agent PASS.
25. Real incorrect-agent FAIL.
26. Preserved evaluation evidence.

This proves the core V0 thesis.

It does **not** mean EvalTape is production-ready.

---

# V0 Limitations

Current limitations include:

- the compiler currently supports exactly one added entity
- update, delete, and multi-entity task compilation are not yet supported
- natural-language task authoring supports only a narrow GitHub issue creation grammar
- task-variable names currently need to match normalized entity field names
- selector inference is currently heuristic
- the first matched task variable is currently used as the selector
- duplicate titles can create ambiguous selectors
- ambiguous selectors fail closed
- array equality is currently order-sensitive
- GitHub entity keys are issue-number based and not yet repository-qualified
- deep semantic field mapping is not implemented
- process constraints are not yet a first-class contract type
- asynchronous / eventual-consistency polling is not implemented
- flaky-environment handling is not implemented
- privacy and evidence-redaction controls are not implemented
- approved eval file validation is still shallow in some paths
- TaskSpec runtime validation should be strengthened
- human confirmation currently supports approve / reject, not rich interactive editing
- generic arbitrary-browser recording is not implemented
- arbitrary products do not automatically work without an adapter

These are known boundaries, not hidden capabilities.

---

# Outcome Contracts vs Process Contracts

EvalTape currently prioritizes:

```text
OutcomeContract
```

which answers:

> What must be true when the task is complete?

Future tasks may also require:

```text
ProcessContract
```

which answers:

> What must or must not happen while completing the task?

Examples:

```text
must request user approval before purchase
must not expose sensitive information
must call a specific compliance step
must not delete existing data
must perform action A before action B
```

Outcome-only evaluation is powerful, but it is not sufficient for every safety or business-critical workflow.

---

# What EvalTape Is Not

EvalTape is not currently:

- a browser agent
- a generic agent executor
- an exact replay system
- a screen-recording automation platform
- an LLM judge
- a general-purpose benchmark suite
- a production SaaS
- a replacement for product-specific adapters
- a guarantee that any demonstrated behavior is automatically a good eval

EvalTape's current job is narrower:

> **Turn a demonstrated task into a human-approved, outcome-based acceptance test and use it to evaluate another execution.**

---

# Repository Structure

Important files include:

```text
src/
  adapter.ts
  actions.ts
  agent-run.ts
  cli.ts
  compiler.ts
  compiler.test.ts
  confirm.ts
  contract.ts
  diff.ts
  evaluator.ts
  evaluator.test.ts
  recording.ts
  state.ts
  store.ts
  task.ts
  task-authoring.ts
  task-authoring.test.ts
  types.ts

  adapters/
    github-issues.ts
    registry.ts
    shop.ts

examples/
  github-real/
    approved-eval.json
    ...

.evaltape/
  recordings/
  runs/
  evals/
```

Runtime `.evaltape` data is ignored by Git.

---

# Development

Run all tests:

```bash
npm test
```

Run the CLI directly without `npm link`:

```bash
npx tsx src/cli.ts
```

Or after:

```bash
npm link
```

use:

```bash
evaltape
```

---

# Design Rules

Several rules currently guide EvalTape development.

## 1. Task intent is authoritative

The demonstration cannot silently override an explicit user requirement.

## 2. Fail closed

When EvalTape cannot safely determine what happened, it should reject or fail rather than manufacture confidence.

## 3. Outcome over exact trajectory

Different execution paths may be valid if they achieve the approved result.

## 4. Human authority

The generated contract is a proposal until the human approves it.

## 5. Deterministic verdicts where possible

Structured invariants should be checked by code rather than subjective model judgment.

## 6. External data is untrusted

Adapters validate raw product data before core evaluation.

## 7. Build for evalability

Structured state and evidence are preferable to hidden reasoning.

## 8. Preserve evidence

Runs store enough evidence to understand what was evaluated and why.

---

# The Thesis

EvalTape is built around a simple hypothesis:

> Given a task description, a successful human demonstration, and structured before / after state, EvalTape can propose a small success contract that a human can quickly approve and that can correctly evaluate alternate agent trajectories.

The V0 GitHub proof supports that hypothesis for one narrow task family.

The next challenge is not to add every possible feature.

It is to determine whether the workflow remains useful and understandable when somebody other than the developer uses it.

---

# Current Status

**Status: V0 technical proof and clean-install validation complete. External-user validation next.**

EvalTape V0 has now been validated through:

- development-environment tests
- real GitHub Issues demonstrations
- deterministic PASS and FAIL evaluation
- alternate agent execution paths
- a fresh clone and installation
- eval authoring from the fresh clone
- a complete alternate-agent run from the fresh clone

The next milestone is external-user validation: can someone who did not build EvalTape understand, install, and use the workflow without developer guidance?

Until that is tested, the priority is usability and evidence rather than expanding the feature surface.
---

## One sentence

**EvalTape lets you demonstrate success once, turn it into an approved acceptance test, and evaluate whether another agent reaches the same required outcome—even by a different path.**
