import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Announced = ReturnType<typeof openAnnounced>;

// Remembers which releases went out, so an edit or a redelivered webhook never posts one twice.
export function openAnnounced(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.run("create table if not exists announced (repo text not null, tag text not null, primary key (repo, tag))");
  const insert = db.prepare("insert or ignore into announced (repo, tag) values (?, ?)");
  return { claim: (repo: string, tag: string) => insert.run(repo, tag).changes === 1 };
}
