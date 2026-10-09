import type {
  EnvironmentSnapshot
} from "./types";

export const initialSnapshot: EnvironmentSnapshot = {
  capturedAt: Date.now(),

  entities: [
    {
      key: "issue:1",

      type: "issue",

      id: 1,

      data: {
        title: "Button alignment",
        priority: "low",
        assignee: "Omar"
      }
    }
  ]
};
