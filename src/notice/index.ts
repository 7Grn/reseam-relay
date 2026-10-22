import type { Event } from "../forgejo";
import { issueFormatters } from "./issues";
import type { Formatters, Notice } from "./model";
import { repositoryFormatters } from "./repository";

export type { Link, Notice, Segment, Tone } from "./model";

const FORMATTERS: Formatters<Event["type"]> = { ...repositoryFormatters, ...issueFormatters };

export function toNotice(event: Event): Notice | undefined {
  const format = FORMATTERS[event.type] as ((payload: Event["payload"], type: Event["type"]) => Notice | undefined) | undefined;
  // The event type comes from a header, so an event Forgejo adds later has no formatter yet.
  return format?.(event.payload, event.type);
}
