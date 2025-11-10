import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Move, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        width?: string | number;
        height?: string | number;
        configOverwrite?: Record<string, any>;
        interfaceConfigOverwrite?: Record<string, any>;
      }
    ) => {
      dispose: () => void;
      executeCommand: (command: string, ...args: any[]) => void;
    };
  }
}

interface VideoChatProps {
  roomCode: string;
  playerName: string;
  isVisible: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const VideoChat: React.FC<VideoChatProps> = ({ roomCode, playerName, isVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [position, setPosition] = useState<Position>({ x: window.innerWidth - 320 - 16, y: 16 });
  const [size, setSize] = useState<Size>({ width: 320, height: 240 });
  const [initialMousePos, setInitialMousePos] = useState<Position>({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState<Size>({ width: 320, height: 240 });
  const [isCallActive, setIsCallActive] = useState(false);

  // Load saved position and size from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('videoChat_position');
    const savedSize = localStorage.getItem('videoChat_size');
    const savedMinimized = localStorage.getItem('videoChat_minimized');

    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        // Ensure position is within screen bounds
        const maxX = window.innerWidth - 200; // Minimum visible width
        const maxY = window.innerHeight - 100; // Minimum visible height
        setPosition({
          x: Math.max(0, Math.min(pos.x, maxX)),
          y: Math.max(0, Math.min(pos.y, maxY))
        });
      } catch (error) {
        console.error('Failed to parse saved position:', error);
      }
    }

    if (savedSize) {
      try {
        const sz = JSON.parse(savedSize);
        setSize({
          width: Math.max(200, Math.min(sz.width, window.innerWidth - 50)),
          height: Math.max(150, Math.min(sz.height, window.innerHeight - 50))
        });
      } catch (error) {
        console.error('Failed to parse saved size:', error);
      }
    }

    if (savedMinimized) {
      setIsMinimized(savedMinimized === 'true');
    }
  }, []);

  // Save position, size, and minimized state to localStorage
  const saveState = useCallback(() => {
    localStorage.setItem('videoChat_position', JSON.stringify(position));
    localStorage.setItem('videoChat_size', JSON.stringify(size));
    localStorage.setItem('videoChat_minimized', isMinimized.toString());
  }, [position, size, isMinimized]);

  // Save state whenever it changes
  useEffect(() => {
    saveState();
  }, [saveState]);

