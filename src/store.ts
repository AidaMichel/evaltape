import {
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";

import path from "node:path";

import type {
  TaskSpec
} from "./types";

import type {
  OutcomeContract
} from "./contract";

export interface SavedEval {
  schemaVersion: 1;

  status: "approved";

  approvedAt: string;

  task: TaskSpec;

  contract: OutcomeContract;
}

function safeFileName(
  value: string
): string {
  return value.replace(
    /[^a-zA-Z0-9._-]+/g,
    "-"
  );
}

export async function saveApprovedEval(
  task: TaskSpec,
  contract: OutcomeContract
): Promise<string> {
  if (contract.taskId !== task.id) {
    throw new Error(
      "Cannot save contract for a different task"
    );
  }

  if (
    contract.taskVersion !==
    task.version
  ) {
    throw new Error(
      "Cannot save a stale contract"
    );
  }

  const directory =
    path.join(
      process.cwd(),
      ".evaltape",
      "evals"
    );

  await mkdir(
    directory,
    {
      recursive: true
    }
  );

  const confirmedContract: OutcomeContract = {
    ...contract,

    id:
      contract.id.endsWith(
        ":candidate"
      )
        ? contract.id.replace(
            /:candidate$/,
            ":approved"
          )
        : contract.id
  };

  const savedEval: SavedEval = {
    schemaVersion: 1,

    status: "approved",

    approvedAt:
      new Date().toISOString(),

    task,

    contract:
      confirmedContract
  };

  const filePath =
    path.join(
      directory,
      `${safeFileName(task.id)}.json`
    );

  await writeFile(
    filePath,
    JSON.stringify(
      savedEval,
      null,
      2
    ) + "\n",
    "utf8"
  );

  return filePath;
}

export async function loadApprovedEval(
  filePath: string
): Promise<SavedEval> {
  const contents =
    await readFile(
      filePath,
      "utf8"
    );

  const parsed =
    JSON.parse(contents);

  if (
    parsed.schemaVersion !== 1 ||
    parsed.status !== "approved"
  ) {
    throw new Error(
      "Invalid or unsupported EvalTape file"
    );
  }

  return parsed as SavedEval;
}
