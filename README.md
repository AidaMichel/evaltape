# EvalTape

**Do the task once. Test any agent against the outcome.**

EvalTape turns a successful human demonstration into a reusable, deterministic acceptance test for agents.

Instead of forcing every agent to repeat the same clicks or procedure, EvalTape focuses on a simpler question:

> **Did the agent achieve the outcome the human approved?**

A human performs a task once.

EvalTape captures the state before and after, proposes a success contract, asks the human to approve it, and saves that contract.

Later, another agent can attempt the same task through a completely different path.

EvalTape then returns:

```text
PASS ✓
```

or:

```text
FAIL ✗
```

with the exact condition that passed or failed.

---

# Why EvalTape?

Most agent evals begin by manually writing assertions.

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

The core idea is:

> **The demonstration provides evidence. The approved contract defines success.**

EvalTape does not blindly replay the demonstration.

---

# Current Status

**EvalTape V0 is a working research prototype.**

The full V0 workflow has been validated against real GitHub Issues, including:

- human browser demonstrations
- automatic before / after capture
- candidate contract generation
- human approval
- deterministic PASS and FAIL evaluation
- alternate agent execution paths
- no-op protection
- runtime validation
- clean-clone installation
- packaged npm tarball installation
- execution outside the source repository
- execution without `tsx`

The next milestone is external-user validation:

> Can someone who did not build EvalTape understand, install, and use it without developer guidance?

Until that is tested, the priority is usability and evidence rather than expanding the feature surface.

---

# Quick Start

## Run without installing globally

```bash
npx evaltape
```

See the available adapters:

```bash
npx evaltape adapters
```

## Or install globally

```bash
npm install -g evaltape
```

Then run:

```bash
evaltape
```

---

# Requirements

EvalTape V0 requires:

- Node.js 20 or newer
- npm
- GitHub CLI (`gh`) for the GitHub Issues workflow
- a GitHub account with access to the repository you want to test

Authenticate GitHub CLI:

```bash
gh auth login
```

Verify authentication:

```bash
gh auth status
```

For testing, use a sandbox or non-production GitHub repository.

---

# Core Principle

EvalTape distinguishes between **procedure** and **outcome**.

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

That means two trajectories can be completely different while still producing the same valid result.

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

# Workflow 1 — Author an Eval

The first workflow turns a successful human demonstration into a reusable eval.

## Step 1 — Start Recording

Example:

```bash
npx evaltape record \
  --adapter github-issues \
  --repo YOUR_USERNAME/YOUR_REPOSITORY \
  --task "Create an open issue titled 'Payment timeout' assigned to YOUR_USERNAME"
```

If EvalTape is installed globally, you can use:

```bash
evaltape record \
  --adapter github-issues \
  --repo YOUR_USERNAME/YOUR_REPOSITORY \
  --task "Create an open issue titled 'Payment timeout' assigned to YOUR_USERNAME"
```

EvalTape captures the current GitHub state before the task.

Example output:

```text
CAPTURING BEFORE STATE...

✓ RECORDING STARTED
Adapter: github-issues
Repo: YOUR_USERNAME/YOUR_REPOSITORY
Task: Create an open issue titled 'Payment timeout' assigned to YOUR_USERNAME
Captured entities: 10
Before snapshot: .../.evaltape/recordings/.../before.json

Now perform the task manually in GitHub.
When finished, run: evaltape finish
```

Now perform the task yourself.

For this example:

1. Open the repository in GitHub.
2. Create a new issue.
3. Set the title to:

```text
Payment timeout
```

4. Assign the requested GitHub user.
5. Leave the issue open.

---

## Step 2 — Finish the Demonstration

If using `npx`:

```bash
npx evaltape finish
```

If installed globally:

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

Known V0 limitations are shown explicitly:

```text
WARNINGS:
! Selector was inferred heuristically and requires human confirmation.
! V0 compiler only supports a single added entity.
! Matching currently requires task-variable names to match entity field names.
```

EvalTape asks:

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
/path/to/.evaltape/evals/task-....json

