import { supabase } from '@/integrations/supabase/client';
import { GameState } from '@/types/game';

export const saveGameState = async (roomId: string, gameState: GameState): Promise<void> => {
  try {
    console.log('Saving game state to database:', { roomId, gameState });
    
    const { error } = await supabase
      .from('games')
      .upsert({
        room_id: roomId,
        game_state: gameState,
        current_player_index: gameState.currentPlayerIndex,
        epoch: gameState.epoch,
        phase: gameState.gamePhase
      }, {
        onConflict: 'room_id'
      });

    if (error) {
      console.error('Error saving game state:', error);
      throw error;
    }

    console.log('Game state saved successfully');
  } catch (error) {
    console.error('Failed to save game state:', error);
    throw error;
  }
};

export const loadGameState = async (roomId: string): Promise<GameState | null> => {
  try {
    console.log('Loading game state from database for room:', roomId);
    
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No game state found
        console.log('No game state found for room:', roomId);
        return null;
      }
      console.error('Error loading game state:', error);
      throw error;
    }

    if (!data) {
      console.log('No data returned for room:', roomId);
      return null;
    }

    console.log('Game state loaded successfully:', data);
    return data.game_state as GameState;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
};

export const subscribeToGameState = (roomId: string, callback: (gameState: GameState | null) => void) => {
  console.log('Setting up game state subscription for room:', roomId);
  
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
        console.log('Game state change detected:', payload);
        if (payload.new && payload.new.game_state) {
          const gameState = payload.new.game_state as GameState;
          console.log('Calling callback with game state:', gameState);
          callback(gameState);
        } else if (payload.eventType === 'DELETE') {
          console.log('Game state deleted');
          callback(null);
        }
      }
    )
    .subscribe((status) => {
      console.log('Game subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to game state changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to game state changes');
      }
    });

  return () => {
    console.log('Unsubscribing from game state:', roomId);
    supabase.removeChannel(channel);
  };
};

// Add a direct check function for debugging
export const checkGameStateExists = async (roomId: string): Promise<boolean> => {
  try {
    console.log('Checking if game state exists for room:', roomId);
    
    const { data, error } = await supabase
      .from('games')
      .select('id')
      .eq('room_id', roomId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking game state:', error);
      return false;
    }

    const exists = !!data;
    console.log('Game state exists:', exists);
    return exists;
  } catch (error) {
    console.error('Failed to check game state:', error);
    return false;
  }
};