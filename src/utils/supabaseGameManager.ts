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
    console.log('Loading game state from database:', roomId);
    
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
      throw error;
    }

    console.log('Game state loaded:', data);
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
        if (payload.new) {
          const gameState = payload.new.game_state as GameState;
          callback(gameState);
        }
      }
    )
    .subscribe((status) => {
      console.log('Game subscription status:', status);
    });

  return () => {
    console.log('Unsubscribing from game state:', roomId);
    supabase.removeChannel(channel);
  };
};