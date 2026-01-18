import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import ShipSVG from './svg/ShipSVG';
import './MainMenu.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function MainMenu({ onStartGame }) {
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSinglePlayer = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/games/singleplayer`, {
        playerName: playerName || 'Commander'
      });
      onStartGame({
        gameId: response.data.gameId,
        playerId: response.data.playerId,
        playerName: playerName || 'Commander',
        isSinglePlayer: true
      });
    } catch (err) {
      setError('Failed to create game. Please try again.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="main-menu">
      <div className="menu-content">
        {/* Animated ship silhouette */}
        <motion.div 
          className="menu-ship"
          initial={{ x: -200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <ShipSVG type="battleship" size={200} />
        </motion.div>

        {/* Title */}
        <motion.div
          className="menu-title"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="title-main">NAVAL</h1>
          <h1 className="title-sub">BATTLESHIP</h1>
          <p className="title-tagline">Command & Conquer the Seas</p>
        </motion.div>

        {/* Radar decoration */}
        <div className="radar-container">
          <div className="radar">
            <div className="radar-sweep"></div>
            <div className="radar-dot dot-1"></div>
            <div className="radar-dot dot-2"></div>
            <div className="radar-dot dot-3"></div>
          </div>
        </div>

        {/* Player name input */}
        <motion.div
          className="menu-form"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="input-group">
            <label htmlFor="playerName">COMMANDER NAME</label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your callsign..."
              maxLength={20}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="menu-buttons">
            <motion.button
              className="btn btn-primary menu-btn"
              onClick={handleSinglePlayer}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <span className="btn-icon">⚓</span>
                  SINGLE PLAYER
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className="menu-decorations">
          <div className="compass">
            <svg viewBox="0 0 100 100" className="compass-svg">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--navy-medium)" strokeWidth="2" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="var(--navy-light)" strokeWidth="1" />
              <line x1="50" y1="10" x2="50" y2="20" stroke="var(--gold)" strokeWidth="2" />
              <line x1="50" y1="80" x2="50" y2="90" stroke="var(--navy-accent)" strokeWidth="2" />
              <line x1="10" y1="50" x2="20" y2="50" stroke="var(--navy-accent)" strokeWidth="2" />
              <line x1="80" y1="50" x2="90" y2="50" stroke="var(--navy-accent)" strokeWidth="2" />
              <text x="50" y="8" textAnchor="middle" fill="var(--gold)" fontSize="8">N</text>
              <polygon points="50,25 45,45 50,40 55,45" fill="var(--hit-red)" />
              <polygon points="50,75 45,55 50,60 55,55" fill="var(--navy-light)" />
            </svg>
          </div>
        </div>

        {/* Special weapons preview */}
        <motion.div
          className="weapons-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <h3>SPECIAL ARSENAL</h3>
          <div className="weapons-list">
            <div className="weapon-item">
              <div className="weapon-icon missile-a">A</div>
              <div className="weapon-info">
                <span className="weapon-name">Cross Strike</span>
                <span className="weapon-desc">Hits target + adjacent cells</span>
              </div>
            </div>
            <div className="weapon-item">
              <div className="weapon-icon missile-b">B</div>
              <div className="weapon-info">
                <span className="weapon-name">Scatter Shot</span>
                <span className="weapon-desc">Splits into 5 impacts</span>
              </div>
            </div>
            <div className="weapon-item">
              <div className="weapon-icon missile-c">C</div>
              <div className="weapon-info">
                <span className="weapon-name">Devastator</span>
                <span className="weapon-desc">Massive area damage</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Anchor decorations */}
      <div className="anchor-left">⚓</div>
      <div className="anchor-right">⚓</div>
    </div>
  );
}

export default MainMenu;
