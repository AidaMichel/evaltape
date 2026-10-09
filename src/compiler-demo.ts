import {
  addEntity
} from "./actions";

import {
  compileCandidateContract
} from "./compiler";

import {
  diffSnapshots
} from "./diff";

import {
  initialSnapshot
} from "./state";

import {
  createTask
} from "./task";

const task = createTask(
  "task:compiler-demo",

  'Create a high-priority issue called "Payment timeout" assigned to Bob.',

  {
    title: "Payment timeout",

    priority: "high",

    assignee: "Bob"
  }
);

const demonstrationAfter =
  addEntity(
    initialSnapshot,

    {
      key:
        "issue:demo-generated-9281",

      type:
        "issue",

      id:
        9281,

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

console.log(
  "DEMONSTRATION DIFF:"
);

console.dir(
  changes,
  {
    depth: null
  }
);

const result =
  compileCandidateContract(
    task,
    changes
  );

console.log(
  "\nPROPOSED CONTRACT:"
);

console.dir(
  result,
  {
    depth: null
  }
);
