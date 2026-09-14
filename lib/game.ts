import type { Definition, Fighter } from "./types";

export function definitionForFighter(
  definitions: Definition[],
  fighter?: Fighter,
) {
  const definition = definitions.find((d) => d.id === fighter?.definitionId);
  return definition &&
    (fighter?.wriggling || fighter?.combatStance) &&
    definition.alternateAttacks
    ? { ...definition, attacks: definition.alternateAttacks }
    : definition;
}

export const EFFECT_DESCRIPTIONS: Record<string, string> = {
  二日酔い:
    "攻撃力が20%低下し、移動・攻撃コストがそれぞれ5増加する。自分のターン終了時に解除される。",
  免疫: "一度だけデバフの付与を無効にする。",
  結界: "付与した次の手番に、結界を持つ本人への敵の攻撃だけを一度無効化する。他の味方だけへの攻撃では消費しない。その手番終了後に消える。",
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
