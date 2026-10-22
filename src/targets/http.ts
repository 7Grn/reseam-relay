import type { Notice } from "../notice";

export type Announcement = { product: string; tag: string; notes: string; url: string };

export type Target<T> = { name: string; send(item: T): Promise<void> };
export type FeedTarget = Target<Notice>;
export type ReleaseTarget = Target<Announcement>;

const MAX_ATTEMPTS = 3;

// Discord and Telegram both answer bursts with 429 and say how long to wait.
export async function request(fetcher: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetcher(url, init);
    if (response.ok) return response;

    const text = await response.text();
    if (response.status !== 429 || attempt === MAX_ATTEMPTS) {
      throw new Error(`${new URL(url).host} answered ${response.status}: ${text.slice(0, 300)}`);
    }
    await Bun.sleep(retryAfter(response, text) * 1000);
  }
}

function retryAfter(response: Response, text: string): number {
  const header = Number(response.headers.get("retry-after"));
  if (header > 0) return header;
  const body = JSON.parse(text) as { retry_after?: number; parameters?: { retry_after?: number } };
  return body.retry_after ?? body.parameters?.retry_after ?? 1;
}
