export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'ready' | 'playing' | 'finished';
  createdAt: Date;
}

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  color?: 'red' | 'blue' | 'yellow' | 'green';
}

export interface PlayerSession {
  playerId: string;
  playerName: string;
  roomCode?: string;
  isHost: boolean;
}