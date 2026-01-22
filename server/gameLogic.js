const GRID_SIZE = 10;

const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 }
];

// Create empty grid
const createEmptyGrid = () => {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
};

// Check if placement is valid
const isValidPlacement = (grid, ship, startX, startY, horizontal) => {
  for (let i = 0; i < ship.size; i++) {
    const x = horizontal ? startX + i : startX;
    const y = horizontal ? startY : startY + i;
    
    if (x >= GRID_SIZE || y >= GRID_SIZE) return false;
    if (grid[y][x] !== null) return false;
  }
  return true;
};

// Place ship on grid
const placeShip = (grid, ship, startX, startY, horizontal, shipIndex) => {
  const newGrid = grid.map(row => [...row]);
  const cells = [];
  
  for (let i = 0; i < ship.size; i++) {
    const x = horizontal ? startX + i : startX;
    const y = horizontal ? startY : startY + i;
    newGrid[y][x] = shipIndex;
    cells.push({ x, y });
  }
  
  return { grid: newGrid, cells };
};

// Auto-place ships for AI or quick setup
const autoPlaceShips = () => {
  let grid = createEmptyGrid();
  const placedShips = [];
  
  for (let i = 0; i < SHIPS.length; i++) {
    const ship = SHIPS[i];
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 100) {
      const horizontal = Math.random() > 0.5;
      const startX = Math.floor(Math.random() * (horizontal ? GRID_SIZE - ship.size + 1 : GRID_SIZE));
      const startY = Math.floor(Math.random() * (horizontal ? GRID_SIZE : GRID_SIZE - ship.size + 1));
      
      if (isValidPlacement(grid, ship, startX, startY, horizontal)) {
        const result = placeShip(grid, ship, startX, startY, horizontal, i);
        grid = result.grid;
        placedShips.push({
          ...ship,
          cells: result.cells,
          horizontal,
          hits: 0,
          sunk: false
        });
        placed = true;
      }
      attempts++;
    }
  }
  
  return { grid, ships: placedShips };
};

// Get affected cells for different missile types
const getMissileAffectedCells = (targetX, targetY, missileType, enemyGrid, destroyedCells = []) => {
  const cells = [];
  const isDestroyed = (x, y) => destroyedCells.some(c => c.x === x && c.y === y);
  const isValid = (x, y) => x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  
  switch (missileType) {
    case 'standard':
      if (isValid(targetX, targetY)) {
        cells.push({ x: targetX, y: targetY });
      }
      break;
      
    case 'missileA':
      // Cross pattern: center + 4 adjacent
      const crossPattern = [
        { x: targetX, y: targetY },
        { x: targetX - 1, y: targetY },
        { x: targetX + 1, y: targetY },
        { x: targetX, y: targetY - 1 },
        { x: targetX, y: targetY + 1 }
      ];
      crossPattern.forEach(cell => {
        if (isValid(cell.x, cell.y)) {
          cells.push(cell);
        }
      });
      break;
      
    case 'missileB':
      // Target cell + 4 random non-destroyed cells
      cells.push({ x: targetX, y: targetY });
      
      // Get all non-destroyed cells
      const availableCells = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (!isDestroyed(x, y) && !(x === targetX && y === targetY)) {
            availableCells.push({ x, y });
          }
        }
      }
      
      // Shuffle and pick 4
      for (let i = availableCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
      }
      
      cells.push(...availableCells.slice(0, 4));
      break;
      
    case 'missileC':
      // All cells within Manhattan distance of 3
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const distance = Math.abs(x - targetX) + Math.abs(y - targetY);
          if (distance <= 3) {
            cells.push({ x, y });
          }
        }
      }
      break;
  }
  
  return cells;
};

// Process attack and determine hits
const processAttack = (cells, enemyGrid, enemyShips) => {
  const results = [];
  const updatedShips = JSON.parse(JSON.stringify(enemyShips));
  
  cells.forEach(cell => {
    const { x, y } = cell;
    const gridValue = enemyGrid[y][x];
    
    if (gridValue !== null && gridValue !== 'hit' && gridValue !== 'miss') {
      // Hit a ship
      const shipIndex = gridValue;
      const ship = updatedShips[shipIndex];
      ship.hits++;
      
      if (ship.hits >= ship.size) {
        ship.sunk = true;
      }
      
      results.push({ x, y, hit: true, shipIndex, sunk: ship.sunk, shipName: ship.name });
    } else if (gridValue === null) {
      // Miss
      results.push({ x, y, hit: false });
    } else {
      // Already attacked
      results.push({ x, y, hit: false, alreadyAttacked: true });
    }
  });
  
  return { results, updatedShips };
};

// Check if all ships are sunk
const checkGameOver = (ships) => {
  return ships.every(ship => ship.sunk);
};

// Treasure chest probability constants
const TREASURE_SPAWN_PROBABILITY = 0.3;
const MAX_TREASURE_CHESTS = 3; // Maximum number of chests per player
const TREASURE_WEAPON_PROBABILITIES = {
  missileA: 0.5,  // Cross Strike
  missileB: 0.3,  // Scatter Shot
  missileC: 0.2   // Devastator
};

// Generate a random treasure chest with a weapon
// attackedCells: cells already attacked by the player
// existingChests: existing treasure chests to avoid overlap
const generateTreasureChest = (attackedCells = [], existingChests = []) => {
  // Check if max chests limit reached
  if (existingChests.length >= MAX_TREASURE_CHESTS) {
    return null;
  }

  // 0.3 probability to spawn a treasure chest
  if (Math.random() > TREASURE_SPAWN_PROBABILITY) {
    return null;
  }

  // Find all available cells (not attacked and no existing chest)
  const availableCells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const isAttacked = attackedCells.some(c => c.x === x && c.y === y);
      const hasChest = existingChests.some(c => c.x === x && c.y === y);
      if (!isAttacked && !hasChest) {
        availableCells.push({ x, y });
      }
    }
  }

  if (availableCells.length === 0) {
    return null;
  }

  // Pick a random available cell
  const randomIndex = Math.floor(Math.random() * availableCells.length);
  const cell = availableCells[randomIndex];

  // Determine the weapon using probability distribution
  const rand = Math.random();
  let weapon;
  if (rand < TREASURE_WEAPON_PROBABILITIES.missileA) {
    weapon = 'missileA'; // Cross Strike - 50%
  } else if (rand < TREASURE_WEAPON_PROBABILITIES.missileA + TREASURE_WEAPON_PROBABILITIES.missileB) {
    weapon = 'missileB'; // Scatter Shot - 30%
  } else {
    weapon = 'missileC'; // Devastator - 20%
  }

  return {
    x: cell.x,
    y: cell.y,
    weapon: weapon
  };
};

// Get weapon display name
const getWeaponName = (weaponId) => {
  const names = {
    missileA: 'Cross Strike',
    missileB: 'Scatter Shot',
    missileC: 'Devastator'
  };
  return names[weaponId] || weaponId;
};

module.exports = {
  GRID_SIZE,
  SHIPS,
  createEmptyGrid,
  isValidPlacement,
  placeShip,
  autoPlaceShips,
  getMissileAffectedCells,
  processAttack,
  checkGameOver,
  generateTreasureChest,
  getWeaponName
};
