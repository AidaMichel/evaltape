import test from "node:test";
import assert from "node:assert/strict";

import {
  authorGitHubIssueTask
} from "./task-authoring";

test(
  "task authoring extracts GitHub issue requirements from supported instruction",
  () => {
    const task =
      authorGitHubIssueTask(
        "task:test-authoring",

        "Create an open issue titled 'Payment timeout' assigned to AidaMichel"
      );

    assert.equal(
      task.id,
      "task:test-authoring"
    );

    assert.equal(
      task.currentInstruction,
      "Create an open issue titled 'Payment timeout' assigned to AidaMichel"
    );

    assert.equal(
      task.variables.title?.value,
      "Payment timeout"
    );

    assert.equal(
      task.variables.state?.value,
      "open"
    );

    assert.deepEqual(
      task.variables.assignees?.value,
      [
        "AidaMichel"
      ]
    );

    assert.equal(
      task.version,
      1
    );
  }
);

test(
  "task authoring supports double-quoted titles",
  () => {
    const task =
      authorGitHubIssueTask(
        "task:test-double-quotes",

        'Create an open issue titled "Checkout failure" assigned to AidaMichel'
      );

    assert.equal(
      task.variables.title?.value,
      "Checkout failure"
    );

    assert.deepEqual(
      task.variables.assignees?.value,
      [
        "AidaMichel"
      ]
    );
  }
);

test(
  "task authoring refuses unsupported instructions instead of guessing",
  () => {
    assert.throws(
      () => {
        authorGitHubIssueTask(
          "task:test-invalid",

          "Please make some GitHub ticket about payments"
        );
      },

      /could not understand the task/
    );
  }
);
