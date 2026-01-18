const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('./database');
const gameLogic = require('./gameLogic');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track connected clients by userId
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        userId = data.userId;
        clients.set(userId, ws);
        db.setUserOnline(userId, true);
        broadcastOnlineUsers();
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      db.setUserOnline(userId, false);
      db.cancelPendingInvitesForUser(userId);
      broadcastOnlineUsers();
    }
  });
});

// Broadcast online users to all connected clients
function broadcastOnlineUsers() {
  const onlineUsers = db.getOnlineUsers();
  const message = JSON.stringify({ type: 'onlineUsers', users: onlineUsers });
  
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Send message to specific user
function sendToUser(userId, message) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Initialize database before starting server
async function startServer() {
  await db.initDatabase();

  // ========== AUTH ENDPOINTS ==========

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });


  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
      }

      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }

      // Check if username exists
      const existing = db.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);
      
      db.createUser(userId, username, passwordHash);

      res.json({
        userId,
        username,
        message: 'Registration successful'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = db.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({
        userId: user.id,
        username: user.username,
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ========== INVITE ENDPOINTS ==========

  // Send invite
  app.post('/api/invites', (req, res) => {
    try {
      const { fromUserId, toUserId } = req.body;
      
      if (fromUserId === toUserId) {
        return res.status(400).json({ error: 'Cannot invite yourself' });
      }

      const toUser = db.getUserById(toUserId);
      if (!toUser || !toUser.is_online) {
        return res.status(400).json({ error: 'User is not online' });
      }

      const inviteId = uuidv4();
      db.createInvite(inviteId, fromUserId, toUserId);

      const fromUser = db.getUserById(fromUserId);
      
      // Send invite notification via WebSocket
      sendToUser(toUserId, {
        type: 'invite',
        inviteId,
        fromUserId,
        fromUsername: fromUser.username
      });

      res.json({
        inviteId,
        message: 'Invite sent'
      });
    } catch (error) {
      console.error('Invite error:', error);
      res.status(500).json({ error: 'Failed to send invite' });
    }
  });

  // Get pending invites for user
  app.get('/api/invites/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      const invites = db.getPendingInvitesForUser(userId);
      res.json(invites);
    } catch (error) {
      console.error('Get invites error:', error);
      res.status(500).json({ error: 'Failed to get invites' });
    }
  });

  // Accept invite
  app.post('/api/invites/:inviteId/accept', (req, res) => {
    try {
      const { inviteId } = req.params;
      const invite = db.getInvite(inviteId);
      
      if (!invite || invite.status !== 'pending') {
        return res.status(400).json({ error: 'Invalid or expired invite' });
      }

      // Create game
      const gameId = uuidv4();
      const player1Id = uuidv4();
      const player2Id = uuidv4();

      const fromUser = db.getUserById(invite.from_user_id);
      const toUser = db.getUserById(invite.to_user_id);

      db.createMultiplayerGame(gameId, player1Id, invite.from_user_id, player2Id, invite.to_user_id);
      db.createPlayer(player1Id, gameId, fromUser.username, invite.from_user_id);
      db.createPlayer(player2Id, gameId, toUser.username, invite.to_user_id);
      
      db.updateInviteStatus(inviteId, 'accepted', gameId);

      // Cancel any other pending invites for both users
      db.cancelPendingInvitesForUser(invite.from_user_id);
      db.cancelPendingInvitesForUser(invite.to_user_id);

      // Notify inviter that game is starting
      sendToUser(invite.from_user_id, {
        type: 'gameStart',
        gameId,
        playerId: player1Id,
        opponentName: toUser.username
      });

      res.json({
        gameId,
        playerId: player2Id,
        opponentName: fromUser.username,
        message: 'Game started'
      });
    } catch (error) {
      console.error('Accept invite error:', error);
      res.status(500).json({ error: 'Failed to accept invite' });
    }
  });

  // Decline invite
  app.post('/api/invites/:inviteId/decline', (req, res) => {
    try {
      const { inviteId } = req.params;
      const invite = db.getInvite(inviteId);
      
      if (!invite || invite.status !== 'pending') {
        return res.status(400).json({ error: 'Invalid or expired invite' });
      }

      db.updateInviteStatus(inviteId, 'declined');

      // Notify inviter
      sendToUser(invite.from_user_id, {
        type: 'inviteDeclined',
        inviteId
      });

      res.json({ message: 'Invite declined' });
    } catch (error) {
      console.error('Decline invite error:', error);
      res.status(500).json({ error: 'Failed to decline invite' });
    }
  });

  // ========== GAME ENDPOINTS ==========

  // Get game state
  app.get('/api/games/:gameId', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerId } = req.query;
      
      const game = db.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }
      
      const players = db.getPlayersByGame(gameId);
      const currentPlayer = players.find(p => p.id === playerId);
      const opponent = players.find(p => p.id !== playerId);
      
      // Parse JSON fields and convert null to Infinity for standard missiles
      const parsePlayerData = (player) => {
        const missiles = JSON.parse(player.missiles);
        return {
          id: player.id,
          name: player.name,
          missiles: {
            standard: missiles.standard === null ? Infinity : missiles.standard,
            missileA: missiles.missileA,
            missileB: missiles.missileB,
            missileC: missiles.missileC
          },
          hits: JSON.parse(player.hits),
          misses: JSON.parse(player.misses),
          grid: JSON.parse(player.grid),
          ships: JSON.parse(player.ships)
        };
      };
      
      const response = {
        game: {
          id: game.id,
          status: game.status,
          currentTurn: game.current_turn,
          winner: game.winner
        },
        player: currentPlayer ? parsePlayerData(currentPlayer) : null,
        opponent: opponent ? {
          id: opponent.id,
          name: opponent.name,
          shipsRemaining: JSON.parse(opponent.ships).filter(s => !s.sunk).length,
          shipsReady: JSON.parse(opponent.ships).length === gameLogic.SHIPS.length
        } : null
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).json({ error: 'Failed to fetch game state' });
    }
  });

  // Place ships
  app.post('/api/games/:gameId/place-ships', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerId, grid, ships, autoPlace } = req.body;
      
      const game = db.getGame(gameId);
      if (!game || (game.status !== 'setup' && game.status !== 'waiting')) {
        return res.status(400).json({ error: 'Cannot place ships at this stage' });
      }
      
      let finalGrid, finalShips;
      
      if (autoPlace) {
        const result = gameLogic.autoPlaceShips();
        finalGrid = result.grid;
        finalShips = result.ships;
      } else {
        finalGrid = grid;
        finalShips = ships;
      }
      
      db.updatePlayerGrid(playerId, finalGrid, finalShips);
      
      // Check if both players have placed ships
      const players = db.getPlayersByGame(gameId);
      const allReady = players.every(p => {
        const playerShips = JSON.parse(p.ships);
        return playerShips.length === gameLogic.SHIPS.length;
      });
      
      if (allReady) {
        db.updateGameStatus(gameId, 'playing');
        
        // Notify both players game is starting
        players.forEach(p => {
          const player = db.getPlayer(p.id);
          if (player && player.user_id) {
            sendToUser(player.user_id, {
              type: 'gameReady',
              gameId
            });
          }
        });
      }
      
      res.json({
        message: 'Ships placed successfully',
        grid: finalGrid,
        ships: finalShips,
        gameReady: allReady
      });
    } catch (error) {
      console.error('Error placing ships:', error);
      res.status(500).json({ error: 'Failed to place ships' });
    }
  });

  // Fire missile
  app.post('/api/games/:gameId/fire', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerId, targetX, targetY, missileType } = req.body;
      
      const game = db.getGame(gameId);
      if (!game || game.status !== 'playing') {
        return res.status(400).json({ error: 'Game is not in playing state' });
      }
      
      if (game.current_turn !== playerId) {
        return res.status(400).json({ error: 'Not your turn' });
      }
      
      const player = db.getPlayer(playerId);
      const missiles = JSON.parse(player.missiles);
      missiles.standard = missiles.standard === null ? Infinity : missiles.standard;
      
      // Check missile availability
      if (missileType !== 'standard' && missiles[missileType] <= 0) {
        return res.status(400).json({ error: 'No missiles of this type remaining' });
      }
      
      // Get opponent
      const players = db.getPlayersByGame(gameId);
      const opponent = players.find(p => p.id !== playerId);
      const opponentGrid = JSON.parse(opponent.grid);
      const opponentShips = JSON.parse(opponent.ships);
      
      // Get destroyed cells
      const playerHits = JSON.parse(player.hits);
      const playerMisses = JSON.parse(player.misses);
      const destroyedCells = [...playerHits, ...playerMisses];
      
      // Calculate affected cells
      const affectedCells = gameLogic.getMissileAffectedCells(
        targetX, targetY, missileType, opponentGrid, destroyedCells
      );
      
      // Process attack
      const { results, updatedShips } = gameLogic.processAttack(
        affectedCells, opponentGrid, opponentShips
      );
      
      // Update player's hits and misses
      const newHits = results.filter(r => r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));
      const newMisses = results.filter(r => !r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));
      
      db.updatePlayerHits(
        playerId,
        [...playerHits, ...newHits],
        [...playerMisses, ...newMisses]
      );
      
      // Update opponent's ships
      db.updatePlayerGrid(opponent.id, opponentGrid, updatedShips);
      
      // Decrease missile count
      if (missileType !== 'standard') {
        missiles[missileType]--;
        db.updatePlayerMissiles(playerId, missiles);
      }
      
      // Record move
      db.recordMove(gameId, playerId, missileType, targetX, targetY, affectedCells);
      
      // Check for game over
      const gameOver = gameLogic.checkGameOver(updatedShips);
      if (gameOver) {
        db.updateGameStatus(gameId, 'finished', playerId);
      } else {
        // Switch turns
        db.updateTurn(gameId, opponent.id);
      }
      
      // Get sunk ships info
      const sunkShips = results.filter(r => r.sunk).map(r => ({
        name: r.shipName,
        shipIndex: r.shipIndex
      }));

      // Notify opponent via WebSocket
      const opponentPlayer = db.getPlayer(opponent.id);
      if (opponentPlayer && opponentPlayer.user_id) {
        sendToUser(opponentPlayer.user_id, {
          type: 'opponentFired',
          gameId,
          results,
          affectedCells,
          sunkShips,
          gameOver,
          isYourTurn: !gameOver
        });
      }
      
      res.json({
        results,
        affectedCells,
        sunkShips,
        missiles,
        gameOver,
        winner: gameOver ? playerId : null
      });
    } catch (error) {
      console.error('Error firing missile:', error);
      res.status(500).json({ error: 'Failed to fire missile' });
    }
  });

  // Get opponent's attacks on player
  app.get('/api/games/:gameId/attacks', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerId } = req.query;
      
      const players = db.getPlayersByGame(gameId);
      const opponent = players.find(p => p.id !== playerId);
      
      if (!opponent) {
        return res.json({ hits: [], misses: [] });
      }
      
      res.json({
        hits: JSON.parse(opponent.hits),
        misses: JSON.parse(opponent.misses)
      });
    } catch (error) {
      console.error('Error fetching attacks:', error);
      res.status(500).json({ error: 'Failed to fetch attacks' });
    }
  });

  // Skip turn (timeout)
  app.post('/api/games/:gameId/skip-turn', (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerId } = req.body;
      
      const game = db.getGame(gameId);
      if (!game || game.status !== 'playing') {
        return res.status(400).json({ error: 'Game is not in playing state' });
      }
      
      if (game.current_turn !== playerId) {
        return res.status(400).json({ error: 'Not your turn' });
      }
      
      // Get opponent
      const players = db.getPlayersByGame(gameId);
      const opponent = players.find(p => p.id !== playerId);
      
      // Switch turns
      db.updateTurn(gameId, opponent.id);
      
      // Notify opponent via WebSocket that it's now their turn
      const opponentPlayer = db.getPlayer(opponent.id);
      if (opponentPlayer && opponentPlayer.user_id) {
        sendToUser(opponentPlayer.user_id, {
          type: 'turnSkipped',
          gameId,
          isYourTurn: true
        });
      }
      
      res.json({
        message: 'Turn skipped due to timeout',
        nextTurn: opponent.id
      });
    } catch (error) {
      console.error('Error skipping turn:', error);
      res.status(500).json({ error: 'Failed to skip turn' });
    }
  });


  // Get online users
  app.get('/api/users/online', (req, res) => {
    try {
      const users = db.getOnlineUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching online users:', error);
      res.status(500).json({ error: 'Failed to fetch online users' });
    }
  });

  server.listen(PORT, () => {
    console.log(`🚢 Battleship multiplayer server running on port ${PORT}`);
  });
}

// Start the server
startServer().catch(console.error);
