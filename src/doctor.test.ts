import test from "node:test";

import assert from "node:assert/strict";

import {
  mkdtemp,
  mkdir,
  writeFile
} from "node:fs/promises";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";

import {
  runDoctor,
  type CommandRunner
} from "./doctor";

test(
  "doctor passes when environment is ready",
  async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "evaltape-doctor-"
        )
      );

    await mkdir(
      join(
        root,
        ".evaltape"
      ),
      {
        recursive: true
      }
    );

    await writeFile(
      join(
        root,
        ".evaltape",
        "config.json"
      ),
      JSON.stringify(
        {
          schemaVersion: 1
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    const runCommand:
      CommandRunner =
      async (
        command,
        args
      ) => {
        if (
          command === "gh" &&
          args[0] === "--version"
        ) {
          return {
            stdout:
              "gh version 2.100.0\n",
            stderr:
              ""
          };
        }

        if (
          command === "gh" &&
          args[0] === "auth" &&
          args[1] === "status"
        ) {
          return {
            stdout:
              "Logged in\n",
            stderr:
              ""
          };
        }

        throw new Error(
          "Unexpected command"
        );
      };

    const result =
      await runDoctor(
        {
          root,
          nodeVersion:
            "20.18.0",
          runCommand
        }
      );

    assert.equal(
      result.passed,
      true
    );

    assert.equal(
      result.checks.length,
      5
    );

    assert.equal(
      result.checks.every(
        (
          check
        ) =>
          check.passed
      ),
      true
    );
  }
);

test(
  "doctor fails when Node version is unsupported",
  async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "evaltape-doctor-"
        )
      );

    const runCommand:
      CommandRunner =
      async (
        command,
        args
      ) => {
        if (
          command === "gh" &&
          args[0] === "--version"
        ) {
          return {
            stdout:
              "gh version 2.100.0\n",
            stderr:
              ""
          };
        }

        if (
          command === "gh" &&
          args[0] === "auth" &&
          args[1] === "status"
        ) {
          return {
            stdout:
              "Logged in\n",
            stderr:
              ""
          };
        }

        throw new Error(
          "Unexpected command"
        );
      };

    const result =
      await runDoctor(
        {
          root,
          nodeVersion:
            "18.20.0",
          runCommand
        }
      );

    const node =
      result.checks.find(
        (
          check
        ) =>
          check.id === "node"
      );

    assert.equal(
      result.passed,
      false
    );

    assert.equal(
      node?.passed,
      false
    );
  }
);

test(
  "doctor fails safely when GitHub CLI is unavailable",
  async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "evaltape-doctor-"
        )
      );

    const runCommand:
      CommandRunner =
      async () => {
        throw new Error(
          "command not found"
        );
      };

    const result =
      await runDoctor(
        {
          root,
          nodeVersion:
            "20.18.0",
          runCommand
        }
      );

    const gh =
      result.checks.find(
        (
          check
        ) =>
          check.id === "gh"
      );

    const auth =
      result.checks.find(
        (
          check
        ) =>
          check.id ===
          "gh-auth"
      );

    assert.equal(
      result.passed,
      false
    );

    assert.equal(
      gh?.passed,
      false
    );

    assert.equal(
      auth?.passed,
      false
    );
  }
);

test(
  "doctor fails when EvalTape project is not initialized",
  async () => {
    const root =
      await mkdtemp(
        join(
          tmpdir(),
          "evaltape-doctor-"
        )
      );

    const runCommand:
      CommandRunner =
      async (
        command,
        args
      ) => {
        if (
          command === "gh" &&
          args[0] === "--version"
        ) {
          return {
            stdout:
              "gh version 2.100.0\n",
            stderr:
              ""
          };
        }

        if (
          command === "gh" &&
          args[0] === "auth" &&
          args[1] === "status"
        ) {
          return {
            stdout:
              "Logged in\n",
            stderr:
              ""
          };
        }

        throw new Error(
          "Unexpected command"
        );
      };

    const result =
      await runDoctor(
        {
          root,
          nodeVersion:
            "20.18.0",
          runCommand
        }
      );

    const project =
      result.checks.find(
        (
          check
        ) =>
          check.id ===
          "project"
      );

    assert.equal(
      result.passed,
      false
    );

    assert.equal(
      project?.passed,
      false
    );
  }
);
