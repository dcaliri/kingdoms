import React, { useState, useCallback } from 'react';
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
import { toast } from 'sonner';

export const useKingdomsGame = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [selectedCastle, setSelectedCastle] = useState<Castle | undefined>();
  const [selectedTile, setSelectedTile] = useState<Tile | undefined>();
  const [hasSelectedStartingTile, setHasSelectedStartingTile] = useState(false);

  const initializeGameFromRoom = useCallback((room: Room, playerId: string) => {
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

    setGameState(initialGameState);
    setCurrentPlayerId(playerId);
    setSelectedCastle(undefined);
    setSelectedTile(undefined);
    setHasSelectedStartingTile(false);
    
    toast.success('Game started!');
  }, []);

  const placeCastle = useCallback((castle: Castle, row: number, col: number) => {
    if (!gameState || !isValidPosition(row, col, gameState.board)) {
      toast.error('Invalid position');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (castle.color !== currentPlayer.color || currentPlayer.id !== currentPlayerId) {
      toast.error('Not your turn or not your castle');
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;

      const newBoard = prev.board.map(r => [...r]);
      const updatedCastle = { ...castle, position: { row, col } };
      newBoard[row][col] = updatedCastle;

      const updatedPlayers = prev.players.map(player => {
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

      return {
        ...prev,
        board: newBoard,
        players: updatedPlayers,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length
      };
    });

    setSelectedCastle(undefined);
    toast.success('Castle placed!');
  }, [gameState, currentPlayerId]);

  const drawAndPlaceTile = useCallback(() => {
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
    
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tileSupply: prev.tileSupply.slice(1)
      };
    });

    toast.success(`Drew ${drawnTile.name} - click an empty space to place it`);
  }, [gameState, currentPlayerId]);

  const placeTile = useCallback((tile: Tile, row: number, col: number) => {
    if (!gameState || !isValidPosition(row, col, gameState.board)) {
      toast.error('Invalid position');
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== currentPlayerId) {
      toast.error('Not your turn');
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;

      const newBoard = prev.board.map(r => [...r]);
      const updatedTile = { ...tile, position: { row, col } };
      newBoard[row][col] = updatedTile;

      return {
        ...prev,
        board: newBoard,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length
      };
    });

    setSelectedTile(undefined);
    setHasSelectedStartingTile(false);
    toast.success('Tile placed!');
  }, [gameState, currentPlayerId]);

  const placeStartingTile = useCallback((row: number, col: number) => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.startingTile || currentPlayer.id !== currentPlayerId) {
      toast.error('No starting tile available or not your turn');
      return;
    }

    placeTile(currentPlayer.startingTile, row, col);
    
    setGameState(prev => {
      if (!prev) return prev;
      
      const updatedPlayers = prev.players.map(player => {
        if (player.id === currentPlayer.id) {
          return { ...player, startingTile: undefined };
        }
        return player;
      });

      return { ...prev, players: updatedPlayers };
    });
  }, [gameState, currentPlayerId, placeTile]);

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

  const passTurn = useCallback(() => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== currentPlayerId) {
      toast.error('Not your turn');
      return;
    }

    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length
      };
    });

    setSelectedCastle(undefined);
    setSelectedTile(undefined);
    setHasSelectedStartingTile(false);
    toast.info('Turn passed');
  }, [gameState, currentPlayerId]);

  const checkEpochEnd = useCallback(() => {
    if (!gameState) return;

    const boardFull = gameState.board.every(row => row.every(cell => cell !== null));
    const noPlayerCanAct = gameState.players.every(player => !canPlayerAct(player, gameState));

    if (boardFull || noPlayerCanAct) {
      // End epoch and score
      const scores = calculateScore(gameState);
      
      setGameState(prev => {
        if (!prev) return prev;

        // Update player gold
        const updatedPlayers = prev.players.map(player => ({
          ...player,
          gold: Math.max(0, player.gold + (scores[player.id] || 0))
        }));

        if (prev.epoch === 3) {
          // Game over
          const winner = updatedPlayers.reduce((prev, current) => 
            current.gold > prev.gold ? current : prev
          );

          toast.success(`Game Over! ${winner.name} wins with ${winner.gold} gold!`);

          return {
            ...prev,
            players: updatedPlayers,
            gamePhase: 'finished',
            winner
          };
        } else {
          // Prepare next epoch
          const nextEpoch = (prev.epoch + 1) as 1 | 2 | 3;
          
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

          toast.success(`Epoch ${prev.epoch} complete! Starting Epoch ${nextEpoch}`);

          return {
            ...prev,
            players: resetPlayers,
            epoch: nextEpoch,
            board: Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)),
            tileSupply: shuffledTiles,
            currentPlayerIndex: newFirstPlayerIndex,
            scores: { ...prev.scores, [`epoch${prev.epoch}`]: scores }
          };
        }
      });
    }
  }, [gameState]);

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