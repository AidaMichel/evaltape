import { initialSnapshot } from "./state";
import {
  addEntity,
  updateEntity
} from "./actions";
import { diffSnapshots } from "./diff";

const afterCreate = addEntity(
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

const afterAssigneeChange = updateEntity(
  afterCreate,
  "issue:2",
  {
    assignee: "Bob"
  }
);

const changes = diffSnapshots(
  afterCreate,
  afterAssigneeChange
);

console.log("ASSIGNEE CHANGE:");
console.dir(changes, {
  depth: null
});
