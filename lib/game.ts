export const EFFECT_DESCRIPTIONS: Record<string, string> = {
  威力上昇: "攻撃ダメージが25%上昇する。",
  俊足: "移動コストが2下がる。",
  俊敏化: "攻撃コストが2下がる。",
  毒: "自分のターン終了時に40ダメージを受ける。",
  麻痺: "行動できない。自分のターン終了時に解除される。",
  鈍足: "移動コストが2上がる。",
  鈍化: "攻撃コストが2上がる。",
  出血: "攻撃ダメージが25%低下する。",
};

export const KEY_DIRECTIONS: Record<string, [number, number]> = {
  arrowup: [0, 1],
  arrowdown: [0, -1],
  arrowleft: [-1, 0],
  arrowright: [1, 0],
  w: [0, 1],
  s: [0, -1],
  a: [-1, 0],
  d: [1, 0],
};
