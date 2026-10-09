import {
  addEntity,
  updateEntity
} from "./actions";

import {
  evaluateContract
} from "./evaluator";

import {
  initialSnapshot
} from "./state";

import {
  loadApprovedEval
} from "./store";

async function main() {
  const saved =
    await loadApprovedEval(
      ".evaltape/evals/task-confirmation-demo.json"
    );

  /*
    RUN 1

    Different trajectory from the human demo:

    1. Create issue with Sarah
    2. Update assignee to Bob

    Different path.
    Correct final outcome.
  */

  const intermediateState =
    addEntity(
      initialSnapshot,
      {
        key:
          "issue:agent-generated-777",

        type:
          "issue",

        id:
          777,

        data: {
          title:
            "Payment timeout",

          priority:
            "high",

          assignee:
            "Sarah"
        }
      }
    );

  const successfulFinalState =
    updateEntity(
      intermediateState,

      "issue:agent-generated-777",

      {
        assignee:
          "Bob"
      }
    );

  console.log(
    "RUN 1 — DIFFERENT PATH, CORRECT OUTCOME"
  );

  console.log(
    "Trajectory: create with Sarah → update to Bob"
  );

  const successfulResult =
    evaluateContract(
      initialSnapshot,
      successfulFinalState,
      saved.task,
      saved.contract
    );

  console.dir(
    successfulResult,
    {
      depth: null
    }
  );

  /*
    RUN 2

    Agent creates the issue,
    but stops with Sarah.

    Wrong final outcome.
  */

  const wrongFinalState =
    addEntity(
      initialSnapshot,
      {
        key:
          "issue:agent-generated-888",

        type:
          "issue",

        id:
          888,

        data: {
          title:
            "Payment timeout",

          priority:
            "high",

          assignee:
            "Sarah"
        }
      }
    );

  console.log(
    "\nRUN 2 — WRONG OUTCOME"
  );

  console.log(
    "Trajectory: create with Sarah and stop"
  );

  const failedResult =
    evaluateContract(
      initialSnapshot,
      wrongFinalState,
      saved.task,
      saved.contract
    );

  console.dir(
    failedResult,
    {
      depth: null
    }
  );

  /*
    RUN 3

    The correct entity already existed
    before the agent started.

    The agent does nothing.

    A final-state-only evaluator could
    incorrectly pass this.

    EvalTape should fail because the
    approved contract says the target
    must NOT already exist before.
  */

  const preExistingState =
    addEntity(
      initialSnapshot,
      {
        key:
          "issue:already-there",

        type:
          "issue",

        id:
          999,

        data: {
          title:
            "Payment timeout",

          priority:
            "high",

          assignee:
            "Bob"
        }
      }
    );

  console.log(
    "\nRUN 3 — CORRECT STATE ALREADY EXISTED"
  );

  console.log(
    "Trajectory: agent does nothing"
  );

  const noOpResult =
    evaluateContract(
      preExistingState,
      preExistingState,
      saved.task,
      saved.contract
    );

  console.dir(
    noOpResult,
    {
      depth: null
    }
  );
}

main().catch(
  (error) => {
    console.error(
      "FAILED:"
    );

    console.error(
      error
    );

    process.exitCode = 1;
  }
);
