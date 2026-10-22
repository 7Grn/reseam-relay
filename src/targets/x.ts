import { TwitterClient } from "@steipete/bird";
import type { Config } from "../config";
import type { ReleaseTarget } from "./http";

type XConfig = NonNullable<Config["x"]>;

// Posts as the logged-in web session, so it breaks when the cookies expire or X changes its web API.
export function xReleases(config: XConfig): ReleaseTarget {
  const client = new TwitterClient({
    cookies: { authToken: config.authToken, ct0: config.ct0, cookieHeader: null, source: "env" },
  });
  return {
    name: "x",
    async send(release) {
      const result = await client.tweet(`${release.product} ${release.tag} is out.\n\n${release.url}`);
      if (!result.success) throw new Error(result.error);
    },
  };
}