  // Handle window resize to keep video chat in bounds
  useEffect(() => {
    const handleWindowResize = () => {
      const maxX = window.innerWidth - 200;
      const maxY = window.innerHeight - 100;
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY))
      }));
      
      setSize(prev => ({
        width: Math.min(prev.width, window.innerWidth - 50),
        height: Math.min(prev.height, window.innerHeight - 50)
      }));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Mouse down handler for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === headerRef.current || headerRef.current?.contains(e.target as Node)) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      e.preventDefault();
    }
  }, []);

  // Mouse down handler for resizing
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    setInitialSize({ ...size });
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep within screen bounds
        const maxX = window.innerWidth - 200;
        const maxY = window.innerHeight - 100;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      } else if (isResizing) {
        const deltaX = e.clientX - initialMousePos.x;
        const deltaY = e.clientY - initialMousePos.y;
        
        const newWidth = Math.max(200, Math.min(initialSize.width + deltaX, window.innerWidth - position.x - 20));
        const newHeight = Math.max(150, Math.min(initialSize.height + deltaY, window.innerHeight - position.y - 20));
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDragging ? 'grabbing' : 'nw-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, dragOffset, initialMousePos, initialSize, position]);

  // Reset to default position and size
  const resetPosition = useCallback(() => {
    setPosition({ x: window.innerWidth - 320 - 16, y: 16 });
    setSize({ width: 320, height: 240 });
    setIsMinimized(false);
  }, []);

  // Initialize Jitsi
  useEffect(() => {
    if (!isVisible) return;

    // Wait for Jitsi script to load
    if (!window.JitsiMeetExternalAPI) {
      const checkJitsi = setInterval(() => {
        if (window.JitsiMeetExternalAPI) {
          clearInterval(checkJitsi);
          initializeJitsi();
        }
      }, 100);

      return () => clearInterval(checkJitsi);
    }

    initializeJitsi();

    function initializeJitsi() {
      if (apiRef.current) {
        console.log('Jitsi already initialized');
        return;
      }

      // Create the jitsi container if it doesn't exist
      if (!jitsiContainerRef.current) {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'jitsi-container';
        videoContainer.style.width = '100%';
        videoContainer.style.height = '100%';
        jitsiContainerRef.current = videoContainer;
        console.log('Created Jitsi container');
      }

      try {
        // Create a sanitized room name from room code
        const roomName = `kingdoms-${roomCode.replace(/[^a-zA-Z0-9]/g, '')}`;

        console.log('Initializing Jitsi with room:', roomName);

        const api = new window.JitsiMeetExternalAPI('8x8.vc', {
          roomName: `vpaas-magic-cookie-80fadb4224d14ab0accb8f61110de9ab/${roomName}`,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            disableInviteFunctions: true,
            disableThirdPartyRequests: true,
            enableWelcomePage: false,
            enableClosePage: false,
            enableLayerSuspension: true,
            enableNoAudioDetection: false,
            enableNoisyMicDetection: false,
            enableTalkWhileMuted: false,
            enableInsecureRoomNameWarning: false,
            disableRemoteMute: false,
            enableTCC: false,
            channelLastN: -1,
            startAudioOnly: false,
            startScreenSharing: false,
            hideDisplayName: false,
            hideEmailInSettings: true,
            defaultLanguage: 'en',
            disableProfile: true,
            disableJoinLeaveSounds: true,
            disableJoinLeaveNotifications: true,
            disableKnockingSounds: true,
            disableRemoteVideo: false,
            disableLocalVideo: false,
            enableRemb: true,
            enableIceRestart: true,
            enableLipSync: false,
            openBridgeChannel: 'websocket',
            p2p: {
              enabled: true,
              stunServers: [
                { urls: 'stun:stun.l.google.com:19302' }
              ]
            },
            analytics: {
              disabled: true
            }
          },
          interfaceConfigOverwrite: {
            APP_NAME: 'Kingdoms',
            NATIVE_APP_NAME: 'Kingdoms',
            PROVIDER_NAME: 'Kingdoms',
            DEFAULT_LANGUAGE: 'en',
            DEFAULT_BACKGROUND: '#1a1a1a',
            DEFAULT_REMOTE_DISPLAY_NAME: 'Fellow Player',
            DEFAULT_DOMAIN: '8x8.vc',
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            DISABLE_PRESENCE_STATUS: true,
            DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
            DISABLE_FOCUS_INDICATOR: true,
            DISABLE_RINGING: true,
            DISABLE_VIDEO_BACKGROUND: false,
            HIDE_INVITE_MORE_HEADER: true,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            INITIAL_TOOLBAR_TIMEOUT: 20000,
            TOOLBAR_TIMEOUT: 4000,
            FILM_STRIP_MAX_HEIGHT: 90,
            TILE_VIEW_MAX_COLUMNS: 5,
            VERTICAL_FILMSTRIP: true,
            ENABLE_DIAL_OUT: false,
            ENABLE_FILE_UPLOAD: false,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'hangup',
              'settings',
              'videoquality',
              'filmstrip'
            ],
            SETTINGS_SECTIONS: ['devices', 'language']
          }
        });

        apiRef.current = api;
        setIsCallActive(true);

        // Set display name
        api.executeCommand('displayName', playerName);

        // Listen for hangup events
        api.addEventListener('videoConferenceLeft', () => {
          console.log('User left the video conference');
          setIsCallActive(false);
        });

        // Listen for ready event
        api.addEventListener('videoConferenceJoined', () => {
          console.log('User joined the video conference');
          setIsCallActive(true);
        });

        console.log('Jitsi initialized successfully');
      } catch (error) {
        console.error('Error initializing Jitsi:', error);
        setIsCallActive(false);
      }
    }

    return () => {
      // Only dispose when component is truly unmounting
      if (apiRef.current) {
        console.log('Disposing Jitsi API');
        try {
          apiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi API:', error);
        }
        apiRef.current = null;
        setIsCallActive(false);
      }
    };
  }, [isVisible, roomCode, playerName]);

  // Handle minimize/maximize
  const handleMinimizeToggle = useCallback(() => {
    console.log('Toggling minimize state from', isMinimized, 'to', !isMinimized);
    setIsMinimized(prev => !prev);
  }, [isMinimized]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const headerHeight = 40;
  const minimizedHeight = 60;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? `${minimizedHeight}px` : `${size.height}px`,
        transition: isDragging || isResizing ? 'none' : 'height 0.3s ease',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header with drag handle */}
      <div
        ref={headerRef}
        className={cn(
          "bg-blue-600 text-white px-3 py-2 flex items-center justify-between flex-shrink-0 select-none",
          "cursor-grab active:cursor-grabbing"
        )}
        style={{ height: `${headerHeight}px` }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move className="h-4 w-4 opacity-70" />
          <span className="text-sm font-semibold">Video Chat</span>
          {isCallActive && (
            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            onClick={resetPosition}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-blue-700"
            title="Reset position and size"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          
          <Button
            onClick={handleMinimizeToggle}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-blue-700"
            title={isMinimized ? 'Expand video (call continues)' : 'Minimize video (call continues)'}
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      
      {/* Video container - ALWAYS present in DOM, just hidden when minimized */}
      <div 
        className="flex-1 bg-gray-900 min-h-0 relative"
        style={{ 
          height: `${size.height - headerHeight - 20}px`,
          display: isMinimized ? 'none' : 'block'
        }}
      >
        {/* Jitsi container is permanently mounted here */}
        <div
          ref={(el) => {
            if (el && jitsiContainerRef.current && !el.contains(jitsiContainerRef.current)) {
              el.appendChild(jitsiContainerRef.current);
            }
          }}
          className="w-full h-full"
        />
      </div>
      
      {/* Resize handle - only show when not minimized */}
      {!isMinimized && (
        <div
          ref={resizeHandleRef}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-blue-600 opacity-50 hover:opacity-75"
          style={{
            clipPath: 'polygon(100% 0, 0 100%, 100% 100%)'
          }}
          onMouseDown={handleResizeMouseDown}
          title="Drag to resize"
        />
      )}
      
      {/* Minimized content */}
      {isMinimized && (
        <div className="px-3 py-2 text-sm text-gray-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Video chat minimized</span>
            {isCallActive && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Call active
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {size.width}×{size.height}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoChat;