const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
const DB_PATH = path.join(__dirname, 'battleship.db');

// Initialize the database
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Try to load existing database, or create new one
  try {
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }

  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      player1_id TEXT,
      player2_id TEXT,
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
      name TEXT,
      grid TEXT,
      ships TEXT,
      missiles TEXT,
      hits TEXT DEFAULT '[]',
      misses TEXT DEFAULT '[]'
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
  
  // Game operations
  createGame: (gameId, player1Id) => {
    runAndSave(
      `INSERT INTO games (id, player1_id, current_turn, status) VALUES (?, ?, ?, 'waiting')`,
      [gameId, player1Id, player1Id]
    );
  },

  joinGame: (gameId, player2Id) => {
    runAndSave(
      `UPDATE games SET player2_id = ?, status = 'setup', updated_at = datetime('now') WHERE id = ?`,
      [player2Id, gameId]
    );
  },

  getGame: (gameId) => {
    return getOne('SELECT * FROM games WHERE id = ?', [gameId]);
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

  // Player operations
  createPlayer: (playerId, gameId, name) => {
    const defaultMissiles = JSON.stringify({
      standard: null, // null represents Infinity
      missileA: 3,
      missileB: 2,
      missileC: 1
    });
    runAndSave(
      `INSERT INTO players (id, game_id, name, grid, ships, missiles, hits, misses) VALUES (?, ?, ?, '[]', '[]', ?, '[]', '[]')`,
      [playerId, gameId, name, defaultMissiles]
    );
  },

  getPlayer: (playerId) => {
    return getOne('SELECT * FROM players WHERE id = ?', [playerId]);
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
