// One-time authorization of the account Relay posts to Reddit as. Needs an installed app at
// https://www.reddit.com/prefs/apps with redirect uri http://localhost:8080.
// Run: REDDIT_CLIENT_ID=... bun scripts/reddit-auth.ts, then log in as the posting account.
import { USER_AGENT } from "../src/targets/reddit";

const REDIRECT_URI = "http://localhost:8080";
const clientId = process.env.REDDIT_CLIENT_ID;
if (!clientId) throw new Error("REDDIT_CLIENT_ID is required");
const basic = `Basic ${btoa(`${clientId}:${process.env.REDDIT_CLIENT_SECRET ?? ""}`)}`;

const code = await new Promise<string>((resolve, reject) => {
  const server = Bun.serve({
    port: 8080,
    hostname: "localhost",
    fetch(request) {
      const params = new URL(request.url).searchParams;
      queueMicrotask(() => server.stop());
      const error = params.get("error");
      if (error) reject(new Error(`Reddit returned ${error}`));
      else resolve(params.get("code")!);
      return new Response(error ? `Reddit returned ${error}` : "Authorized. Return to the terminal.");
    },
  });
  const url = new URL("https://www.reddit.com/api/v1/authorize");
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    state: "relay",
    redirect_uri: REDIRECT_URI,
    duration: "permanent",
    scope: "identity submit",
  }).toString();
  console.log(`Open this while logged in as the account that should post:\n\n${url}\n`);
});

const tokens = (await (
  await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: { Authorization: basic, "User-Agent": USER_AGENT },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }),
  })
).json()) as { access_token: string; refresh_token: string };

const me = (await (
  await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}`, "User-Agent": USER_AGENT },
  })
).json()) as { name: string };

console.log(`Authorized as u/${me.name}\n\nREDDIT_REFRESH_TOKEN=${tokens.refresh_token}`);
