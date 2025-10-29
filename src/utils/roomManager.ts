import { Room, RoomPlayer, PlayerSession } from '@/types/room';

// Simple in-memory storage (in a real app, this would be a database)
const rooms = new Map<string, Room>();
const playerSessions = new Map<string, PlayerSession>();

export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const generatePlayerId = (): string => {
  return `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const createRoom = (hostName: string): { room: Room; playerId: string } => {
  const roomCode = generateRoomCode();
  const playerId = generatePlayerId();
  
  const room: Room = {
    id: `room-${Date.now()}`,
    code: roomCode,
    hostId: playerId,
    players: [{
      id: playerId,
      name: hostName,
      isHost: true,
      isReady: false
    }],
    maxPlayers: 4,
    status: 'waiting',
    createdAt: new Date()
  };

  const session: PlayerSession = {
    playerId,
    playerName: hostName,
    roomCode,
    isHost: true
  };

  rooms.set(roomCode, room);
  playerSessions.set(playerId, session);

  return { room, playerId };
};

export const joinRoom = (roomCode: string, playerName: string): { room: Room; playerId: string } | null => {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.players.length >= room.maxPlayers) {
    throw new Error('Room is full');
  }

  if (room.status !== 'waiting') {
    throw new Error('Game already started');
  }

  // Check if name is already taken
  if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
    throw new Error('Player name already taken');
  }

  const playerId = generatePlayerId();
  const newPlayer: RoomPlayer = {
    id: playerId,
    name: playerName,
    isHost: false,
    isReady: false
  };

  room.players.push(newPlayer);

  const session: PlayerSession = {
    playerId,
    playerName,
    roomCode: room.code,
    isHost: false
  };

  playerSessions.set(playerId, session);

  return { room, playerId };
};

export const getRoom = (roomCode: string): Room | null => {
  return rooms.get(roomCode.toUpperCase()) || null;
};

export const getPlayerSession = (playerId: string): PlayerSession | null => {
  return playerSessions.get(playerId) || null;
};

export const setPlayerReady = (playerId: string, isReady: boolean): Room | null => {
  const session = playerSessions.get(playerId);
  if (!session || !session.roomCode) return null;

  const room = rooms.get(session.roomCode);
  if (!room) return null;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;

  player.isReady = isReady;

  // Check if all players are ready
  const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);
  if (allReady) {
    room.status = 'ready';
  } else {
    room.status = 'waiting';
  }

  return room;
};

export const startGame = (hostId: string): Room | null => {
  const session = playerSessions.get(hostId);
  if (!session || !session.isHost || !session.roomCode) return null;

  const room = rooms.get(session.roomCode);
  if (!room || room.status !== 'ready') return null;

  // Assign colors to players
  const colors: ('red' | 'blue' | 'yellow' | 'green')[] = ['red', 'blue', 'yellow', 'green'];
  room.players.forEach((player, index) => {
    player.color = colors[index];
  });

  room.status = 'playing';
  return room;
};

export const leaveRoom = (playerId: string): void => {
  const session = playerSessions.get(playerId);
  if (!session || !session.roomCode) return;

  const room = rooms.get(session.roomCode);
  if (!room) return;

  // Remove player from room
  room.players = room.players.filter(p => p.id !== playerId);

  // If host left, make another player host
  if (session.isHost && room.players.length > 0) {
    room.players[0].isHost = true;
    room.hostId = room.players[0].id;
    const newHostSession = playerSessions.get(room.players[0].id);
    if (newHostSession) {
      newHostSession.isHost = true;
    }
  }

  // Delete room if empty
  if (room.players.length === 0) {
    rooms.delete(session.roomCode);
  }

  playerSessions.delete(playerId);
};