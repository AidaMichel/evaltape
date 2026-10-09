import {
  addEntity
} from "./actions";

import {
  compileCandidateContract
} from "./compiler";

import {
  confirmProposal
} from "./confirm";

import {
  diffSnapshots
} from "./diff";

import {
  initialSnapshot
} from "./state";

import {
  saveApprovedEval
} from "./store";

import {
  createTask
} from "./task";

async function main() {
  const task =
    createTask(
      "task:confirmation-demo",

      'Create a high-priority issue called "Payment timeout" assigned to Bob.',

      {
        title:
          "Payment timeout",

        priority:
          "high",

        assignee:
          "Bob"
      }
    );

  const demonstrationAfter =
    addEntity(
      initialSnapshot,

      {
        key:
          "issue:demo-123",

        type:
          "issue",

        id:
          123,

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

  const changes =
    diffSnapshots(
      initialSnapshot,
      demonstrationAfter
    );

  const compiled =
    compileCandidateContract(
      task,
      changes
    );

  if (!compiled.ok) {
    console.error(
      "COMPILER FAILED:"
    );

    console.error(
      compiled.error
    );

    return;
  }

  const confirmed =
    await confirmProposal(
      compiled.proposal
    );

  if (!confirmed) {
    console.log(
      "\nCONTRACT REJECTED"
    );

    return;
  }

  const filePath =
    await saveApprovedEval(
      task,
      confirmed
    );

  console.log(
    "\nCONTRACT APPROVED AND SAVED"
  );

  console.log(
    filePath
  );
}

main().catch(
  (error) => {
    console.error(
      "FAILED:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);
