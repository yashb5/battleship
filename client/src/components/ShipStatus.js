import React from 'react';
import { motion } from 'framer-motion';
import ShipSVG from './svg/ShipSVG';
import './ShipStatus.css';

const SHIP_NAMES = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];

function ShipStatus({ ships, enemyHits, sunkEnemyShips }) {
  // Calculate damage for player's ships
  const getShipDamage = (ship) => {
    if (!ship.cells) return { hits: 0, total: ship.size };
    const hits = ship.cells.filter(cell => 
      enemyHits.some(h => h.x === cell.x && h.y === cell.y)
    ).length;
    return { hits, total: ship.size, isSunk: hits >= ship.size };
  };

  return (
    <div className="ship-status panel">
      <div className="panel-header">
        <h3>🚢 FLEET STATUS</h3>
      </div>
      
      {/* Your Fleet */}
      <div className="fleet-section">
        <h4 className="section-title">YOUR FLEET</h4>
        <div className="ship-list">
          {ships.map((ship, index) => {
            const { hits, total, isSunk } = getShipDamage(ship);
            return (
              <motion.div
                key={index}
                className={`ship-status-item ${isSunk ? 'sunk' : ''}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="ship-icon-small">
                  <ShipSVG type={ship.name} size={50} isSunk={isSunk} isHit={hits > 0} />
                </div>
                <div className="ship-info">
                  <span className="ship-name">{ship.name}</span>
                  <div className="health-bar">
                    {[...Array(total)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`health-segment ${i < (total - hits) ? 'intact' : 'damaged'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className={`status-indicator ${isSunk ? 'destroyed' : hits > 0 ? 'damaged' : 'operational'}`}>
                  {isSunk ? 'SUNK' : hits > 0 ? 'DAMAGED' : 'OK'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Enemy Fleet */}
      <div className="fleet-section enemy-fleet">
        <h4 className="section-title enemy">ENEMY FLEET</h4>
        <div className="ship-list">
          {SHIP_NAMES.map((name, index) => {
            const isSunk = sunkEnemyShips.some(s => s.name === name);
            return (
              <motion.div
                key={index}
                className={`ship-status-item enemy ${isSunk ? 'sunk' : ''}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="ship-icon-small">
                  <ShipSVG type={name} size={50} isSunk={isSunk} />
                </div>
                <div className="ship-info">
                  <span className="ship-name">{name}</span>
                </div>
                <div className={`status-indicator ${isSunk ? 'destroyed' : 'unknown'}`}>
                  {isSunk ? 'SUNK' : '???'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Score Summary */}
      <div className="score-summary">
        <div className="score-item">
          <span className="score-label">SHIPS LOST</span>
          <span className="score-value danger">
            {ships.filter(s => getShipDamage(s).isSunk).length}/{ships.length}
          </span>
        </div>
        <div className="score-item">
          <span className="score-label">ENEMY SUNK</span>
          <span className="score-value success">
            {sunkEnemyShips.length}/5
          </span>
        </div>
      </div>
    </div>
  );
}

export default ShipStatus;
