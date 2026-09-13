import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url);
const built = await build({
  stdin: {
    contents: `export { LoadingScene } from './components/scenes/loading-scene';`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  external: ["react", "react-dom"],
  alias: { "@": process.cwd() },
  write: false,
});
const module = { exports: {} };
new Function("require", "module", "exports", built.outputFiles[0].text)(
  require,
  module,
  module.exports,
);
const { LoadingScene } = module.exports;
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
for (const readyPlayerIds of [null, undefined, [], ["a"]]) {
  test(`loading renders for both players with readyPlayerIds=${JSON.stringify(readyPlayerIds)}`, () => {
    for (const guestId of ["a", "b"]) {
      const html = renderToStaticMarkup(
        React.createElement(LoadingScene, {
          match: {
            matchId: "m1",
            readyPlayerIds,
            players: [
              { id: "a", name: "Player A" },
              { id: "b", name: "Player B" },
            ],
            characters: [],
          },
          guestId,
          definitions: [],
          busy: false,
          error: "",
          onPrepared: async () => {},
        }),
      );
      assert.match(html, /Player A/);
      assert.match(html, /Player B/);
      assert.ok(
        html.includes(
          readyPlayerIds?.includes(guestId)
            ? "対戦相手の準備を待っています"
            : "対戦を準備しています",
        ),
      );
    }
  });
}
