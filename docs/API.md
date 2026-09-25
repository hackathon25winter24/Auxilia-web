# Auxilia API仕様（実装ベース）

更新日：2026-09-25。フロントの `lib/api.ts`・`app/page.tsx` と、バックエンドのルート、ハンドラー、GoのJSON定義を基準にしています。例のID・名前・日時・使用数は説明用です。キャラ定義と待機中の試合例は現行Goコードから生成しています。

## 1. 接続と認証

接続先は `NEXT_PUBLIC_API_URL`。未設定時は `https://auxilia-web.trap.show/` です。末尾の `/` を除去し、以下の `/api/...` を連結します。

```http
Content-Type: application/json
Authorization: Bearer token-example
```

認証が必要なAPIには、ゲスト作成時に返る `token` を送ります。フロントでは `localStorage` の `auxilia-token` に保存します。ゲストの有効期限は作成から24時間です。JSON本文内のプレイヤーIDで本人を指定する方式ではありません。

成功時は、後述のオブジェクトまたは配列を直接返します。`data` などの共通ラッパーはありません。JSONレスポンスは `application/json; charset=utf-8`。CSVの取得は既存の `request<T>()`（常に `response.json()` を呼ぶ）ではなく、別のfetch処理等で行います。

## 2. エンドポイント一覧

「認証あり」はBearerトークン必須。本文「なし」はボディ不要（画面側で `{}` を送る場合もあります）。共通レスポンス型の具体例は後述します。

| メソッド・パス | 認証 | リクエスト本文 | 成功 | レスポンス・用途 |
| --- | --- | --- | --- | --- |
| GET `/api/health` | なし | なし | 200 | `{"status":"ok","database":"mariadb"}` |
| POST `/api/guests` | なし | `{"name":"Alice"}` | 201 | Guest。ここだけtokenを含む |
| GET `/api/me` | あり | なし | 200 | Guest。自身の編成・待機・試合ID |
| PUT `/api/me/selection` | あり | `{"characterIds":["tsukiha","zina","jude"]}` | 200 | 更新後のGuest |
| POST `/api/matchmaking` | あり | なし | 200 | Guest。待機開始またはマッチ成立 |
| DELETE `/api/matchmaking` | あり | なし | 200 | 待機解除後のGuest |
| POST `/api/test-matches` | あり | `{"password":"入力された値"}` | 201 | テスト試合IDを含むGuest |
| GET `/api/matches/{id}` | あり | なし | 200 | Match。認証ゲストが参加する試合 |
| POST `/api/matches/{id}/ready` | あり | なし | 200 | 準備完了後のMatch。双方完了で開始 |
| DELETE `/api/matches/{id}/ready` | あり | なし | 200 | 準備解除後のMatch。マッチング取消とは別 |
| POST `/api/matches/{id}/move` | あり | Command | 200 | 移動後のMatch |
| POST `/api/matches/{id}/attack` | あり | Command | 200 | 技使用後のMatch |
| POST `/api/matches/{id}/end-turn` | あり | Command（ID・revision） | 200 | ターン終了処理に入ったMatch |
| POST `/api/matches/{id}/surrender` | あり | Command（ID・revision） | 200 | 終了したMatch。テストモードではテスト終了 |
| POST `/api/matches/{id}/leave` | あり | なし | 200 | 終了試合から退出したGuest |
| GET `/api/characters` | なし | なし | 200 | CharacterDefinitionの配列。今週の使用数を含む |
| GET `/api/character-usage` | なし | なし | 200 | 今週のUsageWeek |
| GET `/api/character-usage/history` | なし | なし | 200 | 確定済みUsageWeekの配列 |
| GET `/api/character-usage/counts.csv` | なし | なし | 200 | 週別使用数のCSV |
| GET `/api/character-usage/rates.csv` | なし | なし | 200 | 週別使用率のCSV |
| POST `/api/presence/heartbeat` | あり | なし | 200 | `{"count":12}`。自身の生存通知と集計 |
| GET `/api/presence/count` | なし | なし | 200 | `{"count":12}`。集計のみ |
| DELETE `/api/presence` | あり | なし | 200 | `{"ok":true}`。自身の接続記録を削除 |

