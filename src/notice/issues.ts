import type { CommentPayload, IssuePayload, PullRequestPayload } from "../forgejo";
import { paragraph, toneOf, words, type Formatters, type Notice } from "./model";

type IssueEvent =
  | "issues"
  | "issue_assign"
  | "issue_label"
  | "issue_milestone"
  | "issue_comment"
  | "pull_request_comment"
  | "pull_request"
  | "pull_request_assign"
  | "pull_request_label"
  | "pull_request_milestone"
  | "pull_request_sync"
  | "pull_request_review_request"
  | "pull_request_review_approved"
  | "pull_request_review_rejected"
  | "pull_request_review_comment";

const VERDICTS: Record<string, string> = {
  pull_request_review_approved: "approved",
  pull_request_review_rejected: "changes requested",
  pull_request_review_comment: "comment",
};

function issue({ action, issue, repository, sender }: IssuePayload): Notice {
  return {
    title: `[${repository.full_name}] Issue ${words(action)}: #${issue.number} ${issue.title}`,
    url: issue.html_url,
    sender,
    tone: toneOf(action),
    body: action === "opened" ? paragraph(issue.body) : [],
  };
}

function comment({ action, issue, comment, repository, sender }: CommentPayload): Notice {
  return {
    title: `[${repository.full_name}] Comment ${action} on #${issue.number} ${issue.title}`,
    url: comment.html_url,
    sender,
    tone: "neutral",
    body: action === "deleted" ? [] : paragraph(comment.body),
  };
}

function pullRequest({ action, pull_request: pr, requested_reviewer, repository, sender }: PullRequestPayload): Notice {
  const merged = action === "closed" && pr.merged;
  const what = merged
    ? "merged"
    : action === "review_requested"
      ? `review requested from ${requested_reviewer?.login}`
      : words(action);
  return {
    title: `[${repository.full_name}] Pull request ${what}: #${pr.number} ${pr.title}`,
    url: pr.html_url,
    sender,
    tone: merged ? "positive" : toneOf(action),
    body: action === "opened" ? paragraph(pr.body) : [],
  };
}

function review({ pull_request: pr, review, repository, sender }: PullRequestPayload, type: string): Notice {
  return {
    title: `[${repository.full_name}] Review ${VERDICTS[type]}: #${pr.number} ${pr.title}`,
    url: pr.html_url,
    sender,
    tone: type === "pull_request_review_approved" ? "positive" : "neutral",
    body: paragraph(review?.content ?? ""),
  };
}

export const issueFormatters: Formatters<IssueEvent> = {
  issues: issue,
  issue_assign: issue,
  issue_label: issue,
  issue_milestone: issue,
  issue_comment: comment,
  pull_request_comment: comment,
  pull_request: pullRequest,
  pull_request_assign: pullRequest,
  pull_request_label: pullRequest,
  pull_request_milestone: pullRequest,
  pull_request_sync: pullRequest,
  pull_request_review_request: pullRequest,
  pull_request_review_approved: review,
  pull_request_review_rejected: review,
  pull_request_review_comment: review,
};
