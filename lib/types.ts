export type Guest = {
  id: string;
  name: string;
  token?: string;
  selection: string[];
  matchId?: string;
  queued: boolean;
};

export type Position = { x: number; y: number };

export type Attack = {
  name: string;
  cost: number;
  power: number;
  range: number;
  target: string;
  pattern: Position[];
  effect?: string;
  effectChance?: number;
  tile?: string;
  clearDebuffs?: boolean;
};

export type Definition = {
  id: string;
  name: string;
  image: string;
  portrait: string;
  maxHP: number;
  moveCost: number;
  moveRange: number;
  passiveName: string;
  passiveDescription: string;
  attacks: Attack[];
  usageCount: number;
  totalPickCount: number;
};

export type Fighter = {
  id: string;
  definitionId: string;
  ownerId: string;
  name: string;
  hp: number;
  maxHP: number;
  position: Position;
  effects: string[];
};

export type BaseState = {
  ownerId: string;
  hp: number;
  maxHP: number;
  position: Position;
};

export type TileEffect = {
  position: Position;
  type: string;
  ownerId: string;
};

export type Player = { id: string; name: string; cost: number };

export type GameEvent = { sequence: number; type: string; text: string };

export type Match = {
  matchId: string;
  revision: number;
  started: boolean;
  readyPlayerIds: string[];
  players: [Player, Player];
  bases: [BaseState, BaseState];
  characters: Fighter[];
  tileEffects: TileEffect[];
  blockedCells: Position[];
  turnPlayerId: string;
  turn: number;
  phase: "waiting" | "action" | "turn_end";
  phaseDeadline?: string;
  turnDeadline: string;
  serverTime: string;
  winnerId?: string;
  finished: boolean;
  lastEvent: GameEvent;
  events: GameEvent[];
};
