# Auxilia Web

Auxilia Battle PrototypeのReactクライアントです。

1. `Auxilia-webserver` を `go run .` で起動
2. 必要に応じて `.env.example` を `.env.local` としてコピー
3. `npm install && npm run dev` で起動
4. ブラウザを通常ウィンドウとプライベートウィンドウで開き、2人分のゲストを作成

ゲストセッションはブラウザのlocalStorageに保存されます。戦闘結果はクライアントでは計算せず、Goサーバーから受信した状態だけを表示します。

## GitHub Pages

Actionsは `npm run build:pages` で `dist-pages` を生成して公開します。GitHubのRepository Settingsで次を設定してください。

- Pages → Source: `GitHub Actions`
- Actions variables → `VITE_API_URL`: 公開済みGoサーバーのHTTPS URL

Goサーバー側の `ALLOWED_ORIGINS` には `https://hackathon25winter24.github.io` を指定します。
