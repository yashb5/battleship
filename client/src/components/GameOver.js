import React from 'react';
import { motion } from 'framer-motion';
import ShipSVG from './svg/ShipSVG';
import './GameOver.css';

function GameOver({ gameData, onReturnToMenu }) {
  const isWinner = gameData.winner;

  return (
    <div className={`game-over ${isWinner ? 'victory' : 'defeat'}`}>
      {/* Background effects */}
      <div className="game-over-bg">
        {isWinner ? (
          <>
            <div className="victory-rays"></div>
            <div className="victory-particles">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="victory-particle"
                  initial={{ 
                    x: '50vw',
                    y: '50vh',
                    scale: 0
                  }}
                  animate={{ 
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    scale: [0, 1, 0],
                    rotate: Math.random() * 360
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 2
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="defeat-overlay">
            <div className="smoke smoke-1"></div>
            <div className="smoke smoke-2"></div>
            <div className="smoke smoke-3"></div>
          </div>
        )}
      </div>

      <motion.div
        className="game-over-content"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
      >
        {/* Medal/Badge */}
        <motion.div
          className="result-badge"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          {isWinner ? (
            <svg viewBox="0 0 100 120" className="badge-svg victory-badge">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#e0c050"/>
                  <stop offset="50%" stopColor="#c9a227"/>
                  <stop offset="100%" stopColor="#8a7020"/>
                </linearGradient>
              </defs>
              {/* Medal ribbon */}
              <path d="M30,0 L50,20 L70,0 L70,35 L50,50 L30,35 Z" fill="#c0392b"/>
              <path d="M35,0 L50,15 L65,0 L65,30 L50,42 L35,30 Z" fill="#e74c3c"/>
              {/* Medal */}
              <circle cx="50" cy="75" r="35" fill="url(#goldGrad)" stroke="#8a7020" strokeWidth="3"/>
              <circle cx="50" cy="75" r="28" fill="none" stroke="#e0c050" strokeWidth="2"/>
              {/* Star */}
              <polygon points="50,50 54,65 70,65 57,75 62,90 50,80 38,90 43,75 30,65 46,65" fill="#8a7020"/>
              <polygon points="50,52 53,64 67,64 56,73 60,86 50,78 40,86 44,73 33,64 47,64" fill="#e0c050"/>
            </svg>
          ) : (
            <svg viewBox="0 0 100 100" className="badge-svg defeat-badge">
              <circle cx="50" cy="50" r="45" fill="#2c3e50" stroke="#1a252f" strokeWidth="3"/>
              <circle cx="50" cy="50" r="35" fill="none" stroke="#34495e" strokeWidth="2"/>
              <line x1="25" y1="25" x2="75" y2="75" stroke="#c0392b" strokeWidth="6" strokeLinecap="round"/>
              <line x1="75" y1="25" x2="25" y2="75" stroke="#c0392b" strokeWidth="6" strokeLinecap="round"/>
            </svg>
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          className="result-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {isWinner ? 'VICTORY!' : 'DEFEATED'}
        </motion.h1>

        <motion.p
          className="result-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {isWinner 
            ? 'You have crushed the enemy fleet!' 
            : 'Your fleet has been destroyed...'}
        </motion.p>

        {/* Ship display */}
        <motion.div
          className="result-ships"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {isWinner ? (
            <div className="victory-fleet">
              <ShipSVG type="Battleship" size={150} />
            </div>
          ) : (
            <div className="defeat-fleet">
              <ShipSVG type="Battleship" size={150} isSunk={true} />
            </div>
          )}
        </motion.div>

        {/* Stats summary */}
        <motion.div
          className="game-stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <div className="stat-item">
            <span className="stat-label">Commander</span>
            <span className="stat-value">{gameData.playerName}</span>
          </div>
        </motion.div>

        {/* Return button */}
        <motion.button
          className={`btn ${isWinner ? 'btn-primary' : 'btn'} return-btn`}
          onClick={onReturnToMenu}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ⚓ RETURN TO PORT
        </motion.button>
      </motion.div>
    </div>
  );
}

export default GameOver;
