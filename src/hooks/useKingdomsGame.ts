import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Player, Castle, Tile, PlayerColor, LogEntry } from '@/types/game';
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
import { saveGameState, loadGameState, subscribeToGameState, debugListAllGames } from '@/utils/supabaseGameManager';
import { toast } from 'sonner';

export const useKingdomsGame = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [selectedCastle, setSelectedCastle] = useState<Castle | undefined>();
  const [selectedTile, setSelectedTile] = useState<Tile | undefined>();
  const [hasSelectedStartingTile, setHasSelectedStartingTile] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [isHost, setIsHost] = useState(false);
  
  // Use refs to prevent infinite loops
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createGameState = useCallback(async (room: Room): Promise<GameState> => {
    console.log('=== CREATING GAME STATE ===');
    console.log('Room:', room);
    
    // Validate room data
    if (!room.players || room.players.length === 0) {
      throw new Error('No players in room');
    }
    
    const playersWithColors = room.players.filter(p => p.color);
    if (playersWithColors.length !== room.players.length) {
      throw new Error('Not all players have colors assigned');
    }
    
    // Create players
    const players: Player[] = room.players.map((roomPlayer) => {
      console.log('Creating player:', roomPlayer);
      return {
        id: roomPlayer.id,
        name: roomPlayer.name,
        color: roomPlayer.color!,
        gold: 50,
        castles: createInitialCastles(roomPlayer.color!, room.players.length)
      };
    });

    console.log('Players created:', players);

    // Create and shuffle tiles
    const tiles = shuffleArray(createInitialTiles());
    console.log('Tiles shuffled, count:', tiles.length);
    
    // Give each player a starting tile
    players.forEach(player => {
      if (tiles.length > 0) {
        player.startingTile = tiles.pop();
        console.log(`Assigned starting tile to ${player.name}:`, player.startingTile);
      }
    });

    // Create initial log entry
    const initialLogEntry: LogEntry = {
      id: `log-${Date.now()}-init`,
      playerId: 'system',
      playerName: 'System',
      playerColor: 'gray',
      action: `🎮 Game started with ${players.length} players! Epoch 1 begins.`,
      timestamp: Date.now(),
      epoch: 1
    };

    const gameState: GameState = {
      id: `game-${Date.now()}`,
      players,
      currentPlayerIndex: 0,
      epoch: 1,
      board: Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)),
      tileSupply: tiles,
      gamePhase: 'playing',
      scores: {},
      gameLog: [initialLogEntry] // Initialize with game start log entry
    };

    console.log('Game state created:', gameState);
    return gameState;
  }, []);

  const initializeGameFromRoom = useCallback(async (room: Room, playerId: string) => {
    console.log('=== INITIALIZING GAME FROM ROOM ===');
    console.log('Room:', room);
    console.log('Player ID:', playerId);
    
    setCurrentPlayerId(playerId);
    setRoomId(room.id);
    setIsInitializing(true);
    setLoadingAttempts(0);

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Check if this player is the host
    const playerInRoom = room.players.find(p => p.id === playerId);
    const playerIsHost = playerInRoom?.isHost || false;
    setIsHost(playerIsHost);
    
    console.log('Player role:', { playerInRoom, playerIsHost });

    // First, try to load existing game state
    try {
      console.log('Checking for existing game state...');
      const existingGameState = await loadGameState(room.id);
      if (existingGameState) {
        console.log('Found existing game state:', existingGameState);
        setGameState(existingGameState);
        setIsInitializing(false);
        toast.success('Game loaded!');
        return;
      }
    } catch (error) {
      console.error('Error checking for existing game:', error);
    }

    if (playerIsHost) {
      console.log('Host will need to create game manually');
      setIsInitializing(false);
    } else {
      console.log('Non-host waiting for game to be created...');
      // Start polling for game state
      let attempts = 0;
      const maxAttempts = 60; // Increased timeout
      
      pollingIntervalRef.current = setInterval(async () => {
        attempts++;
        setLoadingAttempts(attempts);
        console.log(`Poll attempt ${attempts}/${maxAttempts}`);
        
        try {
          const gameState = await loadGameState(room.id);
          if (gameState) {
            console.log('Found game state via polling:', gameState);
            setGameState(gameState);
            setIsInitializing(false);
            
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            toast.success('Game loaded!');
            return;
          }
        } catch (error) {
          console.error(`Poll attempt ${attempts} error:`, error);
        }
        
        if (attempts >= maxAttempts) {
          console.error('Polling timeout');
          setIsInitializing(false);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          toast.error('Failed to load game. Host may need to create the game.');
        }
      }, 2000); // Poll every 2 seconds
    }
  }, []);

  const createAndSaveGame = useCallback(async (room: Room) => {
    console.log('=== HOST CREATING AND SAVING GAME ===');
    setIsInitializing(true);
    
    try {
      // Create the game state
      const newGameState = await createGameState(room);
      
      // Save to database
      console.log('Saving game state to database...');
      await saveGameState(room.id, newGameState);
      console.log('Game state saved successfully');
      
      // Set local state
      setGameState(newGameState);
      setIsInitializing(false);
      
      toast.success('Game created and started!');
      
      // Debug: List all games
      await debugListAllGames();
      
    } catch (error) {
      console.error('Failed to create and save game:', error);
      setIsInitializing(false);
      toast.error(`Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [createGameState]);

  // Set up real-time subscription
  useEffect(() => {
    if (!roomId) return;

    console.log('Setting up real-time subscription for room:', roomId);
    
    const unsubscribe = subscribeToGameState(roomId, (updatedGameState) => {
      console.log('Real-time update received:', updatedGameState);
      
      if (updatedGameState) {
        setGameState(updatedGameState);
        setIsInitializing(false);
        
        // Stop polling if active
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Clear selections when it's not your turn
        const isMyTurn = updatedGameState.players[updatedGameState.currentPlayerIndex]?.id === currentPlayerId;
        if (!isMyTurn) {
          setSelectedCastle(undefined);
          setSelectedTile(undefined);
          setHasSelectedStartingTile(false);
        }
      }
    });

    return () => {
      console.log('Cleaning up subscription');
      unsubscribe();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [roomId, currentPlayerId]);

  const updateGameState = useCallback(async (newGameState: GameState) => {
    console.log('Updating game state:', newGameState);
    
    // Update local state immediately
    setGameState(newGameState);
    
    if (roomId) {
      try {
        await saveGameState(roomId, newGameState);
        console.log('Game state updated successfully');
      } catch (error) {
        console.error('Failed to save game state:', error);
        toast.error('Failed to sync game state');
      }
    }
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

    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    const newGameState = {
      ...gameState,
      board: newBoard,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex
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
      const scores = calculateScore(gameState);
      
      const updatedPlayers = gameState.players.map(player => ({
        ...player,
        gold: Math.max(0, player.gold + (scores[player.id] || 0))
      }));

      if (gameState.epoch === 3) {
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
        const nextEpoch = (gameState.epoch + 1) as 1 | 2 | 3;
        
        const resetPlayers = updatedPlayers.map(player => {
          const rank1Castles = player.castles.filter(c => c.rank === 1).map(c => ({ ...c, position: undefined }));
          return {
            ...player,
            castles: rank1Castles,
            startingTile: undefined
          };
        });

        const shuffledTiles = shuffleArray(createInitialTiles());
        resetPlayers.forEach(player => {
          if (shuffledTiles.length > 0) {
            player.startingTile = shuffledTiles.pop();
          }
        });

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
    loadingAttempts,
    isHost,
    initializeGameFromRoom,
    createAndSaveGame,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn
  };
};