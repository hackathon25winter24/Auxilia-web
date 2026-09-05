import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Auxilia title screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Auxilia Battle Prototype<\/title>/i);
  assert.match(html, /Auxilia/);
  assert.match(html, /id="player-name"/);
  assert.match(html, /title\.png/);
});

test("keeps page responsibilities in dedicated modules", async () => {
  const [page, titleScene, resultScene, api, types] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/scenes/title-scene.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/scenes/result-scene.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/api.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/types.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /import \{ TitleScene \}/);
  assert.match(page, /import \{ ResultScene \}/);
  assert.match(page, /import \{ request \}/);
  assert.match(
    page,
    /import type \{ Definition, Guest, Match, Player, Position \}/,
  );
  assert.match(titleScene, /export function TitleScene/);
  assert.match(resultScene, /export function ResultScene/);
  assert.match(api, /export async function request/);
  assert.match(types, /export type Match/);

  await access(new URL("../components/frame.tsx", import.meta.url));
  await access(new URL("../lib/game.ts", import.meta.url));
});
