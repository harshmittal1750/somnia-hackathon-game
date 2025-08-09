# Somnia Space Defender Backend

A high-performance Node.js backend API for the Somnia Space Defender game with MongoDB database and Web3 integration.

## 🚀 Features

- **Gas-Optimized Architecture**: Moved scores, leaderboards, and achievements off-chain to reduce gas costs from 2M+ to minimal SSD rewards only
- **Anti-Cheat System**: Server-side score validation with multiple layers of protection
- **Real-time Leaderboards**: Fast, cached leaderboard system with multiple ranking types
- **Achievement System**: Comprehensive achievement tracking and unlocking
- **SSD Token Integration**: Seamless Web3 integration for token rewards
- **High Performance**: MongoDB with optimized indexes and caching
- **RESTful API**: Clean, documented API endpoints
- **Security**: Rate limiting, validation, and data sanitization

## 📁 Project Structure

```
backend/
├── models/           # MongoDB schemas
│   ├── Player.js     # Player statistics and profiles
│   ├── GameScore.js  # Game scores and session data
│   └── Achievement.js # Achievement definitions
├── routes/           # API endpoints
│   ├── game.js       # Score submission and game stats
│   ├── leaderboard.js # Leaderboard and rankings
│   ├── achievements.js # Achievement system
│   └── player.js     # Player profiles and stats
├── services/         # Business logic
│   ├── web3Service.js # Blockchain interactions
│   └── antiCheatService.js # Score validation
├── scripts/          # Database and deployment scripts
│   └── seedAchievements.js # Initialize achievements
├── server.js         # Express server setup
├── package.json      # Dependencies
└── env.example       # Environment variables template
```

## 🛠️ Installation

### Prerequisites

- Node.js 16.0.0 or higher
- MongoDB 5.0 or higher
- Somnia testnet access

### Setup

1. **Clone and Install Dependencies**

```bash
cd backend
npm install
```

2. **Configure Environment**

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/somnia-space-defender

# Web3 Configuration
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
CONTRACT_ADDRESS=0x4AB51147CB615DF6630BD91b3a6dCfe5BbEe1041
SSD_TOKEN_ADDRESS=0x1169936CB958c0E39c91Cf4A9A5C0d8B7103FD8F
PRIVATE_KEY=your_private_key_here

# Security
JWT_SECRET=your_jwt_secret_here
API_RATE_LIMIT=100

# Game Configuration
MAX_SCORE_PER_LEVEL=200000
MIN_SCORE_PER_ALIEN=5
MAX_SCORE_PER_ALIEN=150
SUBMISSION_COOLDOWN=5000

# CORS Configuration
CORS_ORIGIN=http://localhost:8000
```

3. **Initialize Database**

```bash
npm run seed
```

4. **Start Server**

```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Documentation

### Game Endpoints

#### Submit Score

```http
POST /api/game/submit-score
```

**Request Body:**

```json
{
  "score": 15000,
  "level": 5,
  "aliensKilled": 50,
  "gameMode": "normal",
  "gameSession": "unique-session-id",
  "playTime": 180,
  "powerUpsCollected": 3,
  "accuracy": 85,
  "playerAddress": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "scoreId": "score-document-id",
  "playerStats": {
    "highScore": 15000,
    "totalGames": 10,
    "totalAliensKilled": 500,
    "maxLevelReached": 5
  },
  "ssdReward": 0.5,
  "txHash": "0x...",
  "newAchievements": [
    {
      "id": "veteran_pilot",
      "name": "Veteran Pilot",
      "description": "Reach Level 5",
      "rarity": "rare"
    }
  ],
  "validationPassed": true
}
```

#### Get Game Statistics

```http
GET /api/game/stats
```

**Response:**

```json
{
  "totalGames": 1500,
  "totalPlayers": 250,
  "totalAliensKilled": 50000,
  "topScore": 95000,
  "topPlayer": "0x..."
}
```

### Leaderboard Endpoints

#### Global Leaderboard

```http
GET /api/leaderboard/global?gameMode=normal&limit=100
```

#### Level Leaderboard

```http
GET /api/leaderboard/level/5?limit=50
```

#### Weekly Leaderboard

```http
GET /api/leaderboard/weekly?limit=50
```

#### Player Rank

```http
GET /api/leaderboard/rank/0x...?gameMode=normal
```

### Player Endpoints

#### Player Statistics

```http
GET /api/player/0x...
```

#### Player Game History

```http
GET /api/player/0x.../games?page=1&limit=20&level=5&sortBy=score
```

#### Compare Players

```http
GET /api/player/compare/0x.../0x...
```

### Achievement Endpoints

#### All Achievements

```http
GET /api/achievements
```

#### Player Achievements

```http
GET /api/achievements/player/0x...
```

#### Achievement Leaderboard

```http
GET /api/achievements/leaderboard?limit=50
```

## 🛡️ Anti-Cheat System

The backend implements comprehensive anti-cheat validation:

### Score Validation Rules

1. **Basic Bounds**: Score, level, and aliens killed within reasonable limits
2. **Score-to-Aliens Ratio**: 5-150 points per alien killed
3. **Level-Based Maximums**: Maximum score per level (1K for level 1, 200K for level 10)
4. **Play Time Consistency**: Minimum/maximum time validation based on score and level
5. **Session Validation**: Unique game sessions to prevent replay attacks
6. **Rate Limiting**: Cooldown periods between submissions

