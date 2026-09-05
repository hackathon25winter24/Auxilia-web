import type { FormEventHandler } from "react";

import { Frame } from "@/components/frame";

type TitleSceneProps = {
  name: string;
  busy: boolean;
  error: string;
  basePath: string;
  onNameChange: (name: string) => void;
  onJoin: FormEventHandler<HTMLFormElement>;
};

export function TitleScene({
  name,
  busy,
  error,
  basePath,
  onNameChange,
  onJoin,
}: TitleSceneProps) {
  return (
    <Frame step="GUEST ENTRY">
      <section className="welcome title-copy">
        <p className="eyebrow">TACTICAL ONLINE BATTLE</p>
        <h1>Auxilia</h1>
        <form onSubmit={onJoin} className="join-card">
          <label htmlFor="player-name">プレイヤー名</label>
          <div className="join-row">
            <input
              id="player-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              maxLength={20}
              placeholder="名前を入力"
              autoComplete="nickname"
            />
            <button disabled={busy}>エントランスへ</button>
          </div>
          <small>1〜20文字で入力してください</small>
        </form>
        {error && <p className="error">{error}</p>}
      </section>
      <aside className="title-visual">
        <img src={`${basePath}/title.png`} alt="Auxiliaのキャラクターたち" />
      </aside>
    </Frame>
  );
}
