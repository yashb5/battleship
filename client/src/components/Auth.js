import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import ShipSVG from './svg/ShipSVG';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? 'login' : 'register';
      const response = await axios.post(`${API_URL}/auth/${endpoint}`, {
        username,
        password
      });

      onLogin({
        userId: response.data.userId,
        username: response.data.username
      });
    } catch (err) {
      console.error('Auth error:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Server not available. Run "npm run dev" to start both server and client.');
      } else {
        setError('Connection error. Please ensure the server is running.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        {/* Ship decoration */}
        <motion.div 
          className="auth-ship"
          initial={{ x: -200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <ShipSVG type="battleship" size={200} />
        </motion.div>

        {/* Title */}
        <motion.div
          className="auth-title"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="title-main">NAVAL</h1>
          <h1 className="title-sub">BATTLESHIP</h1>
          <p className="title-tagline">Multiplayer Command Center</p>
        </motion.div>

        {/* Auth Form */}
        <motion.div
          className="auth-form-container"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              LOGIN
            </button>
            <button 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              REGISTER
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="username">COMMANDER NAME</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your callsign..."
                maxLength={20}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">ACCESS CODE</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
              />
            </div>

            {!isLogin && (
              <div className="input-group">
                <label htmlFor="confirmPassword">CONFIRM CODE</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password..."
                  required
                />
              </div>
            )}

            {error && <p className="error-message">{error}</p>}

            <motion.button
              type="submit"
              className="btn btn-primary auth-btn"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <span className="btn-icon">⚓</span>
                  {isLogin ? 'ENTER COMMAND' : 'ENLIST'}
                </>
              )}
            </motion.button>
          </form>
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
      </div>

      {/* Anchor decorations */}
      <div className="anchor-left">⚓</div>
      <div className="anchor-right">⚓</div>
    </div>
  );
}

export default Auth;
