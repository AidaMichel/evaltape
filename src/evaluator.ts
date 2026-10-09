import type {
  Entity,
  EnvironmentSnapshot,
  JsonValue,
  TaskSpec
} from "./types";

import type {
  Assertion,
  EntitySelector,
  ExpectedValue,
  OutcomeContract,
  SnapshotTarget
} from "./contract";

export interface AssertionResult {
  id: string;

  group: "must" | "must_not";

  snapshot: SnapshotTarget;

  required: boolean;

  passed: boolean;

  expected?: JsonValue;

  observed?: unknown;

  error?: string;
}

export interface EvaluationResult {
  passed: boolean;

  valid: boolean;

  stale: boolean;

  taskId: string;

  activeTaskVersion: number;

  contractTaskVersion: number;

  contractVersion: number;

  checks: AssertionResult[];

  error?: string;
}

function isJsonObject(
  value: JsonValue
): value is Record<string, JsonValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function valuesEqual(
  a: JsonValue,
  b: JsonValue
): boolean {
  if (a === b) {
    return true;
  }

  if (
    Array.isArray(a) &&
    Array.isArray(b)
  ) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every(
      (value, index) =>
        valuesEqual(value, b[index])
    );
  }

  if (
    isJsonObject(a) &&
    isJsonObject(b)
  ) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(
          b,
          key
        ) &&
        valuesEqual(
          a[key],
          b[key]
        )
    );
  }

  return false;
}

function getPath(
  data: Record<string, JsonValue>,
  path: string
): JsonValue | undefined {
  const parts = path
    .split(".")
    .filter(Boolean);

  let current: JsonValue | undefined =
    data;

  for (const part of parts) {
    if (current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(part);

      if (
        !Number.isInteger(index) ||
        index < 0
      ) {
        return undefined;
      }

      current = current[index];
      continue;
    }

    if (isJsonObject(current)) {
      current = current[part];
      continue;
    }

    return undefined;
  }

  return current;
}

function resolveExpectedValue(
  expected: ExpectedValue,
  task: TaskSpec
):
  | {
      ok: true;
      value: JsonValue;
    }
  | {
      ok: false;
      error: string;
    } {
  if (expected.kind === "literal") {
    return {
      ok: true,
      value: expected.value
    };
  }

  const variable =
    task.variables[expected.name];

  if (!variable) {
    return {
      ok: false,
      error:
        `Missing task variable: ${expected.name}`
    };
  }

  return {
    ok: true,
    value: variable.value
  };
}

function findMatchingEntities(
  snapshot: EnvironmentSnapshot,
  selector: EntitySelector,
  task: TaskSpec
):
  | {
      ok: true;
      entities: Entity[];
    }
  | {
      ok: false;
      error: string;
    } {
  const matches: Entity[] = [];

  for (const entity of snapshot.entities) {
    if (entity.type !== selector.type) {
      continue;
    }

    let matchesSelector = true;

    for (const condition of selector.where) {
      const expected =
        resolveExpectedValue(
          condition.expected,
          task
        );

      if (!expected.ok) {
        return expected;
      }

      const actual =
        getPath(
          entity.data,
          condition.path
        );

      if (
        actual === undefined ||
        !valuesEqual(
          actual,
          expected.value
        )
      ) {
        matchesSelector = false;
        break;
      }
    }

    if (matchesSelector) {
      matches.push(entity);
    }
  }

  return {
    ok: true,
    entities: matches
  };
}

