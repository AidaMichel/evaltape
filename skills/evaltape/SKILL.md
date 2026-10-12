---
name: evaltape
description: Validate an AI agent or automation against a human-approved EvalTape outcome contract. Use when the user explicitly asks to run, check, create, initialize, or diagnose an EvalTape evaluation.
---

# EvalTape

Use EvalTape to determine whether an execution satisfied a human-approved outcome contract.

EvalTape evaluates outcomes, not exact trajectories.

A target agent may use a different path from the original human demonstration and still pass if it satisfies the approved contract.

## Core rule

The approved EvalTape contract is the acceptance authority.

Never modify, weaken, replace, regenerate, reinterpret, or selectively ignore an approved eval to make an execution pass.

Preserve failed evaluations as evidence.

## When to use this skill

Use this skill when the user explicitly asks to:

- use EvalTape;
- run or check an approved EvalTape evaluation;
- validate an agent execution using EvalTape;
- create or record a new EvalTape evaluation;
- initialize or diagnose EvalTape.

Do not invoke this skill merely because a repository contains `.evaltape/` or because the user mentions testing, QA, or evaluation generally.

## Safety rules

1. Start the EvalTape baseline before the target task changes external state.
2. Never report PASS unless EvalTape explicitly reports PASS.
3. Never hide or soften FAIL.
4. Do not silently retry using weaker criteria.
5. Do not edit approved evals during an active run.
6. Preserve EvalTape evidence.
7. Fail closed when the eval, repository, or target cannot be resolved safely.
8. Distinguish contract FAIL from environment or runtime errors.
9. Never execute documentation placeholders literally.

## Placeholder safety

These are examples only:

- `PATH_TO_APPROVED_EVAL.json`
- `owner/repository`
- `TASK INSTRUCTION`
- `USERNAME`
- `<resolved-eval-path>`

Never pass those literal strings to EvalTape.

Resolve real values first.

If a required value cannot be determined safely, stop and ask the user rather than guessing.

## Resolve the EvalTape command

Prefer a project-local installation.

Check:

```bash
test -x node_modules/.bin/evaltape
```

If that succeeds, use:

```text
npx --no-install evaltape
```

Otherwise check:

```bash
command -v evaltape
```

If a global executable exists, use:

```text
evaltape
```

Use the chosen invocation consistently for the rest of the workflow.

Do not install EvalTape automatically unless the user asked for setup or authorized project changes.

## Initialize a project

Only initialize EvalTape when setup is part of the user's request.

Run the resolved EvalTape command with:

```text
init
```

Initialization should create:

```text
.evaltape/
├── config.json
└── evals/
```

Approved evals may live in `.evaltape/evals/`.

Runtime recordings and runs should remain ignored.

## Diagnose the environment

Run the resolved EvalTape command with:

```text
doctor
```

For the current GitHub Issues workflow, continue only when EvalTape reports:

```text
READY ✓
```

If it reports:

```text
NOT READY ✗
```

surface the failed checks and stop.

This is a setup blocker, not a task FAIL.

## Find an approved eval

Approved evals normally live in:

```text
.evaltape/evals/
```

Inspect them read-only:

```bash
find .evaltape/evals -maxdepth 1 -type f -name '*.json' -print
```

If the user named an eval, use it.

If exactly one eval is clearly relevant, use it.

If multiple evals could reasonably match, do not guess. Ask the user which approved contract should be used.

Never choose an eval because it is easier to pass.

## Resolve the repository

The current GitHub Issues workflow requires:

```text
owner/repository
```

Prefer:

1. a repository explicitly supplied by the user;
2. a repository clearly identified by task context;
3. the current Git remote only when clearly appropriate.

You may inspect the current remote with:

```bash
git remote get-url origin
```

Do not silently evaluate against another repository.

## Validate an agent execution

### 1. Check readiness

Run `doctor`.

Stop if the environment is not ready.

### 2. Resolve the approved eval

