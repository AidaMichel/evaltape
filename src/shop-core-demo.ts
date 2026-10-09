import {
  shopAdapter
} from "./adapters/shop";

import {
  compileCandidateContract
} from "./compiler";

import {
  diffSnapshots
} from "./diff";

import {
  evaluateContract
} from "./evaluator";

import {
  createTask
} from "./task";

const task =
  createTask(
    "task:shop-demo",

    "Create paid order ORD-2001 for AED 250.",

    {
      orderNumber:
        "ORD-2001",

      status:
        "paid",

      total:
        250,

      currency:
        "AED"
    }
  );

/*
  RAW SHOP DATA BEFORE DEMONSTRATION
*/

const rawBefore = {
  capturedAt: 1,

  orders: [
    {
      orderNumber:
        "ORD-1000",

      status:
        "paid",

      total:
        50,

      currency:
        "AED",

      customerEmail:
        "other@example.com"
    }
  ]
};

/*
  HUMAN DEMONSTRATION RESULT

  A new ORD-2001 order appears.
*/

const rawDemonstrationAfter = {
  capturedAt: 2,

  orders: [
    ...rawBefore.orders,

    {
      orderNumber:
        "ORD-2001",

      status:
        "paid",

      total:
        250,

      currency:
        "AED",

      customerEmail:
        "customer@example.com"
    }
  ]
};

const before =
  shopAdapter.normalize(
    rawBefore
  );

const demonstrationAfter =
  shopAdapter.normalize(
    rawDemonstrationAfter
  );

const changes =
  diffSnapshots(
    before,
    demonstrationAfter
  );

console.log(
  "SHOP DEMONSTRATION DIFF:"
);

console.dir(
  changes,
  {
    depth: null
  }
);

const compiled =
  compileCandidateContract(
    task,
    changes
  );

if (!compiled.ok) {
  throw new Error(
    compiled.error
  );
}

console.log(
  "\nCOMPILER PROPOSAL:"
);

console.dir(
  compiled.proposal,
  {
    depth: null
  }
);

/*
  For this portability test only,
  we use the proposed contract directly.

  In the real product flow,
  human confirmation remains required.
*/

const contract =
  compiled.proposal.contract;

/*
  FRESH AGENT RUN — CORRECT

  Notice this data is coming through
  the shop adapter again.
*/

const rawAgentPass = {
  capturedAt: 3,

  orders: [
    ...rawBefore.orders,

    {
      orderNumber:
        "ORD-2001",

      status:
        "paid",

      total:
        250,

      currency:
        "AED",

      customerEmail:
        "different@example.com"
    }
  ]
};

const agentPassAfter =
  shopAdapter.normalize(
    rawAgentPass
  );

console.log(
  "\nRUN 1 — CORRECT ORDER:"
);

console.dir(
  evaluateContract(
    before,
    agentPassAfter,
    task,
    contract
  ),
  {
    depth: null
  }
);

/*
  FRESH AGENT RUN — WRONG

  Everything is correct except status.
*/

const rawAgentFail = {
  capturedAt: 4,

  orders: [
    ...rawBefore.orders,

    {
      orderNumber:
        "ORD-2001",

      status:
        "pending",

      total:
        250,

      currency:
        "AED",

      customerEmail:
        "different@example.com"
    }
  ]
};

const agentFailAfter =
  shopAdapter.normalize(
    rawAgentFail
  );

console.log(
  "\nRUN 2 — WRONG ORDER STATUS:"
);

console.dir(
  evaluateContract(
    before,
    agentFailAfter,
    task,
    contract
  ),
  {
    depth: null
  }
);
