import {
  execFile
} from "node:child_process";

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

import type {
  EnvironmentSnapshot,
  TaskSpec
} from "./types";

export interface ActiveRecording {
  schemaVersion: 1;
  id: string;
  adapter: "github-issues";
  repo: string;
  startedAt: string;
  directory: string;
  beforeFile: string;

  /*
    Optional only so EvalTape can
    recognize recordings created
    before task persistence existed.
  */
  task?: TaskSpec;
}

export interface StartRecordingResult {
  recording: ActiveRecording;
  capturedEntities: number;
}

export interface FinishRecordingCaptureResult {
  recording: ActiveRecording & {
    task: TaskSpec;
  };

  before: EnvironmentSnapshot;
  after: EnvironmentSnapshot;
  afterFile: string;
  capturedEntities: number;
}

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

function runGh(
  args: string[]
): Promise<string> {
  return new Promise(
    (
      resolvePromise,
      rejectPromise
    ) => {
      execFile(
        "gh",
        args,
        {
          encoding:
            "utf8",

          maxBuffer:
            20 * 1024 * 1024
        },

        (
          error,
          stdout,
          stderr
        ) => {
          if (error) {
            rejectPromise(
              new Error(
                stderr.trim() ||
                error.message
              )
            );

            return;
          }

          resolvePromise(
            stdout
          );
        }
      );
    }
  );
}

export async function captureGitHubIssues(
  repo: string
): Promise<unknown[]> {
  const endpoint =
    `/repos/${repo}/issues?state=open&per_page=100`;

  const stdout =
    await runGh([
      "api",
      "--paginate",
      "--slurp",
      endpoint
    ]);

  const pages =
    JSON.parse(
      stdout
    ) as unknown;

  if (!Array.isArray(pages)) {
    throw new Error(
      "GitHub returned an unexpected response."
    );
  }

  const flattened:
    unknown[] = [];

  for (
    const page of pages
  ) {
    if (!Array.isArray(page)) {
      throw new Error(
        "GitHub pagination returned an unexpected page."
      );
    }

    flattened.push(
      ...page
    );
  }

  /*
    Validate external data before
    trusting or saving it.
  */

  githubIssuesAdapter.normalize(
    flattened
  );

  return flattened;
}

async function loadActiveRecording():
  Promise<ActiveRecording> {
  if (
    !(await pathExists(
      activeRecordingPath
    ))
  ) {
    throw new Error(
      "No active EvalTape recording exists. Start one with `evaltape record`."
    );
  }

  const contents =
    await readFile(
      activeRecordingPath,
      "utf8"
    );

  const parsed =
    JSON.parse(
      contents
    ) as ActiveRecording;

  if (
    parsed.schemaVersion !== 1 ||
    parsed.adapter !==
      "github-issues" ||
    !parsed.repo ||
    !parsed.beforeFile
  ) {
    throw new Error(
      "Active recording file is invalid."
    );
  }

  return parsed;
}

export async function startRecording(
  adapter: string,
  repo: string,
  task: TaskSpec
): Promise<StartRecordingResult> {
  if (
    adapter !==
    "github-issues"
  ) {
    throw new Error(
      `record currently supports only "github-issues".`
    );
  }

  validateRepo(
    repo
  );

  if (
    await pathExists(
      activeRecordingPath
    )
  ) {
    const existing =
      await readFile(
        activeRecordingPath,
        "utf8"
      );

    throw new Error(
      [
        "An EvalTape recording is already active.",
        "",
        existing,
        "",
        "Finish or cancel the active recording before starting another one."
      ].join(
        "\n"
      )
    );
  }

  const rawBefore =
    await captureGitHubIssues(
      repo
    );

  const normalized =
    githubIssuesAdapter.normalize(
      rawBefore
    );

  const now =
    new Date();

  const id =
    `recording-${now
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      )}`;

  const directory =
    resolve(
      ".evaltape",
      "recordings",
      id
    );

  const beforeFile =
    resolve(
      directory,
      "before.json"
    );

  await mkdir(
    directory,
    {
      recursive:
        true
    }
  );

  await mkdir(
    resolve(
      ".evaltape"
    ),
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

  const recording:
    ActiveRecording = {
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

      task
    };

  await writeFile(
    activeRecordingPath,
    JSON.stringify(
      recording,
      null,
      2
    ) + "\n",
    "utf8"
  );

  return {
    recording,

    capturedEntities:
      normalized.entities.length
  };
}

export async function finishRecordingCapture():
  Promise<FinishRecordingCaptureResult> {
  const recording =
    await loadActiveRecording();

  if (!recording.task) {
    throw new Error(
      [
        "This recording was created before EvalTape stored task intent inside the recording.",
        "",
        "Cancel it and start a new recording with:",
        "",
        `evaltape record --adapter github-issues --repo ${recording.repo} --task "Create an open issue titled '...' assigned to USERNAME"`
      ].join(
        "\n"
      )
    );
  }

  const beforeContents =
    await readFile(
      recording.beforeFile,
      "utf8"
    );

  const rawBefore =
    JSON.parse(
      beforeContents
    ) as unknown;

  const rawAfter =
    await captureGitHubIssues(
      recording.repo
    );

  const before =
    githubIssuesAdapter.normalize(
      rawBefore
    );

  const after =
    githubIssuesAdapter.normalize(
      rawAfter
    );

  const afterFile =
    resolve(
      recording.directory,
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

  return {
    recording: {
      ...recording,
      task:
        recording.task
    },

    before,
    after,
    afterFile,

    capturedEntities:
      after.entities.length
  };
}

export async function completeRecording():
  Promise<void> {
  if (
    await pathExists(
      activeRecordingPath
    )
  ) {
    await unlink(
      activeRecordingPath
    );
  }
}

export async function cancelRecording():
  Promise<ActiveRecording> {
  const recording =
    await loadActiveRecording();

  await unlink(
    activeRecordingPath
  );

  return recording;
}
