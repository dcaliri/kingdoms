export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green';

export interface Castle {
  id: string;
  rank: 1 | 2 | 3 | 4;
  color: PlayerColor;
  position?: { row: number; col: number };
}

export interface Tile {
  id: string;
  type: 'resource' | 'hazard' | 'mountain' | 'dragon' | 'goldmine' | 'wizard';
  value: number;
  name: string;
  position?: { row: number; col: number };
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  gold: number;
  castles: Castle[];
  startingTile?: Tile;
}

export interface LogEntry {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: PlayerColor;
  action: string;
  timestamp: number;
  epoch: number;
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  epoch: 1 | 2 | 3;
  board: (Castle | Tile | null)[][];
  tileSupply: Tile[];
  gamePhase: 'setup' | 'playing' | 'scoring' | 'finished';
  winner?: Player;
  scores: { [playerId: string]: number[] }; // scores per epoch
  gameLog: LogEntry[]; // Add game log to track all actions
}

export interface GameAction {
  type: 'PLACE_CASTLE' | 'DRAW_AND_PLACE_TILE' | 'PLACE_STARTING_TILE' | 'PASS';
  playerId: string;
  castle?: Castle;
  tile?: Tile;
  position?: { row: number; col: number };
}