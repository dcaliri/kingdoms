import { Room, RoomPlayer, PlayerSession } from '@/types/room';

// Use localStorage with detailed logging
const ROOMS_KEY = 'kingdoms_rooms';
const SESSIONS_KEY = 'kingdoms_sessions';

// Add detailed logging
const log = (message: string, data?: any) => {
  console.log(`[RoomManager] ${message}`, data || '');
};

const logError = (message: string, error?: any) => {
  console.error(`[RoomManager ERROR] ${message}`, error || '');
};

const getRooms = (): Map<string, Room> => {
  try {
    log('Getting rooms from localStorage...');
    const stored = localStorage.getItem(ROOMS_KEY);
    log('Raw localStorage data:', stored);
    
    if (stored) {
      const data = JSON.parse(stored);
      log('Parsed room data:', data);
      
      const rooms = new Map<string, Room>();
      Object.entries(data).forEach(([key, value]) => {
        rooms.set(key, value as Room);
      });
      
      log(`Loaded ${rooms.size} rooms:`, Array.from(rooms.keys()));
      return rooms;
    } else {
      log('No rooms found in localStorage');
    }
  } catch (error) {
    logError('Error loading rooms:', error);
  }
  return new Map<string, Room>();
};

const saveRooms = (rooms: Map<string, Room>) => {
  try {
    const data = Object.fromEntries(rooms);
    log('Saving rooms to localStorage:', data);
    
    localStorage.setItem(ROOMS_KEY, JSON.stringify(data));
    
    // Broadcast to other tabs/windows
    log('Broadcasting room update to other tabs...');
    window.dispatchEvent(new CustomEvent('roomsUpdated', { 
      detail: { rooms: data, timestamp: Date.now() }
    }));
    
    log('Rooms saved successfully');
  } catch (error) {
    logError('Error saving rooms:', error);
  }
};

const getSessions = (): Map<string, PlayerSession> => {
  try {
    log('Getting sessions from localStorage...');
    const stored = localStorage.getItem(SESSIONS_KEY);
    
    if (stored) {
      const data = JSON.parse(stored);
      const sessions = new Map<string, PlayerSession>();
      Object.entries(data).forEach(([key, value]) => {
        sessions.set(key, value as PlayerSession);
      });
      log(`Loaded ${sessions.size} sessions`);
      return sessions;
    }
  } catch (error) {
    logError('Error loading sessions:', error);
  }
  return new Map<string, PlayerSession>();
};

const saveSessions = (sessions: Map<string, PlayerSession>) => {
  try {
    const data = Object.fromEntries(sessions);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(data));
    log('Sessions saved successfully');
  } catch (error) {
    logError('Error saving sessions:', error);
  }
};

// Listen for room updates from other tabs
if (typeof window !== 'undefined') {
  log('Setting up cross-tab communication listener...');
  
  window.addEventListener('roomsUpdated', (event: any) => {
    log('Received room update from another tab:', event.detail);
  });
  
  // Also listen for storage events (more reliable cross-tab communication)
  window.addEventListener('storage', (event) => {
    if (event.key === ROOMS_KEY) {
      log('Storage event detected for rooms:', event.newValue);
    }
  });
}

export const generateRoomCode = (): string => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  log('Generated room code:', code);
  return code;
};

