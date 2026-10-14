import {
  access,
  mkdir,
  readFile,
  unlink,
  writeFile
} from "node:fs/promises";

import {
  resolve
} from "node:path";

import {
  githubIssuesAdapter
} from "./adapters/github-issues";

import {
  evaluateContract
} from "./evaluator";

import {
  captureGitHubIssues
} from "./recording";

import {
  loadApprovedEval
} from "./store";

import type { OutcomeContract } from "./contract";
import type { EnvironmentSnapshot, TaskSpec } from "./types";

export interface AgentRunObservationOptions {
  before: EnvironmentSnapshot;
  task: TaskSpec;
  contract: OutcomeContract;
  capture: () => Promise<unknown>;
  normalize: (raw: unknown) => EnvironmentSnapshot;
  sleep?: (milliseconds: number) => Promise<void>;
  maxObservations?: number;
  intervalMs?: number;
}

/* Retry observation failures only; never recapture the frozen before-state. */
export async function observeAgentRun({
  before,
  task,
  contract,
  capture,
  normalize,
  sleep = (milliseconds) => new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  }),
  maxObservations = 5,
  intervalMs = 2000
}: AgentRunObservationOptions) {
  if (!Number.isSafeInteger(maxObservations) || maxObservations < 1) {
    throw new Error("maxObservations must be a positive safe integer.");
  }
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new Error("intervalMs must be a non-negative finite number.");
  }

  for (let observation = 1; ; observation += 1) {
    // Capture/normalization exceptions propagate without fabricating a verdict.
    const rawAfter = await capture();
    const after = normalize(rawAfter);
    const result = evaluateContract(before, after, task, contract);
    const requiredFailures = result.checks.filter(
      (check) => check.required && !check.passed
    );
    const retryable = result.valid && !result.stale &&
      result.error === undefined && requiredFailures.length > 0 &&
      requiredFailures.every(
        (check) => check.snapshot === "after" && check.error === undefined
      );

    if (result.passed || !retryable || observation >= maxObservations) {
      return { rawAfter, after, result };
    }
    await sleep(intervalMs);
  }
}

export interface ActiveAgentRun {
  schemaVersion: 1;
  id: string;
  adapter: "github-issues";
  repo: string;
  startedAt: string;
  directory: string;
  beforeFile: string;
  evalFile: string;
  taskId: string;
}

export interface StartAgentRunResult {
  run: ActiveAgentRun;
  taskInstruction: string;
  capturedEntities: number;
}

export interface CheckAgentRunResult {
  run: ActiveAgentRun;
  afterFile: string;
  resultFile: string;
  capturedEntities: number;
  result: ReturnType<
    typeof evaluateContract
  >;
}

const activeRunPath =
  resolve(
    ".evaltape",
    "active-run.json"
  );

const activeRecordingPath =
  resolve(
    ".evaltape",
    "active-recording.json"
  );

async function pathExists(
  filePath: string
): Promise<boolean> {
  try {
    await access(
      filePath
    );

    return true;
  } catch {
    return false;
  }
}

function validateRepo(
  repo: string
) {
  const valid =
    /^[^/\s]+\/[^/\s]+$/.test(
      repo
    );

  if (!valid) {
    throw new Error(
      `Invalid GitHub repo "${repo}". Expected owner/repo.`
    );
  }
}

async function loadActiveAgentRun():
  Promise<ActiveAgentRun> {
  if (
    !(await pathExists(
      activeRunPath
    ))
  ) {
    throw new Error(
      "No active agent run exists. Start one with `evaltape run --eval ... --repo ...`."
    );
  }

  const contents =
    await readFile(
      activeRunPath,
      "utf8"
    );

  const parsed =
    JSON.parse(
      contents
    ) as ActiveAgentRun;

  if (
    parsed.schemaVersion !== 1 ||
    parsed.adapter !==
      "github-issues" ||
    !parsed.repo ||
    !parsed.beforeFile ||
    !parsed.evalFile ||
    !parsed.taskId
  ) {
    throw new Error(
      "Active agent run file is invalid."
    );
  }

  return parsed;
}

