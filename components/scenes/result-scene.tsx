import { Frame } from "@/components/frame";
import { CharacterImage } from "@/components/character-image";
import type { Definition, Match } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type ResultSceneProps = {
  match: Match;
  definitions: Definition[];
  isWinner: boolean;
  busy: boolean;
  error: string;
  onReturn: () => void;
};

export function ResultScene({
  match,
  definitions,
  isWinner,
  busy,
  error,
  onReturn,
}: ResultSceneProps) {
  const winner = match.players.find((p) => p.id === match.winnerId);
  const loser = match.players.find((p) => p.id !== match.winnerId);
  const winningTeam = match.characters.filter((c) => c.ownerId === winner?.id);
  const losingTeam = match.characters.filter((c) => c.ownerId === loser?.id);
  const portrait = (id: string) => {
    const d = definitions.find((d) => d.id === id);
    return d ? `${BASE}/characters/${d.portrait}` : undefined;
  };
  return (
    <Frame step="RESULT">
      <section className="result-layout" aria-label="対戦結果">
        <section
          className="result-winners"
          aria-label="勝利プレイヤーのパーティー"
        >
          <div className="result-winning-team">
            {winningTeam.map((c) => (
              <figure key={c.id}>
                <CharacterImage
                  src={portrait(c.definitionId)}
                  alt={c.name}
                  width={2048}
                  height={2048}
                />
                <figcaption>{c.name}</figcaption>
              </figure>
            ))}
          </div>
          <div className={`result-outcome ${isWinner ? "victory" : "lose"}`}>
            <h1>{isWinner ? "Victory" : "Lose"}</h1>
            <p>{winner?.name ?? "—"} の勝利</p>
          </div>
        </section>
        <aside className="result-sidebar">
          <section
            className="result-losers"
            aria-label="敗北プレイヤーのパーティー"
          >
            <p className="eyebrow">RESULT</p>
            <h2>{loser?.name}</h2>
            <div className="result-losing-team">
              {losingTeam.map((c) => (
                <figure key={c.id}>
                  <CharacterImage
                    src={portrait(c.definitionId)}
                    alt={c.name}
                    width={2048}
                    height={2048}
                  />
                  <figcaption>{c.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
          <div className="result-return">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy} onClick={onReturn}>
              {busy ? "戻っています…" : "エントランスへ戻る"}
            </button>
          </div>
        </aside>
      </section>
    </Frame>
  );
}
