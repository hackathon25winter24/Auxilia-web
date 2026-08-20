# Auxilia Web

Auxilia Battle PrototypeのReactクライアントです。

1. `Auxilia-webserver` を `go run .` で起動
2. 必要に応じて `.env.example` を `.env.local` としてコピー
3. `npm install && npm run dev` で起動
4. ブラウザを通常ウィンドウとプライベートウィンドウで開き、2人分のゲストを作成

ゲストセッションはブラウザのlocalStorageに保存されます。戦闘結果はクライアントでは計算せず、Goサーバーから受信した状態だけを表示します。
