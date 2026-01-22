import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ShipSVG from './svg/ShipSVG';
import './Lobby.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

function Lobby({ user, onGameStart, onLogout }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [sentInvite, setSentInvite] = useState(null);
  const [notification, setNotification] = useState(null);
  const wsRef = useRef(null);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', userId: user.userId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'onlineUsers':
            setOnlineUsers(data.users.filter(u => u.id !== user.userId));
            break;
          case 'invite':
            setPendingInvites(prev => [...prev, {
              id: data.inviteId,
              from_user_id: data.fromUserId,
              from_username: data.fromUsername
            }]);
            showNotification(`${data.fromUsername} wants to battle!`, 'invite');
            break;
          case 'inviteDeclined':
            setSentInvite(null);
            showNotification('Invite was declined', 'warning');
            break;
          case 'gameStart':
            onGameStart({
              gameId: data.gameId,
              playerId: data.playerId,
              opponentName: data.opponentName,
              playerName: user.username
            });
            break;
          default:
            break;
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user.userId, user.username, onGameStart, showNotification]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, invitesRes] = await Promise.all([
          axios.get(`${API_URL}/users/online`),
          axios.get(`${API_URL}/invites/${user.userId}`)
        ]);
        setOnlineUsers(usersRes.data.filter(u => u.id !== user.userId));
        setPendingInvites(invitesRes.data);
      } catch (error) {
        console.error('Error loading lobby data:', error);
      }
    };
    loadData();
  }, [user.userId]);

  const sendInvite = async (toUserId, toUsername) => {
    try {
      await axios.post(`${API_URL}/invites`, {
        fromUserId: user.userId,
        toUserId
      });
      setSentInvite({ toUserId, toUsername });
      showNotification(`Invite sent to ${toUsername}`, 'success');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to send invite', 'error');
    }
  };

  const acceptInvite = async (inviteId) => {
    try {
      const response = await axios.post(`${API_URL}/invites/${inviteId}/accept`);
      onGameStart({
        gameId: response.data.gameId,
        playerId: response.data.playerId,
        opponentName: response.data.opponentName,
        playerName: user.username
      });
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to accept invite', 'error');
    }
  };

  const declineInvite = async (inviteId) => {
    try {
      await axios.post(`${API_URL}/invites/${inviteId}/decline`);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to decline invite', 'error');
    }
  };

  // Pattern grid component for missile blast patterns
  const PatternGrid = ({ pattern, size = 'small' }) => {
    return (
      <div className={`pattern-grid ${size}`}>
        {pattern.map((row, rowIndex) => (
          <div key={rowIndex} className="pattern-row">
            {row.map((cell, colIndex) => (
              <div key={colIndex} className={`cell ${cell}`}></div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Define missile patterns
  const standardPattern = [
    ['', '', ''],
    ['', 'hit center', ''],
    ['', '', '']
  ];

  const crossPattern = [
    ['', 'hit', ''],
    ['hit', 'hit center', 'hit'],
    ['', 'hit', '']
  ];

  const scatterPattern = [
    ['hit random', '', 'hit random'],
    ['', 'hit center', ''],
    ['hit random', '', 'hit random']
  ];

  const devastatorPattern = [
    ['', '', '', 'hit', '', '', ''],
    ['', '', 'hit', 'hit', 'hit', '', ''],
    ['', 'hit', 'hit', 'hit', 'hit', 'hit', ''],
    ['hit', 'hit', 'hit', 'hit center', 'hit', 'hit', 'hit'],
    ['', 'hit', 'hit', 'hit', 'hit', 'hit', ''],
    ['', '', 'hit', 'hit', 'hit', '', ''],
    ['', '', '', 'hit', '', '', '']
  ];

  return (
    <div className="lobby-container">
      <div className="lobby-content">
        {/* Header */}
        <div className="lobby-header">
          <motion.div 
            className="lobby-ship"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <ShipSVG type="battleship" size={120} />
          </motion.div>
          
          <div className="lobby-title">
            <h1>COMMAND CENTER</h1>
            <p>Welcome, Commander <span className="gold">{user.username}</span></p>
          </div>
          
          <motion.button
            className="btn btn-logout"
            onClick={onLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ⚓ LOGOUT
          </motion.button>
        </div>

        {/* Main content */}
        <div className="lobby-main">
          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <motion.div 
              className="panel invites-panel"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="panel-header">
                <h3>⚔️ BATTLE REQUESTS</h3>
              </div>
              <div className="invites-list">
                {pendingInvites.map(invite => (
                  <motion.div 
                    key={invite.id} 
                    className="invite-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="invite-info">
                      <span className="invite-from">{invite.from_username}</span>
                      <span className="invite-text">challenges you to battle!</span>
                    </div>
                    <div className="invite-actions">
                      <motion.button
                        className="btn btn-accept"
                        onClick={() => acceptInvite(invite.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ✓ ACCEPT
                      </motion.button>
                      <motion.button
                        className="btn btn-decline"
                        onClick={() => declineInvite(invite.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ✗ DECLINE
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Sent Invite Status */}
          {sentInvite && (
            <motion.div 
              className="panel sent-invite-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="sent-invite-content">
                <div className="loading-radar">
                  <div className="radar-mini">
                    <div className="radar-sweep"></div>
                  </div>
                </div>
                <p>Waiting for <span className="gold">{sentInvite.toUsername}</span> to respond...</p>
                <button 
                  className="btn btn-cancel"
                  onClick={() => setSentInvite(null)}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Online Players */}
          <motion.div 
            className="panel players-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="panel-header">
              <h3>🎯 ONLINE COMMANDERS ({onlineUsers.length})</h3>
            </div>
            <div className="players-list">
              {onlineUsers.length === 0 ? (
                <div className="no-players">
                  <p>No other commanders online</p>
                  <p className="hint">Waiting for opponents to join...</p>
                </div>
              ) : (
                onlineUsers.map(player => (
                  <motion.div 
                    key={player.id} 
                    className="player-item"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="player-info">
                      <div className="player-status online"></div>
                      <span className="player-name">{player.username}</span>
                    </div>
                    <motion.button
                      className="btn btn-invite"
                      onClick={() => sendInvite(player.id, player.username)}
                      disabled={!!sentInvite}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ⚔️ CHALLENGE
                    </motion.button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* How to play */}
          <motion.div 
            className="panel info-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="panel-header">
              <h3>📋 HOW TO PLAY</h3>
            </div>
            <div className="info-content">
              <ol>
                <li>Challenge an online commander to battle</li>
                <li>Once accepted, deploy your fleet on the grid</li>
                <li>Take turns firing missiles at enemy waters</li>
                <li>⏱️ <strong>15 seconds per turn</strong> — act fast or your turn will be skipped!</li>
                <li>Sink all enemy ships to claim victory!</li>
              </ol>
            </div>
          </motion.div>

          {/* Missile Arsenal Info */}
          <motion.div 
            className="panel arsenal-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="panel-header">
              <h3>🚀 MISSILE ARSENAL</h3>
            </div>
            <div className="arsenal-content">
              {/* Treasure Chest Info */}
              <div className="treasure-info">
                <div className="treasure-icon">🎁</div>
                <div className="treasure-details">
                  <h4>Treasure Chests</h4>
                  <p>Treasure chests may appear on the grid at the start of each turn. 
                     Multiple chests can accumulate — attack them to collect special weapons!</p>
                </div>
              </div>

              <div className="missile-info">
                <div className="missile-card">
                  <div className="missile-icon standard">
                    <span>STD</span>
                  </div>
                  <div className="missile-details">
                    <h4>Standard Missile</h4>
                    <p className="missile-count">Unlimited</p>
                    <p className="missile-desc">Single cell precision strike</p>
                    <div className="impact-pattern standard-pattern">
                      <PatternGrid pattern={standardPattern} size="small" />
                    </div>
                  </div>
                </div>

                <div className="missile-card">
                  <div className="missile-icon cross">
                    <span>A</span>
                  </div>
                  <div className="missile-details">
                    <h4>Cross Strike</h4>
                    <p className="missile-count">×2 Starting + 🎁</p>
                    <p className="missile-desc">Hits target + 4 adjacent cells in cross pattern</p>
                    <div className="impact-pattern cross-pattern">
                      <PatternGrid pattern={crossPattern} size="small" />
                    </div>
                  </div>
                </div>

                <div className="missile-card">
                  <div className="missile-icon scatter">
                    <span>B</span>
                  </div>
                  <div className="missile-details">
                    <h4>Scatter Shot</h4>
                    <p className="missile-count">🎁 Collect from chests</p>
                    <p className="missile-desc">Hits target + 4 random cells across the grid</p>
                    <div className="impact-pattern scatter-pattern">
                      <PatternGrid pattern={scatterPattern} size="small" />
                    </div>
                  </div>
                </div>

                <div className="missile-card">
                  <div className="missile-icon devastator">
                    <span>C</span>
                  </div>
                  <div className="missile-details">
                    <h4>Devastator</h4>
                    <p className="missile-count">🎁 Collect from chests</p>
                    <p className="missile-desc">Massive blast - all cells within range 3</p>
                    <div className="impact-pattern devastator-pattern">
                      <PatternGrid pattern={devastatorPattern} size="large" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`lobby-notification notification-${notification.type}`}
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Lobby;
