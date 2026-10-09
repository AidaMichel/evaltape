import type {
  EntitySelector,
  OutcomeContract
} from "./contract";

import type {
  StateChange
} from "./diff";

import type {
  TaskSpec
} from "./types";

export interface ContractProposal {
  contract: OutcomeContract;

  evidence: {
    entityKey: string;
    entityType: string;
    matchedTaskVariables: string[];
    selectorVariable: string;
  };

  warnings: string[];
}

export type CompileCandidateResult =
  | {
      ok: true;
      proposal: ContractProposal;
    }
  | {
      ok: false;
      error: string;
    };

function valuesEqual(
  left: unknown,
  right: unknown
): boolean {
  return (
    JSON.stringify(left) ===
    JSON.stringify(right)
  );
}

export function compileCandidateContract(
  task: TaskSpec,
  changes: StateChange[]
): CompileCandidateResult {
  const addedEntities =
    changes.filter(
      (
        change
      ): change is Extract<
        StateChange,
        {
          kind: "entity_added";
        }
      > =>
        change.kind ===
        "entity_added"
    );

  if (
    addedEntities.length !== 1
  ) {
    return {
      ok: false,

      error:
        "V0 compiler requires exactly one added entity in the demonstration."
    };
  }

  const added =
    addedEntities[0];

  const entity =
    added.after;

  const variableNames =
    Object.keys(
      task.variables
    );

  if (
    variableNames.length === 0
  ) {
    return {
      ok: false,

      error:
        "Task has no variables that can be compiled into an outcome contract."
    };
  }

  /*
    IMPORTANT V0 SAFETY RULE

    Every task variable must be:

    1. Observable on the demonstrated entity.
    2. Equal to the user's CURRENT task value.

    We fail closed instead of silently
    dropping unmet task requirements.
  */

  const problems:
    string[] = [];

  for (
    const name of variableNames
  ) {
    const variable =
      task.variables[name];

    if (!variable) {
      problems.push(
        `- ${name}: task variable could not be resolved`
      );

      continue;
    }

    if (
      !(
        name in
        entity.data
      )
    ) {
      problems.push(
        `- ${name}: no matching field exists on the demonstrated ${entity.type} entity`
      );

      continue;
    }

    const observed =
      entity.data[name];

    if (
      !valuesEqual(
        observed,
        variable.value
      )
    ) {
      problems.push(
        `- ${name}: expected ${JSON.stringify(variable.value)}, observed ${JSON.stringify(observed)}`
      );
    }
  }

  if (
    problems.length > 0
  ) {
    return {
      ok: false,

      error: [
        "Demonstration does not satisfy the current task intent.",
        "",
        ...problems,
        "",
        "EvalTape refused to generate a weaker contract."
      ].join(
        "\n"
      )
    };
  }

  /*
    Because all task variables passed
    validation above, they are all
    demonstrated requirements.
  */

  const matchedTaskVariables =
    variableNames;

  const selectorVariable =
    matchedTaskVariables[0];

  if (!selectorVariable) {
    return {
      ok: false,

      error:
        "Could not infer a selector for the demonstrated entity."
    };
  }

  const selector:
    EntitySelector = {
      type:
        entity.type,

      where: [
        {
          path:
            selectorVariable,

          expected: {
            kind:
              "task_variable",

            name:
              selectorVariable
          }
        }
      ]
    };

  const contract:
    OutcomeContract = {
      id:
        `contract:${task.id}:candidate`,

      taskId:
        task.id,

      taskVersion:
        task.version,

      contractVersion:
        1,

      must: [
        {
          id:
            "target-exists-after",

          snapshot:
            "after",

          target:
            selector,

          operator:
            "exists",

          required:
            true
        },

        ...matchedTaskVariables
          .slice(1)
          .map(
            (name) => ({
              id:
                `after-${name}-matches`,

              snapshot:
                "after" as const,

              target:
                selector,

              path:
                name,

              operator:
                "equals" as const,

              expected: {
                kind:
                  "task_variable" as const,

                name
              },

              required:
                true
            })
          )
      ],

      mustNot: [
        {
          id:
            "target-did-not-exist-before",

          snapshot:
            "before",

          target:
            selector,

          operator:
            "exists",

          required:
            true
        }
      ]
    };

  return {
    ok:
      true,

    proposal: {
      contract,

      evidence: {
        entityKey:
          added.entityKey,

        entityType:
          added.entityType,

        matchedTaskVariables,

        selectorVariable
      },

      warnings: [
        "Selector was inferred heuristically and requires human confirmation.",
        "V0 compiler only supports a single added entity.",
        "Matching currently requires task-variable names to match entity field names."
      ]
    }
  };
}
