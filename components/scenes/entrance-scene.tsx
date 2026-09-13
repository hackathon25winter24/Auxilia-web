"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { Frame } from "@/components/frame";
import { CharacterImage } from "@/components/character-image";
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
  queue: (password?: string) => Promise<void>;
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
  const testHeld = useRef(false);
  const [sortOrder, setSortOrder] = useState<"usage" | "alphabetical">("usage");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const passwordInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (passwordOpen) passwordInput.current?.focus();
  }, [passwordOpen]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))
      )
        return;
      if (event.code === "KeyT") testHeld.current = true;
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "KeyT") testHeld.current = false;
    };
    const reset = () => {
      testHeld.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);
  const sortedDefinitions = [...definitions].sort((a, b) => {
    const byID = a.id.localeCompare(b.id, "en");
    if (sortOrder === "alphabetical") return byID;
    const aRate = a.totalPickCount > 0 ? a.usageCount / a.totalPickCount : 0;
    const bRate = b.totalPickCount > 0 ? b.usageCount / b.totalPickCount : 0;
    return bRate - aRate || byID;
  });
  const waitingForOpponent =
    !!match &&
    !match.started &&
    (match.readyPlayerIds?.includes(guest.id) ?? false);
  const team = selected.flatMap((id) => {
    const character = definitions.find((item) => item.id === id);
    return character ? [character] : [];
  });
  const totalHP = team.reduce((sum, character) => sum + character.maxHP, 0);
  const totalMoveCost = team.reduce(
    (sum, character) => sum + character.moveCost,
    0,
  );
  return (
    <Frame
      step="ENTRANCE"
      headerAction={
        <button
          className="header-title-back"
          data-se="titleEntrance"
          disabled={busy || !!guest.matchId}
          onClick={returnToTitle}
        >
          タイトルへ戻る
        </button>
      }
    >
      <section className="party-slots" aria-label="チーム編成">
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
                  <CharacterImage
                    src={`${BASE}/characters/${d.portrait}`}
                    alt={d.name}
                    width={2048}
                    height={2048}
                  />
                  <div>
                    <h2>{d.name}</h2>
                    <dl className="party-character-stats">
                      <div>
                        <dt>HP</dt>
                        <dd>{d.maxHP}</dd>
                      </div>
                      <div>
                        <dt>MOV</dt>
                        <dd>{d.moveCost}</dd>
                      </div>
                    </dl>
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
      <section
        className="team-totals"
        aria-label="チームの合計ステータス"
        aria-live="polite"
      >
        <div>
          <span>
            TEAM HP<small>合計体力</small>
          </span>
          <strong>{totalHP}</strong>
        </div>
        <div>
          <span>
            TEAM MOV<small>合計移動コスト</small>
          </span>
          <strong>{totalMoveCost}</strong>
        </div>
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
            data-se="none"
            disabled={selected.filter(Boolean).length !== 3 || busy}
            onClick={() => {
              if (testHeld.current) {
                testHeld.current = false;
                setPasswordOpen(true);
              } else void queue();
            }}
          >
            対戦開始
          </button>
        )}
      </section>
      {passwordOpen && (
        <div className="modal-backdrop">
          <form
            className="surrender-confirm test-password-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-password-title"
            onSubmit={(event) => {
              event.preventDefault();
              const submitted = password;
              setPassword("");
              void queue(submitted);
            }}
          >
            <h2 id="test-password-title">テストモード</h2>
            <label htmlFor="test-password">パスワード</label>
            <input
              id="test-password"
              type="password"
              ref={passwordInput}
              autoComplete="off"
              required
              disabled={busy}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p role="alert">{error}</p>}
            <div>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setPassword("");
                  setPasswordOpen(false);
                }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="primary"
                disabled={busy || !password}
              >
                開始
              </button>
            </div>
          </form>
        </div>
      )}
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
                <div className="character-sort-row">
                  <h2 id="character-modal-title">キャラクター選択</h2>
                  <select
                    aria-label="キャラクターの表示順"
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(
                        event.target.value === "alphabetical"
                          ? "alphabetical"
                          : "usage",
                      )
                    }
                  >
                    <option value="usage">使用率順に表示</option>
                    <option value="alphabetical">アルファベット順に表示</option>
                  </select>
                </div>
              </div>
              <button aria-label="閉じる" onClick={() => setEditingSlot(null)}>
                ×
              </button>
            </header>
            <div className="roster">
              {sortedDefinitions.map((d) => (
                <button
                  key={d.id}
                  disabled={selected.includes(d.id)}
                  onClick={() => chooseCharacter(d.id)}
                >
                  <CharacterImage
                    src={`${BASE}/characters/${d.portrait}`}
                    alt={d.name}
                    width={2048}
                    height={2048}
                  />
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
                    <b>PASSIVE · {d.passiveName || "なし"}</b>
                    <p>
                      {d.passiveDescription || "パッシブスキルはありません。"}
                    </p>
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
