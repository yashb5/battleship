import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import MissileSVG from './svg/MissileSVG';
import './MissileAnimation.css';

function MissileAnimation({ type, targetX, targetY }) {
  // Initialize with pixel numbers, not viewport strings
  const [targetPosition, setTargetPosition] = useState(() => ({
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.4
  }));
  
  useEffect(() => {
    // Find the enemy grid and calculate target cell position
    const enemyGrid = document.querySelector('.enemy-grid .grid');
    if (enemyGrid) {
      const gridRect = enemyGrid.getBoundingClientRect();
      const cellSize = 40; // Each cell is 40px
      const targetPxX = gridRect.left + (targetX * cellSize) + (cellSize / 2);
      const targetPxY = gridRect.top + (targetY * cellSize) + (cellSize / 2);
      setTargetPosition({ x: targetPxX, y: targetPxY });
    }
  }, [targetX, targetY]);

  // Memoize starting positions to ensure they're consistent numbers
  const startPosition = useMemo(() => ({
    top: window.innerHeight,
    left: window.innerWidth * 0.1
  }), []);

  return (
    <motion.div 
      className="missile-animation-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Trail effect */}
      <motion.div
        className="missile-trail"
        style={{
          left: targetPosition.x,
          transformOrigin: 'bottom center'
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: [0, 0.5, 0] }}
        transition={{ duration: 0.8 }}
      />
      
      {/* Main missile */}
      <motion.div
        className={`flying-missile missile-${type}`}
        initial={{ 
          top: startPosition.top,
          left: startPosition.left,
          rotate: -45,
          scale: 0.5 
        }}
        animate={{ 
          top: [startPosition.top, targetPosition.y - 100, targetPosition.y],
          left: [startPosition.left, targetPosition.x - 30, targetPosition.x - 30],
          rotate: [-45, -15, 0],
          scale: [0.5, 1.2, 1]
        }}
        transition={{ 
          duration: 0.8,
          ease: 'easeOut',
          times: [0, 0.6, 1]
        }}
      >
        <MissileSVG type={type} size={60} animated={true} />
        
        {/* Exhaust particles */}
        <div className="exhaust-particles">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="exhaust-particle"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ 
                x: Math.random() * 40 - 20,
                y: Math.random() * 60 + 20,
                opacity: 0,
                scale: [1, 0]
              }}
              transition={{ 
                duration: 0.5,
                delay: i * 0.05,
                repeat: Infinity
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Impact zone indicator */}
      <motion.div
        className="impact-zone"
        style={{
          left: targetPosition.x,
          top: targetPosition.y,
          transform: 'translate(-50%, -50%)'
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 1], opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <svg viewBox="0 0 100 100" className="impact-svg">
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            fill="none" 
            stroke="var(--hit-glow)" 
            strokeWidth="2"
            strokeDasharray="10,5"
          />
          <circle 
            cx="50" 
            cy="50" 
            r="25" 
            fill="none" 
            stroke="var(--hit-glow)" 
            strokeWidth="2"
          />
          <line x1="50" y1="0" x2="50" y2="100" stroke="var(--hit-glow)" strokeWidth="1"/>
          <line x1="0" y1="50" x2="100" y2="50" stroke="var(--hit-glow)" strokeWidth="1"/>
        </svg>
      </motion.div>

      {/* Type-specific effects */}
      {type === 'missileA' && (
        <motion.div
          className="cross-indicator"
          style={{
            left: targetPosition.x,
            top: targetPosition.y,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <svg viewBox="0 0 120 120" className="cross-svg">
            <rect x="50" y="10" width="20" height="100" fill="rgba(231, 76, 60, 0.5)"/>
            <rect x="10" y="50" width="100" height="20" fill="rgba(231, 76, 60, 0.5)"/>
          </svg>
        </motion.div>
      )}

      {type === 'missileB' && (
        <motion.div 
          className="scatter-missiles"
          style={{
            left: targetPosition.x,
            top: targetPosition.y
          }}
        >
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="scatter-missile"
              initial={{ 
                x: 0, 
                y: 0,
                scale: 0.5,
                opacity: 0
              }}
              animate={{ 
                x: [(i % 2 === 0 ? -1 : 1) * (50 + Math.random() * 100)],
                y: [(i < 2 ? -1 : 1) * (30 + Math.random() * 80)],
                scale: 0.3,
                opacity: [0, 1, 0]
              }}
              transition={{ 
                duration: 0.5,
                delay: 0.5 + i * 0.1
              }}
            >
              <MissileSVG type="missileB" size={30} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {type === 'missileC' && (
        <motion.div
          className="devastation-zone"
          style={{
            left: targetPosition.x,
            top: targetPosition.y,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2], opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <svg viewBox="0 0 200 200" className="devastation-svg">
            <polygon 
              points="100,20 180,100 100,180 20,100" 
              fill="rgba(201, 162, 39, 0.4)"
              stroke="var(--gold)"
              strokeWidth="3"
            />
            <polygon 
              points="100,40 160,100 100,160 40,100" 
              fill="rgba(231, 76, 60, 0.4)"
              stroke="var(--hit-glow)"
              strokeWidth="2"
            />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}

export default MissileAnimation;
