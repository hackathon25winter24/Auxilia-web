const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type BGMName = "menu" | "battle";
export type SEName =
  | "menuClick"
  | "titleEntrance"
  | "startBattle"
  | "battleClick"
  | "battleCancel"
  | "damage"
  | "recovery"
  | "endTurn"
  | "startTurn"
  | "victory";

const BGM_PATHS: Record<BGMName, string> = {
  menu: "/sound/BGM/menu.mp3",
  battle: "/sound/BGM/battle.mp3",
};

const SE_PATHS: Record<SEName, string> = {
  menuClick: "/sound/SE/menu/Click.mp3",
  titleEntrance: "/sound/SE/menu/Button_title-entrance.mp3",
  startBattle: "/sound/SE/menu/Button_StartBattle.mp3",
  battleClick: "/sound/SE/battle/Click.mp3",
  battleCancel: "/sound/SE/battle/Button_Cancel.mp3",
  damage: "/sound/SE/battle/DamageSound.mp3",
  recovery: "/sound/SE/battle/Recovery.mp3",
  endTurn: "/sound/SE/battle/EndTurn.mp3",
  startTurn: "/sound/SE/battle/StartTurn.mp3",
  victory: "/sound/SE/battle/Victory.mp3",
};

class BGMController {
  private audio?: HTMLAudioElement;
  private current?: BGMName;

  play(name: BGMName) {
    if (typeof Audio === "undefined") return;
    if (this.current !== name) {
      this.audio?.pause();
      this.audio = new Audio(`${BASE}${BGM_PATHS[name]}`);
      this.audio.loop = true;
      this.audio.volume = 0.35;
      this.current = name;
    }
    void this.audio?.play().catch(() => {
      // Browsers may block BGM until the first user interaction.
    });
  }

  resume() {
    void this.audio?.play().catch(() => {});
  }

  stop() {
    this.audio?.pause();
    this.audio = undefined;
    this.current = undefined;
  }
}

class SEController {
  play(name: SEName) {
    if (typeof Audio === "undefined") return;
    const audio = new Audio(`${BASE}${SE_PATHS[name]}`);
    audio.volume = 0.6;
    void audio.play().catch(() => {});
  }
}

export const BGMManager = new BGMController();
export const SEManager = new SEController();
