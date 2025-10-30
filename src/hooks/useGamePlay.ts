import { useState, useCallback, useEffect } from 'react';
import { GameState, Castle, Tile } from '@/types/game';
import { isValidPosition } from '@/utils/gameLogic';
import { updateGameState, getGameState } from '@/utils/supabaseRoomManager';
import { toast } from 'sonner';

export const useGamePlay = (
  gameState: GameState | null, 
  playerId: string, 
  roomId: string,
  setGameState: (gameState: GameState) => void
) => {
  const [selectedCastle, setSelectedCastle] = useState<Castle | undefined>();
  const [selectedTile, setSelectedTile] = useState<Tile | undefined>();
  const [hasSelectedStartingTile, setHasSelectedStartingTile] = useState(false);

  // Clear selections when it's not your turn
  useEffect(() => {
    if (gameState) {
      const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId;
      if (!isMyTurn) {
        setSelectedCastle(undefined);
        setSelectedTile(undefined);
        setHasSelectedStartingTile(false);
      }
    }
  }, [gameState, playerId]);

  const saveGameState = useCallback(async (newGameState: GameState) => {
    if (!roomId) {
      console.error('No room ID for saving game state');
      return;
    }
    
    try {
      console.log('=== SAVING GAME STATE ===');
      console.log('Room ID:', roomId);
      console.log('New game state:', newGameState);
      console.log('Current player index:', newGameState.currentPlayerIndex);
      console.log('Current player:', newGameState.players[newGameState.currentPlayerIndex]?.name);
      
      // Update local state immediately for responsive UI
      setGameState(newGameState);
      
      // Then save to database
      await updateGameState(roomId, newGameState);
      console.log('=== GAME STATE SAVED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== FAILED TO SAVE GAME STATE ===');
      console.error('Error:', error);
      toast.error('Failed to sync game state');
    }
  }, [roomId, setGameState]);

  const placeCastle = useCallback(async (castle: Castle, row: number, col: number) => {
    if (!gameState || !isValidPosition(row, col, gameState.board)) {
      toast.error('Invalid position');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (castle.color !== currentPlayer.color || currentPlayer.id !== playerId) {
      toast.error('Not your turn or not your castle');
      return;
    }

    console.log('=== PLACING CASTLE ===');
    console.log('Castle:', castle);
    console.log('Position:', { row, col });
    console.log('Current player:', currentPlayer.name);

    const newBoard = gameState.board.map(r => [...r]);
    const updatedCastle = { ...castle, position: { row, col } };
    newBoard[row][col] = updatedCastle;

    const updatedPlayers = gameState.players.map(player => {
      if (player.id === currentPlayer.id) {
        return {
          ...player,
          castles: player.castles.map(c => 
            c.id === castle.id ? updatedCastle : c
          )
        };
      }
      return player;
    });

    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    const newGameState = {
      ...gameState,
      board: newBoard,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex
    };

    console.log('=== NEW GAME STATE AFTER CASTLE PLACEMENT ===');
    console.log('Next player index:', nextPlayerIndex);
    console.log('Next player:', gameState.players[nextPlayerIndex].name);

    await saveGameState(newGameState);
    setSelectedCastle(undefined);
    toast.success('Castle placed!');
  }, [gameState, playerId, saveGameState]);

  const drawAndPlaceTile = useCallback(async () => {
    if (!gameState || gameState.tileSupply.length === 0) {
      toast.error('No tiles available');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      toast.error('Not your turn');
      return;
    }

    console.log('=== DRAWING TILE ===');
    console.log('Current player:', currentPlayer.name);
    console.log('Tiles remaining:', gameState.tileSupply.length);

    const drawnTile = gameState.tileSupply[0];
    setSelectedTile(drawnTile);
    
    const newGameState = {
      ...gameState,
      tileSupply: gameState.tileSupply.slice(1)
    };

    console.log('=== TILE DRAWN ===');
    console.log('Drawn tile:', drawnTile);
    console.log('Tiles remaining after draw:', newGameState.tileSupply.length);

    await saveGameState(newGameState);
    toast.success(`Drew ${drawnTile.name} - click an empty space to place it`);
  }, [gameState, playerId, saveGameState]);

  const placeTile = useCallback(async (tile: Tile, row: number, col: number) => {
    if (!gameState || !isValidPosition(row, col, gameState.board)) {
      toast.error('Invalid position');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      toast.error('Not your turn');
      return;
    }

    console.log('=== PLACING TILE ===');
    console.log('Tile:', tile);
    console.log('Position:', { row, col });
    console.log('Current player:', currentPlayer.name);

    const newBoard = gameState.board.map(r => [...r]);
    const updatedTile = { ...tile, position: { row, col } };
    newBoard[row][col] = updatedTile;

    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    const newGameState = {
      ...gameState,
      board: newBoard,
      currentPlayerIndex: nextPlayerIndex
    };

    console.log('=== NEW GAME STATE AFTER TILE PLACEMENT ===');
    console.log('Next player index:', nextPlayerIndex);
    console.log('Next player:', gameState.players[nextPlayerIndex].name);

    await saveGameState(newGameState);
    setSelectedTile(undefined);
    setHasSelectedStartingTile(false);
    toast.success('Tile placed!');
  }, [gameState, playerId, saveGameState]);

  const placeStartingTile = useCallback(async (row: number, col: number) => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.startingTile || currentPlayer.id !== playerId) {
      toast.error('No starting tile available or not your turn');
      return;
    }

    console.log('=== PLACING STARTING TILE ===');
    console.log('Starting tile:', currentPlayer.startingTile);
    console.log('Position:', { row, col });

    await placeTile(currentPlayer.startingTile, row, col);
    
    const updatedPlayers = gameState.players.map(player => {
      if (player.id === currentPlayer.id) {
        return { ...player, startingTile: undefined };
      }
      return player;
    });

    const newGameState = { ...gameState, players: updatedPlayers };
    await saveGameState(newGameState);
  }, [gameState, playerId, placeTile, saveGameState]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameState || !isValidPosition(row, col, gameState.board)) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      toast.error('Not your turn');
      return;
    }

    console.log('=== CELL CLICKED ===');
    console.log('Position:', { row, col });
    console.log('Selected castle:', selectedCastle);
    console.log('Selected tile:', selectedTile);
    console.log('Has selected starting tile:', hasSelectedStartingTile);

    if (selectedCastle) {
      placeCastle(selectedCastle, row, col);
    } else if (selectedTile) {
      placeTile(selectedTile, row, col);
    } else if (hasSelectedStartingTile) {
      placeStartingTile(row, col);
    }
  }, [gameState, playerId, selectedCastle, selectedTile, hasSelectedStartingTile, placeCastle, placeTile, placeStartingTile]);

  const selectStartingTile = useCallback(() => {
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.startingTile || currentPlayer.id !== playerId) {
      toast.error('No starting tile available or not your turn');
      return;
    }

    setHasSelectedStartingTile(true);
    setSelectedCastle(undefined);
    setSelectedTile(undefined);
    toast.success('Starting tile selected - click an empty space to place it');
  }, [gameState, playerId]);

  const passTurn = useCallback(async () => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      toast.error('Not your turn');
      return;
    }

    console.log('=== PASSING TURN ===');
    console.log('Current player:', currentPlayer.name);

    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    const newGameState = {
      ...gameState,
      currentPlayerIndex: nextPlayerIndex
    };

    console.log('=== TURN PASSED ===');
    console.log('Next player:', gameState.players[nextPlayerIndex].name);

    await saveGameState(newGameState);
    setSelectedCastle(undefined);
    setSelectedTile(undefined);
    setHasSelectedStartingTile(false);
    toast.info('Turn passed');
  }, [gameState, playerId, saveGameState]);

  return {
    selectedCastle,
    selectedTile,
    hasSelectedStartingTile,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn
  };
};