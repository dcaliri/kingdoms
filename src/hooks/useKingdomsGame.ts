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
  const [isInitializing, setIsInitializing] = useState(false);

  const updateGameState = useCallback(async (newGameState: GameState) => {
    console.log('Updating game state:', newGameState);
    console.log('Current player will be:', newGameState.players[newGameState.currentPlayerIndex]?.name);
    
    // Update local state immediately
    setGameState(newGameState);
    
    if (roomId) {
      try {
        await saveGameState(roomId, newGameState);
        console.log('Game state saved to database successfully');
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
    setIsInitializing(true);

    try {
      // Try to load existing game state first
      const existingGameState = await loadGameState(room.id);
      if (existingGameState) {
        console.log('Loading existing game state:', existingGameState);
        console.log('Current player in existing game:', existingGameState.players[existingGameState.currentPlayerIndex]?.name);
        setGameState(existingGameState);
        setIsInitializing(false);
        toast.success('Game resumed!');
        return;
      }

      // Check if this player is the host
      const isHost = room.players.find(p => p.id === playerId)?.isHost;
      
      if (isHost) {
        console.log('Host initializing new game...');
        
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
          currentPlayerIndex: 0, // Always start with first player
          epoch: 1,
          board: Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)),
          tileSupply: tiles,
          gamePhase: 'playing',
          scores: {}
        };

        console.log('Initial game state created:', initialGameState);
        console.log('Starting player:', initialGameState.players[0]?.name);

        await updateGameState(initialGameState);
        setSelectedCastle(undefined);
        setSelectedTile(undefined);
        setHasSelectedStartingTile(false);
        setIsInitializing(false);
        
        toast.success('Game started!');
      } else {
        console.log('Not host, waiting for game state from host...');
        // Non-host players will receive the game state via real-time subscription
        // Set a timeout to check for game state periodically
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds
        
        const checkForGameState = async () => {
          attempts++;
          console.log(`Attempt ${attempts}: Checking for game state...`);
          
          const gameState = await loadGameState(room.id);
          if (gameState) {
            console.log('Game state found for non-host player:', gameState);
            setGameState(gameState);
            setIsInitializing(false);
            toast.success('Game loaded!');
            return;
          }
          
          if (attempts < maxAttempts) {
            setTimeout(checkForGameState, 1000);
          } else {
            console.error('Timeout waiting for game state');
            setIsInitializing(false);
            toast.error('Failed to load game - please refresh');
          }
        };
        
        setTimeout(checkForGameState, 1000);
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      setIsInitializing(false);
      toast.error('Failed to initialize game');
    }
  }, [updateGameState]);

  // Set up real-time subscription
  useEffect(() => {
    if (!roomId) return;

    console.log('Setting up game state subscription for room:', roomId);
    const unsubscribe = subscribeToGameState(roomId, (updatedGameState) => {
      if (updatedGameState) {
        console.log('Received game state update via subscription:', updatedGameState);
        console.log('Updated current player:', updatedGameState.players[updatedGameState.currentPlayerIndex]?.name);
        
        // Always update to the received state (this ensures synchronization)
        setGameState(updatedGameState);
        setIsInitializing(false); // Game state received, no longer initializing
        
        // Clear selections when it's not your turn
        const isMyTurn = updatedGameState.players[updatedGameState.currentPlayerIndex]?.id === currentPlayerId;
        if (!isMyTurn) {
          setSelectedCastle(undefined);
          setSelectedTile(undefined);
          setHasSelectedStartingTile(false);
        }
      }
    });

    return unsubscribe;
  }, [roomId, currentPlayerId]);

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

    console.log('Placing castle for player:', currentPlayer.name);

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
    const nextPlayer = gameState.players[nextPlayerIndex];

    const newGameState = {
      ...gameState,
      board: newBoard,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex
    };

    console.log('Turn changing from', currentPlayer.name, 'to', nextPlayer.name);

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

    console.log('Placing tile for player:', currentPlayer.name);

    const newBoard = gameState.board.map(r => [...r]);
    const updatedTile = { ...tile, position: { row, col } };
    newBoard[row][col] = updatedTile;

    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const nextPlayer = gameState.players[nextPlayerIndex];

    const newGameState = {
      ...gameState,
      board: newBoard,
      currentPlayerIndex: nextPlayerIndex
    };

    console.log('Turn changing from', currentPlayer.name, 'to', nextPlayer.name);

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

    console.log('Placing starting tile for player:', currentPlayer.name);

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

    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const nextPlayer = gameState.players[nextPlayerIndex];

    const newGameState = {
      ...gameState,
      currentPlayerIndex: nextPlayerIndex
    };

    console.log('Passing turn from', currentPlayer.name, 'to', nextPlayer.name);

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
    isInitializing,
    initializeGameFromRoom,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn
  };
};