import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Player, Castle, Tile, PlayerColor } from '@/types/game';
import { Room } from '@/types/room';
import { 
  createInitialTiles, 
  createInitialCastles, 
  shuffleArray, 
  isValidPosition, 
  canPlayerAct,
  calculateScore,
  BOARD_ROWS,
  BOARD_COLS
} from '@/utils/gameLogic';
import { saveGameState, loadGameState, subscribeToGameState } from '@/utils/supabaseGameManager';
import { toast } from 'sonner';

export const useKingdomsGame = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [selectedCastle, setSelectedCastle] = useState<Castle | undefined>();
  const [selectedTile, setSelectedTile] = useState<Tile | undefined>();
  const [hasSelectedStartingTile, setHasSelectedStartingTile] = useState(false);

  const updateGameState = useCallback(async (newGameState: GameState) => {
    console.log('Updating game state:', newGameState);
    setGameState(newGameState);
    
    if (roomId) {
      try {
        await saveGameState(roomId, newGameState);
      } catch (error) {
        console.error('Failed to save game state:', error);
        toast.error('Failed to sync game state');
      }
    }
  }, [roomId]);

  const initializeGameFromRoom = useCallback(async (room: Room, playerId: string) => {
    console.log('Initializing game from room:', { room, playerId });
    setCurrentPlayerId(playerId);
    setRoomId(room.id);

    // Try to load existing game state first
    const existingGameState = await loadGameState(room.id);
    if (existingGameState) {
      console.log('Loading existing game state:', existingGameState);
      setGameState(existingGameState);
      toast.success('Game resumed!');
      return;
    }

    // Create new game state
    const players: Player[] = room.players.map((roomPlayer) => ({
      id: roomPlayer.id,
      name: roomPlayer.name,
      color: roomPlayer.color!,
      gold: 50,
      castles: createInitialCastles(roomPlayer.color!, room.players.length)
    }));

    const tiles = shuffleArray(createInitialTiles());
    
    // Give each player a starting tile
    players.forEach(player => {
      if (tiles.length > 0) {
        player.startingTile = tiles.pop();
      }
    });

    const initialGameState: GameState = {
      id: `game-${Date.now()}`,
      players,
      currentPlayerIndex: Math.floor(Math.random() * players.length),
      epoch: 1,
      board: Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)),
      tileSupply: tiles,
      gamePhase: 'playing',
      scores: {}
    };

    await updateGameState(initialGameState);
    setSelectedCastle(undefined);
    setSelectedTile(undefined);
    setHasSelectedStartingTile(false);
    
    toast.success('Game started!');
  }, [updateGameState]);

  // Set up real-time subscription
  useEffect(() => {
    if (!roomId) return;

    console.log('Setting up game state subscription for room:', roomId);
    const unsubscribe = subscribeToGameState(roomId, (updatedGameState) => {
      if (updatedGameState) {
        console.log('Received game state update:', updatedGameState);
        setGameState(updatedGameState);
      }
    });

    return unsubscribe;
  }, [roomId]);

  const placeCastle = useCallback(async (castle: Castle, row: number, col: number) => {
    if (!gameState || !isValidPosition(row, col, gameState.board)) {
      toast.error('Invalid position');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (castle.color !== currentPlayer.color || currentPlayer.id !== currentPlayerId) {
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

    const newGameState = {
      ...gameState,
      board: newBoard,
      players: updatedPlayers,
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
    };

    await updateGameState(newGameState);
    setSelectedCastle(undefined);
    toast.success('Castle placed!');
  }, [gameState, currentPlayerId, updateGameState]);

  const drawAndPlaceTile = useCallback(async () => {
    if (!gameState || gameState.tileSupply.length === 0) {
      toast.error('No tiles available');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== currentPlayerId) {
      toast.error('Not your turn');
      return;
    }

    const drawnTile = gameState.tileSupply[0];
    setSelectedTile(drawnTile);
    
    const newGameState = {
      ...gameState,
      tileSupply: gameState.tileSupply.slice(1)
    };

    await updateGameState(newGameState);
    toast.success(`Drew ${drawnTile.name} - click an empty space to place it`);
  }, [gameState, currentPlayerId, updateGameState]);

  const placeTile = useCallback(async (tile: Tile, row: number, col: number) => {
    if (!gameState || !isValidPosition(row, col, gameState.board)) {
      toast.error('Invalid position');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== currentPlayerId) {
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

    await updateGameState(newGameState);
    setSelectedTile(undefined);
    setHasSelectedStartingTile(false);
    toast.success('Tile placed!');
  }, [gameState, currentPlayerId, updateGameState]);

  const placeStartingTile = useCallback(async (row: number, col: number) => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.startingTile || currentPlayer.id !== currentPlayerId) {
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
    await updateGameState(newGameState);
  }, [gameState, currentPlayerId, placeTile, updateGameState]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameState || !isValidPosition(row, col, gameState.board)) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== currentPlayerId) {
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
  }, [gameState, currentPlayerId, selectedCastle, selectedTile, hasSelectedStartingTile, placeCastle, placeTile, placeStartingTile]);

  const selectStartingTile = useCallback(() => {
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.startingTile || currentPlayer.id !== currentPlayerId) {
      toast.error('No starting tile available or not your turn');
      return;
    }

    setHasSelectedStartingTile(true);
    setSelectedCastle(undefined);
    setSelectedTile(undefined);
    toast.success('Starting tile selected - click an empty space to place it');
  }, [gameState, currentPlayerId]);

  const passTurn = useCallback(async () => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== currentPlayerId) {
      toast.error('Not your turn');
      return;
    }

    const newGameState = {
      ...gameState,
      currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
    };

    await updateGameState(newGameState);
    setSelectedCastle(undefined);
    setSelectedTile(undefined);
    setHasSelectedStartingTile(false);
    toast.info('Turn passed');
  }, [gameState, currentPlayerId, updateGameState]);

  const checkEpochEnd = useCallback(async () => {
    if (!gameState) return;

    const boardFull = gameState.board.every(row => row.every(cell => cell !== null));
    const noPlayerCanAct = gameState.players.every(player => !canPlayerAct(player, gameState));

    if (boardFull || noPlayerCanAct) {
      // End epoch and score
      const scores = calculateScore(gameState);
      
      // Update player gold
      const updatedPlayers = gameState.players.map(player => ({
        ...player,
        gold: Math.max(0, player.gold + (scores[player.id] || 0))
      }));

      if (gameState.epoch === 3) {
        // Game over
        const winner = updatedPlayers.reduce((prev, current) => 
          current.gold > prev.gold ? current : prev
        );

        toast.success(`Game Over! ${winner.name} wins with ${winner.gold} gold!`);

        const finalGameState = {
          ...gameState,
          players: updatedPlayers,
          gamePhase: 'finished' as const,
          winner
        };

        await updateGameState(finalGameState);
      } else {
        // Prepare next epoch
        const nextEpoch = (gameState.epoch + 1) as 1 | 2 | 3;
        
        // Reset board and redistribute castles
        const resetPlayers = updatedPlayers.map(player => {
          const rank1Castles = player.castles.filter(c => c.rank === 1).map(c => ({ ...c, position: undefined }));
          return {
            ...player,
            castles: rank1Castles,
            startingTile: undefined
          };
        });

        // Shuffle tiles and give new starting tiles
        const shuffledTiles = shuffleArray(createInitialTiles());
        resetPlayers.forEach(player => {
          if (shuffledTiles.length > 0) {
            player.startingTile = shuffledTiles.pop();
          }
        });

        // Determine new first player (highest gold)
        const sortedPlayers = [...resetPlayers].sort((a, b) => b.gold - a.gold);
        const newFirstPlayerIndex = resetPlayers.findIndex(p => p.id === sortedPlayers[0].id);

        toast.success(`Epoch ${gameState.epoch} complete! Starting Epoch ${nextEpoch}`);

        const nextEpochGameState = {
          ...gameState,
          players: resetPlayers,
          epoch: nextEpoch,
          board: Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)),
          tileSupply: shuffledTiles,
          currentPlayerIndex: newFirstPlayerIndex,
          scores: { ...gameState.scores, [`epoch${gameState.epoch}`]: scores }
        };

        await updateGameState(nextEpochGameState);
      }
    }
  }, [gameState, updateGameState]);

  // Check for epoch end after each move
  React.useEffect(() => {
    if (gameState && gameState.gamePhase === 'playing') {
      const timer = setTimeout(checkEpochEnd, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState, checkEpochEnd]);

  return {
    gameState,
    currentPlayerId,
    selectedCastle,
    selectedTile,
    hasSelectedStartingTile,
    initializeGameFromRoom,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn
  };
};