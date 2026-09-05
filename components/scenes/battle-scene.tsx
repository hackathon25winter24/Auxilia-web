"use client";

import type {
  Dispatch,
  PointerEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";

import { Frame } from "@/components/frame";
import { EFFECT_DESCRIPTIONS } from "@/lib/game";
import type {
  Attack,
  Definition,
  Fighter,
  Guest,
  Match,
  Player,
  Position,
} from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const ATTACK_TARGET_LABELS: Record<string, string> = {
  enemy: "敵",
  ally: "味方",
  any: "敵・味方",
  cell: "マス",
};

function AttackPattern({ attack }: { attack: Attack }) {
  const cells = new Set(attack.pattern.map(({ x, y }) => `${x},${y}`));
  const xs = [0, ...attack.pattern.map(({ x }) => x)];
  const ys = [0, ...attack.pattern.map(({ y }) => y)];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const positions: Position[] = [];

  for (let y = maxY; y >= minY; y -= 1) {
    for (let x = minX; x <= maxX; x += 1) positions.push({ x, y });
  }

  return (
    <div>
      <span className="attack-pattern-label">有効攻撃範囲</span>
      <div
        className="attack-pattern"
        style={{ gridTemplateColumns: `repeat(${maxX - minX + 1}, 22px)` }}
        aria-label="⭕がキャラクター、塗りつぶされたマスが有効攻撃範囲"
      >
        {positions.map(({ x, y }) => {
          const origin = x === 0 && y === 0;
          const target = cells.has(`${x},${y}`);
          return (
            <span
              key={`${x},${y}`}
              className={`${origin ? "origin" : ""} ${target ? "target" : ""}`}
              title={origin ? "キャラクター" : target ? "攻撃可能" : "範囲外"}
            >
              {origin ? "⭕" : target ? "■" : "□"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type BattleSceneProps = {
  match: Match;
  guest: Guest;
  definitions: Definition[];
  inspectedFighter: string;
  setInspectedFighter: Dispatch<SetStateAction<string>>;
  showEffectGuide: boolean;
  setShowEffectGuide: Dispatch<SetStateAction<boolean>>;
  active?: Fighter;
  activeDefinition?: Definition;
  selectedAttack?: Attack;
  attackable: Set<string>;
  remaining: number;
  myTurn: boolean;
  busy: boolean;
  error: string;
  actor: string;
  mode: "move" | "attack";
  attackIndex: number;
  controllerPosition: Position | null;
  controllerRef: RefObject<HTMLDivElement | null>;
  mobileDirectionPad: ReactNode;
  portraitFor: (id: string) => string;
  miniFor: (id: string) => string;
  selectActor: (id: string) => void;
  act: (position: Position, mode?: "move" | "attack") => Promise<void>;
  surrender: () => Promise<void>;
  endTurn: () => Promise<void>;
  setMode: Dispatch<SetStateAction<"move" | "attack">>;
  setAttackIndex: Dispatch<SetStateAction<number>>;
  beginControllerDrag: (event: PointerEvent<HTMLElement>) => void;
  dragController: (event: PointerEvent<HTMLElement>) => void;
  endControllerDrag: () => void;
};

export function BattleScene({
  match,
  guest,
  definitions,
  inspectedFighter,
  setInspectedFighter,
  showEffectGuide,
  setShowEffectGuide,
  active,
  activeDefinition,
  selectedAttack,
  attackable,
  remaining,
  myTurn,
  busy,
  error,
  actor,
  mode,
  attackIndex,
  controllerPosition,
  controllerRef,
  mobileDirectionPad,
  portraitFor,
  miniFor,
  selectActor,
  act,
  surrender,
  endTurn,
  setMode,
  setAttackIndex,
  beginControllerDrag,
  dragController,
  endControllerDrag,
}: BattleSceneProps) {
  const inspected = match.characters.find((f) => f.id === inspectedFighter);
  const inspectedDefinition = definitions.find(
    (d) => d.id === inspected?.definitionId,
  );
  const fighterCards = (player: Player, side: "left" | "right") => (
    <aside className={`fighter-cards ${side}`}>
      <strong>{player.id === match.players[0].id ? "1P" : "2P"}</strong>
      {match.characters
        .filter((c) => c.ownerId === player.id)
        .map((f) => {
          const d = definitions.find((item) => item.id === f.definitionId);
          return (
            <button
              key={f.id}
              className={`${f.hp <= 0 ? "knocked-out" : ""} ${active?.id === f.id ? "selected" : ""}`}
              onClick={() => setInspectedFighter(f.id)}
            >
              <img src={portraitFor(f.definitionId)} alt={f.name} />
              <div>
                <b>{f.name}</b>
                <span>
                  HP {f.hp}/{f.maxHP}
                </span>
                {f.effects.length > 0 && (
                  <span className="effects">{f.effects.join(" · ")}</span>
                )}
                <span className="card-hint">技・パッシブ・状態を確認</span>
                <i
                  style={{ width: `${Math.max(0, (f.hp / f.maxHP) * 100)}%` }}
                />
              </div>
              <small>MOVE {d?.moveCost ?? "-"}</small>
            </button>
          );
        })}
    </aside>
  );
  return (
    <Frame step={`MATCH ${match.matchId.slice(-6).toUpperCase()}`}>
      <section className="battle-head">
        <div
          className={`player-cost left ${match.players[0].id === guest.id ? "self" : ""}`}
        >
          <b>1P · {match.players[0].name}</b>
          <span>COST {match.players[0].cost}/50</span>
        </div>
        <div className="turn-state">
          <span>
            TURN {match.turn} · {remaining}s
          </span>
          <h2>{myTurn ? "YOUR TURN" : "ENEMY TURN"}</h2>
        </div>
        <div
          className={`player-cost right ${match.players[1].id === guest.id ? "self" : ""}`}
        >
          <b>2P · {match.players[1].name}</b>
          <span>COST {match.players[1].cost}/50</span>
        </div>
        <div className="battle-actions">
          <button
            className="effect-guide-button"
            onClick={() => setShowEffectGuide(true)}
          >
            状態異常
          </button>
          <button
            className="surrender"
            data-se="battleCancel"
            disabled={busy}
            onClick={surrender}
          >
            投降
          </button>
          <button
            className="end-turn"
            disabled={!myTurn || busy}
            onClick={endTurn}
          >
            ターン終了
          </button>
        </div>
      </section>
      <section className="battle-stage">
        {fighterCards(match.players[0], "left")}
        <div className="battle-center">
          <div className="base-durability">
            {match.bases.map((base, index) => (
              <div key={base.ownerId} className={index === 1 ? "right" : ""}>
                <span>{index === 0 ? "1P" : "2P"} BASE</span>
                <b>
                  {base.hp}/{base.maxHP}
                </b>
                <i>
                  <em
                    style={{
                      width: `${Math.max(0, (base.hp / base.maxHP) * 100)}%`,
                    }}
                  />
                </i>
              </div>
            ))}
          </div>
          <div className="board">
            {Array.from({ length: 40 }, (_, i) => {
              const p = { x: i % 8, y: 4 - Math.floor(i / 8) };
              const fighter = match.characters.find(
                (c) => c.hp > 0 && c.position.x === p.x && c.position.y === p.y,
              );
              const base = match.bases.find(
                (item) => item.position.x === p.x && item.position.y === p.y,
              );
              const blocked = match.blockedCells?.some(
                (item) => item.x === p.x && item.y === p.y,
              );
              const mine = fighter?.ownerId === guest.id;
              const playerOne = fighter?.ownerId === match.players[0].id;
              const inAttackRange =
                !!myTurn &&
                !blocked &&
                mode === "attack" &&
                !!active &&
                attackable.has(`${p.x},${p.y}`);
              const validFighterTarget =
                inAttackRange &&
                !!fighter &&
                !!selectedAttack &&
                (selectedAttack.target === "any" ||
                  (selectedAttack.target === "ally" && mine) ||
                  (selectedAttack.target === "enemy" && !mine));
              const validBaseTarget =
                inAttackRange &&
                !fighter &&
                !!base &&
                !!selectedAttack &&
                (selectedAttack.target === "any" ||
                  (selectedAttack.target === "enemy" &&
                    base.ownerId !== guest.id));
              const validCellTarget =
                inAttackRange &&
                selectedAttack?.target === "cell" &&
                !fighter &&
                !base;
              const validTarget =
                validFighterTarget || validBaseTarget || validCellTarget;
              const tileEffect = match.tileEffects?.find(
                (item) => item.position.x === p.x && item.position.y === p.y,
              );
              const selectedCell = myTurn && actor === fighter?.id;
              const tile = `${BASE}/Grids/${base ? "grid_base_on.png" : "gird_default.png"}`;
              return (
                <div
                  key={i}
                  className={`board-cell ${selectedCell ? "has-controller" : ""} ${base ? "base-cell" : ""} ${tileEffect ? `tile-${tileEffect.type}` : ""} ${blocked ? "blocked-cell" : ""}`}
                >
                  <button
                    disabled={blocked}
                    aria-label={
                      blocked
                        ? `侵入不可能マス ${p.x},${p.y}`
                        : base
                          ? `${base.ownerId === match.players[0].id ? "1P" : "2P"}拠点 耐久力${base.hp}`
                          : `グリッド ${p.x},${p.y}`
                    }
                    style={{ backgroundImage: `url(${tile})` }}
                    className={`${fighter ? "occupied" : ""} ${mine ? "mine" : "enemy"} ${playerOne ? "player-one" : ""} ${selectedCell ? "active" : ""} ${inAttackRange ? "attack-range" : ""} ${validTarget ? "attack-target" : ""} ${fighter && (!mine || !myTurn) && !validTarget ? "inert-fighter" : ""}`}
                    onClick={() =>
                      validTarget
                        ? void act(p, "attack")
                        : fighter && mine && myTurn
                          ? selectActor(fighter.id)
                          : undefined
                    }
                  >
                    <small>
                      {p.x},{p.y}
                      {tileEffect ? ` · ${tileEffect.type}` : ""}
                    </small>
                    {fighter && (
                      <>
                        <img
                          src={miniFor(fighter.definitionId)}
                          alt={fighter.name}
                        />
                        <em>
                          {fighter.hp}/{fighter.maxHP}
                        </em>
                      </>
                    )}
                  </button>
                  {selectedCell && active && (
                    <div
                      ref={controllerRef}
                      style={
                        controllerPosition
                          ? {
                              position: "fixed",
                              left: controllerPosition.x,
                              top: controllerPosition.y,
                              right: "auto",
                              transform: "none",
                            }
                          : undefined
                      }
                      className={`unit-controller ${controllerPosition ? "controller-dragged" : p.x >= 5 ? "controller-left" : "controller-right"}`}
                    >
                      <header
                        onPointerDown={beginControllerDrag}
                        onPointerMove={dragController}
                        onPointerUp={endControllerDrag}
                        onPointerCancel={endControllerDrag}
                      >
                        <b>
                          {active.name}
                          <small>↕ このバーをドラッグして移動</small>
                        </b>
                        <button
                          aria-label="閉じる"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => selectActor("")}
                        >
                          ×
                        </button>
                      </header>
                      <div className="mode">
                        <button
                          className={mode === "move" ? "on" : ""}
                          onClick={() => setMode("move")}
                        >
                          {mode === "move" ? "移動" : "移動（E）"}
                        </button>
                        <button
                          className={mode === "attack" ? "on" : ""}
                          onClick={() => setMode("attack")}
                        >
                          {mode === "attack" ? "攻撃" : "攻撃（E）"}
                        </button>
                      </div>
                      {mode === "move" ? (
                        <>
                          <p className="move-message">
                            <span className="desktop-instruction">
                              十字キー / WASDで移動
                            </span>
                            <span className="mobile-instruction">
                              方向をタップして移動
                            </span>
                          </p>
                          {mobileDirectionPad}
                        </>
                      ) : (
                        <div className="attack-panel">
                          <p className="attack-direction">
                            <span className="desktop-instruction">
                              十字キー / WASDで攻撃方向を変更
                            </span>
                            <span className="mobile-instruction">
                              方向をタップして攻撃方向を変更
                            </span>
                          </p>
                          {mobileDirectionPad}
                          <div className="attack-list">
                            {activeDefinition?.attacks.map((a, index) => (
                              <button
                                key={a.name}
                                className={attackIndex === index ? "on" : ""}
                                onClick={() => setAttackIndex(index)}
                              >
                                <b>{a.name}</b>
                                <span>
                                  COST {a.cost} · POWER {a.power}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="battle-log">
            <b>{match.lastEvent.text}</b>
            <span>
              {mode === "attack" && active
                ? "方向を選び、色の付いたマスを選択"
                : mode === "move" && active
                  ? "方向を選んで移動"
                  : "キャラクターを選択して操作"}
            </span>
            {error && <em>{error}</em>}
          </div>
        </div>
        {fighterCards(match.players[1], "right")}
      </section>
      {(inspected || showEffectGuide) && (
        <div className="modal-backdrop battle-reference-backdrop">
          <section
            className="battle-reference"
            role="dialog"
            aria-modal="true"
            aria-label={
              showEffectGuide ? "状態異常一覧" : `${inspected?.name}の詳細`
            }
          >
            <header>
              <div>
                <p className="eyebrow">BATTLE REFERENCE</p>
                <h2>
                  {showEffectGuide ? "状態異常・バフ一覧" : inspected?.name}
                </h2>
              </div>
              <button
                aria-label="閉じる"
                onClick={() => {
                  setInspectedFighter("");
                  setShowEffectGuide(false);
                }}
              >
                ×
              </button>
            </header>
            {showEffectGuide ? (
              <div className="effect-reference-list">
                {Object.entries(EFFECT_DESCRIPTIONS).map(
                  ([effect, description]) => (
                    <article key={effect}>
                      <b>{effect}</b>
                      <p>{description}</p>
                    </article>
                  ),
                )}
              </div>
            ) : (
              <>
                <section className="character-attacks">
                  <h3>技</h3>
                  <div className="character-attack-list">
                    {inspectedDefinition?.attacks.map((attack) => (
                      <article key={attack.name}>
                        <header>
                          <b>{attack.name}</b>
                          <span>COST {attack.cost}</span>
                        </header>
                        <p>
                          対象：
                          {ATTACK_TARGET_LABELS[attack.target] ?? attack.target}
                          ／
                          {attack.power < 0
                            ? ` 回復：${Math.abs(attack.power)}`
                            : ` 威力：${attack.power}`}
                        </p>
                        <AttackPattern attack={attack} />
                        {attack.effect && (
                          <p>
                            追加効果：
                            {EFFECT_DESCRIPTIONS[attack.effect] ??
                              attack.effect}
                            {attack.effectChance
                              ? `（発生率 ${attack.effectChance}%）`
                              : ""}
                          </p>
                        )}
                        {attack.tile && <p>設置マス：{attack.tile}</p>}
                        {attack.clearDebuffs && (
                          <p>対象のデバフを解除します。</p>
                        )}
                      </article>
                    )) ?? <p>技の情報はありません。</p>}
                  </div>
                </section>
                <article className="passive-detail">
                  <span>PASSIVE</span>
                  <h3>{inspectedDefinition?.passiveName || "パッシブなし"}</h3>
                  <p>
                    {inspectedDefinition?.passiveDescription ||
                      "説明はありません。"}
                  </p>
                </article>
                <div className="current-effects">
                  <h3>現在の状態</h3>
                  {inspected && inspected.effects.length > 0 ? (
                    inspected.effects.map((effect) => (
                      <article key={effect}>
                        <b>{effect}</b>
                        <p>
                          {EFFECT_DESCRIPTIONS[effect] ??
                            "詳細情報はありません。"}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p>状態異常・バフはありません。</p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </Frame>
  );
}
