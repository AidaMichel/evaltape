export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type EntityData = Record<
  string,
  JsonValue
>;

export interface Entity {
  key: string;

  type: string;

  id?: string | number;

  data: EntityData;
}

export interface EnvironmentSnapshot {
  entities: Entity[];

  capturedAt: number;
}

export interface TaskVariable {
  name: string;

  value: JsonValue;

  version: number;
}

export interface TaskSpec {
  id: string;

  currentInstruction: string;

  variables: Record<
    string,
    TaskVariable
  >;

  version: number;
}
