import type { ActionPayload, RefPayload } from "../forgejo";
import { paragraph, shortRef, toneOf, type Formatters, type Notice } from "./model";

type RepositoryEvent =
  | "create"
  | "delete"
  | "fork"
  | "push"
  | "wiki"
  | "repository"
  | "release"
  | "package"
  | "action_run_failure"
  | "action_run_recover"
  | "action_run_success";

const OUTCOMES = { failure: "failed", recover: "recovered", success: "succeeded" } as Record<string, string>;

function ref({ ref, ref_type, repository, sender }: RefPayload, type: "create" | "delete"): Notice {
  const name = shortRef(ref);
  return {
    title: `[${repository.full_name}] ${ref_type} ${name} ${type}d`,
    url: type === "create" ? `${repository.html_url}/src/${ref_type}/${name}` : repository.html_url,
    sender,
    tone: type === "create" ? "positive" : "negative",
    body: [],
  };
}

function actionRun({ action, run }: ActionPayload): Notice {
  return {
    title: `[${run.repository.full_name}] ${run.title} ${OUTCOMES[action]} on ${run.prettyref}`,
    url: run.html_url,
    sender: run.trigger_user,
    tone: action === "failure" ? "negative" : "positive",
    body: [],
  };
}

export const repositoryFormatters: Formatters<RepositoryEvent> = {
  create: ref,
  delete: ref,
  fork: ({ forkee, repository, sender }) => ({
    title: `[${forkee.full_name}] forked to ${repository.full_name}`,
    url: repository.html_url,
    sender,
    tone: "neutral",
    body: [],
  }),
  push: ({ ref, compare_url, commits, total_commits, repository, sender }) =>
    total_commits === 0
      ? undefined
      : {
          title: `[${repository.full_name}:${shortRef(ref)}] ${total_commits} new commit${total_commits === 1 ? "" : "s"}`,
          url: compare_url || commits[0].url,
          sender,
          tone: "neutral",
          body: commits.map((commit) => [
            { text: commit.id.slice(0, 7), url: commit.url },
            ` ${commit.message.split("\n")[0]}${commit.author ? ` - ${commit.author.name}` : ""}`,
          ]),
        },
  wiki: ({ action, page, comment, repository, sender }) => ({
    title: `[${repository.full_name}] Wiki page ${page} ${action}`,
    url: `${repository.html_url}/wiki/${encodeURIComponent(page)}`,
    sender,
    tone: "neutral",
    body: paragraph(comment),
  }),
  repository: ({ action, repository, sender }) => ({
    title: `[${repository.full_name}] Repository ${action}`,
    url: repository.html_url,
    sender,
    tone: toneOf(action),
    body: [],
  }),
  release: ({ action, release, repository, sender }) => ({
    title: `[${repository.full_name}] Release ${action}: ${release.name || release.tag_name}`,
    url: release.html_url,
    sender,
    tone: toneOf(action),
    body: action === "deleted" ? [] : paragraph(release.body),
  }),
  package: ({ action, package: pkg, repository, sender }) => ({
    title: `[${repository?.full_name}] Package ${action}: ${pkg.name}:${pkg.version}`,
    url: pkg.html_url,
    sender,
    tone: toneOf(action),
    body: [],
  }),
  action_run_failure: actionRun,
  action_run_recover: actionRun,
  action_run_success: actionRun,
};
