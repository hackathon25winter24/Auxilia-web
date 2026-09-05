import type { ReactNode } from "react";

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
        <span>Battle Prototype</span>
        <i>{step}</i>
        {headerAction}
      </header>
      {children}
    </main>
  );
}
