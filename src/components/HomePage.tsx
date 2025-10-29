import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Users, Plus } from 'lucide-react';
import { createRoom, joinRoom } from '@/utils/roomManager';
import { toast } from 'sonner';

interface HomePageProps {
  onRoomJoined: (roomCode: string, playerId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onRoomJoined }) => {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      const { room, playerId } = createRoom(playerName.trim());
      toast.success(`Room created! Code: ${room.code}`);
      onRoomJoined(room.code, playerId);
    } catch (error) {
      toast.error('Failed to create room');
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
      const result = joinRoom(roomCode.trim(), playerName.trim());
      if (result) {
        toast.success('Joined room successfully!');
        onRoomJoined(result.room.code, result.playerId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create Room</CardTitle>
            <p className="text-gray-600">Start a new game</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold mb-2">Kingdoms</CardTitle>
          <p className="text-gray-600">Strategic tile placement game</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
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

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
            <h4 className="font-semibold mb-2">How to play:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Create a room and share the code with friends</li>
              <li>• Place castles and tiles strategically</li>
              <li>• Score points from rows and columns</li>
              <li>• Game lasts 3 epochs - most gold wins!</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;