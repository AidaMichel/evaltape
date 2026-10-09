import readline from "node:readline/promises";
import {
  stdin as input,
  stdout as output
} from "node:process";

import type {
  OutcomeContract
} from "./contract";

import type {
  ContractProposal
} from "./compiler";

function describeExpected(
  expected:
    | {
        kind: "literal";
        value: unknown;
      }
    | {
        kind: "task_variable";
        name: string;
      }
    | undefined
): string {
  if (!expected) {
    return "";
  }

  if (expected.kind === "task_variable") {
    return `task.${expected.name}`;
  }

  return JSON.stringify(expected.value);
}

export function printProposal(
  proposal: ContractProposal
) {
  console.log(
    "\nEVALTAPE PROPOSED CONTRACT\n"
  );

  console.log(
    `Entity type: ${proposal.evidence.entityType}`
  );

  console.log(
    `Proposed selector: ${proposal.evidence.selectorVariable}`
  );

  console.log("\nMUST:");

  for (
    const assertion of
    proposal.contract.must
  ) {
    if (
      assertion.operator === "exists" &&
      !assertion.path
    ) {
      console.log(
        `✓ [${assertion.snapshot}] target must exist`
      );

      continue;
    }

    console.log(
      `✓ [${assertion.snapshot}] ${assertion.path} ${assertion.operator} ${describeExpected(assertion.expected)}`
    );
  }

  console.log("\nMUST NOT:");

  for (
    const assertion of
    proposal.contract.mustNot
  ) {
    if (
      assertion.operator === "exists" &&
      !assertion.path
    ) {
      console.log(
        `✓ [${assertion.snapshot}] target must not exist`
      );

      continue;
    }

    console.log(
      `✓ [${assertion.snapshot}] ${assertion.path} must not satisfy ${assertion.operator}`
    );
  }

  if (proposal.warnings.length > 0) {
    console.log("\nWARNINGS:");

    for (const warning of proposal.warnings) {
      console.log(
        `! ${warning}`
      );
    }
  }
}

export async function confirmProposal(
  proposal: ContractProposal
): Promise<OutcomeContract | null> {
  printProposal(proposal);

  const rl =
    readline.createInterface({
      input,
      output
    });

  try {
    const answer =
      await rl.question(
        "\nApprove this contract? [y/n]: "
      );

    const normalized =
      answer
        .trim()
        .toLowerCase();

    if (
      normalized === "y" ||
      normalized === "yes"
    ) {
      return proposal.contract;
    }

    return null;
  } finally {
    rl.close();
  }
}
