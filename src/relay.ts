import type { Config, Settings } from "./config";
import { repositoriesOf, type Event } from "./forgejo";
import { toNotice } from "./notice";
import { discordFeed, discordReleases } from "./targets/discord";
import type { Announcement, FeedTarget, ReleaseTarget, Target } from "./targets/http";
import { redditReleases } from "./targets/reddit";
import { telegramFeed, telegramReleases } from "./targets/telegram";
import { xReleases } from "./targets/x";

export type Feeds = { everything: FeedTarget[]; releases: ReleaseTarget[] };
export type Relay = ReturnType<typeof createRelay>;

export function buildFeeds(config: Config, fetcher: typeof fetch): Feeds {
  const { discord, telegram, reddit, x } = config;
  return {
    everything: [
      discord.feed && discordFeed(fetcher, discord.feed),
      telegram?.feed && telegramFeed(fetcher, telegram.token, telegram.feed),
    ].filter((target) => !!target),
    releases: [
      discord.releases && discordReleases(fetcher, discord.releases),
      telegram?.releases && telegramReleases(fetcher, telegram.token, telegram.releases),
      reddit && redditReleases(fetcher, reddit),
      x && xReleases(x),
    ].filter((target) => !!target),
  };
}

export function toAnnouncement(event: Event, settings: Settings["releases"]): Announcement | undefined {
  if (event.type !== "release" || event.payload.action !== "published") return undefined;
  const { release, repository } = event.payload;
  const product = settings.repos[repository.full_name];
  if (!product || release.draft || (release.prerelease && !settings.prereleases)) return undefined;
  return { product, tag: release.tag_name, notes: release.body.trim(), url: release.html_url };
}

// Each target gets its own queue so a burst of events arrives in order and one slow target holds up no other.
export function createRelay(settings: Settings, feeds: Feeds) {
  const queues = new Map<string, Promise<void>>();

  function enqueue<T>(target: Target<T>, item: T) {
    const next = (queues.get(target.name) ?? Promise.resolve())
      .then(() => target.send(item))
      .catch((error: Error) => console.error(`${target.name}: ${error.message}`));
    queues.set(target.name, next);
  }

  return {
    targets: [...feeds.everything, ...feeds.releases].map((target) => target.name),

    deliver(event: Event) {
      const repositories = repositoriesOf(event);
      if (repositories.some((repository) => !repository || repository.private)) return;

      const excluded = repositories.some((repository) => settings.everything.exclude.includes(repository!.full_name));
      const notice = excluded ? undefined : toNotice(event);
      if (notice) for (const target of feeds.everything) enqueue(target, notice);

      const announcement = toAnnouncement(event, settings.releases);
      if (announcement) for (const target of feeds.releases) enqueue(target, announcement);
    },

    idle: () => Promise.all(queues.values()),
  };
}
