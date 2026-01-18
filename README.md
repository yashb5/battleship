# 🚢 Naval Battleship Command

A browser-based Battleship game with special weapons, smooth animations, and a navy theme.

## Features

### Classic Battleship Gameplay
- 10x10 grid
- 5 ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- Turn-based combat against AI opponent

### Special Weapons Arsenal

| Weapon | Count | Effect |
|--------|-------|--------|
| **Standard Missile** | ∞ | Single cell hit |
| **Cross Strike (A)** | 3 | Hits target + 4 adjacent cells (cross pattern) |
| **Scatter Shot (B)** | 2 | Hits target + 4 random non-destroyed cells |
| **Devastator (C)** | 1 | Hits all cells within Manhattan distance of 3 |

### Navy Theme
- Dark blue color scheme with gold accents
- Military-style fonts (Orbitron, Rajdhani)
- SVG ship and missile graphics
- Animated radar and sonar effects

### Animations
- Missile launch and flight animations
- Explosion effects for hits and misses
- Ship destruction animations
- Floating particles and wave effects
- Screen shake on impact

## Tech Stack

- **Frontend**: React 18, Framer Motion
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Styling**: CSS3 with custom animations

## Installation

```bash
# Install dependencies
cd battleship-game
npm run install-all

# Or install separately
npm install
cd client && npm install
```

## Running the Game

### Development Mode
```bash
# Run both server and client
npm run dev

# Or run separately:
# Terminal 1 - Server
npm run server

# Terminal 2 - Client
npm run client
```

The game will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games/singleplayer` | Create single-player game |
| GET | `/api/games/:id` | Get game state |
| POST | `/api/games/:id/place-ships` | Place ships on grid |
| POST | `/api/games/:id/fire` | Fire missile at target |
| GET | `/api/games/:id/attacks` | Get attacks received |

## Project Structure

```
battleship-game/
├── server/
│   ├── index.js          # Express server
│   ├── database.js       # SQLite database operations
│   └── gameLogic.js      # Game logic and missile calculations
├── client/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── MainMenu.js
│       │   ├── GameSetup.js
│       │   ├── GameBoard.js
│       │   ├── Grid.js
│       │   ├── MissilePanel.js
│       │   ├── ShipStatus.js
│       │   ├── MissileAnimation.js
│       │   ├── GameOver.js
│       │   └── svg/
│       │       ├── ShipSVG.js
│       │       ├── MissileSVG.js
│       │       └── ExplosionSVG.js
│       └── styles/
│           ├── index.css
│           └── App.css
└── package.json
```

## Game Flow

1. **Main Menu**: Enter commander name, start single-player game
2. **Ship Placement**: Place ships manually or use auto-deploy
3. **Battle**: Take turns firing missiles at enemy grid
4. **Victory/Defeat**: Game ends when all ships of one side are destroyed

## Controls

- **Click** on enemy grid to fire
- **Select missile type** from arsenal panel
- **Hover** over cells to see impact preview
- Ships can be rotated during placement

## License

MIT
