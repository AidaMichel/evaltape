import type {
  EnvironmentSnapshot,
  Entity,
  JsonValue
} from "./types";

export type StateChange =
  | {
      kind: "entity_added";
      entityKey: string;
      entityType: string;
      before: null;
      after: Entity;
    }
  | {
      kind: "entity_removed";
      entityKey: string;
      entityType: string;
      before: Entity;
      after: null;
    }
  | {
      kind:
        | "field_added"
        | "field_removed"
        | "field_changed";

      entityKey: string;
      entityType: string;

      path: string;

      before: JsonValue | undefined;
      after: JsonValue | undefined;
    };

function isObject(
  value: JsonValue
): value is Record<string, JsonValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function valuesEqual(
  a: JsonValue | undefined,
  b: JsonValue | undefined
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffValues(
  entity: Entity,
  before: JsonValue | undefined,
  after: JsonValue | undefined,
  path: string,
  changes: StateChange[]
) {
  if (before === undefined) {
    changes.push({
      kind: "field_added",
      entityKey: entity.key,
      entityType: entity.type,
      path,
      before: undefined,
      after
    });

    return;
  }

  if (after === undefined) {
    changes.push({
      kind: "field_removed",
      entityKey: entity.key,
      entityType: entity.type,
      path,
      before,
      after: undefined
    });

    return;
  }

  if (
    isObject(before) &&
    isObject(after)
  ) {
    const keys = new Set([
      ...Object.keys(before),
      ...Object.keys(after)
    ]);

    for (const key of keys) {
      const nextPath =
        path.length > 0
          ? `${path}.${key}`
          : key;

      diffValues(
        entity,
        before[key],
        after[key],
        nextPath,
        changes
      );
    }

    return;
  }

  if (!valuesEqual(before, after)) {
    changes.push({
      kind: "field_changed",
      entityKey: entity.key,
      entityType: entity.type,
      path,
      before,
      after
    });
  }
}

export function diffSnapshots(
  before: EnvironmentSnapshot,
  after: EnvironmentSnapshot
): StateChange[] {
  const changes: StateChange[] = [];

  const beforeByKey = new Map(
    before.entities.map(
      (entity) => [entity.key, entity]
    )
  );

  const afterByKey = new Map(
    after.entities.map(
      (entity) => [entity.key, entity]
    )
  );

  for (const entity of after.entities) {
    if (!beforeByKey.has(entity.key)) {
      changes.push({
        kind: "entity_added",
        entityKey: entity.key,
        entityType: entity.type,
        before: null,
        after: entity
      });
    }
  }

  for (const entity of before.entities) {
    if (!afterByKey.has(entity.key)) {
      changes.push({
        kind: "entity_removed",
        entityKey: entity.key,
        entityType: entity.type,
        before: entity,
        after: null
      });
    }
  }

  for (const beforeEntity of before.entities) {
    const afterEntity =
      afterByKey.get(beforeEntity.key);

    if (!afterEntity) {
      continue;
    }

    diffValues(
      beforeEntity,
      beforeEntity.data,
      afterEntity.data,
      "",
      changes
    );
  }

  return changes;
}
