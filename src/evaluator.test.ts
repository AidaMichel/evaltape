import test from "node:test";
import assert from "node:assert/strict";

import type {
  EnvironmentSnapshot
} from "./types";

import type {
  OutcomeContract
} from "./contract";

import {
  evaluateContract
} from "./evaluator";

import {
  createTask
} from "./task";

const task =
  createTask(
    "task:evaluator-test",

    "Create an open issue titled EvalTape test assigned to AidaMichel.",

    {
      title:
        "EvalTape test",

      state:
        "open",

      assignees:
        [
          "AidaMichel"
        ]
    }
  );

const contract:
  OutcomeContract = {
    id:
      "contract:task:evaluator-test:approved",

    taskId:
      task.id,

    taskVersion:
      task.version,

    contractVersion:
      1,

    must: [
      {
        id:
          "target-exists-after",

        snapshot:
          "after",

        target: {
          type:
            "issue",

          where: [
            {
              path:
                "title",

              expected: {
                kind:
                  "task_variable",

                name:
                  "title"
              }
            }
          ]
        },

        operator:
          "exists",

        required:
          true
      },

      {
        id:
          "after-state-matches",

        snapshot:
          "after",

        target: {
          type:
            "issue",

          where: [
            {
              path:
                "title",

              expected: {
                kind:
                  "task_variable",

                name:
                  "title"
              }
            }
          ]
        },

        path:
          "state",

        operator:
          "equals",

        expected: {
          kind:
            "task_variable",

          name:
            "state"
        },

        required:
          true
      },

      {
        id:
          "after-assignees-matches",

        snapshot:
          "after",

        target: {
          type:
            "issue",

          where: [
            {
              path:
                "title",

              expected: {
                kind:
                  "task_variable",

                name:
                  "title"
              }
            }
          ]
        },

        path:
          "assignees",

        operator:
          "equals",

        expected: {
          kind:
            "task_variable",

          name:
            "assignees"
        },

        required:
          true
      }
    ],

    mustNot: [
      {
        id:
          "target-did-not-exist-before",

        snapshot:
          "before",

        target: {
          type:
            "issue",

          where: [
            {
              path:
                "title",

              expected: {
                kind:
                  "task_variable",

                name:
                  "title"
              }
            }
          ]
        },

        operator:
          "exists",

        required:
          true
      }
    ]
  };

function issueSnapshot(
  assignees: string[]
): EnvironmentSnapshot {
  return {
    capturedAt:
      Date.now(),

    entities: [
      {
        key:
          "github-issue:100",

        type:
          "issue",

        id:
          100,

        data: {
          number:
            100,

          title:
            "EvalTape test",

          state:
            "open",

          assignees,

          body:
            "",

          labels:
            []
        }
      }
    ]
  };
}

test(
  "evaluator passes when required outcome is achieved",
  () => {
    const before:
      EnvironmentSnapshot = {
        capturedAt:
          Date.now(),

        entities:
          []
      };

    const after =
      issueSnapshot(
        [
          "AidaMichel"
        ]
      );

    const result =
      evaluateContract(
        before,
        after,
        task,
        contract
      );

    assert.equal(
      result.valid,
      true
    );

    assert.equal(
      result.passed,
      true
    );
  }
);

test(
  "evaluator fails when required outcome is wrong",
  () => {
    const before:
      EnvironmentSnapshot = {
        capturedAt:
          Date.now(),

        entities:
          []
      };

    const after =
      issueSnapshot(
        []
      );

    const result =
      evaluateContract(
        before,
        after,
        task,
        contract
      );

    assert.equal(
      result.valid,
      true
    );

    assert.equal(
      result.passed,
      false
    );

    const failed =
      result.checks.find(
        (check) =>
          check.id ===
          "after-assignees-matches"
      );

    assert.equal(
      failed?.passed,
      false
    );

    assert.deepEqual(
      failed?.expected,
      [
        "AidaMichel"
      ]
    );

    assert.deepEqual(
      failed?.observed,
      []
    );
  }
);

test(
  "evaluator fails when correct state already existed before the run",
  () => {
    const before =
      issueSnapshot(
        [
          "AidaMichel"
        ]
      );

    const after =
      issueSnapshot(
        [
          "AidaMichel"
        ]
      );

    const result =
      evaluateContract(
        before,
        after,
        task,
        contract
      );

    assert.equal(
      result.valid,
      true
    );

    assert.equal(
      result.passed,
      false
    );

    const failed =
      result.checks.find(
        (check) =>
          check.id ===
          "target-did-not-exist-before"
      );

    assert.equal(
      failed?.passed,
      false
    );
  }
);