✓ RECORDING COMPLETE
```

Keep that saved eval path.

You will use it to test another execution.

---

# Why Human Approval Exists

The demonstration is evidence.

It is **not automatically authoritative**.

EvalTape proposes the contract, but the human remains the authority on what success actually means.

For example, suppose the task is:

```text
Create an open issue titled "Payment timeout" assigned to AidaMichel
```

but the human also writes this body:

```text
Found during checkout testing.
```

The body was not part of the task intent.

A future agent should not automatically fail because it used a different body.

The goal is:

> **The smallest correct success contract, not an exact copy of every observed detail.**

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

If you start a recording but do not want to complete it:

```bash
npx evaltape cancel
```

or:

```bash
evaltape cancel
```

EvalTape removes the active-session marker while preserving the captured evidence directory.

---

# Workflow 2 — Test Another Agent

Once you have an approved eval, another agent can attempt the task.

The alternate execution does **not** need to repeat the human demonstration path.

It can use:

- another browser agent
- GitHub CLI
- GitHub API
- an MCP or connector integration
- another automation system
- another future agent runtime

What matters is whether the approved outcome contract is satisfied.

---

## Step 1 — Start an Agent Run

Use the approved eval created during the human demonstration.

For example:

```bash
npx evaltape run \
  --eval .evaltape/evals/YOUR_APPROVED_EVAL.json \
  --repo YOUR_USERNAME/YOUR_REPOSITORY
```

Or, when globally installed:

```bash
evaltape run \
  --eval .evaltape/evals/YOUR_APPROVED_EVAL.json \
  --repo YOUR_USERNAME/YOUR_REPOSITORY
```

Example output:

```text
CAPTURING AGENT-RUN BASELINE...

✓ AGENT RUN STARTED
Repo: YOUR_USERNAME/YOUR_REPOSITORY
Task: Create an open GitHub issue titled "Payment timeout" assigned to YOUR_USERNAME.
Captured entities: 10
Before snapshot: .../.evaltape/runs/.../before.json

Now let the other agent perform the task.
When it is finished, run: evaltape check
```

EvalTape freezes:

- the before state
- the exact approved eval
- the task being evaluated

The eval is copied into the run evidence directory so changing the original eval later cannot silently change an active run.

---

## Step 2 — Let Another Agent Perform the Task

Now let another agent attempt the task.

For example:

```text
Human demonstration:
GitHub browser UI

Alternate execution:
GitHub API
```

The trajectories may differ.

The required outcome must not.

---

## Step 3 — Check the Result

If using `npx`:

```bash
npx evaltape check
```

Or:

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

EvalTape also preserves the evidence:

```text
Evidence: .../.evaltape/runs/<run-id>
Result: .../.evaltape/runs/<run-id>/result.json

