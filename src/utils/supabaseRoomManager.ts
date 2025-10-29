import { supabase } from '@/lib/supabase';
import { Room, RoomPlayer } from '@/types/room';
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

export const setPlayerReady = async (playerId: string, roomCode: string, isReady: boolean): Promise<Room | null> => {
  try {
    // Get room
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) throw new Error('Room not found');

    // Update player ready status
    const { error: updateError } = await supabase
      .from('room_players')
      .update({ is_ready: isReady })
      .eq('room_id', roomData.id)
      .eq('player_id', playerId);

    if (updateError) throw updateError;

    // Check if all players are ready
    const { data: playersData, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id);

    if (playersError) throw playersError;

    const allReady = playersData.length >= 2 && playersData.every(p => p.is_ready);
    const newStatus = allReady ? 'ready' : 'waiting';

    // Update room status if needed
    if (roomData.status !== newStatus) {
      const { error: statusError } = await supabase
        .from('rooms')
        .update({ status: newStatus })
        .eq('id', roomData.id);

      if (statusError) throw statusError;
    }

    return await getRoom(roomCode);
  } catch (error) {
    console.error('Error setting player ready:', error);
    throw error;
  }
};

export const startGame = async (hostId: string, roomCode: string): Promise<Room | null> => {
  try {
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

    // Assign colors to players
    const { data: playersData, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('created_at', { ascending: true });

    if (playersError) throw playersError;

    const colors: ('red' | 'blue' | 'yellow' | 'green')[] = ['red', 'blue', 'yellow', 'green'];
    
    for (let i = 0; i < playersData.length; i++) {
      const { error: colorError } = await supabase
        .from('room_players')
        .update({ color: colors[i] })
        .eq('id', playersData[i].id);

      if (colorError) throw colorError;
    }

    // Update room status
    const { error: statusError } = await supabase
      .from('rooms')
      .update({ status: 'playing' })
      .eq('id', roomData.id);

    if (statusError) throw statusError;

    return await getRoom(roomCode);
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
      async () => {
        const room = await getRoom(roomCode);
        callback(room);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players'
      },
      async () => {
        const room = await getRoom(roomCode);
        callback(room);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};