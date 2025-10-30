import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  
  // Use refs to prevent infinite loops
  const initializationRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateGameState = useCallback(async (newGameState: GameState) => {
    console.log('=== UPDATING GAME STATE ===');
    console.log('New game state:', newGameState);
    console.log('Room ID for save:', roomId);
    
    // Update local state immediately
    setGameState(newGameState);
    setIsInitializing(false);
    
    if (roomId) {
      try {
        console.log('=== ATTEMPTING TO SAVE TO DATABASE ===');
        await saveGameState(roomId, newGameState);
        console.log('=== GAME STATE SAVED SUCCESSFULLY ===');
      } catch (error) {
        console.error('=== FAILED TO SAVE GAME STATE ===');
        console.error('Save error:', error);
        toast.error('Failed to sync game state');
      }
    } else {
      console.error('=== NO ROOM ID FOR SAVE ===');
      console.error('Cannot save game state without room ID');
    }
  }, [roomId]);

  const initializeGameFromRoom = useCallback(async (room: Room, playerId: string) => {
    // Prevent multiple simultaneous initializations
    if (initializationRef.current) {
      console.log('Initialization already in progress, skipping...');
      return;
    }

    console.log('=== INITIALIZING GAME FROM ROOM ===');
    console.log('Room:', room);
    console.log('Player ID:', playerId);
    
    initializationRef.current = true;
    setCurrentPlayerId(playerId);
    setRoomId(room.id);
    setIsInitializing(true);
    setLoadingAttempts(0);

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      // Check if this player is the host
      const isHost = room.players.find(p => p.id === playerId)?.isHost;
      console.log('=== PLAYER ROLE CHECK ===');
      console.log('Is host:', isHost);
      console.log('Player in room:', room.players.find(p => p.id === playerId));
      
      if (isHost) {
        console.log('=== HOST CREATING GAME ===');
        
        // Validate room data first
        if (!room.players || room.players.length === 0) {
          throw new Error('No players in room');
        }
        
        const playersWithColors = room.players.filter(p => p.color);
        if (playersWithColors.length !== room.players.length) {
          throw new Error('Not all players have colors assigned');
        }
        
        console.log('=== CREATING INITIAL GAME STATE ===');
        
        // Host creates the game state
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

        console.log('=== PLAYERS CREATED ===');
        console.log('Players:', players);

        const tiles = shuffleArray(createInitialTiles());
        console.log('=== TILES SHUFFLED ===');
        console.log('Tile count:', tiles.length);
        
        // Give each player a starting tile
        players.forEach(player => {
          if (tiles.length > 0) {
            player.startingTile = tiles.pop();
            console.log(`Assigned starting tile to ${player.name}:`, player.startingTile);
          }
        });

        const initialGameState: GameState = {
          id: `game-${Date.now()}`,
          players,
          currentPlayerIndex: 0,
          epoch: 1,
          board: Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)),
          tileSupply: tiles,
          gamePhase: 'playing',
          scores: {}
        };

        console.log('=== INITIAL GAME STATE CREATED ===');
        console.log('Initial game state:', initialGameState);
        console.log('About to call updateGameState...');
        
        await updateGameState(initialGameState);
        
        console.log('=== HOST INITIALIZATION COMPLETE ===');
        initializationRef.current = false;
        toast.success('Game started!');
        
        // Debug: List all games after creation
        await debugListAllGames();
      } else {
        console.log('=== NON-HOST WAITING FOR GAME ===');
        
        // For non-host players, poll for game state
        let attempts = 0;
        const maxAttempts = 30;
        
        pollingIntervalRef.current = setInterval(async () => {
          if (!initializationRef.current) {
            console.log('Initialization cancelled, stopping polling');
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }

          attempts++;
          setLoadingAttempts(attempts);
          console.log(`=== POLL ATTEMPT ${attempts}/${maxAttempts} ===`);
          
          try {
            // Debug: List all games to see what's in the database
            if (attempts === 1) {
              await debugListAllGames();
            }
            
            const gameState = await loadGameState(room.id);
            if (gameState) {
              console.log('=== FOUND GAME STATE VIA POLLING ===');
              console.log('Game state:', gameState);
              setGameState(gameState);
              setIsInitializing(false);
              initializationRef.current = false;
              
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
            console.error('=== POLLING TIMEOUT ===');
            setIsInitializing(false);
            initializationRef.current = false;
            
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            toast.error('Failed to load game. Please try refreshing.');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('=== INITIALIZATION ERROR ===');
      console.error('Error:', error);
      setIsInitializing(false);
      initializationRef.current = false;
      toast.error(`Failed to initialize game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [updateGameState]);

  // Set up real-time subscription
  useEffect(() => {
    if (!roomId) return;

    console.log('=== SETTING UP REAL-TIME SUBSCRIPTION ===');
    console.log('Room ID:', roomId);
    
    const unsubscribe = subscribeToGameState(roomId, (updatedGameState) => {
      console.log('=== REAL-TIME UPDATE RECEIVED ===');
      console.log('Updated game state:', updatedGameState);
      
      if (updatedGameState) {
        console.log('Processing real-time game state update');
        setGameState(updatedGameState);
        setIsInitializing(false);
        
        // Stop any ongoing initialization
        initializationRef.current = false;
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
      console.log('=== CLEANING UP SUBSCRIPTION ===');
      unsubscribe();
      initializationRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [roomId, currentPlayerId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('=== COMPONENT UNMOUNTING ===');
      initializationRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

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
    initializeGameFromRoom,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn
  };
};