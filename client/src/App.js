import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import GameSetup from './components/GameSetup';
import GameBoard from './components/GameBoard';
import GameOver from './components/GameOver';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null); // { userId, username }
  const [gameState, setGameState] = useState('auth'); // auth, lobby, setup, playing, gameover
  const [gameData, setGameData] = useState(null);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    setGameState('lobby');
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setGameState('auth');
    setGameData(null);
  }, []);

  const handleGameStart = useCallback((data) => {
    setGameData({
      ...data,
      isSinglePlayer: false
    });
    setGameState('setup');
  }, []);

  const handleGameReady = useCallback((data) => {
    setGameData(prev => ({ ...prev, ...data }));
    setGameState('playing');
  }, []);

  const handleGameOver = useCallback((winner) => {
    setGameData(prev => ({ ...prev, winner }));
    setGameState('gameover');
  }, []);

  const handleReturnToLobby = useCallback(() => {
    setGameState('lobby');
    setGameData(null);
  }, []);

  return (
    <div className="app">
      {/* Animated background elements */}
      <div className="background-effects">
        <div className="wave wave-1"></div>
        <div className="wave wave-2"></div>
        <div className="wave wave-3"></div>
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`
            }}></div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Auth onLogin={handleLogin} />
          </motion.div>
        )}

        {gameState === 'lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <Lobby 
              user={user} 
              onGameStart={handleGameStart}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {gameState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <GameSetup 
              gameData={gameData} 
              onReady={handleGameReady}
              user={user}
            />
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <GameBoard 
              gameData={gameData} 
              onGameOver={handleGameOver}
              setGameData={setGameData}
              user={user}
            />
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GameOver 
              gameData={gameData} 
              onReturnToMenu={handleReturnToLobby}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