## 3. Guest：入場・編成・マッチング

ゲスト作成リクエスト：

```json
{"name":"Alice"}
```

作成レスポンス：

```json
{"id":"guest-a","name":"Alice","token":"token-example","selection":[],"queued":false}
```

編成を保存し、待機列に入った状態：

```json
{"id":"guest-a","name":"Alice","selection":["tsukiha","zina","jude"],"queued":true}
```

マッチ成立時：

```json
{"id":"guest-a","name":"Alice","selection":["tsukiha","zina","jude"],"matchId":"match-example","queued":false}
```

- `id`：認証ゲストのID。`name`：表示名。前後の空白を除去し、1〜20文字を受理します。
- `token`：作成レスポンスのみ。それ以外では省略します。
- `selection`：キャラクター定義IDの配列。編成保存は重複なしの3体が必要です。
- `matchId`：参加する試合ID。未参加時は省略します。
- `queued`：マッチング待機中かどうか。
- エントランスで非表示にする暫定除外リストはフロントの制限です。サーバーのキャラ定義から削除されるわけではありません。
- 旧ID `wellbulus`・`shincho` は `verbulus`・`shicho` に正規化します。

## 4. Command：戦闘操作

移動の例：

```json
{"commandId":"550e8400-e29b-41d4-a716-446655440000","expectedRevision":8,"characterId":"p1-c1","target":{"x":2,"y":2}}
```

攻撃の例（座標・手番・コスト等を満たす試合状態で送信）：

```json
{"commandId":"550e8400-e29b-41d4-a716-446655440001","expectedRevision":9,"characterId":"p1-c1","attackIndex":1,"target":{"x":4,"y":2},"direction":{"x":1,"y":0}}
```

ターン終了・降伏の例：

```json
{"commandId":"550e8400-e29b-41d4-a716-446655440002","expectedRevision":10}
```

| フィールド | 型 | 意味 |
| --- | --- | --- |
| commandId | string | 操作ごとに発行するID。フロントはUUIDを生成。必須。再送時の二重実行防止に使用 |
| expectedRevision | number | 最後に取得したMatchのrevision。古い値は409 |
| characterId | string | 試合内のキャラID。`zina`等の定義IDではなく`p1-c1`等 |
| attackIndex | number | 技の添字。0・1・2。状態切替中は現在の技配列に対応 |
| target | Position | 移動先、攻撃対象または設置先のマス |
| direction | Position | 右 `(1,0)`、左 `(-1,0)`、上 `(0,1)`、下 `(0,-1)` |

盤面は8×5で、xは0〜7、yは0〜4。攻撃範囲はdirectionに合わせて回転します。通常の範囲攻撃はtargetだけに当たるのではなく、その方向の範囲内にいる有効対象へ適用されます。設置技はtargetへ設置します。

成功レスポンスは差分ではなくMatch全体です。次の操作には返却されたrevisionを使います。ターン終了は即次プレイヤーへ渡らず、`phase: "turn_end"` の処理期間（2秒）を挟みます。通常の手番制限は120秒です。

## 5. Match：試合状態

以下は現行コードで生成した、双方が未準備の試合です。

