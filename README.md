# 🚢 Naval Battleship Command - Multiplayer

A browser-based multiplayer Battleship game with user authentication, real-time invites, special weapons, smooth animations, and a navy theme.

## Features

### Multiplayer Gameplay
- **User Authentication**: Sign up and log in with username/password
- **Player Lobby**: See online players and challenge them to battle
- **Real-time Invites**: Send and receive game invitations via WebSocket
- **Turn-based Combat**: Play against other human players in real-time

### Classic Battleship Mechanics
- 10x10 grid
- 5 ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- Take turns firing at enemy waters

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
- **Backend**: Node.js, Express, WebSocket (ws)
- **Database**: SQLite (sql.js)
- **Authentication**: bcryptjs for password hashing
- **Styling**: CSS3 with custom animations

## Installation

```bash
# Install dependencies
cd battleship
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
- WebSocket: ws://localhost:3001

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login existing user |

### Invites
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/invites` | Send game invitation |
| GET | `/api/invites/:userId` | Get pending invites |
| POST | `/api/invites/:id/accept` | Accept invitation (starts game) |
| POST | `/api/invites/:id/decline` | Decline invitation |

### Game
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games/:id` | Get game state |
| POST | `/api/games/:id/place-ships` | Place ships on grid |
| POST | `/api/games/:id/fire` | Fire missile at target |
| GET | `/api/games/:id/attacks` | Get attacks received |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/online` | Get online users |

## WebSocket Events

### Client → Server
- `auth`: Authenticate WebSocket connection with userId

### Server → Client
- `onlineUsers`: List of currently online users
- `invite`: Incoming game invitation
- `inviteDeclined`: Invitation was declined
- `gameStart`: Game has started (for invite sender)
- `gameReady`: Both players have placed ships
- `opponentFired`: Opponent has made a move

## Game Flow

1. **Authentication**: Sign up or log in with your commander name
2. **Lobby**: View online players and send/receive battle invitations
3. **Accept Invite**: When an invite is accepted, the game starts immediately
4. **Ship Placement**: Both players deploy their fleet on the grid
5. **Battle**: Take turns firing missiles at enemy waters in real-time
6. **Victory/Defeat**: Game ends when all ships of one side are destroyed

## Project Structure

```
battleship/
├── server/
│   ├── index.js          # Express + WebSocket server
│   ├── database.js       # SQLite database operations
│   └── gameLogic.js      # Game logic and missile calculations
├── client/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── Auth.js         # Login/Register
│       │   ├── Lobby.js        # Player lobby & invites
│       │   ├── GameSetup.js    # Ship placement
│       │   ├── GameBoard.js    # Main game interface
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

## Controls

- **Click** on enemy grid to fire
- **Select missile type** from arsenal panel
- **Hover** over cells to see impact preview
- Ships can be rotated during placement

## License

MIT
