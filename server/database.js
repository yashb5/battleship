const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
const DB_PATH = path.join(__dirname, 'battleship.db');

// Initialize the database
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Always create a fresh database for multiplayer
  db = new SQL.Database();

  // Initialize tables - Users for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_online INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Invites for game invitations
  db.run(`
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      game_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      player1_id TEXT,
      player2_id TEXT,
      player1_user_id TEXT,
      player2_user_id TEXT,
      current_turn TEXT,
      status TEXT DEFAULT 'waiting',
      winner TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      user_id TEXT,
      name TEXT,
      grid TEXT,
      ships TEXT,
      missiles TEXT,
      hits TEXT DEFAULT '[]',
      misses TEXT DEFAULT '[]',
      treasure_chest TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT,
      player_id TEXT,
      missile_type TEXT,
      target_x INTEGER,
      target_y INTEGER,
      affected_cells TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDatabase();
  console.log('Database initialized');
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper function to run and save
function runAndSave(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

// Helper to get one row
function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Helper to get all rows
function getAll(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

module.exports = {
  initDatabase,
  
  // User operations
  createUser: (userId, username, passwordHash) => {
    runAndSave(
      `INSERT INTO users (id, username, password_hash, is_online) VALUES (?, ?, ?, 0)`,
      [userId, username, passwordHash]
    );
  },

  getUserByUsername: (username) => {
    return getOne('SELECT * FROM users WHERE username = ?', [username]);
  },

  getUserById: (userId) => {
    return getOne('SELECT * FROM users WHERE id = ?', [userId]);
  },

  setUserOnline: (userId, isOnline) => {
    runAndSave(
      `UPDATE users SET is_online = ? WHERE id = ?`,
      [isOnline ? 1 : 0, userId]
    );
  },

  getOnlineUsers: () => {
    return getAll('SELECT id, username FROM users WHERE is_online = 1');
  },

  // Invite operations
  createInvite: (inviteId, fromUserId, toUserId) => {
    runAndSave(
      `INSERT INTO invites (id, from_user_id, to_user_id, status) VALUES (?, ?, ?, 'pending')`,
      [inviteId, fromUserId, toUserId]
    );
  },

  getInvite: (inviteId) => {
    return getOne('SELECT * FROM invites WHERE id = ?', [inviteId]);
  },

  getPendingInvitesForUser: (userId) => {
    return getAll(
      `SELECT i.*, u.username as from_username 
       FROM invites i 
       JOIN users u ON i.from_user_id = u.id 
       WHERE i.to_user_id = ? AND i.status = 'pending'`,
      [userId]
    );
  },

  updateInviteStatus: (inviteId, status, gameId = null) => {
    runAndSave(
      `UPDATE invites SET status = ?, game_id = ? WHERE id = ?`,
      [status, gameId, inviteId]
    );
  },

  cancelPendingInvitesForUser: (userId) => {
    runAndSave(
      `UPDATE invites SET status = 'cancelled' WHERE (from_user_id = ? OR to_user_id = ?) AND status = 'pending'`,
      [userId, userId]
    );
  },

  // Game operations
  createGame: (gameId, player1Id, player1UserId = null) => {
    runAndSave(
      `INSERT INTO games (id, player1_id, player1_user_id, current_turn, status) VALUES (?, ?, ?, ?, 'waiting')`,
      [gameId, player1Id, player1UserId, player1Id]
    );
  },

  createMultiplayerGame: (gameId, player1Id, player1UserId, player2Id, player2UserId) => {
    runAndSave(
      `INSERT INTO games (id, player1_id, player1_user_id, player2_id, player2_user_id, current_turn, status) VALUES (?, ?, ?, ?, ?, ?, 'setup')`,
      [gameId, player1Id, player1UserId, player2Id, player2UserId, player1Id]
    );
  },

  joinGame: (gameId, player2Id, player2UserId = null) => {
    runAndSave(
      `UPDATE games SET player2_id = ?, player2_user_id = ?, status = 'setup', updated_at = datetime('now') WHERE id = ?`,
      [player2Id, player2UserId, gameId]
    );
  },

  getGame: (gameId) => {
    return getOne('SELECT * FROM games WHERE id = ?', [gameId]);
  },

  getActiveGameForUser: (userId) => {
    return getOne(
      `SELECT * FROM games WHERE (player1_user_id = ? OR player2_user_id = ?) AND status IN ('setup', 'playing')`,
      [userId, userId]
    );
  },

  updateGameStatus: (gameId, status, winner = null) => {
    runAndSave(
      `UPDATE games SET status = ?, winner = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, winner, gameId]
    );
  },

  updateTurn: (gameId, playerId) => {
    runAndSave(
      `UPDATE games SET current_turn = ?, updated_at = datetime('now') WHERE id = ?`,
      [playerId, gameId]
    );
  },

  // Treasure chest operations (per player) - supports multiple chests
  setPlayerTreasureChests: (playerId, treasureChests) => {
    runAndSave(
      `UPDATE players SET treasure_chest = ? WHERE id = ?`,
      [treasureChests && treasureChests.length > 0 ? JSON.stringify(treasureChests) : null, playerId]
    );
  },

  getPlayerTreasureChests: (playerId) => {
    const player = getOne('SELECT treasure_chest FROM players WHERE id = ?', [playerId]);
    if (player && player.treasure_chest) {
      return JSON.parse(player.treasure_chest);
    }
    return [];
  },

  addPlayerTreasureChest: (playerId, treasureChest) => {
    const existing = module.exports.getPlayerTreasureChests(playerId);
    existing.push(treasureChest);
    runAndSave(
      `UPDATE players SET treasure_chest = ? WHERE id = ?`,
      [JSON.stringify(existing), playerId]
    );
  },

  removePlayerTreasureChestAt: (playerId, x, y) => {
    const existing = module.exports.getPlayerTreasureChests(playerId);
    const filtered = existing.filter(chest => !(chest.x === x && chest.y === y));
    runAndSave(
      `UPDATE players SET treasure_chest = ? WHERE id = ?`,
      [filtered.length > 0 ? JSON.stringify(filtered) : null, playerId]
    );
    return existing.find(chest => chest.x === x && chest.y === y);
  },

  // Player operations
  createPlayer: (playerId, gameId, name, userId = null) => {
    // Players start with 2 Cross Strike missiles, others must be collected from treasure chests
    const defaultMissiles = JSON.stringify({
      standard: null,
      missileA: 2,
      missileB: 0,
      missileC: 0
    });
    runAndSave(
      `INSERT INTO players (id, game_id, user_id, name, grid, ships, missiles, hits, misses) VALUES (?, ?, ?, ?, '[]', '[]', ?, '[]', '[]')`,
      [playerId, gameId, userId, name, defaultMissiles]
    );
  },

  getPlayer: (playerId) => {
    return getOne('SELECT * FROM players WHERE id = ?', [playerId]);
  },

  getPlayerByUserAndGame: (userId, gameId) => {
    return getOne('SELECT * FROM players WHERE user_id = ? AND game_id = ?', [userId, gameId]);
  },

  getPlayersByGame: (gameId) => {
    return getAll('SELECT * FROM players WHERE game_id = ?', [gameId]);
  },

  updatePlayerGrid: (playerId, grid, ships) => {
    runAndSave(
      `UPDATE players SET grid = ?, ships = ? WHERE id = ?`,
      [JSON.stringify(grid), JSON.stringify(ships), playerId]
    );
  },

  updatePlayerMissiles: (playerId, missiles) => {
    runAndSave(
      `UPDATE players SET missiles = ? WHERE id = ?`,
      [JSON.stringify(missiles), playerId]
    );
  },

  updatePlayerHits: (playerId, hits, misses) => {
    runAndSave(
      `UPDATE players SET hits = ?, misses = ? WHERE id = ?`,
      [JSON.stringify(hits), JSON.stringify(misses), playerId]
    );
  },

  // Move operations
  recordMove: (gameId, playerId, missileType, targetX, targetY, affectedCells) => {
    runAndSave(
      `INSERT INTO moves (game_id, player_id, missile_type, target_x, target_y, affected_cells) VALUES (?, ?, ?, ?, ?, ?)`,
      [gameId, playerId, missileType, targetX, targetY, JSON.stringify(affectedCells)]
    );
  },

  getMoves: (gameId) => {
    return getAll('SELECT * FROM moves WHERE game_id = ? ORDER BY created_at', [gameId]);
  },

  // Utility
  getAllGames: () => {
    return getAll("SELECT * FROM games WHERE status = 'waiting' ORDER BY created_at DESC");
  }
};