```json
{
  "matchId": "match-example",
  "revision": 1,
  "started": false,
  "readyPlayerIds": null,
  "players": [
    {
      "id": "guest-a",
      "name": "Alice",
      "cost": 50
    },
    {
      "id": "guest-b",
      "name": "Bob",
      "cost": 50
    }
  ],
  "bases": [
    {
      "ownerId": "guest-a",
      "hp": 400,
      "maxHP": 400,
      "position": {
        "x": 0,
        "y": 2
      }
    },
    {
      "ownerId": "guest-b",
      "hp": 400,
      "maxHP": 400,
      "position": {
        "x": 7,
        "y": 2
      }
    }
  ],
  "characters": [
    {
      "id": "p1-c1",
      "definitionId": "tsukiha",
      "ownerId": "guest-a",
      "name": "月葉",
      "hp": 100,
      "maxHP": 100,
      "position": {
        "x": 0,
        "y": 4
      },
      "effects": []
    },
    {
      "id": "p1-c2",
      "definitionId": "zina",
      "ownerId": "guest-a",
      "name": "ジーナ",
      "hp": 200,
      "maxHP": 200,
      "position": {
        "x": 1,
        "y": 2
      },
      "effects": []
    },
    {
      "id": "p1-c3",
      "definitionId": "jude",
      "ownerId": "guest-a",
      "name": "ジュード",
      "hp": 250,
      "maxHP": 250,
      "position": {
        "x": 0,
        "y": 0
      },
      "effects": []
    },
    {
      "id": "p2-c1",
      "definitionId": "dana",
      "ownerId": "guest-b",
      "name": "ダーナ",
      "hp": 200,
      "maxHP": 200,
      "position": {
        "x": 7,
        "y": 4
      },
      "effects": []
    },
    {
      "id": "p2-c2",
      "definitionId": "louise",
      "ownerId": "guest-b",
      "name": "ルイース",
      "hp": 100,
      "maxHP": 100,
      "position": {
        "x": 6,
        "y": 2
      },
      "effects": []
    },
    {
      "id": "p2-c3",
      "definitionId": "liberette",
      "ownerId": "guest-b",
      "name": "リベレット",
      "hp": 150,
      "maxHP": 150,
      "position": {
        "x": 7,
        "y": 0
      },
      "effects": []
    }
  ],
  "tileEffects": null,
  "blockedCells": [
    {
      "x": 1,
      "y": 1
    },
    {
      "x": 2,
      "y": 3
    },
    {
      "x": 5,
      "y": 1
    },
    {
      "x": 6,
      "y": 3
    }
  ],
  "turnPlayerId": "guest-a",
  "turn": 1,
  "phase": "waiting",
  "phaseDeadline": "0001-01-01T00:00:00Z",
  "turnDeadline": "0001-01-01T00:00:00Z",
  "serverTime": "2026-09-25T12:00:00Z",
  "finished": false,
  "lastEvent": {
    "sequence": 1,
    "type": "MATCH_FOUND",
    "text": "対戦相手が見つかりました"
  },
  "events": [
    {
      "sequence": 1,
      "type": "MATCH_FOUND",
      "text": "対戦相手が見つかりました"
    }
  ]
}
```

| フィールド | 意味 |
| --- | --- |
| matchId / revision | 試合ID／更新番号 |
| started / finished | 開始済み／終了済み |
| readyPlayerIds | 準備済みプレイヤーID配列。未準備時は`null`になり得る |
| players | 1P・2Pの順の2要素。id・name・現在の行動cost |
| bases | 各拠点のownerId・hp・maxHP・position |
| characters | 両陣営の試合内キャラ |
| tileEffects | 設置マス。空の場合は`null`になり得る |
| blockedCells | 侵入不可マスのPosition配列 |
| turnPlayerId / turn | 操作中プレイヤーID／両者の手番交代ごとに増える番号 |
| phase | `waiting`・`action`・`turn_end` |
| phaseDeadline / turnDeadline | 終了処理期限／手番期限。RFC3339形式 |
| serverTime | サーバー時刻。フロントの残り時間補正に使う |
| winnerId | 勝者ID。未決着時は省略 |
| lastEvent / events | 最新イベント／イベント履歴。各要素はsequence・type・text |
| testOwnerId | テストモードだけ返る、操作元ゲストのID |

Goの`time.Time`はゼロ値でも `"0001-01-01T00:00:00Z"` が返る場合があります。`omitempty`指定だけを根拠に「未開始時はキーがない」と判断しないでください。未使用の配列も必ず`[]`とは限りません。

### 試合内キャラの追加フィールド

基本フィールドは`id, definitionId, ownerId, name, hp, maxHP, position, effects`。以下はゼロ値・false・空なら省略されます。サーバーはフロントのTypeScript型に載っていない状態管理フィールドも返します。

