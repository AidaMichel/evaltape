import test from "node:test";

import assert from "node:assert/strict";

import {
  mkdtemp,
  readFile,
  writeFile
} from "node:fs/promises";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";

import {
  initProject
} from "./project";

test(
  "initProject creates EvalTape project files",
  async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "evaltape-init-"
        )
      );

    const result =
      await initProject(
        root
      );

    const config =
      JSON.parse(
        await readFile(
          result.configFile,
          "utf8"
        )
      );

    assert.deepEqual(
      config,
      {
        schemaVersion: 1
      }
    );

    const gitignore =
      await readFile(
        result.gitignoreFile,
        "utf8"
      );

    assert.match(
      gitignore,
      /\.evaltape\/recordings\//
    );

    assert.match(
      gitignore,
      /\.evaltape\/runs\//
    );

    assert.match(
      gitignore,
      /\.evaltape\/active-recording\.json/
    );

    assert.match(
      gitignore,
      /\.evaltape\/active-run\.json/
    );

    assert.equal(
      gitignore.includes(
        ".evaltape/evals/"
      ),
      false
    );

    assert.equal(
      result.configCreated,
      true
    );

    assert.equal(
      result.gitignoreUpdated,
      true
    );
  }
);

test(
  "initProject preserves existing config and does not duplicate gitignore block",
  async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "evaltape-init-"
        )
      );

    await initProject(
      root
    );

    const configFile =
      join(
        root,
        ".evaltape",
        "config.json"
      );

    await writeFile(
      configFile,
      JSON.stringify(
        {
          schemaVersion: 1,
          customValue: "keep-me"
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const second =
      await initProject(
        root
      );

    const config =
      JSON.parse(
        await readFile(
          configFile,
          "utf8"
        )
      );

    assert.equal(
      config.customValue,
      "keep-me"
    );

    assert.equal(
      second.configCreated,
      false
    );

    assert.equal(
      second.gitignoreUpdated,
      false
    );

    const gitignore =
      await readFile(
        join(
          root,
          ".gitignore"
        ),
        "utf8"
      );

    const markerCount =
      gitignore
        .split(
          "# EvalTape runtime evidence"
        )
        .length - 1;

    assert.equal(
      markerCount,
      1
    );
  }
);
