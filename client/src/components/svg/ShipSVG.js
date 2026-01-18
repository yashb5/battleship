import React from 'react';

const ShipSVG = ({ type, size = 100, rotation = 0, isHit = false, isSunk = false }) => {
  const color = isSunk ? '#2c3e50' : isHit ? '#c0392b' : '#4a8ac0';
  const accentColor = isSunk ? '#1a252f' : isHit ? '#8b1a1a' : '#2a5a8a';
  const highlightColor = isSunk ? '#34495e' : isHit ? '#e74c3c' : '#6ab4e8';

  const ships = {
    carrier: (
      <svg viewBox="0 0 200 40" width={size} height={size * 0.2} style={{ transform: `rotate(${rotation}deg)` }}>
        <defs>
          <linearGradient id="shipGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor={accentColor} />
          </linearGradient>
        </defs>
        {/* Hull */}
        <path d="M10,20 L30,35 L170,35 L190,20 L170,5 L30,5 Z" fill="url(#shipGradient)" stroke={accentColor} strokeWidth="2"/>
        {/* Deck */}
        <rect x="40" y="12" width="120" height="16" fill={accentColor} rx="2"/>
        {/* Control tower */}
        <rect x="70" y="8" width="30" height="24" fill={color} stroke={accentColor} strokeWidth="1"/>
        <rect x="75" y="12" width="8" height="6" fill={highlightColor} opacity="0.5"/>
        <rect x="87" y="12" width="8" height="6" fill={highlightColor} opacity="0.5"/>
        {/* Runway markings */}
        <line x1="45" y1="20" x2="65" y2="20" stroke={highlightColor} strokeWidth="1" strokeDasharray="4,2"/>
        <line x1="105" y1="20" x2="155" y2="20" stroke={highlightColor} strokeWidth="1" strokeDasharray="4,2"/>
        {/* Aircraft */}
        <polygon points="120,17 130,20 120,23 122,20" fill={highlightColor} opacity="0.7"/>
        <polygon points="140,17 150,20 140,23 142,20" fill={highlightColor} opacity="0.7"/>
      </svg>
    ),
    battleship: (
      <svg viewBox="0 0 160 40" width={size} height={size * 0.25} style={{ transform: `rotate(${rotation}deg)` }}>
        <defs>
          <linearGradient id="battleshipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor={accentColor} />
          </linearGradient>
        </defs>
        {/* Hull */}
        <path d="M5,20 L20,32 L140,32 L155,20 L140,8 L20,8 Z" fill="url(#battleshipGrad)" stroke={accentColor} strokeWidth="2"/>
        {/* Main turrets */}
        <circle cx="35" cy="20" r="8" fill={accentColor}/>
        <rect x="30" y="16" width="20" height="3" fill={color}/>
        <rect x="30" y="21" width="20" height="3" fill={color}/>
        <circle cx="125" cy="20" r="8" fill={accentColor}/>
        <rect x="120" y="16" width="20" height="3" fill={color}/>
        <rect x="120" y="21" width="20" height="3" fill={color}/>
        {/* Bridge */}
        <rect x="65" y="10" width="30" height="20" fill={color} stroke={accentColor} strokeWidth="1"/>
        <rect x="70" y="13" width="6" height="5" fill={highlightColor} opacity="0.6"/>
        <rect x="79" y="13" width="6" height="5" fill={highlightColor} opacity="0.6"/>
        <rect x="88" y="13" width="6" height="5" fill={highlightColor} opacity="0.6"/>
        {/* Mast */}
        <line x1="80" y1="5" x2="80" y2="10" stroke={accentColor} strokeWidth="2"/>
      </svg>
    ),
    cruiser: (
      <svg viewBox="0 0 120 35" width={size} height={size * 0.29} style={{ transform: `rotate(${rotation}deg)` }}>
        <defs>
          <linearGradient id="cruiserGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor={accentColor} />
          </linearGradient>
        </defs>
        <path d="M5,17 L15,28 L105,28 L115,17 L105,6 L15,6 Z" fill="url(#cruiserGrad)" stroke={accentColor} strokeWidth="2"/>
        <circle cx="30" cy="17" r="6" fill={accentColor}/>
        <rect x="25" y="14" width="15" height="2" fill={color}/>
        <rect x="25" y="18" width="15" height="2" fill={color}/>
        <rect x="50" y="9" width="20" height="16" fill={color} stroke={accentColor} strokeWidth="1"/>
        <rect x="54" y="12" width="5" height="4" fill={highlightColor} opacity="0.5"/>
        <rect x="61" y="12" width="5" height="4" fill={highlightColor} opacity="0.5"/>
        <circle cx="90" cy="17" r="5" fill={accentColor}/>
        <rect x="88" y="14" width="10" height="2" fill={color}/>
      </svg>
    ),
    submarine: (
      <svg viewBox="0 0 120 30" width={size} height={size * 0.25} style={{ transform: `rotate(${rotation}deg)` }}>
        <defs>
          <linearGradient id="subGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} />
            <stop offset="60%" stopColor={color} />
            <stop offset="100%" stopColor={accentColor} />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="18" rx="55" ry="10" fill="url(#subGrad)" stroke={accentColor} strokeWidth="2"/>
        <rect x="45" y="8" width="30" height="10" rx="3" fill={color} stroke={accentColor} strokeWidth="1"/>
        <rect x="50" y="10" width="5" height="6" fill={highlightColor} opacity="0.5"/>
        <rect x="58" y="10" width="5" height="6" fill={highlightColor} opacity="0.5"/>
        <rect x="66" y="10" width="5" height="6" fill={highlightColor} opacity="0.5"/>
        <line x1="60" y1="3" x2="60" y2="8" stroke={accentColor} strokeWidth="2"/>
        <ellipse cx="60" cy="3" rx="3" ry="2" fill={color}/>
      </svg>
    ),
    destroyer: (
      <svg viewBox="0 0 80 25" width={size} height={size * 0.31} style={{ transform: `rotate(${rotation}deg)` }}>
        <defs>
          <linearGradient id="destroyerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor={accentColor} />
          </linearGradient>
        </defs>
        <path d="M5,12 L15,20 L65,20 L75,12 L65,4 L15,4 Z" fill="url(#destroyerGrad)" stroke={accentColor} strokeWidth="2"/>
        <circle cx="25" cy="12" r="4" fill={accentColor}/>
        <rect x="22" y="10" width="10" height="1.5" fill={color}/>
        <rect x="38" y="6" width="12" height="12" fill={color} stroke={accentColor} strokeWidth="1"/>
        <rect x="40" y="8" width="3" height="3" fill={highlightColor} opacity="0.5"/>
        <rect x="45" y="8" width="3" height="3" fill={highlightColor} opacity="0.5"/>
        <circle cx="60" cy="12" r="3" fill={accentColor}/>
      </svg>
    )
  };

  const shipTypes = {
    'Carrier': 'carrier',
    'Battleship': 'battleship',
    'Cruiser': 'cruiser',
    'Submarine': 'submarine',
    'Destroyer': 'destroyer'
  };

  const shipKey = shipTypes[type] || type;
  return ships[shipKey] || ships.battleship;
};

export default ShipSVG;
