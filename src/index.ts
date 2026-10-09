import { initialState } from "./state";
import { createIssue } from "./actions";
import { evaluatePaymentTimeoutTask } from "./evaluator";
import { TraceRecorder } from "./trace";
import { diffStates } from "./diff";

const trace = new TraceRecorder();

trace.record({
  type: "task_start",
  message:
    'Create a high-priority issue called "Payment timeout" assigned to Sarah.'
});

trace.record({
  type: "state_before",
  state: initialState
});

const issueToCreate = {
  id: 2,
  title: "Payment timeout",
  priority: "high" as const,
  assignee: "Bob"
};

trace.record({
  type: "action",
  name: "createIssue",
  data: issueToCreate
});

const nextState = createIssue(
  initialState,
  issueToCreate
);

trace.record({
  type: "state_after",
  state: nextState
});

const changes = diffStates(
  initialState,
  nextState
);

console.log("STATE CHANGES:");
console.dir(changes, {
  depth: null
});

const result =
  evaluatePaymentTimeoutTask(nextState);

trace.record({
  type: "eval_result",
  result
});

console.log("\nTRACE:");
console.dir(trace.getEvents(), {
  depth: null
});
