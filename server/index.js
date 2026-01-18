const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
const gameLogic = require('./gameLogic');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database before starting server
async function startServer() {
  await db.initDatabase();

// Create a new game
app.post('/api/games', (req, res) => {
  try {
    const { playerName } = req.body;
    const gameId = uuidv4();
    const playerId = uuidv4();
    
    db.createGame(gameId, playerId);
    db.createPlayer(playerId, gameId, playerName || 'Player 1');
    
    res.json({
      gameId,
      playerId,
      message: 'Game created successfully'
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get available games
app.get('/api/games', (req, res) => {
  try {
    const games = db.getAllGames();
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Join an existing game
app.post('/api/games/:gameId/join', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerName } = req.body;
    
    const game = db.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'waiting') {
      return res.status(400).json({ error: 'Game is not accepting players' });
    }
    
    const playerId = uuidv4();
    db.joinGame(gameId, playerId);
    db.createPlayer(playerId, gameId, playerName || 'Player 2');
    
    res.json({
      gameId,
      playerId,
      message: 'Joined game successfully'
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Start single player game against AI
app.post('/api/games/singleplayer', (req, res) => {
  try {
    const { playerName } = req.body;
    const gameId = uuidv4();
    const playerId = uuidv4();
    const aiPlayerId = 'ai-' + uuidv4();
    
    db.createGame(gameId, playerId);
    db.joinGame(gameId, aiPlayerId);
    db.createPlayer(playerId, gameId, playerName || 'Player');
    db.createPlayer(aiPlayerId, gameId, 'Admiral CPU');
    
    // Auto-place AI ships
    const { grid, ships } = gameLogic.autoPlaceShips();
    db.updatePlayerGrid(aiPlayerId, grid, ships);
    
    db.updateGameStatus(gameId, 'setup');
    
    res.json({
      gameId,
      playerId,
      aiPlayerId,
      message: 'Single player game created'
    });
  } catch (error) {
    console.error('Error creating single player game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

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
        // Don't reveal opponent's grid or ship positions
        shipsRemaining: JSON.parse(opponent.ships).filter(s => !s.sunk).length
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
    // Convert null to Infinity for standard missiles
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
      
      // AI opponent's turn
      if (opponent.id.startsWith('ai-')) {
        setTimeout(() => processAITurn(gameId, opponent.id, playerId), 1500);
      }
    }
    
    // Get sunk ships info
    const sunkShips = results.filter(r => r.sunk).map(r => ({
      name: r.shipName,
      shipIndex: r.shipIndex
    }));
    
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

// AI turn processing
function processAITurn(gameId, aiPlayerId, humanPlayerId) {
  try {
    const game = db.getGame(gameId);
    if (game.status !== 'playing' || game.current_turn !== aiPlayerId) {
      return;
    }
    
    const aiPlayer = db.getPlayer(aiPlayerId);
    const humanPlayer = db.getPlayer(humanPlayerId);
    
    const aiHits = JSON.parse(aiPlayer.hits);
    const aiMisses = JSON.parse(aiPlayer.misses);
    const humanGrid = JSON.parse(humanPlayer.grid);
    const humanShips = JSON.parse(humanPlayer.ships);
    const aiMissiles = JSON.parse(aiPlayer.missiles);
    
    // Simple AI: target cells near previous hits, otherwise random
    const destroyedCells = [...aiHits, ...aiMisses];
    const availableCells = [];
    
    for (let y = 0; y < gameLogic.GRID_SIZE; y++) {
      for (let x = 0; x < gameLogic.GRID_SIZE; x++) {
        if (!destroyedCells.some(c => c.x === x && c.y === y)) {
          availableCells.push({ x, y });
        }
      }
    }
    
    if (availableCells.length === 0) return;
    
    // Prioritize cells adjacent to hits
    let targetCell;
    const adjacentToHits = availableCells.filter(cell => {
      return aiHits.some(hit => {
        const dx = Math.abs(hit.x - cell.x);
        const dy = Math.abs(hit.y - cell.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
      });
    });
    
    if (adjacentToHits.length > 0) {
      targetCell = adjacentToHits[Math.floor(Math.random() * adjacentToHits.length)];
    } else {
      targetCell = availableCells[Math.floor(Math.random() * availableCells.length)];
    }
    
    // Occasionally use special missiles
    let missileType = 'standard';
    if (Math.random() > 0.8) {
      if (aiMissiles.missileA > 0) missileType = 'missileA';
      else if (aiMissiles.missileB > 0) missileType = 'missileB';
      else if (aiMissiles.missileC > 0) missileType = 'missileC';
    }
    
    // Calculate affected cells
    const affectedCells = gameLogic.getMissileAffectedCells(
      targetCell.x, targetCell.y, missileType, humanGrid, destroyedCells
    );
    
    // Process attack
    const { results, updatedShips } = gameLogic.processAttack(
      affectedCells, humanGrid, humanShips
    );
    
    // Update hits and misses
    const newHits = results.filter(r => r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));
    const newMisses = results.filter(r => !r.hit && !r.alreadyAttacked).map(r => ({ x: r.x, y: r.y }));
    
    db.updatePlayerHits(
      aiPlayerId,
      [...aiHits, ...newHits],
      [...aiMisses, ...newMisses]
    );
    
    // Update human's ships
    db.updatePlayerGrid(humanPlayerId, humanGrid, updatedShips);
    
    // Decrease missile count
    if (missileType !== 'standard') {
      aiMissiles[missileType]--;
      db.updatePlayerMissiles(aiPlayerId, aiMissiles);
    }
    
    // Record move
    db.recordMove(gameId, aiPlayerId, missileType, targetCell.x, targetCell.y, affectedCells);
    
    // Check for game over
    const gameOver = gameLogic.checkGameOver(updatedShips);
    if (gameOver) {
      db.updateGameStatus(gameId, 'finished', aiPlayerId);
    } else {
      db.updateTurn(gameId, humanPlayerId);
    }
  } catch (error) {
    console.error('AI turn error:', error);
  }
}

// Get opponent's attacks on player (for receiving hits)
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

  app.listen(PORT, () => {
    console.log(`🚢 Battleship server running on port ${PORT}`);
  });
}

// Start the server
startServer().catch(console.error);
