import {
  readFile
} from "node:fs/promises";

import {
  resolve
} from "node:path";

import {
  cancelAgentRun,
  checkAgentRun,
  startAgentRun
} from "./agent-run";

import {
  getAdapter,
  listAdapters
} from "./adapters/registry";

import {
  compileCandidateContract
} from "./compiler";

import {
  confirmProposal
} from "./confirm";

import {
  diffSnapshots
} from "./diff";

import {
  evaluateContract
} from "./evaluator";

import {
  cancelRecording,
  completeRecording,
  finishRecordingCapture,
  startRecording
} from "./recording";

import {
  loadApprovedEval,
  saveApprovedEval
} from "./store";

import {
  authorGitHubIssueTask
} from "./task-authoring";

import type {
  EnvironmentSnapshot,
  TaskSpec
} from "./types";

async function loadJson<T>(
  filePath: string
): Promise<T> {
  const contents =
    await readFile(
      resolve(filePath),
      "utf8"
    );

  return JSON.parse(
    contents
  ) as T;
}

function getOption(
  args: string[],
  name: string
): string | undefined {
  const index =
    args.indexOf(
      name
    );

  if (index === -1) {
    return undefined;
  }

  const value =
    args[index + 1];

  if (
    !value ||
    value.startsWith("--")
  ) {
    return undefined;
  }

  return value;
}

function printUsage() {
  console.log(`
EvalTape V0


AUTHOR AN EVAL

  evaltape record \\
    --adapter github-issues \\
    --repo owner/repository \\
    --task "Create an open issue titled 'Payment timeout' assigned to USERNAME"

  evaltape finish

  evaltape cancel


TEST ANOTHER EXECUTION

  evaltape run \\
    --eval examples/github-real/approved-eval.json \\
    --repo owner/repository

  evaltape check

  evaltape cancel-run


ADAPTERS

  evaltape adapters


ADVANCED — NORMALIZED STATE

  evaltape propose <task.json> <before.json> <after.json>

  evaltape run <eval.json> <before.json> <after.json>


ADVANCED — RAW PRODUCT STATE

  evaltape propose-raw <adapter> <task.json> <before.json> <after.json>

  evaltape run-raw <adapter> <eval.json> <before.json> <after.json>
`);
}

function printEvaluationResult(
  result:
    ReturnType<
      typeof evaluateContract
    >
): number {
  console.log(
    "\nEVAL RESULT\n"
  );

  for (
    const check of
      result.checks
  ) {
    const symbol =
      check.passed
        ? "✓"
        : "✗";

    console.log(
      `${symbol} ${check.id} [${check.snapshot}]`
    );

    if (!check.passed) {
      if (
        check.expected !==
        undefined
      ) {
        console.log(
          `  expected: ${JSON.stringify(check.expected)}`
        );
      }

      if (
        check.observed !==
        undefined
      ) {
        console.log(
          `  observed: ${JSON.stringify(check.observed)}`
        );
      }

      if (check.error) {
        console.log(
          `  error: ${check.error}`
        );
      }
    }
  }

  console.log("");

  if (!result.valid) {
    console.log(
      `INVALID: ${result.error ?? "unknown error"}`
    );

    return 2;
  }

  if (result.passed) {
    console.log(
      "PASS ✓"
    );

    return 0;
  }

  console.log(
    "FAIL ✗"
  );

  return 1;
}

async function proposeFromSnapshots(
  task: TaskSpec,
  before: EnvironmentSnapshot,
  after: EnvironmentSnapshot
): Promise<boolean> {
  console.log(
    "\nDIFFING DEMONSTRATION..."
  );

  const changes =
    diffSnapshots(
      before,
      after
    );

  console.dir(
    changes,
    {
      depth:
        null
    }
  );

  const compiled =
    compileCandidateContract(
      task,
      changes
    );

  if (!compiled.ok) {
    throw new Error(
      compiled.error
    );
  }

  const confirmed =
    await confirmProposal(
      compiled.proposal
    );

  if (!confirmed) {
    console.log(
      "\nCONTRACT REJECTED"
    );

    return false;
  }

  const savedPath =
    await saveApprovedEval(
      task,
      confirmed
    );

  console.log(
    "\n✓ APPROVED EVAL SAVED"
  );

  console.log(
    savedPath
  );

  return true;
}

async function runFromSnapshots(
  evalFile: string,
  before: EnvironmentSnapshot,
  after: EnvironmentSnapshot
) {
  const saved =
    await loadApprovedEval(
      evalFile
    );

  const result =
    evaluateContract(
      before,
      after,
      saved.task,
      saved.contract
    );

  process.exitCode =
    printEvaluationResult(
      result
    );
}

