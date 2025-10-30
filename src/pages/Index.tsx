import React, { useState, useEffect } from 'react';
import { Room } from '@/types/room';
import { GameState } from '@/types/game';
import HomePage from '@/components/HomePage';
import GameLobby from '@/components/GameLobby';
import GameBoard from '@/components/GameBoard';
import PlayerPanel from '@/components/PlayerPanel';
import GameActions from '@/components/GameActions';
import ScoreDisplay from '@/components/ScoreDisplay';
import GameLog from '@/components/GameLog';
import EpochScoreScreen from '@/components/EpochScoreScreen';
import { useGamePlay } from '@/hooks/useGamePlay';
import { supabase } from '@/integrations/supabase/client';
import { getRoom, getGameState } from '@/utils/supabaseRoomManager';
import { saveGameSession, loadGameSession, clearGameSession, updateSessionState } from '@/utils/sessionManager';
import { toast } from 'sonner';

type AppState = 'home' | 'lobby' | 'playing';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('home');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const {
    selectedCastle,
    selectedTile,
    hasSelectedStartingTile,
    showEpochScores,
    epochScores,
    completedEpoch,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn,
    abandonGame,
    endGame,
    continueToNextEpoch
  } = useGamePlay(gameState, playerId, room?.id || '', setGameState);

  // Restore session on page load
  useEffect(() => {
    const restoreSession = async () => {
      console.log('=== ATTEMPTING SESSION RESTORATION ===');
      
      const session = loadGameSession();
      if (!session) {
        console.log('No session to restore');
        setIsRestoring(false);
        return;
      }

      console.log('Restoring session:', session);
      
      try {
        // Restore basic session data
        setRoomCode(session.roomCode);
        setPlayerId(session.playerId);
        
        // Get current room data
        const currentRoom = await getRoom(session.roomCode);
        if (!currentRoom) {
          console.log('Room no longer exists, clearing session');
          clearGameSession();
          setIsRestoring(false);
          toast.error('Room no longer exists');
          return;
        }

        // Check if player is still in the room
        const playerInRoom = currentRoom.players.find(p => p.id === session.playerId);
        if (!playerInRoom) {
          console.log('Player no longer in room, clearing session');
          clearGameSession();
          setIsRestoring(false);
          toast.error('You are no longer in this room');
          return;
        }

        setRoom(currentRoom);

        // Restore appropriate app state
        if (session.appState === 'playing' || currentRoom.status === 'playing') {
          // Try to get game state
          const currentGameState = await getGameState(currentRoom.id);
          if (currentGameState) {
            console.log('Restored game state:', currentGameState);
            setGameState(currentGameState);
            setAppState('playing');
            updateSessionState('playing');
            toast.success('Game restored successfully!');
          } else {
            console.log('No game state found, going to lobby');
            setAppState('lobby');
            updateSessionState('lobby');
            toast.info('Rejoined room lobby');
          }
        } else {
          // Go to lobby
          setAppState('lobby');
          updateSessionState('lobby');
          toast.info('Rejoined room lobby');
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        clearGameSession();
        toast.error('Failed to restore session');
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, []);

  // Set up real-time subscription for game state updates
  useEffect(() => {
    if (!room?.id || appState !== 'playing') return;

    console.log('=== SETTING UP GAME STATE SUBSCRIPTION ===');
    console.log('Room ID:', room.id);
    console.log('Player ID:', playerId);

    const channel = supabase
      .channel(`game-state-${room.id}-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('=== GAME STATE REAL-TIME UPDATE ===');
          console.log('Event type:', payload.eventType);
          console.log('Player ID:', playerId);
          
          if (payload.new && payload.new.game_state) {
            const updatedGameState = payload.new.game_state as GameState;
            console.log('=== UPDATING GAME STATE FROM REAL-TIME ===');
            console.log('Current player index:', updatedGameState.currentPlayerIndex);
            console.log('Current player:', updatedGameState.players[updatedGameState.currentPlayerIndex]?.name);
            setGameState(updatedGameState);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('=== GAME STATE SUBSCRIPTION STATUS ===');
        console.log('Status:', status);
        if (err) {
          console.error('Subscription error:', err);
        }
      });

    return () => {
      console.log('=== CLEANING UP GAME STATE SUBSCRIPTION ===');
      supabase.removeChannel(channel);
    };
  }, [room?.id, appState, playerId]);

  const handleRoomJoined = (code: string, id: string) => {
    console.log('=== ROOM JOINED ===');
    console.log('Room code:', code);
    console.log('Player ID:', id);
    
    setRoomCode(code);
    setPlayerId(id);
    setAppState('lobby');
    
    // Save session
    saveGameSession({
      appState: 'lobby',
      roomCode: code,
      playerId: id,
      roomId: '', // Will be updated when we get room data
      playerName: '' // Will be updated when we get room data
    });
  };

  const handleGameStart = (roomData: Room, initialGameState: GameState) => {
    console.log('=== GAME START TRIGGERED ===');
    console.log('Room data:', roomData);
    console.log('Initial game state:', initialGameState);
    console.log('Player ID:', playerId);
    
    setRoom(roomData);
    setGameState(initialGameState);
    setAppState('playing');
    
    // Update session
    const playerInRoom = roomData.players.find(p => p.id === playerId);
    saveGameSession({
      appState: 'playing',
      roomCode: roomData.code,
      playerId: playerId,
      roomId: roomData.id,
      playerName: playerInRoom?.name || ''
    });
  };

  const handleLeaveRoom = () => {
    console.log('=== LEAVING ROOM ===');
    
    setAppState('home');
    setRoomCode('');
    setPlayerId('');
    setRoom(null);
    setGameState(null);
    
    // Clear session
    clearGameSession();
  };

  const handleAbandonGame = async () => {
    if (window.confirm('Are you sure you want to abandon the game? This will end the game for all players if you are the last one.')) {
      await abandonGame();
      // After abandoning, go back to home
      setTimeout(() => {
        handleLeaveRoom();
      }, 2000); // Give time for the toast message
    }
  };

  const handleEndGame = async () => {
    if (window.confirm('Are you sure you want to end the game? This will calculate final scores and finish the game for all players.')) {
      await endGame();
    }
  };

  // Handle game state updates from epoch score screen
  const handleGameStateUpdateFromEpochScreen = (newGameState: GameState) => {
    console.log('=== GAME STATE UPDATE FROM EPOCH SCREEN ===');
    console.log('New game state:', newGameState);
    console.log('New epoch:', newGameState.epoch);
    console.log('New phase:', newGameState.gamePhase);
    
    setGameState(newGameState);
    
    // Update session if needed
    if (room) {
      const playerInRoom = room.players.find(p => p.id === playerId);
      saveGameSession({
        appState: 'playing',
        roomCode: room.code,
        playerId: playerId,
        roomId: room.id,
        playerName: playerInRoom?.name || ''
      });
    }
  };

  // Show loading screen while restoring session
  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Restoring your game session...</p>
        </div>
      </div>
    );
  }

  if (appState === 'home') {
    return <HomePage onRoomJoined={handleRoomJoined} />;
  }

  if (appState === 'lobby') {
    return (
      <GameLobby
        roomCode={roomCode}
        playerId={playerId}
        onGameStart={handleGameStart}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  // Show epoch score screen if needed
  if (showEpochScores) {
    const isHost = gameState.players[0]?.id === playerId;
    return (
      <EpochScoreScreen
        gameState={gameState}
        epochScores={epochScores}
        epochNumber={completedEpoch}
        onContinue={continueToNextEpoch}
        onGameStateUpdate={handleGameStateUpdateFromEpochScreen}
        isHost={isHost}
        roomId={room?.id || ''}
      />
    );
  }

  if (gameState.gamePhase === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Game Over!</h1>
          {gameState.winner ? (
            <h2 className="text-2xl text-yellow-600 mb-6">
              🏆 {gameState.winner.name} Wins! 🏆
            </h2>
          ) : (
            <h2 className="text-2xl text-gray-600 mb-6">
              Game Ended
            </h2>
          )}
          <div className="space-y-2 mb-6">
            {gameState.players
              .sort((a, b) => b.gold - a.gold)
              .map((player, index) => (
                <div key={player.id} className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                    <span>{player.name}</span>
                  </span>
                  <span className="font-bold text-yellow-600">{player.gold} Gold</span>
                </div>
              ))}
          </div>
          <button
            onClick={() => {
              clearGameSession();
              window.location.reload();
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const ownPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = currentPlayer?.id === playerId;

  return (
    <div className="min-h-screen bg-gray-100 p-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-2xl font-bold mb-1">Kingdoms</h1>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-gray-600">
              Epoch {gameState.epoch} of 3
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">
              Room: {roomCode}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-blue-600">
              You are: {ownPlayer?.name}
            </span>
          </div>
          
          {/* Turn Status */}
          <div className={`mt-2 p-3 rounded-lg ${
            isMyTurn 
              ? 'bg-green-100 border border-green-300' 
              : 'bg-gray-100 border border-gray-300'
          }`}>
            {isMyTurn ? (
              <div className="text-green-800 font-semibold">
                🎯 It's YOUR turn! Make your move.
              </div>
            ) : (
              <div className="text-gray-700">
                ⏳ Waiting for <span className="font-semibold">{currentPlayer?.name}</span>'s turn
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Left Column - Players and Game Log */}
          <div className="lg:col-span-1 space-y-3">
            {/* Players */}
            <div className="space-y-2">
              {gameState.players.map(player => (
                <PlayerPanel
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === currentPlayer.id}
                  isOwnPlayer={player.id === playerId}
                  onCastleSelect={setSelectedCastle}
                  onStartingTileSelect={selectStartingTile}
                  selectedCastle={selectedCastle}
                  hasSelectedStartingTile={hasSelectedStartingTile && player.id === playerId}
                  selectedTile={selectedTile} // Pass selectedTile to disable interactions
                />
              ))}
            </div>
            
            {/* Game Log below players */}
            <GameLog gameState={gameState} />
          </div>

          {/* Center Column - Game Board */}
          <div className="lg:col-span-3 flex justify-center">
            <div className="w-full max-w-2xl">
              <GameBoard
                gameState={gameState}
                onCellClick={handleCellClick}
                selectedCastle={selectedCastle}
                selectedTile={selectedTile}
              />
            </div>
          </div>

          {/* Right Column - Actions and Scores */}
          <div className="lg:col-span-1 space-y-3">
            <GameActions
              gameState={gameState}
              currentPlayer={currentPlayer}
              onDrawTile={drawAndPlaceTile}
              onPass={passTurn}
              onAbandonGame={handleAbandonGame}
              onEndGame={handleEndGame}
              selectedCastle={selectedCastle}
              selectedTile={selectedTile}
              hasSelectedStartingTile={hasSelectedStartingTile}
              playerId={playerId}
            />
            <ScoreDisplay gameState={gameState} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;