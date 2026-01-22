import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Grid from './Grid';
import MissilePanel from './MissilePanel';
import ShipStatus from './ShipStatus';
import MissileAnimation from './MissileAnimation';
import './GameBoard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
const TURN_TIME_LIMIT = 15; // seconds

function GameBoard({ gameData, onGameOver, setGameData, user }) {
  const [selectedMissile, setSelectedMissile] = useState('standard');
  const [missiles, setMissiles] = useState({
    standard: null,
    missileA: 2,
    missileB: 0,
    missileC: 0
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
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  const [treasureChests, setTreasureChests] = useState([]);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  const isPlayerTurn = currentTurn === gameData.playerId;

  // Skip turn when timer runs out
  const skipTurn = useCallback(async () => {
    if (!isPlayerTurn || isAnimating) return;
    
    try {
      await axios.post(`${API_URL}/games/${gameData.gameId}/skip-turn`, {
        playerId: gameData.playerId
      });
      
      setShowNotification({ type: 'warning', message: 'Time ran out! Turn skipped.' });
      setTimeout(() => setShowNotification(null), 3000);
      setMessage(`${gameData.opponentName} is taking aim...`);
    } catch (error) {
      console.error('Error skipping turn:', error);
    }
  }, [isPlayerTurn, isAnimating, gameData.gameId, gameData.playerId, gameData.opponentName]);

  // Timer effect - countdown when it's player's turn
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isPlayerTurn && !isAnimating) {
      // Reset timer to full time
      setTimeLeft(TURN_TIME_LIMIT);
      
      // Start countdown
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - skip turn
            clearInterval(timerRef.current);
            timerRef.current = null;
            skipTurn();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Not player's turn - reset timer display
      setTimeLeft(TURN_TIME_LIMIT);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlayerTurn, isAnimating, skipTurn]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (user) {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', userId: user.userId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'opponentFired') {
            handleOpponentFire(data);
          } else if (data.type === 'turnSkipped') {
            // Opponent's turn was skipped, now it's our turn
            if (data.isYourTurn) {
              setCurrentTurn(gameData.playerId);
              setMessage('Your turn - Select a target');
              setShowNotification({ type: 'info', message: 'Opponent ran out of time!' });
              setTimeout(() => setShowNotification(null), 3000);
              // Update treasure chests
              if (data.treasureChests) {
                setTreasureChests(data.treasureChests);
              }
            }
          } else if (data.type === 'gameReady') {
            // Initial treasure chests when game starts
            if (data.treasureChests) {
              setTreasureChests(data.treasureChests);
            }
          } else if (data.type === 'opponentResigned') {
            // Opponent resigned, we win!
            setShowNotification({ type: 'success', message: 'Opponent surrendered! You win!' });
            setTimeout(() => {
              onGameOver(true, 'opponent_surrendered'); // We win by opponent surrender
            }, 2000);
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    }
  }, [user, gameData.playerId]);

  const handleOpponentFire = useCallback((data) => {
    const { results, sunkShips: newSunkShips, gameOver, isYourTurn, treasureChests: newTreasureChests } = data;

    const newHits = results.filter(r => r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));
    const newMisses = results.filter(r => !r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));

    setEnemyHits(prev => [...prev, ...newHits]);
    setEnemyMisses(prev => [...prev, ...newMisses]);

    if (newSunkShips && newSunkShips.length > 0) {
      setShips(prev => prev.map((ship, index) => {
        const sunkShip = newSunkShips.find(s => s.shipIndex === index);
        if (sunkShip) {
          return { ...ship, sunk: true };
        }
        return ship;
      }));

      setShowNotification({ 
        type: 'warning', 
        message: `Your ${newSunkShips[0].name} was destroyed!` 
      });
      setTimeout(() => setShowNotification(null), 3000);
    } else if (newHits.length > 0) {
      setShowNotification({ type: 'warning', message: 'Your ship was hit!' });
      setTimeout(() => setShowNotification(null), 2000);
    }

    if (gameOver) {
      setTimeout(() => {
        onGameOver(false);
      }, 2000);
    } else if (isYourTurn) {
      setCurrentTurn(gameData.playerId);
      setMessage('Your turn - Select a target');
      // Update treasure chests for our turn
      setTreasureChests(newTreasureChests || []);
    }
  }, [gameData.playerId, onGameOver]);

  // Poll for game state updates
  useEffect(() => {
    const pollGameState = async () => {
      try {
        const response = await axios.get(`${API_URL}/games/${gameData.gameId}?playerId=${gameData.playerId}`);
        const { game, player } = response.data;

        if (game.status === 'finished') {
          onGameOver(game.winner === gameData.playerId);
          return;
        }

        const wasPlayerTurn = currentTurn === gameData.playerId;
        const isNowPlayerTurn = game.currentTurn === gameData.playerId;
        
        setCurrentTurn(game.currentTurn);
        
        if (player) {
          setMissiles(player.missiles);
          setPlayerHits(player.hits);
          setPlayerMisses(player.misses);
        }

        // Always sync treasure chests from server state
        setTreasureChests(game.treasureChests || []);

        const attacksResponse = await axios.get(
          `${API_URL}/games/${gameData.gameId}/attacks?playerId=${gameData.playerId}`
        );
        setEnemyHits(attacksResponse.data.hits);
        setEnemyMisses(attacksResponse.data.misses);

        if (isNowPlayerTurn) {
          setMessage('Your turn - Select a target');
        } else {
          setMessage(`${gameData.opponentName} is taking aim...`);
        }
      } catch (error) {
        console.error('Error polling game state:', error);
      }
    };

    const interval = setInterval(pollGameState, 2000);
    pollGameState();

    return () => clearInterval(interval);
  }, [gameData.gameId, gameData.playerId, gameData.opponentName, onGameOver, currentTurn]);

  // Helper function to show attack result notification
  const showAttackNotification = useCallback((newSunkShips, newHits, newMisses) => {
    if (newSunkShips && newSunkShips.length > 0) {
      setSunkShips(prev => [...prev, ...newSunkShips]);
      setShowNotification({ 
        type: 'success', 
        message: `${newSunkShips[0].name} DESTROYED!` 
      });
      setTimeout(() => setShowNotification(null), 2000);
    } else if (newHits.length > 0) {
      setShowNotification({ type: 'hit', message: 'HIT!' });
      setTimeout(() => setShowNotification(null), 1500);
    } else if (newMisses.length > 0) {
      setShowNotification({ type: 'miss', message: 'MISS' });
      setTimeout(() => setShowNotification(null), 1500);
    }
  }, []);

  const handleFire = useCallback(async (x, y) => {
    if (currentTurn !== gameData.playerId || isAnimating) return;

    if (playerHits.some(h => h.x === x && h.y === y) || 
        playerMisses.some(m => m.x === x && m.y === y)) {
      setShowNotification({ type: 'warning', message: 'Already targeted!' });
      setTimeout(() => setShowNotification(null), 2000);
      return;
    }

    if (selectedMissile !== 'standard') {
      const missileCount = missiles[selectedMissile];
      if (missileCount !== null && missileCount !== Infinity && missileCount <= 0) {
        setShowNotification({ type: 'warning', message: 'No missiles remaining!' });
        setTimeout(() => setShowNotification(null), 2000);
        return;
      }
    }

    // Stop the timer when firing
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsAnimating(true);
    setMessage('Launching missile...');

    try {
      setAnimationData({
        type: selectedMissile,
        targetX: x,
        targetY: y
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await axios.post(`${API_URL}/games/${gameData.gameId}/fire`, {
        playerId: gameData.playerId,
        targetX: x,
        targetY: y,
        missileType: selectedMissile
      });

      const { results, affectedCells, sunkShips: newSunkShips, gameOver, winner, treasureCollected, missiles: updatedMissiles } = response.data;

      const newHits = results.filter(r => r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));
      const newMisses = results.filter(r => !r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));

      setPlayerHits(prev => [...prev, ...newHits]);
      setPlayerMisses(prev => [...prev, ...newMisses]);
      setLastMoveResults(affectedCells);

      // Update missiles from server response (includes any treasure collected)
      if (updatedMissiles) {
        setMissiles(updatedMissiles);
      } else if (selectedMissile !== 'standard') {
        setMissiles(prev => ({
          ...prev,
          [selectedMissile]: prev[selectedMissile] - 1
        }));
      }

      // Show treasure collected notification first (if applicable)
      if (treasureCollected && treasureCollected.weapons && treasureCollected.weapons.length > 0) {
        // Build message for collected treasures
        const weaponNames = treasureCollected.weapons.map(w => w.weaponName).join(', ');
        const count = treasureCollected.weapons.length;
        setShowNotification({ 
          type: 'treasure', 
          message: count === 1 
            ? `🎁 TREASURE! +1 ${weaponNames}!` 
            : `🎁 TREASURES! +${count} weapons: ${weaponNames}!`
        });
        setTimeout(() => {
          setShowNotification(null);
          // Then show hit/miss/sunk notification
          showAttackNotification(newSunkShips, newHits, newMisses);
        }, 2000);
      } else if (newSunkShips && newSunkShips.length > 0) {
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

      if (gameOver) {
        setTimeout(() => {
          onGameOver(winner === gameData.playerId);
        }, 2000);
      } else {
        setCurrentTurn('opponent'); // Force turn change
        setMessage(`${gameData.opponentName} is taking aim...`);
      }

    } catch (error) {
      console.error('Error firing:', error);
      const errorMessage = error.response?.data?.error || 'Error - Try again';
      setMessage(errorMessage);
      setShowNotification({ type: 'warning', message: errorMessage });
      setTimeout(() => setShowNotification(null), 3000);
    } finally {
      setTimeout(() => {
        setAnimationData(null);
        setIsAnimating(false);
      }, 800);
    }

  }, [currentTurn, gameData.playerId, gameData.gameId, gameData.opponentName, isAnimating, missiles, 
      playerHits, playerMisses, selectedMissile, onGameOver, showAttackNotification]);

  // Get timer color based on time remaining
  const getTimerColor = () => {
    if (timeLeft <= 5) return '#e74c3c'; // Red
    if (timeLeft <= 10) return '#f39c12'; // Orange
    return '#2ecc71'; // Green
  };

  // Handle resignation
  const handleResign = useCallback(async () => {
    try {
      await axios.post(`${API_URL}/games/${gameData.gameId}/resign`, {
        playerId: gameData.playerId
      });
      
      setShowResignConfirm(false);
      onGameOver(false, 'surrendered'); // Player loses by surrender
    } catch (error) {
      console.error('Error resigning:', error);
      setShowNotification({ type: 'warning', message: 'Failed to resign' });
      setTimeout(() => setShowNotification(null), 3000);
    }
  }, [gameData.gameId, gameData.playerId, onGameOver]);

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
          <span className="enemy-name">{gameData.opponentName}</span>
          <span className="enemy-rank">ENEMY</span>
        </div>
        <motion.button
          className="btn-resign"
          onClick={() => setShowResignConfirm(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🏳️ SURRENDER
        </motion.button>
      </div>

      {/* Resign Confirmation Modal */}
      <AnimatePresence>
        {showResignConfirm && (
          <motion.div
            className="resign-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="resign-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h2>🏳️ Surrender?</h2>
              <p>Are you sure you want to surrender? This will count as a defeat.</p>
              <div className="resign-modal-buttons">
                <motion.button
                  className="btn-confirm-resign"
                  onClick={handleResign}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Yes, I Surrender
                </motion.button>
                <motion.button
                  className="btn-cancel-resign"
                  onClick={() => setShowResignConfirm(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Keep Fighting
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer Display */}
      {isPlayerTurn && !isAnimating && (
        <motion.div 
          className="turn-timer"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <div className="timer-circle" style={{ borderColor: getTimerColor() }}>
            <span className="timer-value" style={{ color: getTimerColor() }}>{timeLeft}</span>
            <span className="timer-label">SEC</span>
          </div>
          <div className="timer-bar-container">
            <motion.div 
              className="timer-bar"
              style={{ 
                backgroundColor: getTimerColor(),
                width: `${(timeLeft / TURN_TIME_LIMIT) * 100}%`
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* Main game area */}
      <div className="game-main">
        <MissilePanel 
          missiles={missiles}
          selectedMissile={selectedMissile}
          onSelectMissile={setSelectedMissile}
          disabled={!isPlayerTurn || isAnimating}
        />

        <div className="grids-container">
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
              treasureChests={treasureChests}
            />
          </div>

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

        <ShipStatus 
          ships={ships}
          enemyHits={enemyHits}
          sunkEnemyShips={sunkShips}
        />
      </div>

      <AnimatePresence>
        {animationData && (
          <MissileAnimation
            type={animationData.type}
            targetX={animationData.targetX}
            targetY={animationData.targetY}
          />
        )}
      </AnimatePresence>

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