| フィールド | 型 | 用途 |
| --- | --- | --- |
| usedSkills | object | 技名→最後に使ったturn。1ターン1回制限 |
| combatStance | boolean | ルイースの臨戦状態 |
| wriggling | boolean | 睡魔のくねくね状態 |
| barrierTurn | number | 結界が有効になる手番番号 |
| temporaryBuffs | string[] | 手番終了時に解除する一時バフ |
| reviveUsed | boolean | 復活パッシブ使用済み |
| departureUsed | boolean | 戦闘離脱時パッシブ使用済み |
| drankTurn | number | 酒の威力上昇を終了する手番番号 |
| hangoverTurn | number | 二日酔いを開始する手番番号 |
| hangoverUntil | number | 二日酔いを終了する手番番号 |

設置マスの例：

```json
{"position":{"x":3,"y":2},"type":"不変","ownerId":"guest-a","hp":170}
```

`type`は地雷・まきびし・毒ガス・不変。`hp`は不変マスで使用します。`ownerId`は設置プレイヤーIDで、設置キャラクターIDではありません。

## 6. キャラクター定義

`GET /api/characters`は全定義の配列です。以下はそのうちダーナ1体の具体例です。使用数は例示値です。

```json
[
  {
    "id": "dana",
    "name": "ダーナ",
    "image": "Dana_mini.png",
    "portrait": "Dana.png",
    "maxHP": 200,
    "moveCost": 9,
    "moveRange": 2,
    "passiveName": "毒物耐性",
    "passiveDescription": "デバフの影響を受けない。デバフマスによるダメージや移動コスト増加は受ける。",
    "attacks": [
      {
        "name": "残留型毒ガス",
        "cost": 10,
        "power": 0,
        "range": 1,
        "target": "cell",
        "pattern": [
          {
            "x": 1,
            "y": 0
          }
        ],
        "tile": "毒ガス"
      },
      {
        "name": "拡散型毒ガス",
        "cost": 20,
        "power": 20,
        "range": 3,
        "target": "enemy",
        "pattern": [
          {
            "x": 1,
            "y": 0
          },
          {
            "x": 2,
            "y": -1
          },
          {
            "x": 2,
            "y": 0
          },
          {
            "x": 2,
            "y": 1
          },
          {
            "x": 3,
            "y": 0
          }
        ],
        "effect": "毒",
        "effectChance": 100
      },
      {
        "name": "活性化ガス",
        "cost": 20,
        "power": -30,
        "range": 0,
        "target": "ally",
        "pattern": [
          {
            "x": 0,
            "y": 0
          }
        ]
      }
    ],
    "usageCount": 8,
    "totalPickCount": 20
  }
]
```

- `id`：小文字の定義ID。`portrait`は`/characters/`、`image`は`/characters-mini/`のファイル名。
- `maxHP, moveCost, moveRange`：最大体力、基礎移動コスト、移動距離。
- `passiveName, passiveDescription`：パッシブの表示文言。
- `attacks`：通常状態の3技。`alternateAttacks`：別状態の3技（該当キャラのみ）。
- `usageCount`：今週のそのキャラの使用数。`totalPickCount`：今週の参加パーティー数。使用率は `usageCount / totalPickCount * 100`。0件時は画面では0%表示。
- 攻撃の`power`は正ならダメージ、負なら回復。`range`はパターン内最大マンハッタン距離。実際の範囲は`pattern`を使用。
- `target`は`enemy`・`ally`・`any`・`cell`。`pattern`は自身を原点とした相対座標。
- 任意フィールド：`description`（説明）、`effect`（毒等）、`effectChance`（0〜100）、`tile`（設置種別）、`clearDebuffs`・`clearBuffs`（解除）、`allyEffect`（味方への効果）、`oncePerTurn`（手番ごと1回）。ゼロ値は省略されます。

## 7. 使用率API・CSV

集計境界は日本時間の月曜0時です。現在週はその時刻から問い合わせ時点まで。通常対戦の開始時に記録し、テストモードは除外します。1試合は2パーティーとして数え、各編成キャラの使用数を増やします。

現在週のレスポンス例（counts・ratesは説明用に2キャラのみ掲載。実際は集計対象の全IDが含まれます）：

