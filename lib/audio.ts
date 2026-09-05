const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const BGM_VOLUME_KEY = "auxilia-bgm-volume";
const SE_VOLUME_KEY = "auxilia-se-volume";

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value));
}

function savedVolume(key: string, fallback: number) {
  if (typeof localStorage === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  const saved = Number(stored);
  return Number.isFinite(saved) ? clampVolume(saved) : fallback;
}

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
  private volume = 0.35;
  private volumeLoaded = false;

  getVolume() {
    this.loadVolume();
    return this.volume;
  }

  setVolume(volume: number) {
    this.volume = clampVolume(volume);
    this.volumeLoaded = true;
    if (this.audio) this.audio.volume = this.volume;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(BGM_VOLUME_KEY, String(this.volume));
    }
  }

  private loadVolume() {
    if (this.volumeLoaded) return;
    this.volume = savedVolume(BGM_VOLUME_KEY, this.volume);
    this.volumeLoaded = true;
  }

  play(name: BGMName) {
    if (typeof Audio === "undefined") return;
    this.loadVolume();
    if (this.current !== name) {
      this.audio?.pause();
      this.audio = new Audio(`${BASE}${BGM_PATHS[name]}`);
      this.audio.loop = true;
      this.audio.volume = this.volume;
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
  private volume = 0.6;
  private volumeLoaded = false;

  getVolume() {
    this.loadVolume();
    return this.volume;
  }

  setVolume(volume: number) {
    this.volume = clampVolume(volume);
    this.volumeLoaded = true;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SE_VOLUME_KEY, String(this.volume));
    }
  }

  private loadVolume() {
    if (this.volumeLoaded) return;
    this.volume = savedVolume(SE_VOLUME_KEY, this.volume);
    this.volumeLoaded = true;
  }

  play(name: SEName) {
    if (typeof Audio === "undefined") return;
    this.loadVolume();
    const audio = new Audio(`${BASE}${SE_PATHS[name]}`);
    audio.volume = this.volume;
    void audio.play().catch(() => {});
  }
}

export const BGMManager = new BGMController();
export const SEManager = new SEController();
