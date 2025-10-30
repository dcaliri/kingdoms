import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Castle, Tile } from '@/types/game';
import { isValidPosition, calculateScore, canPlayerAct, createInitialTiles, shuffleArray, BOARD_ROWS, BOARD_COLS } from '@/utils/gameLogic';
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

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

  // Check for epoch end after each game state change
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing') return;

    const checkEpochEnd = async () => {
      console.log('=== CHECKING EPOCH END ===');
      console.log('Current epoch:', gameState.epoch);
      console.log('Game phase:', gameState.gamePhase);

      // Check if board is full
      const boardFull = gameState.board.every(row => row.every(cell => cell !== null));
      console.log('Board full:', boardFull);

      // Check if no player can act
      const noPlayerCanAct = gameState.players.every(player => !canPlayerAct(player, gameState));
      console.log('No player can act:', noPlayerCanAct);
      console.log('Players can act:', gameState.players.map(p => ({ name: p.name, canAct: canPlayerAct(p, gameState) })));

      if (boardFull || noPlayerCanAct) {
        console.log('=== EPOCH SHOULD END ===');
        
        // Only the first player (host) should trigger epoch transition to avoid duplicates
        const isHost = gameState.players[0]?.id === playerId;
        if (!isHost) {
          console.log('Not host, waiting for host to trigger epoch end');
          return;
        }

        console.log('Host triggering epoch end...');

        // Calculate scores for this epoch
        const scores = calculateScore(gameState);
        console.log('Epoch scores:', scores);

        // Update players with their earned gold
        const updatedPlayers = gameState.players.map(player => ({
          ...player,
          gold: Math.max(0, player.gold + (scores[player.id] || 0))
        }));

        console.log('Updated player gold:', updatedPlayers.map(p => ({ name: p.name, gold: p.gold })));

        if (gameState.epoch === 3) {
          // Game is finished
          console.log('=== GAME FINISHED ===');
          
          const winner = updatedPlayers.reduce((prev, current) => 
            current.gold > prev.gold ? current : prev
          );

          console.log('Winner:', winner.name, 'with', winner.gold, 'gold');

          const finalGameState = {
            ...gameState,
            players: updatedPlayers,
            gamePhase: 'finished' as const,
            winner,
            scores: { ...gameState.scores, [`epoch${gameState.epoch}`]: scores }
          };

          await saveGameState(finalGameState);
          toast.success(`Game Over! ${winner.name} wins with ${winner.gold} gold!`);
        } else {
          // Start next epoch
          console.log('=== STARTING NEXT EPOCH ===');
          const nextEpoch = (gameState.epoch + 1) as 1 | 2 | 3;
          console.log('Next epoch:', nextEpoch);

          // Reset players for next epoch
          const resetPlayers = updatedPlayers.map(player => {
            // Only rank 1 castles return for next epoch
            const rank1Castles = player.castles
              .filter(c => c.rank === 1)
              .map(c => ({ ...c, position: undefined }));
            
            console.log(`${player.name} gets ${rank1Castles.length} rank 1 castles back`);
            
            return {
              ...player,
              castles: rank1Castles,
              startingTile: undefined
            };
          });

          // Create new tiles and give starting tiles
          const shuffledTiles = shuffleArray(createInitialTiles());
          console.log('Created', shuffledTiles.length, 'new tiles for next epoch');
          
          resetPlayers.forEach(player => {
            if (shuffledTiles.length > 0) {
              player.startingTile = shuffledTiles.pop();
              console.log(`Gave ${player.name} starting tile:`, player.startingTile?.name);
            }
          });

          // Determine first player (richest player goes first)
          const sortedPlayers = [...resetPlayers].sort((a, b) => b.gold - a.gold);
          const newFirstPlayerIndex = resetPlayers.findIndex(p => p.id === sortedPlayers[0].id);
          console.log('First player for next epoch:', sortedPlayers[0].name);

          const nextEpochGameState = {
            ...gameState,
            players: resetPlayers,
            epoch: nextEpoch,
            board: Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)),
            tileSupply: shuffledTiles,
            currentPlayerIndex: newFirstPlayerIndex,
            scores: { ...gameState.scores, [`epoch${gameState.epoch}`]: scores }
          };

          console.log('=== NEXT EPOCH GAME STATE ===');
          console.log('Epoch:', nextEpochGameState.epoch);
          console.log('Current player:', nextEpochGameState.players[nextEpochGameState.currentPlayerIndex].name);
          console.log('Tiles in supply:', nextEpochGameState.tileSupply.length);

          await saveGameState(nextEpochGameState);
          toast.success(`Epoch ${gameState.epoch} complete! Starting Epoch ${nextEpoch}. ${sortedPlayers[0].name} goes first!`);
        }
      }
    };

    // Small delay to ensure all moves are processed
    const timer = setTimeout(checkEpochEnd, 500);
    return () => clearTimeout(timer);
  }, [gameState, playerId, saveGameState]);

  // Fallback polling mechanism
  useEffect(() => {
    if (!roomId || !gameState) return;

    console.log('=== SETTING UP FALLBACK POLLING ===');
    console.log('Room ID:', roomId);
    console.log('Player ID:', playerId);

    // Poll every 2 seconds as a fallback
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const currentGameState = await getGameState(roomId);
        if (currentGameState) {
          // Check if the game state has actually changed
          const currentStateStr = JSON.stringify(gameState);
          const newStateStr = JSON.stringify(currentGameState);
          
          if (currentStateStr !== newStateStr) {
            console.log('=== POLLING DETECTED CHANGE ===');
            console.log('Current player index:', currentGameState.currentPlayerIndex);
            console.log('Current player:', currentGameState.players[currentGameState.currentPlayerIndex]?.name);
            console.log('Player ID:', playerId);
            setGameState(currentGameState);
            lastUpdateRef.current = Date.now();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    return () => {
      console.log('=== CLEANING UP POLLING ===');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [roomId, gameState, playerId, setGameState]);

  const saveGameState = useCallback(async (newGameState: GameState) => {
    if (!roomId) {
      console.error('No room ID for saving game state');
      return;
    }
    
    try {
      console.log('=== SAVING GAME STATE ===');
      console.log('Room ID:', roomId);
      console.log('Player ID:', playerId);
      console.log('New game state:', newGameState);
      console.log('Current player index:', newGameState.currentPlayerIndex);
      console.log('Current player:', newGameState.players[newGameState.currentPlayerIndex]?.name);
      
      // Update local state immediately for responsive UI
      setGameState(newGameState);
      lastUpdateRef.current = Date.now();
      
      // Then save to database
      await updateGameState(roomId, newGameState);
      console.log('=== GAME STATE SAVED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== FAILED TO SAVE GAME STATE ===');
      console.error('Error:', error);
      toast.error('Failed to sync game state');
    }
  }, [roomId, setGameState, playerId]);

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

    if (!isValidPosition(row, col, gameState.board)) {
      toast.error('Invalid position');
      return;
    }

    console.log('=== PLACING STARTING TILE ===');
    console.log('Starting tile:', currentPlayer.startingTile);
    console.log('Position:', { row, col });
    console.log('Current player:', currentPlayer.name);

    // Create the updated tile with position
    const updatedTile = { ...currentPlayer.startingTile, position: { row, col } };
    
    // Update the board
    const newBoard = gameState.board.map(r => [...r]);
    newBoard[row][col] = updatedTile;

    // Remove starting tile from player and advance turn
    const updatedPlayers = gameState.players.map(player => {
      if (player.id === currentPlayer.id) {
        return { ...player, startingTile: undefined };
      }
      return player;
    });

    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    // Create complete new game state in one operation
    const newGameState = {
      ...gameState,
      board: newBoard,
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex
    };

    console.log('=== NEW GAME STATE AFTER STARTING TILE PLACEMENT ===');
    console.log('Next player index:', nextPlayerIndex);
    console.log('Next player:', gameState.players[nextPlayerIndex].name);
    console.log('Starting tile removed from player:', !newGameState.players.find(p => p.id === currentPlayer.id)?.startingTile);
    console.log('Tile placed on board:', newGameState.board[row][col]);

    await saveGameState(newGameState);
    setHasSelectedStartingTile(false);
    toast.success('Starting tile placed!');
  }, [gameState, playerId, saveGameState]);

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

  const abandonGame = useCallback(async () => {
    if (!gameState) return;

    console.log('=== ABANDONING GAME ===');
    console.log('Player abandoning:', playerId);
    console.log('Current players:', gameState.players.map(p => p.name));

    // Remove the abandoning player
    const remainingPlayers = gameState.players.filter(p => p.id !== playerId);
    
    console.log('Remaining players:', remainingPlayers.map(p => p.name));

    if (remainingPlayers.length === 0) {
      // No players left, just end the game
      const finalGameState = {
        ...gameState,
        players: [],
        gamePhase: 'finished' as const,
        winner: undefined
      };

      await saveGameState(finalGameState);
      toast.info('Game ended - no players remaining');
      return;
    }

    if (remainingPlayers.length === 1) {
      // Only one player left, they win
      const winner = remainingPlayers[0];
      const finalGameState = {
        ...gameState,
        players: remainingPlayers,
        gamePhase: 'finished' as const,
        winner
      };

      await saveGameState(finalGameState);
      toast.success(`${winner.name} wins by default!`);
      return;
    }

    // Multiple players remaining, continue game
    let newCurrentPlayerIndex = gameState.currentPlayerIndex;
    
    // If the abandoning player was the current player, advance to next
    const abandoningPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (abandoningPlayerIndex === gameState.currentPlayerIndex) {
      newCurrentPlayerIndex = gameState.currentPlayerIndex % remainingPlayers.length;
    } else if (abandoningPlayerIndex < gameState.currentPlayerIndex) {
      // Adjust current player index since we removed a player before them
      newCurrentPlayerIndex = gameState.currentPlayerIndex - 1;
    }

    const newGameState = {
      ...gameState,
      players: remainingPlayers,
      currentPlayerIndex: newCurrentPlayerIndex
    };

    await saveGameState(newGameState);
    toast.info('You have abandoned the game');
  }, [gameState, playerId, saveGameState]);

  const endGame = useCallback(async () => {
    if (!gameState) return;

    console.log('=== ENDING GAME ===');
    console.log('Host ending game:', playerId);

    // Calculate final scores
    const scores = calculateScore(gameState);
    
    // Add current scores to player gold
    const finalPlayers = gameState.players.map(player => ({
      ...player,
      gold: Math.max(0, player.gold + (scores[player.id] || 0))
    }));

    // Determine winner
    const winner = finalPlayers.reduce((prev, current) => 
      current.gold > prev.gold ? current : prev
    );

    const finalGameState = {
      ...gameState,
      players: finalPlayers,
      gamePhase: 'finished' as const,
      winner
    };

    await saveGameState(finalGameState);
    toast.success(`Game ended! ${winner.name} wins with ${winner.gold} gold!`);
  }, [gameState, playerId, saveGameState]);

  return {
    selectedCastle,
    selectedTile,
    hasSelectedStartingTile,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn,
    abandonGame,
    endGame
  };
};