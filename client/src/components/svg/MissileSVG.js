import React from 'react';

const MissileSVG = ({ type, size = 40, animated = false }) => {
  const colors = {
    standard: { main: '#4a8ac0', accent: '#6ab4e8', trail: '#2a5a8a' },
    missileA: { main: '#c0392b', accent: '#e74c3c', trail: '#8b1a1a' },
    missileB: { main: '#3498db', accent: '#5dade2', trail: '#2171a5' },
    missileC: { main: '#c9a227', accent: '#e0c050', trail: '#8a7020' }
  };

  const { main, accent, trail } = colors[type] || colors.standard;

  return (
    <svg 
      viewBox="0 0 40 60" 
      width={size} 
      height={size * 1.5}
      className={animated ? 'missile-animated' : ''}
    >
      <defs>
        <linearGradient id={`missileGrad-${type}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accent} />
          <stop offset="50%" stopColor={main} />
          <stop offset="100%" stopColor={trail} />
        </linearGradient>
        <filter id={`glow-${type}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Missile body */}
      <path 
        d="M20,5 L28,20 L28,45 L24,50 L20,55 L16,50 L12,45 L12,20 Z" 
        fill={`url(#missileGrad-${type})`}
        stroke={accent}
        strokeWidth="1"
        filter={`url(#glow-${type})`}
      />
      
      {/* Nose cone */}
      <path d="M20,5 L25,15 L15,15 Z" fill={accent}/>
      
      {/* Fins */}
      <path d="M12,40 L5,50 L12,48 Z" fill={main}/>
      <path d="M28,40 L35,50 L28,48 Z" fill={main}/>
      
      {/* Window/marking */}
      <circle cx="20" cy="25" r="3" fill={accent} opacity="0.7"/>
      
      {/* Type indicator */}
      {type === 'missileA' && (
        <g>
          <line x1="15" y1="35" x2="25" y2="35" stroke={accent} strokeWidth="2"/>
          <line x1="20" y1="30" x2="20" y2="40" stroke={accent} strokeWidth="2"/>
        </g>
      )}
      {type === 'missileB' && (
        <g>
          <circle cx="16" cy="35" r="2" fill={accent}/>
          <circle cx="24" cy="35" r="2" fill={accent}/>
          <circle cx="20" cy="38" r="2" fill={accent}/>
        </g>
      )}
      {type === 'missileC' && (
        <g>
          <circle cx="20" cy="35" r="4" fill="none" stroke={accent} strokeWidth="1.5"/>
          <circle cx="20" cy="35" r="6" fill="none" stroke={accent} strokeWidth="1" opacity="0.5"/>
        </g>
      )}
      
      {/* Exhaust trail */}
      {animated && (
        <g className="exhaust">
          <ellipse cx="20" cy="58" rx="4" ry="2" fill={accent} opacity="0.8">
            <animate attributeName="ry" values="2;4;2" dur="0.3s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="20" cy="62" rx="3" ry="3" fill={accent} opacity="0.5">
            <animate attributeName="ry" values="3;5;3" dur="0.3s" repeatCount="indefinite"/>
          </ellipse>
        </g>
      )}
    </svg>
  );
};

export default MissileSVG;
