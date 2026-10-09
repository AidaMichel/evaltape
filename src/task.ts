import type {
  JsonValue,
  TaskSpec,
  TaskVariable
} from "./types";

export function createTask(
  id: string,
  currentInstruction: string,
  values: Record<string, JsonValue>
): TaskSpec {
  const variables: Record<
    string,
    TaskVariable
  > = {};

  for (const [name, value] of Object.entries(values)) {
    variables[name] = {
      name,
      value,
      version: 1
    };
  }

  return {
    id,
    currentInstruction,
    variables,
    version: 1
  };
}

export function updateTask(
  task: TaskSpec,
  currentInstruction: string,
  changes: Record<string, JsonValue>
): TaskSpec {
  const variables = {
    ...task.variables
  };

  for (const [name, value] of Object.entries(changes)) {
    const existing =
      variables[name];

    variables[name] = {
      name,
      value,

      version:
        existing
          ? existing.version + 1
          : 1
    };
  }

  return {
    ...task,

    currentInstruction,

    variables,

    version: task.version + 1
  };
}