Identify the exact approved eval file.

Do not modify it.

### 3. Resolve the repository

Identify the exact `owner/repository`.

Do not continue while this is ambiguous.

### 4. Capture the baseline

Construct the command using real resolved values:

```text
evaltape run --eval <resolved eval path> --repo <resolved owner/repository>
```

The values in angle brackets describe structure only.

Never execute them literally.

Continue only if EvalTape confirms that the agent run started and the before-state was captured.

If baseline capture fails:

- stop immediately;
- do not perform the target task;
- do not call `check`;
- report an evaluation setup or runtime error.

### 5. Perform the target task

Only after baseline capture succeeds, perform the requested task using the available tools.

The agent does not need to reproduce the human demonstration.

Optimize for satisfying the approved outcome rather than reproducing clicks.

Do not change the contract to fit the agent's behavior.

### 6. Check the result

After the target task completes, run:

```text
evaltape check
```

Only call `check` when a corresponding agent run successfully started.

Interpret the result as follows:

```text
PASS ✓
```

means the execution satisfied the approved contract.

```text
FAIL ✗
```

means the execution did not satisfy the approved contract.

CLI exceptions, missing files, authentication failures, missing active runs, API failures, malformed evals, or other runtime problems are evaluation errors, not contract FAIL.

## PASS

When EvalTape reports PASS, report:

- `PASS`;
- approved eval used;
- target repository;
- concise statement that the approved outcome contract was satisfied.

Do not imply that PASS proves every possible property of the agent.

## FAIL

When EvalTape reports FAIL:

- preserve the result;
- surface the failed checks;
- do not weaken the contract;
- do not report partial success as PASS;
- do not silently retry.

A retry should begin as a new EvalTape run with a new before-state.

## Evaluation blocker

Use `BLOCKED` when EvalTape cannot produce a valid PASS or FAIL because of setup or runtime problems.

Examples:

- `doctor` reports `NOT READY`;
- eval file is missing;
- repository cannot be resolved;
- baseline capture fails;
- no active run exists;
- GitHub API access fails;
- EvalTape reports an invalid evaluation.

Do not represent these as agent FAIL.

## Cancel an active run

If an active run must be abandoned, use:

```text
evaltape cancel-run
```

Cancellation preserves evidence.

Do not use cancellation to hide a genuine FAIL.

## Author a new eval

Only enter authoring mode when the user explicitly asks to create or record a new EvalTape evaluation.

The current natural-language workflow supports GitHub Issues.

Resolve the actual repository and task instruction before execution.

Command structure:

```text
evaltape record --adapter github-issues --repo <resolved owner/repository> --task "<resolved task instruction>"
```

Never execute unresolved placeholders literally.

The command captures the before-state.

The human then performs the demonstration.

After the human confirms the demonstration is complete, run:

```text
evaltape finish
```

EvalTape proposes a contract for human approval.

Do not approve the contract on the human's behalf when human confirmation is required.

If authoring is abandoned, run:

```text
evaltape cancel
```

## Trust boundaries

Keep these separate:

- task intent: what the user wants accomplished;
- human demonstration: evidence of one successful path;
- approved eval: the acceptance contract;
- agent trajectory: one attempted execution;
- EvalTape verdict: whether that execution satisfied the approved contract.

A demonstration is not automatically the contract.

A trajectory is not automatically the outcome.

An agent saying "done" is not proof.

EvalTape PASS means the execution satisfied the approved contract.

## Final reporting

PASS:

```text
EvalTape: PASS ✓
Eval: <approved eval path>
Target: <owner/repository>

The execution satisfied the approved outcome contract.
```

FAIL:

```text
EvalTape: FAIL ✗
Eval: <approved eval path>
Target: <owner/repository>

Failed condition:
<failed EvalTape check>

The approved contract was not modified.
```

BLOCKED:

```text
EvalTape: BLOCKED

Reason:
<setup or runtime problem>

No PASS or FAIL verdict was produced.
```
