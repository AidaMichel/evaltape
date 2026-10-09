import type {
  JsonValue
} from "./types";

export type Operator =
  | "equals"
  | "not_equals"
  | "exists"
  | "contains";

export type SnapshotTarget =
  | "before"
  | "after";

export type ExpectedValue =
  | {
      kind: "literal";
      value: JsonValue;
    }
  | {
      kind: "task_variable";
      name: string;
    };

export interface SelectorCondition {
  path: string;

  expected: ExpectedValue;
}

export interface EntitySelector {
  type: string;

  where: SelectorCondition[];
}

export interface Assertion {
  id: string;

  snapshot: SnapshotTarget;

  target: EntitySelector;

  path?: string;

  operator: Operator;

  expected?: ExpectedValue;

  required: boolean;
}

export interface OutcomeContract {
  id: string;

  taskId: string;

  taskVersion: number;

  contractVersion: number;

  must: Assertion[];

  mustNot: Assertion[];
}
