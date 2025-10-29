import { supabase } from '@/integrations/supabase/client';
import { GameState } from '@/types/game';

export const saveGameState = async (roomId: string, gameState: GameState): Promise<void> => {
  try {
    console.log('=== SAVING GAME STATE ===');
    console.log('Room ID:', roomId);
    console.log('Game State:', gameState);
    
    const gameData = {
      room_id: roomId,
      game_state: gameState,
      current_player_index: gameState.currentPlayerIndex,
      epoch: gameState.epoch,
      phase: gameState.gamePhase
    };
    
    console.log('Data to save:', gameData);
    
    const { data, error } = await supabase
      .from('games')
      .upsert(gameData, {
        onConflict: 'room_id'
      })
      .select();

    if (error) {
      console.error('=== SAVE ERROR ===');
      console.error('Error details:', error);
      throw error;
    }

    console.log('=== SAVE SUCCESS ===');
    console.log('Saved data:', data);
  } catch (error) {
    console.error('=== SAVE FAILED ===');
    console.error('Failed to save game state:', error);
    throw error;
  }
};

export const loadGameState = async (roomId: string): Promise<GameState | null> => {
  try {
    console.log('=== LOADING GAME STATE ===');
    console.log('Room ID:', roomId);
    
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('room_id', roomId)
      .single();

    console.log('Load query result:', { data, error });

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('=== NO GAME STATE FOUND ===');
        return null;
      }
      console.error('=== LOAD ERROR ===');
      console.error('Error details:', error);
      throw error;
    }

    if (!data) {
      console.log('=== NO DATA RETURNED ===');
      return null;
    }

    console.log('=== LOAD SUCCESS ===');
    console.log('Loaded game state:', data.game_state);
    return data.game_state as GameState;
  } catch (error) {
    console.error('=== LOAD FAILED ===');
    console.error('Failed to load game state:', error);
    return null;
  }
};

export const subscribeToGameState = (roomId: string, callback: (gameState: GameState | null) => void) => {
  console.log('=== SETTING UP SUBSCRIPTION ===');
  console.log('Room ID:', roomId);
  
  const channel = supabase
    .channel(`game-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        console.log('=== REAL-TIME EVENT ===');
        console.log('Event type:', payload.eventType);
        console.log('Payload:', payload);
        
        if (payload.new && payload.new.game_state) {
          const gameState = payload.new.game_state as GameState;
          console.log('=== CALLING CALLBACK ===');
          console.log('Game state:', gameState);
          callback(gameState);
        } else if (payload.eventType === 'DELETE') {
          console.log('=== GAME DELETED ===');
          callback(null);
        }
      }
    )
    .subscribe((status) => {
      console.log('=== SUBSCRIPTION STATUS ===');
      console.log('Status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to game state changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to game state changes');
      }
    });

  return () => {
    console.log('=== UNSUBSCRIBING ===');
    console.log('Room ID:', roomId);
    supabase.removeChannel(channel);
  };
};

// Add a direct check function for debugging
export const checkGameStateExists = async (roomId: string): Promise<boolean> => {
  try {
    console.log('=== CHECKING GAME STATE EXISTS ===');
    console.log('Room ID:', roomId);
    
    const { data, error } = await supabase
      .from('games')
      .select('id')
      .eq('room_id', roomId)
      .single();

    console.log('Exists check result:', { data, error });

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking game state:', error);
      return false;
    }

    const exists = !!data;
    console.log('=== EXISTS RESULT ===');
    console.log('Game state exists:', exists);
    return exists;
  } catch (error) {
    console.error('=== EXISTS CHECK FAILED ===');
    console.error('Failed to check game state:', error);
    return false;
  }
};

// Add a function to list all games for debugging
export const debugListAllGames = async (): Promise<void> => {
  try {
    console.log('=== DEBUG: LISTING ALL GAMES ===');
    
    const { data, error } = await supabase
      .from('games')
      .select('*');

    if (error) {
      console.error('Error listing games:', error);
      return;
    }

    console.log('All games in database:', data);
  } catch (error) {
    console.error('Failed to list games:', error);
  }
};