async function proposeNormalized(
  taskFile: string,
  beforeFile: string,
  afterFile: string
) {
  const task =
    await loadJson<TaskSpec>(
      taskFile
    );

  const before =
    await loadJson<EnvironmentSnapshot>(
      beforeFile
    );

  const after =
    await loadJson<EnvironmentSnapshot>(
      afterFile
    );

  await proposeFromSnapshots(
    task,
    before,
    after
  );
}

async function runNormalized(
  evalFile: string,
  beforeFile: string,
  afterFile: string
) {
  const before =
    await loadJson<EnvironmentSnapshot>(
      beforeFile
    );

  const after =
    await loadJson<EnvironmentSnapshot>(
      afterFile
    );

  await runFromSnapshots(
    evalFile,
    before,
    after
  );
}

async function proposeRaw(
  adapterName: string,
  taskFile: string,
  beforeFile: string,
  afterFile: string
) {
  const adapter =
    getAdapter(
      adapterName
    );

  const task =
    await loadJson<TaskSpec>(
      taskFile
    );

  const rawBefore =
    await loadJson<unknown>(
      beforeFile
    );

  const rawAfter =
    await loadJson<unknown>(
      afterFile
    );

  console.log(
    `\nUSING ADAPTER: ${adapter.name}`
  );

  const before =
    adapter.normalize(
      rawBefore
    );

  const after =
    adapter.normalize(
      rawAfter
    );

  await proposeFromSnapshots(
    task,
    before,
    after
  );
}

async function runRaw(
  adapterName: string,
  evalFile: string,
  beforeFile: string,
  afterFile: string
) {
  const adapter =
    getAdapter(
      adapterName
    );

  const rawBefore =
    await loadJson<unknown>(
      beforeFile
    );

  const rawAfter =
    await loadJson<unknown>(
      afterFile
    );

  console.log(
    `\nUSING ADAPTER: ${adapter.name}`
  );

  const before =
    adapter.normalize(
      rawBefore
    );

  const after =
    adapter.normalize(
      rawAfter
    );

  await runFromSnapshots(
    evalFile,
    before,
    after
  );
}

async function record(
  args: string[]
) {
  const adapter =
    getOption(
      args,
      "--adapter"
    );

  const repo =
    getOption(
      args,
      "--repo"
    );

  const instruction =
    getOption(
      args,
      "--task"
    );

  if (
    !adapter ||
    !repo ||
    !instruction
  ) {
    console.log(
      "\nrecord requires --adapter, --repo, and --task."
    );

    printUsage();

    process.exitCode =
      2;

    return;
  }

  if (
    adapter !==
    "github-issues"
  ) {
    throw new Error(
      "Natural-language task authoring currently supports only github-issues."
    );
  }

  const task =
    authorGitHubIssueTask(
      `task:github-issues:${Date.now()}`,
      instruction
    );

  console.log(
    "\nCAPTURING BEFORE STATE..."
  );

  const result =
    await startRecording(
      adapter,
      repo,
      task
    );

  console.log(
    "\n✓ RECORDING STARTED"
  );

  console.log(
    `Adapter: ${result.recording.adapter}`
  );

  console.log(
    `Repo: ${result.recording.repo}`
  );

  console.log(
    `Task: ${task.currentInstruction}`
  );

  console.log(
    `Captured entities: ${result.capturedEntities}`
  );

  console.log(
    `Before snapshot: ${result.recording.beforeFile}`
  );

  console.log(
    "\nNow perform the task manually in GitHub."
  );

  console.log(
    "When finished, run: evaltape finish"
  );
}

async function finish(
  args: string[]
) {
  if (
    args.length > 0
  ) {
    console.log(
      "\nfinish does not require options. The task is stored when recording starts."
    );

    printUsage();

    process.exitCode =
      2;

    return;
  }

  console.log(
    "\nCAPTURING AFTER STATE..."
  );

  const capture =
    await finishRecordingCapture();

  console.log(
    "\n✓ AFTER STATE CAPTURED"
  );

  console.log(
    `Repo: ${capture.recording.repo}`
  );

  console.log(
    `Task: ${capture.recording.task.currentInstruction}`
  );

  console.log(
    `Captured entities: ${capture.capturedEntities}`
  );

  console.log(
    `After snapshot: ${capture.afterFile}`
  );

  const approved =
    await proposeFromSnapshots(
      capture.recording.task,
      capture.before,
      capture.after
    );

  if (!approved) {
    console.log(
      "\nRecording remains active so you can fix the demonstration and try again."
    );

    return;
  }

  await completeRecording();

  console.log(
    "\n✓ RECORDING COMPLETE"
  );
}

