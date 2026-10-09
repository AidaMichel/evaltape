import {
  createTask
} from "./task";

import type {
  TaskSpec
} from "./types";

export function authorGitHubIssueTask(
  id: string,
  instruction: string
): TaskSpec {
  const normalized =
    instruction.trim();

  const match =
    normalized.match(
      /^Create\s+an\s+open\s+(?:GitHub\s+)?issue\s+titled\s+(?:"([^"]+)"|'([^']+)')\s+assigned\s+to\s+([A-Za-z0-9-]+)\.?$/i
    );

  if (!match) {
    throw new Error(
      [
        "GitHub Issues V0 could not understand the task.",
        "",
        "Supported format:",
        "",
        `Create an open issue titled 'Payment timeout' assigned to AidaMichel`,
        "",
        "EvalTape refused to guess the task requirements."
      ].join(
        "\n"
      )
    );
  }

  const title =
    match[1] ??
    match[2];

  const assignee =
    match[3];

  if (
    !title ||
    !assignee
  ) {
    throw new Error(
      "Could not extract the issue title or assignee."
    );
  }

  return createTask(
    id,
    instruction,
    {
      title,
      state:
        "open",

      assignees: [
        assignee
      ]
    }
  );
}
