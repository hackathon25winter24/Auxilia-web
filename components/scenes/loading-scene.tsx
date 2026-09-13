"use client";

import { useEffect, useRef } from "react";
import { Frame } from "@/components/frame";
import { CharacterImage } from "@/components/character-image";
import type { Definition, Match } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Props = {
  match: Match;
  definitions: Definition[];
  guestId: string;
  busy: boolean;
  error: string;
  onPrepared: () => Promise<void>;
};

export function LoadingScene({
  match,
  definitions,
  guestId,
  busy,
  error,
  onPrepared,
}: Props) {
  const prepare = useRef(onPrepared);
  prepare.current = onPrepared;
  const prepared = match.readyPlayerIds?.includes(guestId) ?? false;
  useEffect(() => {
    if (prepared || definitions.length === 0) return;
    const timer = window.setTimeout(() => {
      void prepare.current();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [match.matchId, prepared, definitions.length]);

  return (
    <Frame step="MATCH LOADING">
      <section className="match-loading" aria-label="対戦準備">
        {match.players.map((player, index) => {
          const team = match.characters.filter((c) => c.ownerId === player.id);
          return (
            <section
              className={`loading-party side-${index + 1}`}
              key={player.id}
              aria-label={`${index + 1}Pのパーティー`}
            >
              <header className="loading-player">
                <span>{index + 1}P</span>
                <h1>{player.name}</h1>
              </header>
              <div className="loading-cards">
                {team.map((fighter) => {
                  const definition = definitions.find(
                    (d) => d.id === fighter.definitionId,
                  );
                  return (
                    <article className="loading-character" key={fighter.id}>
                      <CharacterImage
                        src={
                          definition
                            ? `${BASE}/characters/${definition.portrait}`
                            : undefined
                        }
                        alt={fighter.name}
                        width={2048}
                        height={2048}
                      />
                      <div>
                        <h2>{fighter.name}</h2>
                        <dl className="party-character-stats">
                          <div>
                            <dt>HP</dt>
                            <dd>{fighter.maxHP}</dd>
                          </div>
                          <div>
                            <dt>MOV</dt>
                            <dd>{definition?.moveCost ?? "—"}</dd>
                          </div>
                        </dl>
                      </div>
                    </article>
                  );
                })}
              </div>
              <dl className="loading-totals">
                <div>
                  <dt>
                    PARTY HP<small>合計体力</small>
                  </dt>
                  <dd>{team.reduce((sum, c) => sum + c.maxHP, 0)}</dd>
                </div>
                <div>
                  <dt>
                    PARTY MOV<small>合計移動コスト</small>
                  </dt>
                  <dd>
                    {team.every((c) =>
                      definitions.some((d) => d.id === c.definitionId),
                    )
                      ? team.reduce(
                          (sum, c) =>
                            sum +
                            definitions.find((d) => d.id === c.definitionId)!
                              .moveCost,
                          0,
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          );
        })}
        <span className="loading-versus" aria-hidden="true">
          VS
        </span>
        <div className="loading-status" role="status">
          {error ? (
            <>
              <p className="error">{error}</p>
              <button className="primary" disabled={busy} onClick={onPrepared}>
                再試行
              </button>
            </>
          ) : (
            <p>
              {prepared
                ? "対戦相手の準備を待っています…"
                : "対戦を準備しています…"}
            </p>
          )}
        </div>
      </section>
    </Frame>
  );
}
