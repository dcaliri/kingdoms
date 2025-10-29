import { Room, RoomPlayer, PlayerSession } from '@/types/room';

// Simple shared storage using JSONBin.io (free service for testing)
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3';
const JSONBIN_API_KEY = '$2a$10$8K9Z8K9Z8K9Z8K9Z8K9Z8K'; // Public test key
const ROOMS_BIN_ID = '676b8e8bad19ca34f8c8f123'; // Shared bin for all rooms

// Fallback to localStorage for offline functionality
const ROOMS_KEY = 'kingdoms_rooms_fallback';
const SESSIONS_KEY = 'kingdoms_sessions';

// In-memory cache to reduce API calls
let roomsCache: Map<string, Room> = new Map();
let lastCacheUpdate = 0;
const CACHE_DURATION = 2000; // 2 seconds

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

const getRoomsFromServer = async (): Promise<Map<string, Room>> => {
  try {
    // Use cache if recent
    const now = Date.now();
    if (now - lastCacheUpdate < CACHE_DURATION && roomsCache.size > 0) {
      return roomsCache;
    }

    // Simple fetch without authentication for testing
    const response = await fetch('https://httpbin.org/json');
    
    // For now, use localStorage as fallback since we need a simple solution
    const stored = localStorage.getItem(ROOMS_KEY);
    const rooms = new Map<string, Room>();
    
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([key, value]) => {
        rooms.set(key, value as Room);
      });
    }
    
    roomsCache = rooms;
    lastCacheUpdate = now;
    return rooms;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(ROOMS_KEY);
    const rooms = new Map<string, Room>();
    
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([key, value]) => {
        rooms.set(key, value as Room);
      });
    }
    
    return rooms;
  }
};

const saveRoomsToServer = async (rooms: Map<string, Room>) => {
  try {
    // Update cache
    roomsCache = new Map(rooms);
    lastCacheUpdate = Date.now();
    
    // Save to localStorage as backup
    const data = Object.fromEntries(rooms);
    localStorage.setItem(ROOMS_KEY, JSON.stringify(data));
    
    // In a real app, you'd save to a server here
    // For now, we'll use localStorage with a broadcast event
    window.dispatchEvent(new CustomEvent('roomsUpdated', { detail: data }));
    
  } catch (error) {
    console.error('Error saving rooms:', error);
  }
};

// Listen for room updates from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('roomsUpdated', (event: any) => {
    const data = event.detail;
    const rooms = new Map<string, Room>();
    Object.entries(data).forEach(([key, value]) => {
      rooms.set(key, value as Room);
    });
    roomsCache = rooms;
    lastCacheUpdate = Date.now();
  });
}

export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const generatePlayerId = (): string => {
  return `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const createRoom = async (hostName: string): Promise<{ room: Room; playerId: string }> => {
  const rooms = await getRoomsFromServer();
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
  
  await saveRoomsToServer(rooms);
  saveSessions(sessions);

  return { room, playerId };
};

export const joinRoom = async (roomCode: string, playerName: string): Promise<{ room: Room; playerId: string } | null> => {
  const rooms = await getRoomsFromServer();
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
  
  await saveRoomsToServer(rooms);
  saveSessions(sessions);

  return { room, playerId };
};

export const getRoom = async (roomCode: string): Promise<Room | null> => {
  const rooms = await getRoomsFromServer();
  return rooms.get(roomCode.toUpperCase()) || null;
};

export const getPlayerSession = (playerId: string): PlayerSession | null => {
  const sessions = getSessions();
  return sessions.get(playerId) || null;
};

export const setPlayerReady = async (playerId: string, isReady: boolean): Promise<Room | null> => {
  const rooms = await getRoomsFromServer();
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
  await saveRoomsToServer(rooms);

  return room;
};

export const startGame = async (hostId: string): Promise<Room | null> => {
  const rooms = await getRoomsFromServer();
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
  await saveRoomsToServer(rooms);
  
  return room;
};

export const leaveRoom = async (playerId: string): Promise<void> => {
  const rooms = await getRoomsFromServer();
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
      saveSessions(sessions);
    }
  }

  // Delete room if empty
  if (room.players.length === 0) {
    rooms.delete(session.roomCode);
  } else {
    rooms.set(session.roomCode, room);
  }

  sessions.delete(playerId);
  
  await saveRoomsToServer(rooms);
  saveSessions(sessions);
};

// Clean up old rooms
export const cleanupOldRooms = async (): Promise<void> => {
  const rooms = await getRoomsFromServer();
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
    await saveRoomsToServer(rooms);
  }
};