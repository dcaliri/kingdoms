import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, Crown, Check, X, Wifi } from 'lucide-react';
import { Room } from '@/types/room';
import { getRoom, setPlayerReady, startGame, leaveRoom, subscribeToRoom } from '@/utils/supabaseRoomManager';
import { toast } from 'sonner';

interface GameLobbyProps {
  roomCode: string;
  playerId: string;
  onGameStart: (room: Room) => void;
  onLeaveRoom: () => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({ 
  roomCode, 
  playerId, 
  onGameStart, 
  onLeaveRoom 
}) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    console.log('GameLobby mounted with:', { roomCode, playerId });
    
    // Initial room load
    const loadRoom = async () => {
      try {
        console.log('Loading initial room data...');
        const currentRoom = await getRoom(roomCode);
        console.log('Initial room data:', currentRoom);
        if (currentRoom) {
          setRoom(currentRoom);
        }
      } catch (error) {
        console.error('Error loading room:', error);
        toast.error('Failed to load room');
      }
    };

    loadRoom();

    // Set up real-time subscription
    const unsubscribe = subscribeToRoom(roomCode, (updatedRoom) => {
      console.log('Received room update:', updatedRoom);
      if (updatedRoom) {
        setRoom(updatedRoom);
        
        // Check if game started
        if (updatedRoom.status === 'playing') {
          console.log('Game started, transitioning...');
          onGameStart(updatedRoom);
        }
      }
      setIsConnected(true);
    });

    // Connection status monitoring
    const connectionInterval = setInterval(() => {
      setIsConnected(navigator.onLine);
    }, 5000);

    return () => {
      console.log('GameLobby unmounting, cleaning up...');
      unsubscribe();
      clearInterval(connectionInterval);
    };
  }, [roomCode, playerId, onGameStart]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Room code copied to clipboard!');
  };

  const handleToggleReady = async () => {
    if (isLoading || !room) return;
    
    const currentPlayer = room.players.find(p => p.id === playerId);
    if (!currentPlayer) {
      toast.error('Player not found in room');
      return;
    }

    const newReadyState = !currentPlayer.isReady;
    console.log('Toggling ready state:', { playerId, currentReady: currentPlayer.isReady, newReady: newReadyState });
    
    setIsLoading(true);
    try {
      await setPlayerReady(playerId, roomCode, newReadyState);
      toast.success(newReadyState ? 'You are ready!' : 'Ready status removed');
    } catch (error) {
      toast.error('Failed to update ready status');
      console.error('Ready toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await startGame(playerId, roomCode);
      toast.success('Game starting!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start game');
      console.error('Start game error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await leaveRoom(playerId, roomCode);
      onLeaveRoom();
      toast.info('Left the room');
    } catch (error) {
      toast.error('Failed to leave room');
      console.error('Leave room error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost || false;
  const canStartGame = room.status === 'ready' && isHost;
  const allPlayersReady = room.players.length >= 2 && room.players.every(p => p.isReady);

  console.log('Render state:', { 
    currentPlayer, 
    isHost, 
    canStartGame, 
    allPlayersReady, 
    roomStatus: room.status,
    players: room.players.map(p => ({ name: p.name, isReady: p.isReady }))
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Game Lobby</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">
                {roomCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Connection lost'}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Players List */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5" />
                <h3 className="text-lg font-semibold">
                  Players ({room.players.length}/{room.maxPlayers})
                </h3>
              </div>
              
              <div className="space-y-2">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {player.color && (
                        <div className={`w-4 h-4 rounded-full ${
                          player.color === 'red' ? 'bg-red-500' :
                          player.color === 'blue' ? 'bg-blue-500' :
                          player.color === 'yellow' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                      )}
                      <span className="font-medium">{player.name}</span>
                      {player.isHost && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      {player.id === playerId && (
                        <span className="text-xs text-blue-600">(You)</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {player.isReady ? (
                        <Badge variant="default" className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="h-3 w-3 mr-1" />
                          Not Ready
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Status */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              {room.players.length < 2 ? (
                <p className="text-gray-600">Waiting for more players to join...</p>
              ) : allPlayersReady ? (
                <p className="text-green-600 font-semibold">All players ready! Host can start the game.</p>
              ) : (
                <p className="text-gray-600">Waiting for all players to be ready...</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleToggleReady}
                variant={currentPlayer?.isReady ? "default" : "outline"}
                className="flex-1"
                disabled={isLoading || !isConnected}
              >
                {isLoading ? (
                  'Updating...'
                ) : currentPlayer?.isReady ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Ready!
                  </>
                ) : (
                  "I'm Ready"
                )}
              </Button>

              {isHost && (
                <Button
                  onClick={handleStartGame}
                  disabled={!canStartGame || isLoading || !isConnected}
                  className="flex-1"
                  variant="default"
                >
                  {isLoading ? 'Starting...' : 'Start Game'}
                </Button>
              )}
            </div>

            <Button
              onClick={handleLeaveRoom}
              variant="destructive"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Leaving...' : 'Leave Room'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GameLobby;