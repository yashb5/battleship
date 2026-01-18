import React from 'react';
import { motion } from 'framer-motion';
import MissileSVG from './svg/MissileSVG';
import './MissilePanel.css';

const MISSILES = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Single target strike',
    pattern: 'Single cell'
  },
  {
    id: 'missileA',
    name: 'Cross Strike',
    description: 'Cross pattern explosion',
    pattern: 'Target + 4 adjacent'
  },
  {
    id: 'missileB',
    name: 'Scatter Shot',
    description: 'Splits into multiple warheads',
    pattern: 'Target + 4 random'
  },
  {
    id: 'missileC',
    name: 'Devastator',
    description: 'Massive area bombardment',
    pattern: 'Manhattan dist. 3'
  }
];

function MissilePanel({ missiles, selectedMissile, onSelectMissile, disabled }) {
  return (
    <div className="missile-panel panel">
      <div className="panel-header">
        <h3>⚔ ARSENAL</h3>
      </div>
      <div className="missile-list">
        {MISSILES.map((missile, index) => {
          const count = missiles[missile.id];
          const isSelected = selectedMissile === missile.id;
          // Standard missiles (null or Infinity) are always available, others need count > 0
          const isAvailable = missile.id === 'standard' || count === Infinity || count === null || count > 0;
          
          return (
            <motion.button
              key={missile.id}
              className={`missile-item ${isSelected ? 'selected' : ''} ${!isAvailable ? 'depleted' : ''}`}
              onClick={() => isAvailable && !disabled && onSelectMissile(missile.id)}
              disabled={disabled || !isAvailable}
              whileHover={isAvailable && !disabled ? { scale: 1.02 } : {}}
              whileTap={isAvailable && !disabled ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="missile-icon">
                <MissileSVG type={missile.id} size={35} />
              </div>
              <div className="missile-info">
                <span className="missile-name">{missile.name}</span>
                <span className="missile-pattern">{missile.pattern}</span>
              </div>
              <div className="missile-count">
                {(count === Infinity || count === null) ? '∞' : count}
              </div>
              {isSelected && (
                <motion.div 
                  className="selected-indicator"
                  layoutId="selectedMissile"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Missile info tooltip */}
      <div className="missile-details">
        <div className="detail-header">
          <span className="detail-label">SELECTED:</span>
          <span className="detail-name">
            {MISSILES.find(m => m.id === selectedMissile)?.name}
          </span>
        </div>
        <p className="detail-desc">
          {MISSILES.find(m => m.id === selectedMissile)?.description}
        </p>
        
        {/* Pattern visualization */}
        <div className="pattern-preview">
          <div className="pattern-label">IMPACT PATTERN</div>
          <div className="pattern-grid">
            {selectedMissile === 'standard' && (
              <div className="pattern-cell center"></div>
            )}
            {selectedMissile === 'missileA' && (
              <>
                <div className="pattern-cell top"></div>
                <div className="pattern-cell left"></div>
                <div className="pattern-cell center"></div>
                <div className="pattern-cell right"></div>
                <div className="pattern-cell bottom"></div>
              </>
            )}
            {selectedMissile === 'missileB' && (
              <>
                <div className="pattern-cell center"></div>
                <div className="pattern-cell random r1">?</div>
                <div className="pattern-cell random r2">?</div>
                <div className="pattern-cell random r3">?</div>
                <div className="pattern-cell random r4">?</div>
              </>
            )}
            {selectedMissile === 'missileC' && (
              <div className="pattern-area">
                <svg viewBox="0 0 100 100" className="pattern-svg">
                  <polygon 
                    points="50,10 90,50 50,90 10,50" 
                    fill="rgba(201, 162, 39, 0.3)"
                    stroke="var(--gold)"
                    strokeWidth="2"
                  />
                  <circle cx="50" cy="50" r="5" fill="var(--gold)"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MissilePanel;
