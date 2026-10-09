import {
  z
} from "zod";

import type {
  ProductAdapter
} from "../adapter";

import type {
  EnvironmentSnapshot
} from "../types";

const GitHubUserSchema =
  z.object({
    login:
      z.string()
  })
    .passthrough();

const GitHubLabelSchema =
  z.object({
    name:
      z.string()
  })
    .passthrough();

const GitHubIssueSchema =
  z.object({
    number:
      z.number(),

    title:
      z.string(),

    body:
      z
        .string()
        .nullable()
        .optional(),

    state:
      z.string(),

    assignees:
      z.array(
        GitHubUserSchema
      ),

    labels:
      z.array(
        GitHubLabelSchema
      ),

    html_url:
      z
        .string()
        .optional(),

    /*
      GitHub's Issues endpoint can
      also return pull requests.

      If this field exists,
      this object is a PR,
      not a normal issue.
    */
    pull_request:
      z
        .unknown()
        .optional()
  })
    .passthrough();

const RawGitHubIssuesSchema =
  z.array(
    GitHubIssueSchema
  );

export const githubIssuesAdapter:
  ProductAdapter = {
    name:
      "github-issues",

    normalize(
      rawState: unknown
    ): EnvironmentSnapshot {
      const validated =
        RawGitHubIssuesSchema.parse(
          rawState
        );

      const issues =
        validated.filter(
          (item) =>
            item.pull_request ===
            undefined
        );

      return {
        capturedAt:
          Date.now(),

        entities:
          issues.map(
            (issue) => ({
              key:
                `github-issue:${issue.number}`,

              type:
                "issue",

              id:
                issue.number,

              data: {
                number:
                  issue.number,

                title:
                  issue.title,

                state:
                  issue.state,

                body:
                  issue.body ?? "",

                assignees:
                  issue.assignees.map(
                    (user) =>
                      user.login
                  ),

                labels:
                  issue.labels.map(
                    (label) =>
                      label.name
                  ),

                url:
                  issue.html_url ?? ""
              }
            })
          )
      };
    }
  };
