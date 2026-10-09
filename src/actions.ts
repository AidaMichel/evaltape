import type {
  Entity,
  EnvironmentSnapshot,
  JsonValue
} from "./types";

export function addEntity(
  snapshot: EnvironmentSnapshot,
  entity: Entity
): EnvironmentSnapshot {
  return {
    capturedAt: Date.now(),

    entities: [
      ...snapshot.entities,
      entity
    ]
  };
}

export function updateEntity(
  snapshot: EnvironmentSnapshot,
  entityKey: string,
  changes: Record<string, JsonValue>
): EnvironmentSnapshot {
  return {
    capturedAt: Date.now(),

    entities: snapshot.entities.map(
      (entity) => {
        if (entity.key === entityKey) {
          return {
            ...entity,

            data: {
              ...entity.data,
              ...changes
            }
          };
        }

        return entity;
      }
    )
  };
}
