import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Users, Plus, Bug } from 'lucide-react';
import { createRoom, joinRoom } from '@/utils/roomManager';
import { toast } from 'sonner';

interface HomePageProps {
  onRoomJoined: (roomCode: string, playerId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onRoomJoined }) => {
  const [mode, setMode] = useState<'home' | 'create' | 'join' | 'debug'>('home');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    // Test localStorage on component mount
    try {
      localStorage.setItem('test', 'working');
      const test = localStorage.getItem('test');
      console.log('[DEBUG] localStorage test:', test);
      
      // Show current rooms in localStorage
      const rooms = localStorage.getItem('kingdoms_rooms');
      console.log('[DEBUG] Current rooms in localStorage:', rooms);
      setDebugInfo(`localStorage test: ${test}\nCurrent rooms: ${rooms || 'none'}`);
    } catch (error) {
      console.error('[DEBUG] localStorage error:', error);
      setDebugInfo(`localStorage error: ${error}`);
    }
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[DEBUG] About to create room for:', playerName.trim());
      const { room, playerId } = createRoom(playerName.trim());
      console.log('[DEBUG] Room created successfully:', { room, playerId });
      toast.success(`Room created! Code: ${room.code}`);
      onRoomJoined(room.code, playerId);
    } catch (error) {
      console.error('[DEBUG] Create room error:', error);
      toast.error('Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = () => {
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
      console.log('[DEBUG] About to join room:', { roomCode: roomCode.trim(), playerName: playerName.trim() });
      
      // Check what's in localStorage before joining
      const currentRooms = localStorage.getItem('kingdoms_rooms');
      console.log('[DEBUG] Current localStorage before join:', currentRooms);
      
      const result = joinRoom(roomCode.trim(), playerName.trim());
      console.log('[DEBUG] Join room result:', result);
      
      if (result) {
        toast.success('Joined room successfully!');
        onRoomJoined(result.room.code, result.playerId);
      }
    } catch (error) {
      console.error('[DEBUG] Join room error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const testLocalStorage = () => {
    try {
      // Create a test room manually
      const testData = {
        'TEST123': {
          id: 'test-room',
          code: 'TEST123',
          hostId: 'test-host',
          players: [{ id: 'test-host', name: 'Test Host', isHost: true, isReady: false }],
          maxPlayers: 4,
          status: 'waiting',
          createdAt: new Date()
        }
      };
      
      localStorage.setItem('kingdoms_rooms', JSON.stringify(testData));
      console.log('[DEBUG] Test room created in localStorage');
      
      // Try to retrieve it
      const retrieved = localStorage.getItem('kingdoms_rooms');
      console.log('[DEBUG] Retrieved test data:', retrieved);
      
      toast.success('Test room TEST123 created in localStorage');
      setDebugInfo(`Test room created: ${retrieved}`);
    } catch (error) {
      console.error('[DEBUG] Test failed:', error);
      toast.error('localStorage test failed');
    }
  };

  if (mode === 'debug') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Debug Info</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-gray-100 p-3 rounded text-xs font-mono whitespace-pre-wrap">
              {debugInfo}
            </div>
            
            <Button onClick={testLocalStorage} className="w-full">
              Create Test Room (TEST123)
            </Button>
            
            <Button 
              onClick={() => setMode('home')} 
              variant="outline" 
              className="w-full"
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                placeholder="Enter 6-letter code (try TEST123)"
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

          <Button 
            onClick={() => setMode('debug')} 
            variant="secondary" 
            className="w-full"
            size="sm"
          >
            <Bug className="mr-2 h-4 w-4" />
            Debug Info
          </Button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
            <h4 className="font-semibold mb-2">Testing Note:</h4>
            <p className="text-gray-600 text-xs">
              localStorage is isolated per browser/domain. For true cross-browser testing, 
              you'll need to use the same browser in different tabs/windows, or use the debug 
              mode to create a test room.
            </p>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
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