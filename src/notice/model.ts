import type { Event, User } from "../forgejo";

export type Link = { text: string; url: string };
export type Segment = string | Link;
export type Tone = "positive" | "negative" | "neutral";

export type Notice = {
  title: string;
  url: string;
  sender: User;
  tone: Tone;
  body: Segment[][];
};

type EventType = Event["type"];
type PayloadOf<T extends EventType> = Extract<Event, { type: T }>["payload"];

export type Formatters<K extends EventType> = {
  [T in K]: (payload: PayloadOf<T>, type: T) => Notice | undefined;
};

const EXCERPT_LENGTH = 500;

export function paragraph(text: string): Segment[][] {
  const trimmed = text.trim();
  const excerpt = trimmed.length > EXCERPT_LENGTH ? `${trimmed.slice(0, EXCERPT_LENGTH - 1)}…` : trimmed;
  return excerpt ? excerpt.split("\n").map((line) => [line]) : [];
}

export function shortRef(ref: string) {
  return ref.replace(/^refs\/(heads|tags)\//, "");
}

export function words(action: string) {
  return action.replaceAll("_", " ");
}

export function toneOf(action: string): Tone {
  if (["opened", "reopened", "created", "published"].includes(action)) return "positive";
  if (["closed", "deleted"].includes(action)) return "negative";
  return "neutral";
}