✓ AGENT RUN COMPLETE
```

---

# Example Failure

If the agent does not create the required issue:

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

EvalTape intentionally reports **why** the run failed instead of returning only an opaque score.

---

# No-Op Protection

EvalTape distinguishes between:

```text
"The required state exists"
```

and:

```text
"The agent actually caused the required transition"
```

Suppose the correct issue already existed before the run.

If the agent does nothing, the final state may still look correct.

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

Cancel an active agent evaluation with:

```bash
npx evaltape cancel-run
```

or:

```bash
evaltape cancel-run
```

Human recordings and agent runs are separate session types:

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

EvalTape prevents a human demonstration and agent evaluation from being active at the same time.

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

These contain evidence such as:

- task intent
- before state
- after state
- frozen approved evals
- deterministic evaluation results

When working from the source repository, these runtime artifacts are ignored by Git.

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

EvalTape core reasons about normalized evidence rather than knowing every product's raw API structure.

---

# Runtime Validation

External product data is treated as untrusted.

The GitHub adapter validates raw input before converting it into EvalTape state.

Malformed data fails closed.

For example, an issue number arriving as a string instead of a number is rejected instead of quietly being interpreted.

This protects the evaluator from making decisions using malformed evidence.

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

The final contract verdict is deterministic.

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

Contracts contain:

```text
MUST
```

and:

```text
MUST NOT
```

assertions.

Current operators include:

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

Expected values can be literal values or references to dynamic task variables.

That allows a contract to remain reusable even when task-specific values change.

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

EvalTape V0 has demonstrated:

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
19. Real human browser demonstrations.
20. Compiler rejection of contradictory demonstrations.
21. Automatic human-demo before / after capture.
22. Natural-language task persistence.
23. Automatic agent-run baseline and result capture.
24. Real alternate-agent PASS.
25. Real incorrect-agent FAIL.
26. Preserved evaluation evidence.
27. Fresh-clone installation.
28. npm-package build and packaging.
29. npm-package execution outside the source repository.
30. Runtime operation without `tsx`.

This proves the core V0 thesis for one narrow task family.

It does **not** mean EvalTape is production-ready.

---

# V0 Limitations

Current limitations include:

- the compiler currently supports exactly one added entity
- update, delete, and multi-entity task compilation are not yet supported
- natural-language task authoring supports only a narrow GitHub issue creation grammar
- task-variable names currently need to match normalized entity field names
- selector inference is currently heuristic
- duplicate titles can create ambiguous selectors
- ambiguous selectors fail closed
- array equality is currently order-sensitive
- GitHub entity keys are issue-number based and not yet repository-qualified
- deep semantic field mapping is not implemented
- process constraints are not yet a first-class contract type
- asynchronous / eventual-consistency polling is not implemented
- flaky-environment handling is not implemented
- privacy and evidence-redaction controls are not implemented
- approved eval validation is still shallow in some paths
- TaskSpec runtime validation should be strengthened
- human confirmation currently supports approve / reject, not rich interactive editing
- generic arbitrary-browser recording is not implemented
- arbitrary products do not automatically work without an adapter
- native Windows behavior has not yet been fully validated
- V0 currently depends on GitHub CLI for the GitHub Issues integration

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

Outcome-only evaluation is useful, but it is not sufficient for every safety-critical or business-critical workflow.

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
- a guarantee that any demonstrated behavior automatically becomes a good eval

EvalTape's current job is narrower:

> **Turn a demonstrated task into a human-approved, outcome-based acceptance test and use it to evaluate another execution.**

---

# Development

Clone the source repository:

```bash
git clone https://github.com/AidaMichel/evaltape.git
cd evaltape
npm install
```

Run the tests:

```bash
npm test
```

Build the production CLI:

```bash
npm run build
```

Run directly:

```bash
node bin/evaltape.js
```

Or link the development version locally:

```bash
npm link
evaltape
```

Inspect the npm package before publishing:

```bash
npm pack --dry-run
```

---

# Repository Structure

Important source files include:

```text
src/
  adapter.ts
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
  store.ts
  task.ts
  task-authoring.ts
  task-authoring.test.ts
  types.ts

  adapters/
    github-issues.ts
    registry.ts
    shop.ts

bin/
  evaltape.js

dist/
  generated production JavaScript
```

`dist/` is generated during the build and is not committed to the source repository.

---

# Design Rules

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

EvalTape is built around a falsifiable hypothesis:

> Given a task description, a successful human demonstration, and structured before / after state, EvalTape can propose a small success contract that a human can quickly approve and that can correctly evaluate alternate agent trajectories.

The GitHub Issues V0 supports that hypothesis for one narrow task family.

The next challenge is not to add every possible feature.

It is to determine whether the workflow remains useful and understandable when somebody other than the developer uses it.

---

# Contributing

EvalTape is intentionally small while the core workflow is being validated.

Before proposing a large feature expansion, consider whether the change improves one of these areas:

- contract correctness
- evaluation reliability
- adapter quality
- evidence quality
- installation
- usability
- external-user validation

Bug reports and focused pull requests are welcome.

Repository:

```text
https://github.com/AidaMichel/evaltape
```

Issues:

```text
https://github.com/AidaMichel/evaltape/issues
```

---

# License

MIT

---

# One Sentence

**EvalTape lets you demonstrate success once, turn it into an approved acceptance test, and evaluate whether another agent reaches the same required outcome—even by a different path.**