function evaluatePositiveAssertion(
  assertion: Assertion,
  snapshot: EnvironmentSnapshot,
  task: TaskSpec
): {
  satisfied: boolean;

  expected?: JsonValue;

  observed?: unknown;

  error?: string;
} {
  const matching =
    findMatchingEntities(
      snapshot,
      assertion.target,
      task
    );

  if (!matching.ok) {
    return {
      satisfied: false,
      error: matching.error
    };
  }

  const entities =
    matching.entities;

  if (
    assertion.operator === "exists" &&
    assertion.path === undefined
  ) {
    return {
      satisfied:
        entities.length > 0,

      observed:
        `${entities.length} matching entity/entities`
    };
  }

  if (entities.length === 0) {
    return {
      satisfied: false,
      observed: "No matching entity"
    };
  }

  if (entities.length > 1) {
    return {
      satisfied: false,

      error:
        `Ambiguous selector: matched ${entities.length} entities`
    };
  }

  if (!assertion.path) {
    return {
      satisfied: false,

      error:
        `Operator "${assertion.operator}" requires a path`
    };
  }

  const actual =
    getPath(
      entities[0].data,
      assertion.path
    );

  if (assertion.operator === "exists") {
    return {
      satisfied:
        actual !== undefined,

      observed: actual
    };
  }

  if (actual === undefined) {
    return {
      satisfied: false,

      observed:
        "Field does not exist"
    };
  }

  if (!assertion.expected) {
    return {
      satisfied: false,

      error:
        `Operator "${assertion.operator}" requires an expected value`
    };
  }

  const expected =
    resolveExpectedValue(
      assertion.expected,
      task
    );

  if (!expected.ok) {
    return {
      satisfied: false,
      error: expected.error
    };
  }

  if (assertion.operator === "equals") {
    return {
      satisfied:
        valuesEqual(
          actual,
          expected.value
        ),

      expected:
        expected.value,

      observed:
        actual
    };
  }

  if (
    assertion.operator ===
    "not_equals"
  ) {
    return {
      satisfied:
        !valuesEqual(
          actual,
          expected.value
        ),

      expected:
        expected.value,

      observed:
        actual
    };
  }

  if (assertion.operator === "contains") {
    let satisfied = false;

    if (
      typeof actual === "string" &&
      typeof expected.value === "string"
    ) {
      satisfied =
        actual.includes(
          expected.value
        );
    }

    if (Array.isArray(actual)) {
      satisfied =
        actual.some(
          (value) =>
            valuesEqual(
              value,
              expected.value
            )
        );
    }

    return {
      satisfied,

      expected:
        expected.value,

      observed:
        actual
    };
  }

  return {
    satisfied: false,

    error:
      `Unsupported operator: ${assertion.operator}`
  };
}

export function evaluateContract(
  beforeSnapshot: EnvironmentSnapshot,
  afterSnapshot: EnvironmentSnapshot,
  task: TaskSpec,
  contract: OutcomeContract
): EvaluationResult {
  if (contract.taskId !== task.id) {
    return {
      passed: false,
      valid: false,
      stale: false,

      taskId:
        task.id,

      activeTaskVersion:
        task.version,

      contractTaskVersion:
        contract.taskVersion,

      contractVersion:
        contract.contractVersion,

      checks: [],

      error:
        "Contract belongs to a different task"
    };
  }

  if (
    contract.taskVersion !==
    task.version
  ) {
    return {
      passed: false,
      valid: false,
      stale: true,

      taskId:
        task.id,

      activeTaskVersion:
        task.version,

      contractTaskVersion:
        contract.taskVersion,

      contractVersion:
        contract.contractVersion,

      checks: [],

      error:
        "Contract is stale because the task changed"
    };
  }

  const checks: AssertionResult[] = [];

  for (
    const assertion of contract.must
  ) {
    const snapshot =
      assertion.snapshot === "before"
        ? beforeSnapshot
        : afterSnapshot;

    const result =
      evaluatePositiveAssertion(
        assertion,
        snapshot,
        task
      );

    checks.push({
      id:
        assertion.id,

      group:
        "must",

      snapshot:
        assertion.snapshot,

      required:
        assertion.required,

      passed:
        result.error === undefined &&
        result.satisfied,

      expected:
        result.expected,

      observed:
        result.observed,

      error:
        result.error
    });
  }

  for (
    const assertion of
    contract.mustNot
  ) {
    const snapshot =
      assertion.snapshot === "before"
        ? beforeSnapshot
        : afterSnapshot;

    const result =
      evaluatePositiveAssertion(
        assertion,
        snapshot,
        task
      );

    checks.push({
      id:
        assertion.id,

      group:
        "must_not",

      snapshot:
        assertion.snapshot,

      required:
        assertion.required,

      passed:
        result.error === undefined &&
        !result.satisfied,

      expected:
        result.expected,

      observed:
        result.observed,

      error:
        result.error
    });
  }

  const requiredChecks =
    checks.filter(
      (check) =>
        check.required
    );

  const passed =
    requiredChecks.every(
      (check) =>
        check.passed
    );

  return {
    passed,
    valid: true,
    stale: false,

    taskId:
      task.id,

    activeTaskVersion:
      task.version,

    contractTaskVersion:
      contract.taskVersion,

    contractVersion:
      contract.contractVersion,

    checks
  };
}
