import { Frame } from "@/components/frame";

type ResultSceneProps = {
  winnerName?: string;
  isWinner: boolean;
  turn: number;
  revision: number;
  busy: boolean;
  error: string;
  onReturn: () => void;
};

export function ResultScene({
  winnerName,
  isWinner,
  turn,
  revision,
  busy,
  error,
  onReturn,
}: ResultSceneProps) {
  return (
    <Frame step="RESULT">
      <section className="result">
        <p className="eyebrow">MATCH COMPLETE</p>
        <div className="result-mark">{isWinner ? "WIN" : "LOSE"}</div>
        <h1>{winnerName} の勝利</h1>
        <p>
          {turn}ターン・最終リビジョン {revision}
        </p>
        <button className="primary" disabled={busy} onClick={onReturn}>
          {busy ? "戻っています…" : "エントランスへ戻る"}
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </Frame>
  );
}
