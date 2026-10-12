import {
  constants
} from "node:fs";

import {
  access,
  readFile
} from "node:fs/promises";

import {
  execFile
} from "node:child_process";

import {
  resolve
} from "node:path";

export interface DoctorCheck {
  id:
    | "node"
    | "gh"
    | "gh-auth"
    | "project"
    | "writable";

  label: string;
  passed: boolean;
  detail: string;
}

export interface DoctorResult {
  passed: boolean;
  checks: DoctorCheck[];
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export type CommandRunner = (
  command: string,
  args: string[]
) => Promise<CommandResult>;

export interface DoctorOptions {
  root?: string;
  nodeVersion?: string;
  runCommand?: CommandRunner;
}

function defaultRunCommand(
  command: string,
  args: string[]
): Promise<CommandResult> {
  return new Promise(
    (
      resolvePromise,
      rejectPromise
    ) => {
      execFile(
        command,
        args,
        {
          encoding: "utf8"
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
            {
              stdout,
              stderr
            }
          );
        }
      );
    }
  );
}

async function checkNode(
  nodeVersion: string
): Promise<DoctorCheck> {
  const major =
    Number(
      nodeVersion
        .split(".")[0]
    );

  const passed =
    Number.isFinite(
      major
    ) &&
    major >= 20;

  return {
    id: "node",
    label: "Node.js 20+",
    passed,
    detail:
      passed
        ? `Node.js ${nodeVersion}`
        : `Node.js ${nodeVersion} is unsupported. EvalTape requires Node.js 20 or newer.`
  };
}

async function checkGhInstalled(
  runCommand: CommandRunner
): Promise<DoctorCheck> {
  try {
    const result =
      await runCommand(
        "gh",
        [
          "--version"
        ]
      );

    const firstLine =
      result.stdout
        .trim()
        .split("\n")[0];

    return {
      id: "gh",
      label: "GitHub CLI installed",
      passed: true,
      detail:
        firstLine ||
        "GitHub CLI available"
    };
  } catch {
    return {
      id: "gh",
      label: "GitHub CLI installed",
      passed: false,
      detail:
        "GitHub CLI (`gh`) was not found."
    };
  }
}

async function checkGhAuth(
  runCommand: CommandRunner
): Promise<DoctorCheck> {
  try {
    await runCommand(
      "gh",
      [
        "auth",
        "status"
      ]
    );

    return {
      id: "gh-auth",
      label: "GitHub authenticated",
      passed: true,
      detail:
        "GitHub CLI authentication is valid."
    };
  } catch {
    return {
      id: "gh-auth",
      label: "GitHub authenticated",
      passed: false,
      detail:
        "GitHub CLI is not authenticated. Run `gh auth login`."
    };
  }
}

async function checkProjectInitialized(
  root: string
): Promise<DoctorCheck> {
  const configFile =
    resolve(
      root,
      ".evaltape",
      "config.json"
    );

  try {
    const contents =
      await readFile(
        configFile,
        "utf8"
      );

    const config =
      JSON.parse(
        contents
      ) as {
        schemaVersion?: unknown;
      };

    if (
      config.schemaVersion !==
      1
    ) {
      return {
        id: "project",
        label: "EvalTape project initialized",
        passed: false,
        detail:
          "EvalTape config exists but is invalid."
      };
    }

    return {
      id: "project",
      label: "EvalTape project initialized",
      passed: true,
      detail:
        configFile
    };
  } catch {
    return {
      id: "project",
      label: "EvalTape project initialized",
      passed: false,
      detail:
        "No valid .evaltape/config.json found. Run `evaltape init`."
    };
  }
}

async function checkWritable(
  root: string
): Promise<DoctorCheck> {
  try {
    await access(
      root,
      constants.W_OK
    );

    return {
      id: "writable",
      label: "Project directory writable",
      passed: true,
      detail:
        root
    };
  } catch {
    return {
      id: "writable",
      label: "Project directory writable",
      passed: false,
      detail:
        `EvalTape cannot write to ${root}`
    };
  }
}

export async function runDoctor(
  options:
    DoctorOptions = {}
): Promise<DoctorResult> {
  const root =
    resolve(
      options.root ??
      process.cwd()
    );

  const nodeVersion =
    options.nodeVersion ??
    process.versions.node;

  const runCommand =
    options.runCommand ??
    defaultRunCommand;

  const node =
    await checkNode(
      nodeVersion
    );

  const gh =
    await checkGhInstalled(
      runCommand
    );

  const ghAuth =
    gh.passed
      ? await checkGhAuth(
          runCommand
        )
      : {
          id:
            "gh-auth" as const,

          label:
            "GitHub authenticated",

          passed:
            false,

          detail:
            "Cannot check GitHub authentication because `gh` is unavailable."
        };

  const project =
    await checkProjectInitialized(
      root
    );

  const writable =
    await checkWritable(
      root
    );

  const checks =
    [
      node,
      gh,
      ghAuth,
      project,
      writable
    ];

  return {
    checks,

    passed:
      checks.every(
        (
          check
        ) =>
          check.passed
      )
  };
}
