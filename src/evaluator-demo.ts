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
  createTask,
  updateTask
} from "./task";

import type {
  OutcomeContract
} from "./contract";

const taskV1 = createTask(
  "task:1",

  'Create a high-priority issue called "Payment timeout" assigned to Sarah.',

  {
    title: "Payment timeout",
    priority: "high",
    assignee: "Sarah"
  }
);

const taskV2 = updateTask(
  taskV1,

  'Create a high-priority issue called "Payment timeout" assigned to Bob.',

  {
    assignee: "Bob"
  }
);

const contract: OutcomeContract = {
  id: "contract:1",

  taskId: taskV2.id,

  taskVersion: taskV2.version,

  contractVersion: 1,

  must: [
    {
      id: "target-exists",

      snapshot: "after",

      target: {
        type: "issue",

        where: [
          {
            path: "title",

            expected: {
              kind: "task_variable",
              name: "title"
            }
          }
        ]
      },

      operator: "exists",

      required: true
    },

    {
      id: "priority-matches",

      snapshot: "after",

      target: {
        type: "issue",

        where: [
          {
            path: "title",

            expected: {
              kind: "task_variable",
              name: "title"
            }
          }
        ]
      },

      path: "priority",

      operator: "equals",

      expected: {
        kind: "task_variable",
        name: "priority"
      },

      required: true
    },

    {
      id: "assignee-matches",

      snapshot: "after",

      target: {
        type: "issue",

        where: [
          {
            path: "title",

            expected: {
              kind: "task_variable",
              name: "title"
            }
          }
        ]
      },

      path: "assignee",

      operator: "equals",

      expected: {
        kind: "task_variable",
        name: "assignee"
      },

      required: true
    }
  ],

  mustNot: [
    {
      id: "target-did-not-exist-before",

      snapshot: "before",

      target: {
        type: "issue",

        where: [
          {
            path: "title",

            expected: {
              kind: "task_variable",
              name: "title"
            }
          }
        ]
      },

      operator: "exists",

      required: true
    }
  ]
};

const stateWithSarah = addEntity(
  initialSnapshot,

  {
    key: "issue:2",

    type: "issue",

    id: 2,

    data: {
      title: "Payment timeout",
      priority: "high",
      assignee: "Sarah"
    }
  }
);

console.log(
  "USER CURRENTLY WANTS:"
);

console.log(
  taskV2.currentInstruction
);

console.log(
  "\nEVALUATE STATE WITH SARAH:"
);

console.dir(
  evaluateContract(
    initialSnapshot,
    stateWithSarah,
    taskV2,
    contract
  ),
  {
    depth: null
  }
);

const stateWithBob = updateEntity(
  stateWithSarah,

  "issue:2",

  {
    assignee: "Bob"
  }
);

console.log(
  "\nEVALUATE STATE WITH BOB:"
);

console.dir(
  evaluateContract(
    initialSnapshot,
    stateWithBob,
    taskV2,
    contract
  ),
  {
    depth: null
  }
);
