"use client";

import type { Dispatch, SetStateAction } from "react";

import { Frame } from "@/components/frame";
import type { Definition, Guest, Match } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type EntranceSceneProps = {
  guest: Guest;
  match: Match | null;
  definitions: Definition[];
  selected: string[];
  editingSlot: number | null;
  busy: boolean;
  error: string;
  setEditingSlot: Dispatch<SetStateAction<number | null>>;
  chooseCharacter: (id: string) => void;
  clearSlot: (index: number) => void;
  queue: () => Promise<void>;
  cancel: () => Promise<void>;
  returnToTitle: () => Promise<void>;
  acceptMatch: () => Promise<void>;
  cancelMatchStart: () => Promise<void>;
};

export function EntranceScene({
  guest,
  match,
  definitions,
  selected,
  editingSlot,
  busy,
  error,
  setEditingSlot,
  chooseCharacter,
  clearSlot,
  queue,
  cancel,
  returnToTitle,
  acceptMatch,
  cancelMatchStart,
}: EntranceSceneProps) {
  const waitingForOpponent =
    !!match && !match.started && match.readyPlayerIds.includes(guest.id);
  return (
    <Frame
      step="ENTRANCE"
      headerAction={
        <button
          className="header-title-back"
          disabled={busy || !!guest.matchId}
          onClick={returnToTitle}
        >
          タイトルへ戻る
        </button>
      }
    >
      <section className="entrance-head">
        <div>
          <p className="eyebrow">WELCOME, {guest.name.toUpperCase()}</p>
          <h1 className="small-h1">3人の部隊を編成</h1>
        </div>
        <div className={`status ${guest.queued ? "searching" : ""}`}>
          {guest.matchId
            ? "マッチングしました"
            : guest.queued
              ? "対戦相手を検索中"
              : "キャラクターを選択"}
        </div>
      </section>
      <section className="party-slots">
        {Array.from({ length: 3 }, (_, index) => {
          const id = selected[index];
          const d = definitions.find((item) => item.id === id);
          return (
            <button
              key={index}
              className={`party-slot ${d ? "filled" : ""}`}
              disabled={guest.queued || !!guest.matchId}
              onClick={() => setEditingSlot(index)}
            >
              {d ? (
                <>
                  <span>SLOT 0{index + 1}</span>
                  <img src={`${BASE}/characters/${d.portrait}`} alt={d.name} />
                  <div>
                    <h2>{d.name}</h2>
                  </div>
                </>
              ) : (
                <>
                  <b>＋</b>
                  <span>SLOT 0{index + 1}</span>
                  <p>クリックして選択</p>
                </>
              )}
            </button>
          );
        })}
      </section>
      <section className="match-bar">
        <div>
          <b>{selected.filter(Boolean).length}/3 SELECTED</b>
          <span>
            {waitingForOpponent
              ? "相手も対戦開始を押すとゲームが始まります"
              : guest.matchId
                ? "準備ができたら対戦を開始してください"
                : guest.queued
                  ? "マッチ成立までお待ちください"
                  : "各枠をクリックしてキャラクターを選択してください"}
          </span>
        </div>
        {guest.matchId ? (
          waitingForOpponent ? (
            <button
              className="secondary cancel-ready"
              onClick={cancelMatchStart}
              disabled={busy}
            >
              {busy ? "キャンセル中…" : "対戦開始をキャンセル"}
            </button>
          ) : (
            <button
              className="primary match-ready"
              onClick={acceptMatch}
              disabled={busy}
            >
              対戦を開始
            </button>
          )
        ) : guest.queued ? (
          <button className="secondary" onClick={cancel}>
            キャンセル
          </button>
        ) : (
          <button
            className="primary"
            disabled={selected.filter(Boolean).length !== 3 || busy}
            onClick={queue}
          >
            マッチング開始
          </button>
        )}
      </section>
      {editingSlot !== null && (
        <div className="modal-backdrop">
          <div
            className="character-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-modal-title"
          >
            <header>
              <div>
                <p className="eyebrow">SELECT FOR SLOT 0{editingSlot + 1}</p>
                <h2 id="character-modal-title">キャラクター選択</h2>
              </div>
              <button aria-label="閉じる" onClick={() => setEditingSlot(null)}>
                ×
              </button>
            </header>
            <div className="roster">
              {definitions.map((d) => (
                <button
                  key={d.id}
                  disabled={selected.includes(d.id)}
                  onClick={() => chooseCharacter(d.id)}
                >
                  <img src={`${BASE}/characters/${d.portrait}`} alt={d.name} />
                  <h3>{d.name}</h3>
                  <p>
                    HP {d.maxHP} / 移動コスト {d.moveCost}
                  </p>
                  <div>
                    {d.attacks.map((a) => (
                      <span key={a.name}>{a.name}</span>
                    ))}
                  </div>
                  <div className="usage-stats">
                    <small>
                      使用率{" "}
                      <b>
                        {(d.totalPickCount > 0
                          ? (d.usageCount / d.totalPickCount) * 100
                          : 0
                        ).toFixed(1)}
                        %
                      </b>
                    </small>
                    <small>
                      使用数 <b>{d.usageCount}</b>
                    </small>
                  </div>
                  <article className="passive-summary">
                    <b>PASSIVE · {d.passiveName}</b>
                    <p>{d.passiveDescription}</p>
                  </article>
                </button>
              ))}
            </div>
            {selected[editingSlot] && (
              <button
                className="remove-character"
                onClick={() => clearSlot(editingSlot)}
              >
                この枠を空にする
              </button>
            )}
          </div>
        </div>
      )}
      {error && <p className="floating-error">{error}</p>}
    </Frame>
  );
}