```json
{"weekStart":"2026-09-21","weekEnd":"2026-09-28","playerPickCount":20,"counts":{"zina":5,"jude":8},"rates":{"zina":25,"jude":40},"partial":true,"recordingSince":"2026-09-14T00:00:00Z"}
```

`rates`は%単位。分母が0の場合は`null`です。`partial`は未確定の現在週ならtrue、確定週ならfalse。`recordingSince`は記録開始日時で、省略される場合があります。`history`は同じ型の配列で、記録がなければ空配列`[]`を返します。記録開始が週途中の場合、その不完全な週は週次確定対象から除外します。

CSVは `text/csv; charset=utf-8`、添付ファイル名は `character-usage-counts.csv` または `character-usage-rates.csv`。最左列は `week_start`、以降はキャラIDのアルファベット順です。確定週だけを出力し、割合不明のセルは空欄になります。

## 8. 接続人数

20秒ごとのheartbeatに対し、サーバー時刻で直近60秒以内の通知があるIDを数えます。同じIDの複数タブは1人、別IDは別人です。heartbeatとcountのレスポンスは`{"count":12}`。キャッシュは禁止です。

タイトルへ戻る際にDELETEを呼びます。タブ終了・回線切断は通知が途絶えて60秒後に集計対象外となり、表示は次回取得時に反映されます。テストモードの仮想1P・2Pは通知せず、認証ゲストを1人として扱います。

## 9. フロントからの典型的な呼び出し順

1. 起動時にcharactersを取得。保存tokenがあればmeで復帰。
2. 新規入場はguestsをPOSTし、tokenを保存。以後heartbeatを20秒間隔で送信。
3. エントランスでselectionをPUTし、matchmakingをPOST。
4. 待機中はmeを1秒間隔で取得。matchIdを得たら試合状態を取得。
5. 通常対戦のロード画面で5秒待ち、readyをPOST。両者完了でstarted=true。
6. 試合状態は約900ms間隔で取得。move・attack等の成功レスポンスでも更新。
7. finished=trueを受信したら1秒後に勝者名を表示し、その2秒後リザルトへ。
8. leaveをPOSTしてエントランスへ戻る。

テストモードはselection保存後、password付きでtest-matchesをPOSTします。ロード・準備待ちを省略し、`testOwnerId`のゲストが現在の手番側を操作します。surrenderまたは時間切れで終了し、通常の勝利演出を挟まずエントランスへ戻ります。仮想プレイヤーのid・nameは、それぞれ「ユーザー名＋1」「ユーザー名＋2」です。両陣営とも入場時に選択した3体を使います。パスワードの実値はこの資料に記載しません。

## 10. エラー

```json
{"error":"古いゲーム状態からの操作です"}
```

| HTTP | 主な条件 |
| --- | --- |
| 400 | 不正JSON、未知の入力フィールド、名前が範囲外、編成が3体でない・重複・不明ID、commandIdなし |
| 401 | tokenなし、無効、期限切れ |
| 403 | テストモードのパスワード不一致 |
| 404 | 対象データ・アクセス可能な試合が見つからない |
| 409 | 古いrevision、編成・待機状態の競合、開始済み試合の準備取消、未終了試合からの退出等 |
| 422 | move/attack/end-turn/surrenderの無効操作。手番・コスト・対象等の検証失敗 |
| 500 | サーバー処理失敗。通常は`サーバー処理に失敗しました` |
| 503 | TESTMODE_PASSWORD未設定 |

本文をdecodeするAPIは最大1MiB、未知のJSONフィールドを拒否します。サーバーのルーティング由来の404/405等はこのJSON形式とは限りません。フロントは戦闘操作失敗時に最新Matchを再取得します。GET Matchでも時間切れ判定により状態が更新されるため、revisionが進む場合があります。

## 11. 実装の参照先

- フロント：`lib/api.ts`、`lib/types.ts`、`app/page.tsx`
- バックエンド：`../Auxilia-webserver/main.go`、`handlers.go`、`presence.go`、`weekly_usage.go`
- JSON定義：`../Auxilia-webserver/internal/game/engine.go`、`characters.go`
- 保存・集計：`../Auxilia-webserver/internal/store/`
