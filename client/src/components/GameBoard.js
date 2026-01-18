import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Grid from './Grid';
import MissilePanel from './MissilePanel';
import ShipStatus from './ShipStatus';
import MissileAnimation from './MissileAnimation';
import './GameBoard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function GameBoard({ gameData, onGameOver, setGameData }) {
  const [selectedMissile, setSelectedMissile] = useState('standard');
  const [missiles, setMissiles] = useState({
    standard: null, // null represents unlimited
    missileA: 3,
    missileB: 2,
    missileC: 1
  });
  const [playerHits, setPlayerHits] = useState([]);
  const [playerMisses, setPlayerMisses] = useState([]);
  const [enemyHits, setEnemyHits] = useState([]);
  const [enemyMisses, setEnemyMisses] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(gameData.playerId);
  const [message, setMessage] = useState('Your turn - Select a target');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [sunkShips, setSunkShips] = useState([]);
  const [ships, setShips] = useState(gameData.ships || []);
  const [showNotification, setShowNotification] = useState(null);
  const [lastMoveResults, setLastMoveResults] = useState([]);

  // Poll for game state updates (for AI turns)
  useEffect(() => {
    const pollGameState = async () => {
      try {
        const response = await axios.get(`${API_URL}/games/${gameData.gameId}?playerId=${gameData.playerId}`);
        const { game, player } = response.data;

        if (game.status === 'finished') {
          onGameOver(game.winner === gameData.playerId);
          return;
        }

        setCurrentTurn(game.currentTurn);
        if (player) {
          setMissiles(player.missiles);
          setPlayerHits(player.hits);
          setPlayerMisses(player.misses);
        }

        // Get enemy attacks on our ships
        const attacksResponse = await axios.get(
          `${API_URL}/games/${gameData.gameId}/attacks?playerId=${gameData.playerId}`
        );
        setEnemyHits(attacksResponse.data.hits);
        setEnemyMisses(attacksResponse.data.misses);

        // Update message based on turn
        if (game.currentTurn === gameData.playerId) {
          setMessage('Your turn - Select a target');
        } else {
          setMessage('Enemy is taking aim...');
        }
      } catch (error) {
        console.error('Error polling game state:', error);
      }
    };

    const interval = setInterval(pollGameState, 1500);
    pollGameState(); // Initial poll

    return () => clearInterval(interval);
  }, [gameData.gameId, gameData.playerId, onGameOver]);

  const handleFire = useCallback(async (x, y) => {
    if (currentTurn !== gameData.playerId || isAnimating) return;

    // Check if already attacked
    if (playerHits.some(h => h.x === x && h.y === y) || 
        playerMisses.some(m => m.x === x && m.y === y)) {
      setShowNotification({ type: 'warning', message: 'Already targeted!' });
      setTimeout(() => setShowNotification(null), 2000);
      return;
    }

    // Check missile availability (standard missiles are always available)
    if (selectedMissile !== 'standard') {
      const missileCount = missiles[selectedMissile];
      if (missileCount !== null && missileCount !== Infinity && missileCount <= 0) {
        setShowNotification({ type: 'warning', message: 'No missiles remaining!' });
        setTimeout(() => setShowNotification(null), 2000);
        return;
      }
    }

    setIsAnimating(true);
    setMessage('Launching missile...');

    try {
      // Start missile animation
      setAnimationData({
        type: selectedMissile,
        targetX: x,
        targetY: y
      });

      // Wait for missile to travel
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await axios.post(`${API_URL}/games/${gameData.gameId}/fire`, {
        playerId: gameData.playerId,
        targetX: x,
        targetY: y,
        missileType: selectedMissile
      });

      const { results, affectedCells, sunkShips: newSunkShips, gameOver, winner } = response.data;

      // Update hits and misses
      const newHits = results.filter(r => r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));
      const newMisses = results.filter(r => !r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));

      setPlayerHits(prev => [...prev, ...newHits]);
      setPlayerMisses(prev => [...prev, ...newMisses]);
      setLastMoveResults(affectedCells);

      // Update missiles
      if (selectedMissile !== 'standard') {
        setMissiles(prev => ({
          ...prev,
          [selectedMissile]: prev[selectedMissile] - 1
        }));
      }

      // Handle sunk ships
      if (newSunkShips && newSunkShips.length > 0) {
        setSunkShips(prev => [...prev, ...newSunkShips]);
        setShowNotification({ 
          type: 'success', 
          message: `${newSunkShips[0].name} DESTROYED!` 
        });
        setTimeout(() => setShowNotification(null), 3000);
      } else if (newHits.length > 0) {
        setShowNotification({ type: 'hit', message: 'HIT!' });
        setTimeout(() => setShowNotification(null), 2000);
      } else if (newMisses.length > 0) {
        setShowNotification({ type: 'miss', message: 'MISS' });
        setTimeout(() => setShowNotification(null), 2000);
      }

      // Check game over
      if (gameOver) {
        setTimeout(() => {
          onGameOver(winner === gameData.playerId);
        }, 2000);
      } else {
        setMessage('Enemy is taking aim...');
      }

    } catch (error) {
      console.error('Error firing:', error);
      const errorMessage = error.response?.data?.error || 'Error - Try again';
      setMessage(errorMessage);
      setShowNotification({ type: 'warning', message: errorMessage });
      setTimeout(() => setShowNotification(null), 3000);
    } finally {
      // Always clean up animation state
      setTimeout(() => {
        setAnimationData(null);
        setIsAnimating(false);
      }, 800);
    }

  }, [currentTurn, gameData.playerId, gameData.gameId, isAnimating, missiles, 
      playerHits, playerMisses, selectedMissile, onGameOver]);

  const isPlayerTurn = currentTurn === gameData.playerId;

  return (
    <div className="game-board">
      {/* Header */}
      <div className="game-header">
        <div className="player-info">
          <span className="player-name">{gameData.playerName}</span>
          <span className="player-rank">COMMANDER</span>
        </div>
        <div className="turn-indicator">
          <motion.div 
            className={`turn-light ${isPlayerTurn ? 'active' : ''}`}
            animate={{ opacity: isPlayerTurn ? [0.5, 1, 0.5] : 0.3 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span>{message}</span>
        </div>
        <div className="enemy-info">
          <span className="enemy-name">Admiral CPU</span>
          <span className="enemy-rank">ENEMY</span>
        </div>
      </div>

      {/* Main game area */}
      <div className="game-main">
        {/* Missile Panel */}
        <MissilePanel 
          missiles={missiles}
          selectedMissile={selectedMissile}
          onSelectMissile={setSelectedMissile}
          disabled={!isPlayerTurn || isAnimating}
        />

        {/* Grids */}
        <div className="grids-container">
          {/* Enemy Grid (target) */}
          <div className="grid-section enemy-section">
            <h3>ENEMY WATERS</h3>
            <Grid
              type="enemy"
              hits={playerHits}
              misses={playerMisses}
              onCellClick={handleFire}
              disabled={!isPlayerTurn || isAnimating}
              selectedMissile={selectedMissile}
              highlightedCells={lastMoveResults}
            />
          </div>

          {/* Player Grid (own ships) */}
          <div className="grid-section player-section">
            <h3>YOUR FLEET</h3>
            <Grid
              type="player"
              ships={ships}
              hits={enemyHits}
              misses={enemyMisses}
              disabled={true}
            />
          </div>
        </div>

        {/* Ship Status */}
        <ShipStatus 
          ships={ships}
          enemyHits={enemyHits}
          sunkEnemyShips={sunkShips}
        />
      </div>

      {/* Missile Animation Overlay */}
      <AnimatePresence>
        {animationData && (
          <MissileAnimation
            type={animationData.type}
            targetX={animationData.targetX}
            targetY={animationData.targetY}
          />
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            className={`notification notification-${showNotification.type}`}
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
          >
            {showNotification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GameBoard;