export const generatePlayerId = (): string => {
  const id = `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  log('Generated player ID:', id);
  return id;
};

export const createRoom = (hostName: string): { room: Room; playerId: string } => {
  log('Creating room for host:', hostName);
  
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

  log('Created room object:', room);
  log('Created session object:', session);

  rooms.set(roomCode, room);
  sessions.set(playerId, session);
  
  saveRooms(rooms);
  saveSessions(sessions);

  log('Room created successfully with code:', roomCode);
  return { room, playerId };
};

export const joinRoom = (roomCode: string, playerName: string): { room: Room; playerId: string } => {
  log('Attempting to join room:', { roomCode, playerName });
  
  const rooms = getRooms();
  const sessions = getSessions();
  
  log('Available rooms:', Array.from(rooms.keys()));
  
  const room = rooms.get(roomCode.toUpperCase());
  log('Found room for code', roomCode.toUpperCase(), ':', room);
  
  if (!room) {
    logError('Room not found for code:', roomCode.toUpperCase());
    logError('Available room codes:', Array.from(rooms.keys()));
    throw new Error('Room not found');
  }

  if (room.players.length >= room.maxPlayers) {
    logError('Room is full:', room.players.length, '/', room.maxPlayers);
    throw new Error('Room is full');
  }

  if (room.status !== 'waiting') {
    logError('Game already started, room status:', room.status);
    throw new Error('Game already started');
  }

  // Check if name is already taken
  const existingNames = room.players.map(p => p.name.toLowerCase());
  log('Existing player names:', existingNames);
  
  if (existingNames.includes(playerName.toLowerCase())) {
    logError('Player name already taken:', playerName);
    throw new Error('Player name already taken');
  }

  const playerId = generatePlayerId();
  const newPlayer: RoomPlayer = {
    id: playerId,
    name: playerName,
    isHost: false,
    isReady: false
  };

  log('Adding new player:', newPlayer);
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

  log('Successfully joined room:', roomCode);
  return { room, playerId };
};

export const getRoom = (roomCode: string): Room | null => {
  log('Getting room for code:', roomCode);
  const rooms = getRooms();
  const room = rooms.get(roomCode.toUpperCase()) || null;
  log('Retrieved room:', room);
  return room;
};

export const getPlayerSession = (playerId: string): PlayerSession | null => {
  log('Getting session for player:', playerId);
  const sessions = getSessions();
  const session = sessions.get(playerId) || null;
  log('Retrieved session:', session);
  return session;
};

export const setPlayerReady = (playerId: string, isReady: boolean): Room | null => {
  log('Setting player ready status:', { playerId, isReady });
  
  const rooms = getRooms();
  const sessions = getSessions();
  
  const session = sessions.get(playerId);
  if (!session || !session.roomCode) {
    logError('No session found for player:', playerId);
    return null;
  }

  const room = rooms.get(session.roomCode);
  if (!room) {
    logError('No room found for code:', session.roomCode);
    return null;
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player) {
    logError('Player not found in room:', playerId);
    return null;
  }

  player.isReady = isReady;
  log('Updated player ready status:', player);

  // Check if all players are ready
  const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);
  log('All players ready check:', { playerCount: room.players.length, allReady });
  
  if (allReady) {
    room.status = 'ready';
  } else {
    room.status = 'waiting';
  }

  rooms.set(session.roomCode, room);
  saveRooms(rooms);

  log('Room status updated:', room.status);
  return room;
};

export const startGame = (hostId: string): Room | null => {
  log('Starting game for host:', hostId);
  
  const rooms = getRooms();
  const sessions = getSessions();
  
  const session = sessions.get(hostId);
  if (!session || !session.isHost || !session.roomCode) {
    logError('Invalid host session:', session);
    return null;
  }

  const room = rooms.get(session.roomCode);
  if (!room || room.status !== 'ready') {
    logError('Cannot start game, room status:', room?.status);
    return null;
  }

  // Assign colors to players
  const colors: ('red' | 'blue' | 'yellow' | 'green')[] = ['red', 'blue', 'yellow', 'green'];
  room.players.forEach((player, index) => {
    player.color = colors[index];
  });

  room.status = 'playing';
  log('Game started, room status:', room.status);
  
  rooms.set(session.roomCode, room);
  saveRooms(rooms);
  
  return room;
};

export const leaveRoom = (playerId: string): void => {
  log('Player leaving room:', playerId);
  
  const rooms = getRooms();
  const sessions = getSessions();
  
  const session = sessions.get(playerId);
  if (!session || !session.roomCode) {
    logError('No session found for leaving player:', playerId);
    return;
  }

  const room = rooms.get(session.roomCode);
  if (!room) {
    logError('No room found for leaving player:', session.roomCode);
    return;
  }

  // Remove player from room
  const originalPlayerCount = room.players.length;
  room.players = room.players.filter(p => p.id !== playerId);
  log('Removed player from room:', { originalCount: originalPlayerCount, newCount: room.players.length });

  // If host left, make another player host
  if (session.isHost && room.players.length > 0) {
    room.players[0].isHost = true;
    room.hostId = room.players[0].id;
    const newHostSession = sessions.get(room.players[0].id);
    if (newHostSession) {
      newHostSession.isHost = true;
      sessions.set(room.players[0].id, newHostSession);
    }
    log('Transferred host to:', room.players[0].name);
  }

  // Delete room if empty
  if (room.players.length === 0) {
    rooms.delete(session.roomCode);
    log('Deleted empty room:', session.roomCode);
  } else {
    rooms.set(session.roomCode, room);
    log('Updated room after player left');
  }

  sessions.delete(playerId);
  
  saveRooms(rooms);
  saveSessions(sessions);
  
  log('Player successfully left room');
};

// Clean up old rooms
export const cleanupOldRooms = (): void => {
  log('Cleaning up old rooms...');
  const rooms = getRooms();
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  let hasChanges = false;
  rooms.forEach((room, code) => {
    const roomAge = now.getTime() - new Date(room.createdAt).getTime();
    if (roomAge > maxAge) {
      log('Removing old room:', code);
      rooms.delete(code);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    saveRooms(rooms);
    log('Cleanup completed');
  } else {
    log('No old rooms to clean up');
  }
};