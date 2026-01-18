import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import ShipSVG from './svg/ShipSVG';
import './GameSetup.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const GRID_SIZE = 10;
const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 }
];

function GameSetup({ gameData, onReady }) {
  const [grid, setGrid] = useState(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
  const [ships, setShips] = useState([]);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [hoveredCells, setHoveredCells] = useState([]);
  const [isValidHover, setIsValidHover] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentShip = SHIPS[currentShipIndex];

  const getCellsForPlacement = useCallback((x, y, ship, horizontal) => {
    const cells = [];
    for (let i = 0; i < ship.size; i++) {
      const cellX = horizontal ? x + i : x;
      const cellY = horizontal ? y : y + i;
      cells.push({ x: cellX, y: cellY });
    }
    return cells;
  }, []);

  const isValidPlacement = useCallback((cells) => {
    return cells.every(cell => {
      if (cell.x >= GRID_SIZE || cell.y >= GRID_SIZE) return false;
      if (cell.x < 0 || cell.y < 0) return false;
      if (grid[cell.y][cell.x] !== null) return false;
      return true;
    });
  }, [grid]);

  const handleCellHover = useCallback((x, y) => {
    if (!currentShip) return;
    const cells = getCellsForPlacement(x, y, currentShip, isHorizontal);
    const valid = isValidPlacement(cells);
    setHoveredCells(cells);
    setIsValidHover(valid);
  }, [currentShip, isHorizontal, getCellsForPlacement, isValidPlacement]);

  const handleCellClick = useCallback((x, y) => {
    if (!currentShip) return;
    const cells = getCellsForPlacement(x, y, currentShip, isHorizontal);
    
    if (!isValidPlacement(cells)) return;

    // Place the ship
    const newGrid = grid.map(row => [...row]);
    cells.forEach(cell => {
      newGrid[cell.y][cell.x] = currentShipIndex;
    });
    setGrid(newGrid);

    const newShip = {
      ...currentShip,
      cells,
      horizontal: isHorizontal,
      hits: 0,
      sunk: false
    };
    setShips([...ships, newShip]);
    setCurrentShipIndex(currentShipIndex + 1);
    setHoveredCells([]);
  }, [currentShip, isHorizontal, getCellsForPlacement, isValidPlacement, grid, currentShipIndex, ships]);

  const handleRotate = () => {
    setIsHorizontal(!isHorizontal);
  };

  const handleReset = () => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
    setShips([]);
    setCurrentShipIndex(0);
    setHoveredCells([]);
  };

  const handleAutoPlace = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/games/${gameData.gameId}/place-ships`, {
        playerId: gameData.playerId,
        autoPlace: true
      });
      setGrid(response.data.grid);
      setShips(response.data.ships);
      setCurrentShipIndex(SHIPS.length);
      
      // Don't automatically proceed - let the user review their ships
      // and click "BATTLE STATIONS" to confirm deployment
    } catch (error) {
      console.error('Error auto-placing ships:', error);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (ships.length !== SHIPS.length) return;
    
    setLoading(true);
    try {
      // First check if ships are already placed on server
      const gameState = await axios.get(`${API_URL}/games/${gameData.gameId}?playerId=${gameData.playerId}`);
      
      // If game is already in playing state, just transition
      if (gameState.data.game.status === 'playing') {
        onReady({
          grid,
          ships,
          gameReady: true
        });
        return;
      }
      
      // Otherwise, place the ships
      const response = await axios.post(`${API_URL}/games/${gameData.gameId}/place-ships`, {
        playerId: gameData.playerId,
        grid,
        ships
      });
      
      onReady({
        grid,
        ships,
        gameReady: response.data.gameReady
      });
    } catch (error) {
      console.error('Error confirming ships:', error);
      setLoading(false);
    }
  };

  const renderCell = (x, y) => {
    const shipIndex = grid[y][x];
    const isHovered = hoveredCells.some(c => c.x === x && c.y === y);
    const hasShip = shipIndex !== null;

    let className = 'setup-cell';
    if (hasShip) className += ' has-ship';
    if (isHovered) {
      className += isValidHover ? ' hover-valid' : ' hover-invalid';
    }

    return (
      <motion.div
        key={`${x}-${y}`}
        className={className}
        onMouseEnter={() => handleCellHover(x, y)}
        onMouseLeave={() => setHoveredCells([])}
        onClick={() => handleCellClick(x, y)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {hasShip && (
          <div className="cell-ship-indicator"></div>
        )}
      </motion.div>
    );
  };

  const allShipsPlaced = ships.length === SHIPS.length;

  return (
    <div className="game-setup">
      <div className="setup-header">
        <h1>DEPLOY YOUR FLEET</h1>
        <p>Position your ships on the grid. Click to place, press R or button to rotate.</p>
      </div>

      <div className="setup-content">
        <div className="setup-left">
          {/* Ship queue */}
          <div className="panel ship-queue">
            <div className="panel-header">
              <h3>FLEET ROSTER</h3>
            </div>
            <div className="ship-list">
              {SHIPS.map((ship, index) => (
                <motion.div
                  key={ship.name}
                  className={`ship-item ${index === currentShipIndex ? 'current' : ''} ${index < currentShipIndex ? 'placed' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="ship-preview">
                    <ShipSVG type={ship.name} size={80} />
                  </div>
                  <div className="ship-details">
                    <span className="ship-name">{ship.name}</span>
                    <span className="ship-size">{ship.size} cells</span>
                  </div>
                  <div className={`ship-status ${index < currentShipIndex ? 'deployed' : ''}`}>
                    {index < currentShipIndex ? '✓ DEPLOYED' : index === currentShipIndex ? '⟐ READY' : '○ PENDING'}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="panel setup-controls">
            <div className="panel-header">
              <h3>CONTROLS</h3>
            </div>
            <div className="controls-content">
              <button 
                className="btn"
                onClick={handleRotate}
                disabled={allShipsPlaced}
              >
                🔄 ROTATE ({isHorizontal ? 'HORIZONTAL' : 'VERTICAL'})
              </button>
              <button 
                className="btn"
                onClick={handleAutoPlace}
                disabled={loading}
              >
                🎲 AUTO DEPLOY
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleReset}
              >
                ↺ RESET FLEET
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="setup-grid-container">
          <div className="grid-labels-top">
            {[...'ABCDEFGHIJ'].map((letter, i) => (
              <span key={letter}>{letter}</span>
            ))}
          </div>
          <div className="grid-wrapper">
            <div className="grid-labels-left">
              {[...Array(GRID_SIZE)].map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <div className="setup-grid">
              {[...Array(GRID_SIZE)].map((_, y) => (
                <div key={y} className="grid-row">
                  {[...Array(GRID_SIZE)].map((_, x) => renderCell(x, y))}
                </div>
              ))}

              {/* Render placed ships */}
              {ships.map((ship, index) => (
                <div
                  key={index}
                  className="placed-ship"
                  style={{
                    left: `${ship.cells[0].x * 40}px`,
                    top: `${ship.cells[0].y * 40}px`,
                    width: ship.horizontal ? `${ship.size * 40}px` : '40px',
                    height: ship.horizontal ? '40px' : `${ship.size * 40}px`
                  }}
                >
                  <div style={{ transform: ship.horizontal ? 'none' : 'rotate(90deg)', transformOrigin: '20px 20px' }}>
                    <ShipSVG type={ship.name} size={ship.size * 38} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <div className="setup-right">
          <motion.button
            className="btn btn-primary confirm-btn"
            onClick={handleConfirm}
            disabled={!allShipsPlaced || loading}
            whileHover={{ scale: allShipsPlaced ? 1.05 : 1 }}
            whileTap={{ scale: allShipsPlaced ? 0.95 : 1 }}
          >
            {loading ? 'DEPLOYING...' : allShipsPlaced ? '⚓ BATTLE STATIONS' : 'PLACE ALL SHIPS'}
          </motion.button>

          {allShipsPlaced && (
            <motion.p
              className="ready-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              All ships deployed! Ready for battle.
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameSetup;