async function cancel() {
  const recording =
    await cancelRecording();

  console.log(
    "\n✓ RECORDING CANCELLED"
  );

  console.log(
    `Repo: ${recording.repo}`
  );

  console.log(
    `Evidence preserved at: ${recording.directory}`
  );
}

async function startEvaluationRun(
  args: string[]
) {
  const evalFile =
    getOption(
      args,
      "--eval"
    );

  const repo =
    getOption(
      args,
      "--repo"
    );

  if (
    !evalFile ||
    !repo
  ) {
    console.log(
      "\nrun requires --eval and --repo."
    );

    printUsage();

    process.exitCode =
      2;

    return;
  }

  console.log(
    "\nCAPTURING AGENT-RUN BASELINE..."
  );

  const started =
    await startAgentRun(
      evalFile,
      repo
    );

  console.log(
    "\n✓ AGENT RUN STARTED"
  );

  console.log(
    `Repo: ${started.run.repo}`
  );

  console.log(
    `Task: ${started.taskInstruction}`
  );

  console.log(
    `Captured entities: ${started.capturedEntities}`
  );

  console.log(
    `Before snapshot: ${started.run.beforeFile}`
  );

  console.log(
    "\nNow let the other agent perform the task."
  );

  console.log(
    "When it is finished, run: evaltape check"
  );
}

async function check() {
  console.log(
    "\nCAPTURING AGENT-RUN RESULT..."
  );

  const checked =
    await checkAgentRun();

  console.log(
    "\n✓ AFTER STATE CAPTURED"
  );

  console.log(
    `Repo: ${checked.run.repo}`
  );

  console.log(
    `Captured entities: ${checked.capturedEntities}`
  );

  console.log(
    `After snapshot: ${checked.afterFile}`
  );

  const exitCode =
    printEvaluationResult(
      checked.result
    );

  console.log(
    `Evidence: ${checked.run.directory}`
  );

  console.log(
    `Result: ${checked.resultFile}`
  );

  console.log(
    "\n✓ AGENT RUN COMPLETE"
  );

  process.exitCode =
    exitCode;
}

async function cancelRun() {
  const run =
    await cancelAgentRun();

  console.log(
    "\n✓ AGENT RUN CANCELLED"
  );

  console.log(
    `Repo: ${run.repo}`
  );

  console.log(
    `Evidence preserved at: ${run.directory}`
  );
}

async function main() {
  const [
    ,
    ,
    command,
    ...args
  ] = process.argv;

  if (
    command ===
    "record"
  ) {
    await record(
      args
    );

    return;
  }

  if (
    command ===
    "finish"
  ) {
    await finish(
      args
    );

    return;
  }

  if (
    command ===
    "cancel"
  ) {
    await cancel();

    return;
  }

  if (
    command ===
    "check"
  ) {
    if (
      args.length !==
      0
    ) {
      printUsage();

      process.exitCode =
        2;

      return;
    }

    await check();

    return;
  }

  if (
    command ===
    "cancel-run"
  ) {
    if (
      args.length !==
      0
    ) {
      printUsage();

      process.exitCode =
        2;

      return;
    }

    await cancelRun();

    return;
  }

  if (
    command ===
    "adapters"
  ) {
    console.log(
      "\nAVAILABLE ADAPTERS:"
    );

    for (
      const name of
        listAdapters()
    ) {
      console.log(
        `- ${name}`
      );
    }

    return;
  }

  if (
    command ===
    "propose"
  ) {
    if (
      args.length !==
      3
    ) {
      printUsage();

      process.exitCode =
        2;

      return;
    }

    await proposeNormalized(
      args[0],
      args[1],
      args[2]
    );

    return;
  }

  if (
    command ===
    "run"
  ) {
    const hasNewRunOptions =
      args.includes(
        "--eval"
      ) ||
      args.includes(
        "--repo"
      );

    if (hasNewRunOptions) {
      await startEvaluationRun(
        args
      );

      return;
    }

    if (
      args.length !==
      3
    ) {
      printUsage();

      process.exitCode =
        2;

      return;
    }

    await runNormalized(
      args[0],
      args[1],
      args[2]
    );

    return;
  }

  if (
    command ===
    "propose-raw"
  ) {
    if (
      args.length !==
      4
    ) {
      printUsage();

      process.exitCode =
        2;

      return;
    }

    await proposeRaw(
      args[0],
      args[1],
      args[2],
      args[3]
    );

    return;
  }

  if (
    command ===
    "run-raw"
  ) {
    if (
      args.length !==
      4
    ) {
      printUsage();

      process.exitCode =
        2;

      return;
    }

    await runRaw(
      args[0],
      args[1],
      args[2],
      args[3]
    );

    return;
  }

  printUsage();
}

main().catch(
  (error) => {
    console.error(
      "\nEVALTAPE ERROR"
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode =
      2;
  }
);
