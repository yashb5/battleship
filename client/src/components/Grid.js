import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ShipSVG from './svg/ShipSVG';
import ExplosionSVG from './svg/ExplosionSVG';
import './Grid.css';

const GRID_SIZE = 10;

function Grid({ 
  type, 
  ships = [], 
  hits = [], 
  misses = [], 
  onCellClick, 
  disabled = false,
  selectedMissile = 'standard',
  highlightedCells = []
}) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [explosions, setExplosions] = useState([]);

  // Calculate cells that would be affected by current missile
  const previewCells = useMemo(() => {
    if (!hoveredCell || type !== 'enemy' || disabled) return [];
    
    const { x, y } = hoveredCell;
    const cells = [];
    
    switch (selectedMissile) {
      case 'standard':
        cells.push({ x, y });
        break;
      case 'missileA':
        cells.push({ x, y });
        if (x > 0) cells.push({ x: x - 1, y });
        if (x < GRID_SIZE - 1) cells.push({ x: x + 1, y });
        if (y > 0) cells.push({ x, y: y - 1 });
        if (y < GRID_SIZE - 1) cells.push({ x, y: y + 1 });
        break;
      case 'missileB':
        cells.push({ x, y });
        // Random cells are unpredictable, show just the target
        break;
      case 'missileC':
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= 3) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                cells.push({ x: nx, y: ny });
              }
            }
          }
        }
        break;
      default:
        cells.push({ x, y });
    }
    
    return cells;
  }, [hoveredCell, selectedMissile, disabled, type]);

  const handleCellClick = (x, y) => {
    if (disabled || type !== 'enemy') return;
    
    // Add explosion effect
    const id = Date.now();
    const isHit = hits.some(h => h.x === x && h.y === y);
    setExplosions(prev => [...prev, { id, x, y, type: isHit ? 'hit' : 'splash' }]);
    
    if (onCellClick) {
      onCellClick(x, y);
    }
  };

  const removeExplosion = (id) => {
    setExplosions(prev => prev.filter(e => e.id !== id));
  };

  const getCellStatus = (x, y) => {
    const isHit = hits.some(h => h.x === x && h.y === y);
    const isMiss = misses.some(m => m.x === x && m.y === y);
    const isHighlighted = highlightedCells.some(c => c.x === x && c.y === y);
    const isPreview = previewCells.some(c => c.x === x && c.y === y);
    
    // For player grid, check if ship is at this position
    let shipHere = null;
    if (type === 'player' && ships.length > 0) {
      ships.forEach((ship, index) => {
        if (ship.cells && ship.cells.some(c => c.x === x && c.y === y)) {
          shipHere = { ship, index };
        }
      });
    }
    
    return { isHit, isMiss, isHighlighted, isPreview, shipHere };
  };

  const renderCell = (x, y) => {
    const { isHit, isMiss, isHighlighted, isPreview, shipHere } = getCellStatus(x, y);
    
    let className = 'grid-cell';
    if (type === 'enemy') className += ' enemy-cell';
    if (type === 'player') className += ' player-cell';
    if (isHit) className += ' hit';
    if (isMiss) className += ' miss';
    if (isHighlighted) className += ' highlighted';
    if (isPreview && !isHit && !isMiss) className += ' preview';
    if (disabled) className += ' disabled';
    if (shipHere) className += ' has-ship';

    return (
      <motion.div
        key={`${x}-${y}`}
        className={className}
        onClick={() => handleCellClick(x, y)}
        onMouseEnter={() => setHoveredCell({ x, y })}
        onMouseLeave={() => setHoveredCell(null)}
        whileHover={!disabled && type === 'enemy' ? { scale: 1.1 } : {}}
        whileTap={!disabled && type === 'enemy' ? { scale: 0.95 } : {}}
      >
        {/* Hit marker */}
        {isHit && (
          <motion.div 
            className="hit-marker"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <svg viewBox="0 0 40 40" className="hit-x">
              <line x1="8" y1="8" x2="32" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              <line x1="32" y1="8" x2="8" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </motion.div>
        )}
        
        {/* Miss marker */}
        {isMiss && (
          <motion.div 
            className="miss-marker"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <svg viewBox="0 0 40 40" className="miss-dot">
              <circle cx="20" cy="20" r="6" fill="currentColor"/>
              <circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
            </svg>
          </motion.div>
        )}

        {/* Ship cell indicator for player grid */}
        {type === 'player' && shipHere && !isHit && (
          <div className="ship-cell-indicator"></div>
        )}

        {/* Preview indicator */}
        {isPreview && !isHit && !isMiss && (
          <motion.div 
            className="preview-marker"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="crosshair">
              <div className="crosshair-h"></div>
              <div className="crosshair-v"></div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  // Render ships on player grid
  const renderShips = () => {
    if (type !== 'player' || ships.length === 0) return null;

    return ships.map((ship, index) => {
      if (!ship.cells || ship.cells.length === 0) return null;

      const startCell = ship.cells[0];
      const isHorizontal = ship.horizontal;
      const shipHits = ship.cells.filter(cell => 
        hits.some(h => h.x === cell.x && h.y === cell.y)
      ).length;
      const isSunk = shipHits >= ship.size;

      return (
        <motion.div
          key={index}
          className={`grid-ship ${isSunk ? 'sunk' : ''}`}
          style={{
            left: `${startCell.x * 40}px`,
            top: `${startCell.y * 40}px`,
            width: isHorizontal ? `${ship.size * 40}px` : '40px',
            height: isHorizontal ? '40px' : `${ship.size * 40}px`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isSunk ? 0.4 : 0.9 }}
        >
          <div 
            className="ship-svg-wrapper"
            style={{ 
              transform: isHorizontal ? 'none' : 'rotate(90deg)',
              transformOrigin: '20px 20px'
            }}
          >
            <ShipSVG 
              type={ship.name} 
              size={ship.size * 38} 
              isSunk={isSunk}
              isHit={shipHits > 0}
            />
          </div>
        </motion.div>
      );
    });
  };

  return (
    <div className={`grid-container ${type}-grid`}>
      {/* Grid labels */}
      <div className="grid-labels-top">
        {[...'ABCDEFGHIJ'].map((letter) => (
          <span key={letter}>{letter}</span>
        ))}
      </div>
      
      <div className="grid-wrapper">
        <div className="grid-labels-left">
          {[...Array(GRID_SIZE)].map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        
        <div className="grid">
          {[...Array(GRID_SIZE)].map((_, y) => (
            <div key={y} className="grid-row">
              {[...Array(GRID_SIZE)].map((_, x) => renderCell(x, y))}
            </div>
          ))}
          
          {/* Ships overlay for player grid */}
          {renderShips()}
          
          {/* Explosions overlay */}
          <AnimatePresence>
            {explosions.map(explosion => (
              <div
                key={explosion.id}
                style={{
                  position: 'absolute',
                  left: `${explosion.x * 40 + 20}px`,
                  top: `${explosion.y * 40 + 20}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 100
                }}
              >
                <ExplosionSVG 
                  type={explosion.type}
                  onComplete={() => removeExplosion(explosion.id)}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Sonar overlay for enemy grid */}
      {type === 'enemy' && (
        <div className="sonar-overlay">
          <div className="sonar-ring ring-1"></div>
          <div className="sonar-ring ring-2"></div>
          <div className="sonar-ring ring-3"></div>
        </div>
      )}
    </div>
  );
}

export default Grid;
