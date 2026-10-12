import {
  access,
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";

import {
  resolve
} from "node:path";

export interface InitProjectResult {
  root: string;
  evaltapeDirectory: string;
  configFile: string;
  evalsDirectory: string;
  gitignoreFile: string;
  configCreated: boolean;
  gitignoreUpdated: boolean;
}

const GITIGNORE_BLOCK = [
  "# EvalTape runtime evidence",
  ".evaltape/recordings/",
  ".evaltape/runs/",
  ".evaltape/active-recording.json",
  ".evaltape/active-run.json"
].join("\n");

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

export async function initProject(
  root: string = process.cwd()
): Promise<InitProjectResult> {
  const projectRoot =
    resolve(
      root
    );

  const evaltapeDirectory =
    resolve(
      projectRoot,
      ".evaltape"
    );

  const evalsDirectory =
    resolve(
      evaltapeDirectory,
      "evals"
    );

  const configFile =
    resolve(
      evaltapeDirectory,
      "config.json"
    );

  const gitignoreFile =
    resolve(
      projectRoot,
      ".gitignore"
    );

  await mkdir(
    evalsDirectory,
    {
      recursive: true
    }
  );

  let configCreated =
    false;

  if (
    !(await pathExists(
      configFile
    ))
  ) {
    await writeFile(
      configFile,
      JSON.stringify(
        {
          schemaVersion: 1
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    configCreated =
      true;
  }

  let currentGitignore =
    "";

  if (
    await pathExists(
      gitignoreFile
    )
  ) {
    currentGitignore =
      await readFile(
        gitignoreFile,
        "utf8"
      );
  }

  let gitignoreUpdated =
    false;

  if (
    !currentGitignore.includes(
      "# EvalTape runtime evidence"
    )
  ) {
    const separator =
      currentGitignore.length === 0 ||
      currentGitignore.endsWith("\n")
        ? ""
        : "\n";

    const prefix =
      currentGitignore.length === 0
        ? ""
        : "\n";

    await writeFile(
      gitignoreFile,
      currentGitignore +
        separator +
        prefix +
        GITIGNORE_BLOCK +
        "\n",
      "utf8"
    );

    gitignoreUpdated =
      true;
  }

  return {
    root:
      projectRoot,

    evaltapeDirectory,
    configFile,
    evalsDirectory,
    gitignoreFile,
    configCreated,
    gitignoreUpdated
  };
}
