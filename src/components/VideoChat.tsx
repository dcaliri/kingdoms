import React, { useEffect, useRef, useState } from 'react';

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

const VideoChat: React.FC<VideoChatProps> = ({ roomCode, playerName, isVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

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
      if (!containerRef.current || apiRef.current) return;

      try {
        // Create a sanitized room name from room code
        const roomName = `kingdoms-${roomCode.replace(/[^a-zA-Z0-9]/g, '')}`;

        const api = new window.JitsiMeetExternalAPI('8x8.vc', {
          roomName: `vpaas-magic-cookie-80fadb4224d14ab0accb8f61110de9ab/${roomName}`,
          parentNode: containerRef.current,
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

        // Set display name
        api.executeCommand('displayName', playerName);

        // Cleanup function
        return () => {
          if (apiRef.current) {
            try {
              apiRef.current.dispose();
            } catch (error) {
              console.error('Error disposing Jitsi API:', error);
            }
            apiRef.current = null;
          }
        };
      } catch (error) {
        console.error('Error initializing Jitsi:', error);
      }
    }

    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi API:', error);
        }
        apiRef.current = null;
      }
    };
  }, [isVisible, roomCode, playerName]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isMinimized 
        ? 'w-48 sm:w-64 h-12 sm:h-16' 
        : 'w-72 sm:w-80 h-48 sm:h-60'
    }`}>
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
        {/* Header with minimize button */}
        <div className="bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-xs sm:text-sm font-semibold">Video Chat</span>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-blue-700 rounded px-2 py-1 transition-colors text-xs sm:text-base"
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '↑' : '↓'}
          </button>
        </div>
        
        {/* Video container */}
        {!isMinimized && (
          <div 
            ref={containerRef} 
            className="flex-1 bg-gray-900 min-h-0"
            style={{ minHeight: '180px' }}
          />
        )}
        
        {isMinimized && (
          <div className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-600">
            Video chat minimized
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoChat;

