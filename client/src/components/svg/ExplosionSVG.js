import React from 'react';
import { motion } from 'framer-motion';

const ExplosionSVG = ({ size = 60, type = 'hit', onComplete }) => {
  const colors = {
    hit: ['#e74c3c', '#f39c12', '#ffeb3b', '#ffffff'],
    miss: ['#3498db', '#5dade2', '#87ceeb', '#ffffff'],
    splash: ['#1a5276', '#2980b9', '#5dade2', '#a9cce3']
  };

  const palette = colors[type] || colors.hit;

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: [0, 1.5, 2], opacity: [1, 0.8, 0] }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <defs>
        <radialGradient id={`explosionGrad-${type}`}>
          <stop offset="0%" stopColor={palette[3]} />
          <stop offset="30%" stopColor={palette[2]} />
          <stop offset="60%" stopColor={palette[1]} />
          <stop offset="100%" stopColor={palette[0]} stopOpacity="0" />
        </radialGradient>
        <filter id="explosionBlur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Main explosion */}
      <circle 
        cx="50" 
        cy="50" 
        r="40" 
        fill={`url(#explosionGrad-${type})`}
        filter="url(#explosionBlur)"
      />

      {/* Burst rays */}
      {[...Array(8)].map((_, i) => (
        <motion.line
          key={i}
          x1="50"
          y1="50"
          x2={50 + Math.cos((i * Math.PI) / 4) * 45}
          y2={50 + Math.sin((i * Math.PI) / 4) * 45}
          stroke={palette[1]}
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: [0, 1], opacity: [1, 0] }}
          transition={{ duration: 0.4, delay: i * 0.02 }}
        />
      ))}

      {/* Particles */}
      {[...Array(12)].map((_, i) => (
        <motion.circle
          key={`particle-${i}`}
          cx="50"
          cy="50"
          r="3"
          fill={palette[Math.floor(Math.random() * 3)]}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ 
            x: Math.cos((i * Math.PI) / 6) * 40,
            y: Math.sin((i * Math.PI) / 6) * 40,
            opacity: 0
          }}
          transition={{ duration: 0.5, delay: i * 0.02 }}
        />
      ))}
    </motion.svg>
  );
};

export default ExplosionSVG;
