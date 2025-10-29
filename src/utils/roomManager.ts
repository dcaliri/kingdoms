import { Room, RoomPlayer, PlayerSession } from '@/types/room';

// Use localStorage for cross-browser sharing (simple solution for testing)
const ROOMS_KEY = 'kingdoms_rooms';
const SESSIONS_KEY = 'kingdoms_sessions';

const getRooms = (): Map<string, Room> => {
  try {
    const stored = localStorage.getItem(ROOMS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const rooms = new Map<string, Room>();
      Object.entries(data).forEach(([key, value]) => {
        rooms.set(key, value as Room);
      });
      return rooms;
    }
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
  return new Map<string, Room>();
};

const saveRooms = (rooms: Map<string, Room>) => {
  try {
    const data = Object.fromEntries(rooms);
    localStorage.setItem(ROOMS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving rooms:', error);
  }
};

const getSessions = (): Map<string, PlayerSession> => {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const sessions = new Map<string, PlayerSession>();
      Object.entries(data).forEach(([key, value]) => {
        sessions.set(key, value as PlayerSession);
      });
      return sessions;
    }
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
  return new Map<string, PlayerSession>();
};

const saveSessions = (sessions: Map<string, PlayerSession>) => {
  try {
    const data = Object.fromEntries(sessions);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
};

export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const generatePlayerId = (): string => {
  return `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const createRoom = (hostName: string): { room: Room; playerId: string } => {
  const rooms = getRooms();
  const sessions = getSessions();
  
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
  sessions.set(playerId, session);
  
  saveRooms(rooms);
  saveSessions(sessions);

  return { room, playerId };
};

export const joinRoom = (roomCode: string, playerName: string): { room: Room; playerId: string } | null => {
  const rooms = getRooms();
  const sessions = getSessions();
  
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

  rooms.set(roomCode.toUpperCase(), room);
  sessions.set(playerId, session);
  
  saveRooms(rooms);
  saveSessions(sessions);

  return { room, playerId };
};

export const getRoom = (roomCode: string): Room | null => {
  const rooms = getRooms();
  return rooms.get(roomCode.toUpperCase()) || null;
};

export const getPlayerSession = (playerId: string): PlayerSession | null => {
  const sessions = getSessions();
  return sessions.get(playerId) || null;
};

export const setPlayerReady = (playerId: string, isReady: boolean): Room | null => {
  const rooms = getRooms();
  const sessions = getSessions();
  
  const session = sessions.get(playerId);
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

  rooms.set(session.roomCode, room);
  saveRooms(rooms);

  return room;
};

export const startGame = (hostId: string): Room | null => {
  const rooms = getRooms();
  const sessions = getSessions();
  
  const session = sessions.get(hostId);
  if (!session || !session.isHost || !session.roomCode) return null;

  const room = rooms.get(session.roomCode);
  if (!room || room.status !== 'ready') return null;

  // Assign colors to players
  const colors: ('red' | 'blue' | 'yellow' | 'green')[] = ['red', 'blue', 'yellow', 'green'];
  room.players.forEach((player, index) => {
    player.color = colors[index];
  });

  room.status = 'playing';
  
  rooms.set(session.roomCode, room);
  saveRooms(rooms);
  
  return room;
};

export const leaveRoom = (playerId: string): void => {
  const rooms = getRooms();
  const sessions = getSessions();
  
  const session = sessions.get(playerId);
  if (!session || !session.roomCode) return;

  const room = rooms.get(session.roomCode);
  if (!room) return;

  // Remove player from room
  room.players = room.players.filter(p => p.id !== playerId);

  // If host left, make another player host
  if (session.isHost && room.players.length > 0) {
    room.players[0].isHost = true;
    room.hostId = room.players[0].id;
    const newHostSession = sessions.get(room.players[0].id);
    if (newHostSession) {
      newHostSession.isHost = true;
      sessions.set(room.players[0].id, newHostSession);
    }
  }

  // Delete room if empty
  if (room.players.length === 0) {
    rooms.delete(session.roomCode);
  } else {
    rooms.set(session.roomCode, room);
  }

  sessions.delete(playerId);
  
  saveRooms(rooms);
  saveSessions(sessions);
};

// Clean up old rooms (optional - call this periodically)
export const cleanupOldRooms = (): void => {
  const rooms = getRooms();
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  let hasChanges = false;
  rooms.forEach((room, code) => {
    const roomAge = now.getTime() - new Date(room.createdAt).getTime();
    if (roomAge > maxAge) {
      rooms.delete(code);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    saveRooms(rooms);
  }
};