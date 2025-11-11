import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Copy, Users, Crown, Check, X, Wifi, RefreshCw, Shuffle } from 'lucide-react';
import { Room } from '@/types/room';
import { getRoom, setPlayerReady, startGame, leaveRoom, subscribeToRoom, getGameState, updateRoomVariant } from '@/utils/supabaseRoomManager';
import { saveGameSession, updateSessionState } from '@/utils/sessionManager';
import { toast } from 'sonner';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

interface GameLobbyProps {
  roomCode: string;
  playerId: string;
  onGameStart: (room: Room, gameState: any) => void;
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
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [useVariant, setUseVariant] = useState(false);
  const [isUpdatingVariant, setIsUpdatingVariant] = useState(false);

  const refreshRoom = useCallback(async () => {
    try {
      console.log('Manually refreshing room data...');
      const currentRoom = await getRoom(roomCode);
      console.log('Manual refresh result:', currentRoom);
      if (currentRoom) {
        setRoom(currentRoom);
        setLastUpdate(Date.now());
        
        // Update variant checkbox based on room data
        setUseVariant(currentRoom.variant === 'tile-swap');
        
        // Update session with room data
        const playerInRoom = currentRoom.players.find(p => p.id === playerId);
        if (playerInRoom) {
          saveGameSession({
            appState: 'lobby',
            roomCode: currentRoom.code,
            playerId: playerId,
            roomId: currentRoom.id,
            playerName: playerInRoom.name
          });
        }
        
        // Check if game has started
        if (currentRoom.status === 'playing') {
          console.log('Game is playing after refresh, getting game state...');
          const gameState = await getGameState(currentRoom.id);
          if (gameState) {
            console.log('Found game state, transitioning to game...');
            onGameStart(currentRoom, gameState);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing room:', error);
      toast.error('Failed to refresh room');
    }
  }, [roomCode, onGameStart, playerId]);

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
          setLastUpdate(Date.now());
          
          // Set variant checkbox based on room data
          setUseVariant(currentRoom.variant === 'tile-swap');
          
          // Save session data
          const playerInRoom = currentRoom.players.find(p => p.id === playerId);
          if (playerInRoom) {
            saveGameSession({
              appState: 'lobby',
              roomCode: currentRoom.code,
              playerId: playerId,
              roomId: currentRoom.id,
              playerName: playerInRoom.name
            });
          }
          
          // Check if game is already playing
          if (currentRoom.status === 'playing') {
            console.log('Game already playing, getting game state...');
            const gameState = await getGameState(currentRoom.id);
            if (gameState) {
              console.log('Found game state, transitioning immediately...');
              onGameStart(currentRoom, gameState);
            }
          }
        }
      } catch (error) {
        console.error('Error loading room:', error);
        toast.error('Failed to load room');
      }
    };

    loadRoom();

    // Set up real-time subscription
    const unsubscribe = subscribeToRoom(roomCode, async (updatedRoom) => {
      console.log('Received room update via subscription:', updatedRoom);
      if (updatedRoom) {
        setRoom(updatedRoom);
        setLastUpdate(Date.now());
        
        // Update variant checkbox - but only if we're not currently updating it
        if (!isUpdatingVariant) {
          setUseVariant(updatedRoom.variant === 'tile-swap');
        }
        
        // Update session data
        const playerInRoom = updatedRoom.players.find(p => p.id === playerId);
        if (playerInRoom) {
          saveGameSession({
            appState: 'lobby',
            roomCode: updatedRoom.code,
            playerId: playerId,
            roomId: updatedRoom.id,
            playerName: playerInRoom.name
          });
        }
        
        // Check if game started
        if (updatedRoom.status === 'playing') {
          console.log('Game started via subscription, getting game state...');
          const gameState = await getGameState(updatedRoom.id);
          if (gameState) {
            console.log('Found game state, transitioning to game...');
            onGameStart(updatedRoom, gameState);
          }
        }
      }
      setIsConnected(true);
    });

    // Connection status monitoring
    const connectionInterval = setInterval(() => {
      setIsConnected(navigator.onLine);
    }, 5000);

    // Auto-refresh every 5 seconds as backup
    const autoRefreshInterval = setInterval(refreshRoom, 5000);

