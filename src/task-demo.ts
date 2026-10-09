import {
  createTask,
  updateTask
} from "./task";

const taskV1 = createTask(
  "task:1",

  'Create a high-priority issue called "Payment timeout" assigned to Sarah.',

  {
    title: "Payment timeout",
    priority: "high",
    assignee: "Sarah"
  }
);

console.log("TASK V1:");
console.dir(taskV1, {
  depth: null
});

const taskV2 = updateTask(
  taskV1,

  'Create a high-priority issue called "Payment timeout" assigned to Bob.',

  {
    assignee: "Bob"
  }
);

console.log("\nTASK V2:");
console.dir(taskV2, {
  depth: null
});

console.log("\nORIGINAL TASK STILL:");
console.dir(taskV1, {
  depth: null
});