### Validation Response

```json
{
  "valid": false,
  "reason": "Score-to-aliens ratio is suspicious",
  "details": {
    "basicValidation": true,
    "scoreRatioValidation": false,
    "levelValidation": true,
    "timeConsistent": true,
    "sessionValidation": true,
    "levelProgression": true
  }
}
```

## 💾 Database Schema

### Player Model

```javascript
{
  address: String,           // Ethereum address (unique)
  highScore: Number,         // Best score across all games
  totalGames: Number,        // Total games played
  totalAliensKilled: Number, // Lifetime alien kills
  maxLevelReached: Number,   // Highest level completed
  totalPlayTime: Number,     // Total seconds played
  achievementsUnlocked: [{   // Achievement progress
    achievementId: String,
    unlockedAt: Date
  }],
  ssdEarned: Number,         // Total SSD tokens earned
  ssdSpent: Number,          // Total SSD tokens spent
  twitterHandle: String,     // Social media handle
  twitterVerified: Boolean,  // Verification status
  lastSubmissionTime: Date,  // Anti-cheat timing
  createdAt: Date,
  updatedAt: Date
}
```

### GameScore Model

```javascript
{
  player: String,            // Player address
  score: Number,             // Game score
  level: Number,             // Level reached
  aliensKilled: Number,      // Aliens killed in game
  gameMode: String,          // Game mode (normal/endless/challenge)
  gameSession: String,       // Unique session ID
  playTime: Number,          // Game duration in seconds
  powerUpsCollected: Number, // Power-ups collected
  accuracy: Number,          // Shooting accuracy percentage
  validated: Boolean,        // Passed anti-cheat validation
  validationDetails: Object, // Validation breakdown
  ssdRewarded: Number,       // SSD tokens awarded
  txHash: String,            // Blockchain transaction hash
  createdAt: Date
}
```

### Achievement Model

```javascript
{
  id: String,                // Unique achievement ID
  name: String,              // Display name
  description: String,       // Achievement description
  requirement: Number,       // Requirement value
  achievementType: String,   // Type (score/level/aliens/games/time/special)
  category: String,          // Category (combat/progression/endurance/social/special)
  rarity: String,            // Rarity (common/rare/epic/legendary)
  ssdReward: Number,         // SSD tokens awarded
  isActive: Boolean,         // Whether achievement is active
  order: Number,             // Display order
  createdAt: Date
}
```

## 🔧 Development

### Database Indexes

The backend automatically creates optimized indexes:

```javascript
// Player indexes
{ address: 1 }                    // Unique player lookup
{ highScore: -1, updatedAt: -1 }  // Leaderboard queries

// GameScore indexes
{ score: -1, createdAt: -1 }      // Global leaderboard
{ player: 1, score: -1 }          // Player scores
{ level: 1, score: -1 }           // Level leaderboards
{ gameMode: 1, score: -1 }        // Mode leaderboards
```

### Performance Optimizations

1. **Caching**: Leaderboard caching with 5-minute TTL
2. **Pagination**: All list endpoints support pagination
3. **Aggregation**: MongoDB aggregation pipelines for complex queries
4. **Batch Operations**: Batch database writes where possible
5. **Connection Pooling**: Optimized MongoDB connection settings

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Check code coverage
npm run test:coverage
```

### Linting

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix
```

## 🚀 Deployment

### Production Environment

1. **Environment Setup**

```bash
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db/somnia-space-defender
```

2. **Process Management**

```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name "somnia-backend"

# Using Docker
docker build -t somnia-backend .
docker run -p 3000:3000 somnia-backend
```

3. **Database Setup**

```bash
# Create indexes
npm run create-indexes

# Seed achievements
npm run seed
```

### Monitoring

- Health check endpoint: `GET /health`
- Performance metrics via Morgan logging
- Error tracking and alerts
- Database performance monitoring

## 🔐 Security

### Security Features

1. **Rate Limiting**: 100 requests per 15 minutes per IP
2. **CORS**: Configured for specific origins
3. **Helmet**: Security headers
4. **Input Validation**: All inputs validated and sanitized
5. **Error Handling**: No sensitive data in error responses
6. **Session Management**: Anti-replay session tracking

### Security Best Practices

- Never commit private keys or sensitive data
- Use environment variables for all configuration
- Regular security audits of dependencies
- Monitor for suspicious score submissions
- Implement proper backup strategies

## 📊 Monitoring & Analytics

### Key Metrics

- Total games played
- Active players (daily/weekly/monthly)
- Average session time
- Score distributions
- Anti-cheat detection rates
- API response times
- Database performance

### Logs

The backend logs all important events:

- Score submissions and validations
- SSD token rewards
- Achievement unlocks
- API errors and warnings
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards
4. Add tests for new features
5. Submit a pull request

### Code Style

- Use ESLint configuration
- Follow Node.js best practices
- Comment complex logic
- Use meaningful variable names
- Keep functions small and focused

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review the API examples
- Test with the health check endpoint
