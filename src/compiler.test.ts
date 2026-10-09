import test from "node:test";
import assert from "node:assert/strict";

import {
  compileCandidateContract
} from "./compiler";

import type {
  StateChange
} from "./diff";

import {
  createTask
} from "./task";

test(
  "compiler refuses to weaken task when demonstration contradicts task intent",
  () => {
    const task =
      createTask(
        "task:test-mismatch",

        "Create an open issue assigned to AidaMichel.",

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

    const changes:
      StateChange[] = [
        {
          kind:
            "entity_added",

          entityKey:
            "github-issue:12",

          entityType:
            "issue",

          before:
            null,

          after: {
            key:
              "github-issue:12",

            type:
              "issue",

            id:
              12,

            data: {
              number:
                12,

              title:
                "EvalTape test",

              state:
                "open",

              assignees:
                [],

              body:
                "",

              labels:
                []
            }
          }
        }
      ];

    const result =
      compileCandidateContract(
        task,
        changes
      );

    assert.equal(
      result.ok,
      false
    );

    if (result.ok) {
      assert.fail(
        "Compiler should have rejected the demonstration."
      );
    }

    assert.match(
      result.error,
      /assignees/
    );

    assert.match(
      result.error,
      /expected \["AidaMichel"\], observed \[\]/
    );
  }
);

test(
  "compiler includes satisfied task variables in the contract",
  () => {
    const task =
      createTask(
        "task:test-match",

        "Create an open issue assigned to AidaMichel.",

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

    const changes:
      StateChange[] = [
        {
          kind:
            "entity_added",

          entityKey:
            "github-issue:13",

          entityType:
            "issue",

          before:
            null,

          after: {
            key:
              "github-issue:13",

            type:
              "issue",

            id:
              13,

            data: {
              number:
                13,

              title:
                "EvalTape test",

              state:
                "open",

              assignees:
                [
                  "AidaMichel"
                ],

              body:
                "Different incidental body",

              labels:
                []
            }
          }
        }
      ];

    const result =
      compileCandidateContract(
        task,
        changes
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      assert.fail(
        result.error
      );
    }

    const assertionIds =
      result.proposal.contract.must.map(
        (assertion) =>
          assertion.id
      );

    assert.deepEqual(
      assertionIds,
      [
        "target-exists-after",
        "after-state-matches",
        "after-assignees-matches"
      ]
    );
  }
);