export async function startAgentRun(
  evalFile: string,
  repo: string
): Promise<StartAgentRunResult> {
  validateRepo(
    repo
  );

  if (
    await pathExists(
      activeRunPath
    )
  ) {
    throw new Error(
      "An EvalTape agent run is already active. Check or cancel it before starting another one."
    );
  }

  if (
    await pathExists(
      activeRecordingPath
    )
  ) {
    throw new Error(
      "A human demonstration recording is currently active. Finish or cancel it before starting an agent run."
    );
  }

  const sourceEvalPath =
    resolve(
      evalFile
    );

  const saved =
    await loadApprovedEval(
      sourceEvalPath
    );

  const rawBefore =
    await captureGitHubIssues(
      repo
    );

  const before =
    githubIssuesAdapter.normalize(
      rawBefore
    );

  const now =
    new Date();

  const id =
    `run-${now
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      )}`;

  const directory =
    resolve(
      ".evaltape",
      "runs",
      id
    );

  const beforeFile =
    resolve(
      directory,
      "before.json"
    );

  const frozenEvalFile =
    resolve(
      directory,
      "eval.json"
    );

  await mkdir(
    directory,
    {
      recursive:
        true
    }
  );

  await writeFile(
    beforeFile,
    JSON.stringify(
      rawBefore,
      null,
      2
    ) + "\n",
    "utf8"
  );

  const evalContents =
    await readFile(
      sourceEvalPath,
      "utf8"
    );

  /*
    Freeze the exact approved eval
    used when this run starts.

    If the original file changes
    later, this run still evaluates
    against the original contract.
  */

  await writeFile(
    frozenEvalFile,
    evalContents,
    "utf8"
  );

  const run:
    ActiveAgentRun = {
      schemaVersion:
        1,

      id,

      adapter:
        "github-issues",

      repo,

      startedAt:
        now.toISOString(),

      directory,

      beforeFile,

      evalFile:
        frozenEvalFile,

      taskId:
        saved.task.id
    };

  await writeFile(
    activeRunPath,
    JSON.stringify(
      run,
      null,
      2
    ) + "\n",
    "utf8"
  );

  return {
    run,

    taskInstruction:
      saved.task.currentInstruction,

    capturedEntities:
      before.entities.length
  };
}

export async function checkAgentRun():
  Promise<CheckAgentRunResult> {
  const run =
    await loadActiveAgentRun();

  const beforeContents =
    await readFile(
      run.beforeFile,
      "utf8"
    );

  const rawBefore =
    JSON.parse(
      beforeContents
    ) as unknown;

  const before =
    githubIssuesAdapter.normalize(
      rawBefore
    );

  const saved =
    await loadApprovedEval(
      run.evalFile
    );

  const { rawAfter, after, result } =
    await observeAgentRun({
      before,
      task: saved.task,
      contract: saved.contract,
      capture: () => captureGitHubIssues(run.repo),
      normalize: (raw) => githubIssuesAdapter.normalize(raw)
    });

  const afterFile =
    resolve(
      run.directory,
      "after.json"
    );

  await writeFile(
    afterFile,
    JSON.stringify(
      rawAfter,
      null,
      2
    ) + "\n",
    "utf8"
  );

  const resultFile =
    resolve(
      run.directory,
      "result.json"
    );

  await writeFile(
    resultFile,
    JSON.stringify(
      result,
      null,
      2
    ) + "\n",
    "utf8"
  );

  /*
    A verdict ends this run.

    PASS or FAIL is preserved
    in the run evidence directory.
  */

  await unlink(
    activeRunPath
  );

  return {
    run,
    afterFile,
    resultFile,

    capturedEntities:
      after.entities.length,

    result
  };
}

export async function cancelAgentRun():
  Promise<ActiveAgentRun> {
  const run =
    await loadActiveAgentRun();

  await unlink(
    activeRunPath
  );

  return run;
}
