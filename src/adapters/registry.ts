import type {
  ProductAdapter
} from "../adapter";

import {
  githubIssuesAdapter
} from "./github-issues";

import {
  shopAdapter
} from "./shop";

const adapters: Record<
  string,
  ProductAdapter
> = {
  "github-issues":
    githubIssuesAdapter,

  shop:
    shopAdapter
};

export function getAdapter(
  name: string
): ProductAdapter {
  const adapter =
    adapters[name];

  if (!adapter) {
    const available =
      Object.keys(
        adapters
      )
        .sort()
        .join(", ");

    throw new Error(
      `Unknown adapter "${name}". Available adapters: ${available}`
    );
  }

  return adapter;
}

export function listAdapters():
  string[] {
  return Object.keys(
    adapters
  ).sort();
}
