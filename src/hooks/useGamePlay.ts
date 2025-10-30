import { useState, useCallback, useEffect } from 'react';
import { GameState, Castle, Tile } from '@/types/game';
import { isValidPosition } from '@/utils/gameLogic';
import { updateGameState, getGameState } from '@/utils/supabaseRoomManager';
import { toast } from 'sonner';

export const useGamePlay = (gameState: GameState | null, playerId: string, roomId: string) => {
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
    if (!roomId) return;
    
    try {
      await updateGameState(roomId, newGameState);
      console.log('Game state updated successfully');
    } catch (error) {
      console.error('Failed to save game state:', error);
      toast.error('Failed to sync game state');
    }
  }, [roomId]);

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

    const drawnTile = gameState.tileSupply[0];
    setSelectedTile(drawnTile);
    
    const newGameState = {
      ...gameState,
      tileSupply: gameState.tileSupply.slice(1)
    };

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

    const newBoard = gameState.board.map(r => [...r]);
    const updatedTile = { ...tile, position: { row, col } };
    newBoard[row][col] = updatedTile;

    const newGameState = {
      ...gameState,
      board: newBoard,
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
    };

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

    const newGameState = {
      ...gameState,
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
    };

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