    return () => {
      console.log('GameLobby unmounting, cleaning up...');
      unsubscribe();
      clearInterval(connectionInterval);
      clearInterval(autoRefreshInterval);
    };
  }, [roomCode, playerId, onGameStart, refreshRoom, isUpdatingVariant]);

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
      
      // Force refresh after a short delay to ensure we get the updated state
      setTimeout(refreshRoom, 1000);
    } catch (error) {
      toast.error('Failed to update ready status');
      console.error('Ready toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariantChange = async (checked: boolean) => {
    if (!room) return;
    
    const currentPlayer = room.players.find(p => p.id === playerId);
    if (!currentPlayer?.isHost) {
      toast.error('Only the host can change game variant');
      return;
    }

    console.log('=== VARIANT CHANGE REQUESTED ===');
    console.log('Checked:', checked);
    console.log('Current variant:', room.variant);

    setIsUpdatingVariant(true);
    setUseVariant(checked); // Update UI immediately

    try {
      const newVariant = checked ? 'tile-swap' : 'classic';
      console.log('Updating room variant to:', newVariant);
      
      await updateRoomVariant(roomCode, playerId, newVariant);
      
      console.log('=== VARIANT UPDATE SUCCESS ===');
      toast.success(checked ? 'Tile Swap Variant enabled!' : 'Classic mode selected');
      
      // Force refresh to get updated room data
      setTimeout(refreshRoom, 500);
    } catch (error) {
      console.error('=== VARIANT UPDATE FAILED ===');
      console.error('Error:', error);
      
      // Revert the checkbox on error
      setUseVariant(!checked);
      toast.error('Failed to update game variant');
    } finally {
      // Clear the updating flag after a delay to allow subscription to update
      setTimeout(() => {
        setIsUpdatingVariant(false);
      }, 2000);
    }
  };

  const handleStartGame = async () => {
    if (isLoading || !room) return;
    
    console.log('Starting game...', { hostId: playerId, roomCode, roomStatus: room.status, variant: useVariant ? 'tile-swap' : 'classic' });
    
    setIsLoading(true);
    try {
      // Pass variant information to startGame
      const updatedRoom = await startGame(playerId, roomCode, useVariant ? 'tile-swap' : 'classic');
      console.log('Start game result:', updatedRoom);
      
      if (updatedRoom) {
        toast.success(`Game starting! ${useVariant ? '(Tile Swap Variant)' : '(Classic Mode)'}`);
        setRoom(updatedRoom);
        
        // Get the game state that was just created
        const gameState = await getGameState(updatedRoom.id);
        if (gameState) {
          console.log('Game started successfully, transitioning...');
          onGameStart(updatedRoom, gameState);
        } else {
          console.error('Game started but no game state found');
          toast.error('Game started but failed to load game state');
        }
      } else {
        console.error('Start game returned null');
        toast.error('Failed to start game - no room returned');
      }
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost || false;
  const canStartGame = room.status === 'ready' && isHost;
  const allPlayersReady = room.players.length >= 2 && room.players.every(p => p.isReady);

  return (
    <div className="min-h-screen bg-background p-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcher />
      </div>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Game Lobby</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-lg font-mono bg-muted px-3 py-1 rounded">
                {roomCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshRoom}
                title="Refresh room"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Connection lost'}
              </span>
              <span className="text-xs text-muted-foreground">
                • Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Game Variant Selection - Only for Host */}
            {isHost && (
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <Shuffle className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Game Variant</h3>
                  {isUpdatingVariant && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="variant-checkbox"
                    checked={useVariant}
                    onCheckedChange={handleVariantChange}
                    disabled={isLoading || isUpdatingVariant}
                  />
                  <Label htmlFor="variant-checkbox" className="text-sm font-medium cursor-pointer">
                    Enable Tile Swap Variant
                  </Label>
                </div>
                
                <div className="mt-3 text-xs text-muted-foreground">
                  {useVariant ? (
                    <div className="space-y-1">
                      <div className="font-semibold text-primary">🔄 Tile Swap Variant Active</div>
                      <div>• When you draw a tile, you can choose to swap it with your starting tile</div>
                      <div>• The drawn tile becomes your new starting tile</div>
                      <div>• You then place the previous starting tile</div>
                      <div>• This adds strategic depth to tile management!</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-semibold">📋 Classic Mode</div>
                      <div>• Standard rules: drawn tiles must be placed immediately</div>
                      <div>• Starting tiles are played separately</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show variant status for non-hosts */}
            {!isHost && (
              <div className="bg-muted/30 p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Shuffle className="h-4 w-4" />
                  <span className="font-medium">
                    Game Mode: {useVariant ? 'Tile Swap Variant' : 'Classic'}
                  </span>
                  {useVariant && (
                    <Badge variant="secondary" className="text-xs">
                      🔄 Variant
                    </Badge>
                  )}
                </div>
                {useVariant && (
                  <div className="text-xs text-muted-foreground mt-1">
                    You can swap drawn tiles with your starting tile
                  </div>
                )}
              </div>
            )}

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
                    className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
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
                        <span className="text-xs text-primary">(You)</span>
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
            <div className="text-center p-4 bg-muted rounded-lg">
              {room.players.length < 2 ? (
                <p className="text-muted-foreground">Waiting for more players to join...</p>
              ) : allPlayersReady ? (
                <p className="text-green-600 dark:text-green-400 font-semibold">All players ready! Host can start the game.</p>
              ) : (
                <p className="text-muted-foreground">Waiting for all players to be ready...</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Room status: {room.status}</p>
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