import test from "node:test";
import assert from "node:assert/strict";

import {
  githubIssuesAdapter
} from "./adapters/github-issues";

test(
  "GitHub adapter normalizes issue data",
  () => {
    const raw = [
      {
        number: 42,
        title: "Payment timeout",
        body: "Investigate timeout.",
        state: "open",

        assignees: [
          {
            login: "AidaMichel"
          }
        ],

        labels: [
          {
            name: "bug"
          },
          {
            name: "high"
          }
        ],

        html_url:
          "https://github.com/example/repo/issues/42"
      }
    ];

    const result =
      githubIssuesAdapter.normalize(
        raw
      );

    assert.equal(
      result.entities.length,
      1
    );

    assert.deepEqual(
      result.entities[0],
      {
        key:
          "github-issue:42",

        type:
          "issue",

        id:
          42,

        data: {
          number:
            42,

          title:
            "Payment timeout",

          state:
            "open",

          body:
            "Investigate timeout.",

          assignees:
            [
              "AidaMichel"
            ],

          labels:
            [
              "bug",
              "high"
            ],

          url:
            "https://github.com/example/repo/issues/42"
        }
      }
    );
  }
);

test(
  "GitHub adapter filters pull requests returned by Issues API",
  () => {
    const raw = [
      {
        number: 10,
        title: "Real issue",
        body: null,
        state: "open",
        assignees: [],
        labels: [],
        html_url:
          "https://github.com/example/repo/issues/10"
      },

      {
        number: 11,
        title: "This is actually a PR",
        body: null,
        state: "open",
        assignees: [],
        labels: [],
        html_url:
          "https://github.com/example/repo/pull/11",

        pull_request: {
          url:
            "https://api.github.com/repos/example/repo/pulls/11"
        }
      }
    ];

    const result =
      githubIssuesAdapter.normalize(
        raw
      );

    assert.equal(
      result.entities.length,
      1
    );

    assert.equal(
      result.entities[0]?.id,
      10
    );

    assert.equal(
      result.entities[0]?.data.title,
      "Real issue"
    );
  }
);

test(
  "GitHub adapter rejects malformed external data",
  () => {
    const malformed = [
      {
        number:
          "not-a-number",

        title:
          "Broken",

        state:
          "open",

        assignees:
          "AidaMichel",

        labels:
          []
      }
    ];

    assert.throws(
      () => {
        githubIssuesAdapter.normalize(
          malformed
        );
      }
    );
  }
);
