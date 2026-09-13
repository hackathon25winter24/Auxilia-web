import type { FormEventHandler } from "react";
import { AudioSettings } from "@/components/audio-settings";

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
    <main className="title-screen">
      <img
        className="title-background"
        src={`${basePath}/UI/title.png`}
        alt=""
        width={2560}
        height={1440}
        fetchPriority="high"
      />
      <div className="title-audio brand-tools">
        <AudioSettings />
      </div>
      <h1 className="title-logo">
        <img
          src={`${basePath}/UI/Title_logo.png`}
          alt="Auxilia アウクシリア"
          width={1230}
          height={1110}
          fetchPriority="high"
        />
      </h1>
      <form onSubmit={onJoin} className="title-entry">
        <label htmlFor="player-name">プレイヤー名</label>
        <div className="join-row">
          <input
            id="player-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            maxLength={20}
            placeholder="名前を入力"
            autoComplete="nickname"
            aria-describedby="player-name-help"
          />
          <button data-se="titleEntrance" disabled={busy}>
            {busy ? "接続中…" : "エントランスへ"}
          </button>
        </div>
        <small id="player-name-help">1〜20文字で入力してください</small>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
