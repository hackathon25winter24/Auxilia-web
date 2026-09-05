import type { ReactNode } from "react";

import { AudioSettings } from "@/components/audio-settings";

type FrameProps = {
  step: string;
  headerAction?: ReactNode;
  children: ReactNode;
};

export function Frame({ step, headerAction, children }: FrameProps) {
  return (
    <main className={`app ${step === "ENTRANCE" ? "entrance-frame" : ""}`}>
      <header className="brand">
        <b>AUXILIA</b>
        <span>Ver.1.0</span>
        <div className="brand-tools">
          <i>{step}</i>
          {headerAction}
          <AudioSettings />
        </div>
      </header>
      {children}
    </main>
  );
}
