import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus, Wifi, LogOut, Crown } from 'lucide-react';
import { createRoom, joinRoom } from '@/utils/supabaseRoomManager';
import { useAuth } from '@/hooks/useAuth';
import Leaderboard from '@/components/Leaderboard';
import { toast } from 'sonner';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

interface HomePageProps {
  onRoomJoined: (roomCode: string, playerId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onRoomJoined }) => {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [playerName, setPlayerName] = useState(user?.user_metadata?.name || '');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.name && !playerName) {
      setPlayerName(user.user_metadata.name as string);
    }
  }, [user, playerName]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.info('Signed out');
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Sign out error:', error);
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      const { room, playerId } = await createRoom(playerName.trim(), user?.id);
      toast.success(`Room created! Code: ${room.code}`);
      onRoomJoined(room.code, playerId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create room');
      console.error('Create room error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      toast.error('Please enter room code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await joinRoom(roomCode.trim(), playerName.trim(), user?.id);
      if (result) {
        toast.success('Joined room successfully!');
        onRoomJoined(result.room.code, result.playerId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join room');
      console.error('Join room error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <div className="absolute top-4 right-4">
          <ThemeSwitcher />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create Room</CardTitle>
            <p className="text-gray-600">Start a new multiplayer game</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleCreateRoom} 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </Button>
              
              <Button 
                onClick={() => setMode('home')} 
                variant="outline" 
                className="w-full"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <div className="absolute top-4 right-4">
          <ThemeSwitcher />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Join Room</CardTitle>
            <p className="text-gray-600">Enter room code to join</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code</Label>
              <Input
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-letter code"
                maxLength={6}
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleJoinRoom} 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </Button>
              
              <Button 
                onClick={() => setMode('home')} 
                variant="outline" 
                className="w-full"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold mb-2">Kingdoms</CardTitle>
          <p className="text-gray-600">Strategic tile placement game</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-green-600">
            <Wifi className="h-4 w-4" />
            <span>Real-time multiplayer</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {authLoading ? (
            <div className="text-center text-sm text-muted-foreground py-1">Loading...</div>
          ) : user ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage
                    src={(user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || undefined}
                    alt={user.user_metadata?.name as string}
                  />
                  <AvatarFallback>
                    <Crown className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {(user.user_metadata?.name as string) || user.email}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Playing as {user.email}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="text-left">
                <p className="text-sm font-medium">Play anonymously</p>
                <p className="text-xs text-muted-foreground">
                  or log in to track your stats
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  signInWithGoogle().catch(err => {
                    toast.error('Failed to sign in with Google');
                    console.error('Google sign-in error:', err);
                  });
                }}
              >
                Continue with Google
              </Button>
            </div>
          )}

          <Button 
            onClick={() => setMode('create')} 
            className="w-full h-12 text-lg"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Room
          </Button>
          
          <Button 
            onClick={() => setMode('join')} 
            variant="outline" 
            className="w-full h-12 text-lg"
            size="lg"
          >
            <Users className="mr-2 h-5 w-5" />
            Join Room
          </Button>

          <div className="mt-6 p-4 bg-green-50 rounded-lg text-sm border border-green-200">
            <h4 className="font-semibold mb-2 text-green-800">🌍 Play with friends anywhere!</h4>
            <ul className="space-y-1 text-green-700 text-xs">
              <li>• Create a room and share the code</li>
              <li>• Friends can join from any device/location</li>
              <li>• Real-time synchronization</li>
              <li>• Cross-platform compatible</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
            <h4 className="font-semibold mb-2">How to play:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Place castles and tiles strategically</li>
              <li>• Score points from rows and columns</li>
              <li>• Game lasts 3 epochs - most gold wins!</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 w-full max-w-md">
        <Leaderboard limit={10} compact />
      </div>
    </div>
  );
};

export default HomePage;