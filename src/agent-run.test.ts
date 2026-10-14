import test from "node:test";
import assert from "node:assert/strict";

import { observeAgentRun } from "./agent-run";
import { githubIssuesAdapter } from "./adapters/github-issues";
import type { OutcomeContract } from "./contract";
import { createTask } from "./task";

const task = createTask("task:observation-test", "Create an open issue", {
  title: "Agent skill validation 030",
  state: "open",
  assignees: ["AidaMichel"]
});
const target = {
  type: "issue",
  where: [{
    path: "title",
    expected: { kind: "task_variable" as const, name: "title" }
  }]
};
const contract: OutcomeContract = {
  id: "contract:observation-test",
  taskId: task.id,
  taskVersion: task.version,
  contractVersion: 1,
  must: [
    { id: "exists", snapshot: "after", target, operator: "exists", required: true },
    ...["state", "assignees"].map((path) => ({
      id: path, snapshot: "after" as const, target, path,
      operator: "equals" as const,
      expected: { kind: "task_variable" as const, name: path },
      required: true
    }))
  ],
  mustNot: [{
    id: "absent-before", snapshot: "before", target,
    operator: "exists", required: true
  }]
};
const issue = {
  number: 23, title: task.variables.title.value, state: "open",
  assignees: [{ login: "AidaMichel" }], labels: []
};
const normalize = (raw: unknown) => githubIssuesAdapter.normalize(raw);

function harness(observations: unknown[], options: {
  before?: unknown;
  contract?: OutcomeContract;
  maxObservations?: number;
} = {}) {
  let captures = 0;
  const sleeps: number[] = [];
  const before = normalize(options.before ?? []);
  const frozenBefore = structuredClone(before);
  const frozenContract = structuredClone(options.contract ?? contract);
  return {
    captures: () => captures,
    sleeps,
    run: async () => {
      const final = await observeAgentRun({
        before, task, contract: options.contract ?? contract,
        capture: async () => {
          const raw = observations[Math.min(captures, observations.length - 1)];
          captures += 1;
          return raw;
        },
        normalize,
        sleep: async (milliseconds) => { sleeps.push(milliseconds); },
        maxObservations: options.maxObservations
      });
      assert.deepEqual(before, frozenBefore);
      assert.deepEqual(options.contract ?? contract, frozenContract);
      return final;
    }
  };
}

test("eventual consistency recovers on the second fresh observation", async () => {
  const h = harness([[], [issue]]);
  const final = await h.run();
  assert.equal(final.result.passed, true);
  assert.deepEqual(final.rawAfter, [issue]);
  assert.equal(final.after.entities.length, 1);
  assert.equal(h.captures(), 2);
  assert.deepEqual(h.sleeps, [2000]);
});

test("genuine after-state failure exhausts the configured bound", async () => {
  const h = harness([[]], { maxObservations: 3 });
  const final = await h.run();
  assert.equal(final.result.passed, false);
  assert.equal(final.result.valid, true);
  assert.deepEqual(final.rawAfter, []);
  assert.equal(h.captures(), 3);
  assert.deepEqual(h.sleeps, [2000, 2000]);
});

test("default observation bound is five captures and four waits", async () => {
  const h = harness([[]]);
  assert.equal((await h.run()).result.passed, false);
  assert.equal(h.captures(), 5);
  assert.deepEqual(h.sleeps, [2000, 2000, 2000, 2000]);
});

test("frozen-before failure stops even with retryable after failures", async () => {
  const h = harness([[]], { before: [issue] });
  const final = await h.run();
  assert.equal(final.result.passed, false);
  assert.equal(final.result.checks.find((c) => c.id === "absent-before")?.passed, false);
  assert.equal(h.captures(), 1);
  assert.deepEqual(h.sleeps, []);
});

test("an immediate pass does not sleep or recapture", async () => {
  const h = harness([[issue]]);
  assert.equal((await h.run()).result.passed, true);
  assert.equal(h.captures(), 1);
  assert.deepEqual(h.sleeps, []);
});

for (const [name, changedContract] of [
  ["invalid", { ...contract, taskId: "different-task" }],
  ["stale", { ...contract, taskVersion: task.version + 1 }]
] as const) {
  test(`${name} evaluation does not retry`, async () => {
    const h = harness([[]], { contract: changedContract });
    const final = await h.run();
    assert.equal(final.result.passed, false);
    assert.equal(final.result.valid, false);
    assert.equal(final.result.stale, name === "stale");
    assert.equal(h.captures(), 1);
    assert.deepEqual(h.sleeps, []);
  });
}

test("required structural error stops alongside an after-state mismatch", async () => {
  const h = harness([[{ ...issue, state: "closed" }]], {
    contract: {
      ...contract,
      must: [...contract.must, {
        id: "missing-variable", snapshot: "after", target,
        path: "state", operator: "equals", required: true,
        expected: { kind: "task_variable", name: "missing" }
      }]
    }
  });
  const final = await h.run();
  assert.equal(final.result.passed, false);
  assert.equal(final.result.checks.find((c) => c.id === "missing-variable")?.error,
    "Missing task variable: missing");
  assert.equal(h.captures(), 1);
  assert.deepEqual(h.sleeps, []);
});

test("capture exceptions propagate without a verdict or more retries", async () => {
  const failure = new Error("GitHub capture failed");
  let captures = 0;
  const sleeps: number[] = [];
  await assert.rejects(observeAgentRun({
    before: normalize([]), task, contract, normalize,
    capture: async () => {
      captures += 1;
      if (captures === 2) throw failure;
      return [];
    },
    sleep: async (ms) => { sleeps.push(ms); }
  }), (error) => error === failure);
  assert.equal(captures, 2);
  assert.deepEqual(sleeps, [2000]);
});

test("normalization exceptions propagate without retry", async () => {
  const h = harness([{ invalid: "raw snapshot" }]);
  await assert.rejects(h.run());
  assert.equal(h.captures(), 1);
  assert.deepEqual(h.sleeps, []);
});
