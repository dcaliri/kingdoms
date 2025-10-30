interface GameSession {
  appState: 'home' | 'lobby' | 'playing';
  roomCode: string;
  playerId: string;
  roomId: string;
  playerName: string;
  timestamp: number;
}

const SESSION_KEY = 'kingdoms_game_session';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export const saveGameSession = (session: Omit<GameSession, 'timestamp'>) => {
  try {
    const sessionData: GameSession = {
      ...session,
      timestamp: Date.now()
    };
    
    console.log('=== SAVING GAME SESSION ===');
    console.log('Session data:', sessionData);
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to save game session:', error);
  }
};

export const loadGameSession = (): GameSession | null => {
  try {
    console.log('=== LOADING GAME SESSION ===');
    
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      console.log('No session found');
      return null;
    }

    const session: GameSession = JSON.parse(stored);
    console.log('Found session:', session);

    // Check if session is expired
    const now = Date.now();
    if (now - session.timestamp > SESSION_TIMEOUT) {
      console.log('Session expired, clearing...');
      clearGameSession();
      return null;
    }

    console.log('Session is valid');
    return session;
  } catch (error) {
    console.error('Failed to load game session:', error);
    clearGameSession();
    return null;
  }
};

export const clearGameSession = () => {
  try {
    console.log('=== CLEARING GAME SESSION ===');
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear game session:', error);
  }
};

export const updateSessionState = (appState: 'home' | 'lobby' | 'playing') => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const session: GameSession = JSON.parse(stored);
      session.appState = appState;
      session.timestamp = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      console.log('Updated session state to:', appState);
    }
  } catch (error) {
    console.error('Failed to update session state:', error);
  }
};