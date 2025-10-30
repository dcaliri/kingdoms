import { supabase } from '@/integrations/supabase/client';
import { Room, RoomPlayer } from '@/types/room';
import { GameState, Player } from '@/types/game';
import { createInitialTiles, createInitialCastles, shuffleArray, BOARD_ROWS, BOARD_COLS } from '@/utils/gameLogic';
import { toast } from 'sonner';

export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const generatePlayerId = (): string => {
  return `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const createRoom = async (hostName: string): Promise<{ room: Room; playerId: string }> => {
  const roomCode = generateRoomCode();
  const playerId = generatePlayerId();
  
  try {
    // Create room
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code: roomCode,
        host_id: playerId,
        status: 'waiting',
        max_players: 4
      })
      .select()
      .single();

    if (roomError) throw roomError;

    // Add host as player
    const { error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: roomData.id,
        player_id: playerId,
        player_name: hostName,
        is_host: true,
        is_ready: false
      });

    if (playerError) throw playerError;

    const room: Room = {
      id: roomData.id,
      code: roomData.code,
      hostId: roomData.host_id,
      players: [{
        id: playerId,
        name: hostName,
        isHost: true,
        isReady: false
      }],
      maxPlayers: roomData.max_players,
      status: roomData.status as 'waiting' | 'ready' | 'playing' | 'finished',
      createdAt: new Date(roomData.created_at)
    };

    return { room, playerId };
  } catch (error) {
    console.error('Error creating room:', error);
    throw new Error('Failed to create room');
  }
};

export const joinRoom = async (roomCode: string, playerName: string): Promise<{ room: Room; playerId: string }> => {
  const playerId = generatePlayerId();
  
  try {
    // Find room by code
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) {
      throw new Error('Room not found');
    }

    if (roomData.status !== 'waiting') {
      throw new Error('Game already started');
    }

    // Check current players
    const { data: playersData, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id);

    if (playersError) throw playersError;

    if (playersData.length >= roomData.max_players) {
      throw new Error('Room is full');
    }

    // Check if name is taken
    const existingNames = playersData.map(p => p.player_name.toLowerCase());
    if (existingNames.includes(playerName.toLowerCase())) {
      throw new Error('Player name already taken');
    }

    // Add player to room
    const { error: joinError } = await supabase
      .from('room_players')
      .insert({
        room_id: roomData.id,
        player_id: playerId,
        player_name: playerName,
        is_host: false,
        is_ready: false
      });

    if (joinError) throw joinError;

    // Get updated room data
    const room = await getRoom(roomCode);
    if (!room) throw new Error('Failed to get updated room');

    return { room, playerId };
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
};

export const getRoom = async (roomCode: string): Promise<Room | null> => {
  try {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) return null;

    const { data: playersData, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('created_at', { ascending: true });

    if (playersError) throw playersError;

    const players: RoomPlayer[] = playersData.map(p => ({
      id: p.player_id,
      name: p.player_name,
      isHost: p.is_host,
      isReady: p.is_ready,
      color: p.color as 'red' | 'blue' | 'yellow' | 'green' | undefined
    }));

    return {
      id: roomData.id,
      code: roomData.code,
      hostId: roomData.host_id,
      players,
      maxPlayers: roomData.max_players,
      status: roomData.status as 'waiting' | 'ready' | 'playing' | 'finished',
      createdAt: new Date(roomData.created_at)
    };
  } catch (error) {
    console.error('Error getting room:', error);
    return null;
  }
};

export const setPlayerReady = async (playerId: string, roomCode: string, isReady: boolean): Promise<void> => {
  try {
    console.log('Setting player ready:', { playerId, roomCode, isReady });
    
    // Get room first to get room_id
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) {
      console.error('Room not found:', roomError);
      throw new Error('Room not found');
    }

    console.log('Found room:', roomData);

    // Update player ready status
    const { data: updateData, error: updateError } = await supabase
      .from('room_players')
      .update({ is_ready: isReady })
      .eq('room_id', roomData.id)
      .eq('player_id', playerId)
      .select();

    if (updateError) {
      console.error('Error updating player ready status:', updateError);
      throw updateError;
    }

    console.log('Player ready status updated successfully:', updateData);

    // Get all players to check if all are ready
    const { data: playersData, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id);

    if (playersError) {
      console.error('Error getting players:', playersError);
      throw playersError;
    }

    console.log('Current players after update:', playersData);

    const allReady = playersData.length >= 2 && playersData.every(p => p.is_ready);
    const newStatus = allReady ? 'ready' : 'waiting';

    console.log('All ready check:', { playerCount: playersData.length, allReady, newStatus, currentStatus: roomData.status });

    // Update room status if needed
    if (roomData.status !== newStatus) {
      const { data: statusData, error: statusError } = await supabase
        .from('rooms')
        .update({ status: newStatus })
        .eq('id', roomData.id)
        .select();

      if (statusError) {
        console.error('Error updating room status:', statusError);
        throw statusError;
      }

      console.log('Room status updated to:', newStatus, statusData);
    }
  } catch (error) {
    console.error('Error in setPlayerReady:', error);
    throw error;
  }
};

const createGameStateFromRoom = (room: Room): GameState => {
  console.log('Creating game state from room:', room);
  
  // Create players
  const players: Player[] = room.players.map((roomPlayer) => ({
    id: roomPlayer.id,
    name: roomPlayer.name,
    color: roomPlayer.color!,
    gold: 50,
    castles: createInitialCastles(roomPlayer.color!, room.players.length)
  }));

  // Create and shuffle tiles
  const tiles = shuffleArray(createInitialTiles());
  
  // Give each player a starting tile
  players.forEach(player => {
    if (tiles.length > 0) {
      player.startingTile = tiles.pop();
    }
  });

  const gameState: GameState = {
    id: `game-${Date.now()}`,
    players,
    currentPlayerIndex: 0,
    epoch: 1,
    board: Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)),
    tileSupply: tiles,
    gamePhase: 'playing',
    scores: {}
  };

  console.log('Game state created:', gameState);
  return gameState;
};

export const startGame = async (hostId: string, roomCode: string): Promise<Room | null> => {
  try {
    console.log('=== STARTING GAME ===');
    console.log('Host ID:', hostId);
    console.log('Room Code:', roomCode);
    
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) throw new Error('Room not found');

    if (roomData.host_id !== hostId) {
      throw new Error('Only host can start game');
    }

    if (roomData.status !== 'ready') {
      throw new Error('Not all players are ready');
    }

    // Get current room with players
    const room = await getRoom(roomCode);
    if (!room) throw new Error('Failed to get room data');

    // Assign colors to players if not already assigned
    const { data: playersData, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('created_at', { ascending: true });

    if (playersError) throw playersError;

    const colors: ('red' | 'blue' | 'yellow' | 'green')[] = ['red', 'blue', 'yellow', 'green'];
    
    for (let i = 0; i < playersData.length; i++) {
      if (!playersData[i].color) {
        const { error: colorError } = await supabase
          .from('room_players')
          .update({ color: colors[i] })
          .eq('id', playersData[i].id);

        if (colorError) throw colorError;
      }
    }

    // Update room status to playing
    const { error: statusError } = await supabase
      .from('rooms')
      .update({ status: 'playing' })
      .eq('id', roomData.id);

    if (statusError) throw statusError;

    // Get updated room with colors
    const updatedRoom = await getRoom(roomCode);
    if (!updatedRoom) throw new Error('Failed to get updated room');

    // Create and save game state
    console.log('Creating game state...');
    const gameState = createGameStateFromRoom(updatedRoom);
    
    console.log('Saving game state to database...');
    const { error: gameError } = await supabase
      .from('games')
      .insert({
        room_id: roomData.id,
        game_state: gameState,
        current_player_index: gameState.currentPlayerIndex,
        epoch: gameState.epoch,
        phase: gameState.gamePhase
      });

    if (gameError) {
      console.error('Error saving game state:', gameError);
      throw gameError;
    }

    console.log('Game started successfully!');
    return updatedRoom;
  } catch (error) {
    console.error('Error starting game:', error);
    throw error;
  }
};

export const leaveRoom = async (playerId: string, roomCode: string): Promise<void> => {
  try {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) return;

    // Remove player
    const { error: removeError } = await supabase
      .from('room_players')
      .delete()
      .eq('room_id', roomData.id)
      .eq('player_id', playerId);

    if (removeError) throw removeError;

    // Check remaining players
    const { data: remainingPlayers, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id);

    if (playersError) throw playersError;

    if (remainingPlayers.length === 0) {
      // Delete empty room
      await supabase.from('rooms').delete().eq('id', roomData.id);
    } else if (roomData.host_id === playerId) {
      // Transfer host to first remaining player
      const newHost = remainingPlayers[0];
      await supabase
        .from('rooms')
        .update({ host_id: newHost.player_id })
        .eq('id', roomData.id);
      
      await supabase
        .from('room_players')
        .update({ is_host: true })
        .eq('id', newHost.id);
    }
  } catch (error) {
    console.error('Error leaving room:', error);
    throw error;
  }
};

// Real-time subscription helpers
export const subscribeToRoom = (roomCode: string, callback: (room: Room | null) => void) => {
  console.log('Setting up subscription for room:', roomCode);
  
  // First get the room ID for proper filtering
  let roomId: string | null = null;
  
  const setupSubscription = async () => {
    const room = await getRoom(roomCode);
    if (room) {
      roomId = room.id;
      console.log('Got room ID for subscription:', roomId);
    }
    
    const channel = supabase
      .channel(`room-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${roomCode.toUpperCase()}`
        },
        async (payload) => {
          console.log('Room table change detected:', payload);
          const updatedRoom = await getRoom(roomCode);
          callback(updatedRoom);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players'
        },
        async (payload) => {
          console.log('Room players table change detected:', payload);
          // Check if this change affects our room
          const changeRoomId = payload.new?.room_id || payload.old?.room_id;
          if (changeRoomId === roomId || !roomId) {
            console.log('Change affects our room, updating...');
            const updatedRoom = await getRoom(roomCode);
            if (updatedRoom) {
              callback(updatedRoom);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games'
        },
        async (payload) => {
          console.log('Games table change detected:', payload);
          // Check if this affects our room
          const changeRoomId = payload.new?.room_id || payload.old?.room_id;
          if (changeRoomId === roomId || !roomId) {
            console.log('Game state change affects our room, updating...');
            const updatedRoom = await getRoom(roomCode);
            if (updatedRoom) {
              callback(updatedRoom);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return channel;
  };

  let channel: any = null;
  setupSubscription().then(ch => {
    channel = ch;
  });

  return () => {
    console.log('Unsubscribing from room:', roomCode);
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
};

// Get game state for a room
export const getGameState = async (roomId: string): Promise<GameState | null> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No game state found
      }
      throw error;
    }

    return data.game_state as GameState;
  } catch (error) {
    console.error('Error getting game state:', error);
    return null;
  }
};

// Update game state
export const updateGameState = async (roomId: string, gameState: GameState): Promise<void> => {
  try {
    const { error } = await supabase
      .from('games')
      .update({
        game_state: gameState,
        current_player_index: gameState.currentPlayerIndex,
        epoch: gameState.epoch,
        phase: gameState.gamePhase
      })
      .eq('room_id', roomId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating game state:', error);
    throw error;
  }
};