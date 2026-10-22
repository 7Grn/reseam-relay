import { createHmac, timingSafeEqual } from "node:crypto";

export type User = { login: string; avatar_url: string; html_url: string };

export type Repository = { full_name: string; html_url: string; private: boolean };

export type Commit = {
  id: string;
  message: string;
  url: string;
  author: { name: string } | null;
};

export type Issue = { number: number; title: string; body: string; html_url: string };

export type PullRequest = Issue & { merged: boolean };

export type Release = {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
};

export type ActionRun = {
  title: string;
  html_url: string;
  prettyref: string;
  repository: Repository;
  trigger_user: User;
};

export type RefPayload = { ref: string; ref_type: string; repository: Repository; sender: User };
export type ForkPayload = { forkee: Repository; repository: Repository; sender: User };
export type PushPayload = {
  ref: string;
  compare_url: string;
  commits: Commit[];
  total_commits: number;
  repository: Repository;
  sender: User;
};
export type IssuePayload = { action: string; issue: Issue; repository: Repository; sender: User };
export type CommentPayload = {
  action: string;
  issue: Issue;
  comment: { body: string; html_url: string };
  is_pull: boolean;
  repository: Repository;
  sender: User;
};
export type PullRequestPayload = {
  action: string;
  pull_request: PullRequest;
  requested_reviewer: User | null;
  review: { content: string } | null;
  repository: Repository;
  sender: User;
};
export type WikiPayload = {
  action: string;
  page: string;
  comment: string;
  repository: Repository;
  sender: User;
};
export type RepositoryPayload = { action: string; repository: Repository; sender: User };
export type ReleasePayload = { action: string; release: Release; repository: Repository; sender: User };
export type PackagePayload = {
  action: string;
  package: { name: string; version: string; html_url: string };
  repository: Repository | null;
  sender: User;
};
export type ActionPayload = { action: string; run: ActionRun };

export type Event =
  | { type: "create" | "delete"; payload: RefPayload }
  | { type: "fork"; payload: ForkPayload }
  | { type: "push"; payload: PushPayload }
  | { type: "issues" | "issue_assign" | "issue_label" | "issue_milestone"; payload: IssuePayload }
  | { type: "issue_comment" | "pull_request_comment"; payload: CommentPayload }
  | {
      type:
        | "pull_request"
        | "pull_request_assign"
        | "pull_request_label"
        | "pull_request_milestone"
        | "pull_request_sync"
        | "pull_request_review_request"
        | "pull_request_review_approved"
        | "pull_request_review_rejected"
        | "pull_request_review_comment";
      payload: PullRequestPayload;
    }
  | { type: "wiki"; payload: WikiPayload }
  | { type: "repository"; payload: RepositoryPayload }
  | { type: "release"; payload: ReleasePayload }
  | { type: "package"; payload: PackagePayload }
  | { type: "action_run_failure" | "action_run_recover" | "action_run_success"; payload: ActionPayload };

export function verifySignature(secret: string, body: string, signature: string) {
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Every repository an event touches, so a fork into or out of a private repository is caught too.
export function repositoriesOf(event: Event): (Repository | null)[] {
  switch (event.type) {
    case "fork":
      return [event.payload.forkee, event.payload.repository];
    case "action_run_failure":
    case "action_run_recover":
    case "action_run_success":
      return [event.payload.run.repository];
    default:
      return [event.payload.repository];
  }
}
