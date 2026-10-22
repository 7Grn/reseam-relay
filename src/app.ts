import { Elysia } from "elysia";
import type { Config } from "./config";
import { verifySignature, type Event } from "./forgejo";
import type { Relay } from "./relay";

type AppOptions = { config: Config; relay: Relay; version: string };

export function createApp({ config, relay, version }: AppOptions) {
  return new Elysia()
    .get("/v1/health", () => ({ ok: true, version, targets: relay.targets }))
    .post(
      "/v1/forgejo",
      async ({ request, headers, status }) => {
        const body = await request.text();
        if (!verifySignature(config.webhookSecret, body, headers["x-forgejo-signature"] ?? "")) {
          return status(401, { error: "Invalid signature" });
        }
        // Forgejo gives up on a delivery after a few seconds, so posting happens after the reply.
        relay.deliver({ type: headers["x-forgejo-event-type"], payload: JSON.parse(body) } as Event);
        return status(202, { ok: true });
      },
      { parse: "none" },
    );
}

export type App = ReturnType<typeof createApp>;
