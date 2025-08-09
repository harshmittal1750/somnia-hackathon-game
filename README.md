# 🚀 Somnia Space Defender

An addictive 2D space shooter game built for the Somnia Hackathon. Defend the galaxy against alien invasion with smooth gameplay, Web3 integration, and on-chain scoring!

![Game Banner](https://img.shields.io/badge/Somnia-Space%20Defender-blue?style=for-the-badge&logo=ethereum)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.19-brightgreen?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=flat-square)
![Web3](https://img.shields.io/badge/Web3.js-Enabled-orange?style=flat-square)

## 🎮 Game Overview

Somnia Space Defender is a modern take on classic space shooter games like "Chicken Invaders". Battle through 10 increasingly difficult levels, collect power-ups, and compete on the global leaderboard powered by Somnia blockchain.

### ✨ Key Features

- **10 Difficulty Levels**: From Rookie to INSANE
- **Web3 Integration**: Connect wallet and save scores on Somnia testnet
- **Smooth Gameplay**: 60 FPS optimized performance
- **Power-up System**: Rapid fire, shields, multi-shot, and health boosts
- **Achievement System**: Unlock achievements and track statistics
- **Global Leaderboard**: Compete with players worldwide
- **Responsive Design**: Works on desktop and mobile devices

### 💰 SSD Token Integration

**Play-to-Earn Space Combat!** Earn SSD tokens while defending the galaxy and spend them on powerful upgrades.

#### 🎮 Earning SSD Tokens

- **Kill Rewards**: Earn 0.01 SSD for every alien eliminated
- **Social Bonus**: Verify your Twitter account for 50 SSD tokens
- **Achievement Rewards**: Unlock bonus SSD through gameplay milestones

#### 🛍️ Power-Up Shop

Spend your earned SSD tokens on game-changing boosts:

- 🚀 **2x Score Multiplier** (30 minutes) - 15 SSD
- ⚡ **Rapid Fire Mode** (1 hour) - 10 SSD
- 🛡️ **Energy Shield** (45 minutes) - 12 SSD
- 🔫 **Multi-Shot Cannon** (30 minutes) - 8 SSD
- ❤️ **Extra Life** (permanent until used) - 25 SSD

#### 📱 Social Features

- **Twitter Verification**: Connect your Twitter for 5 SSD reward bonus
- **Community Engagement**: Follow development and participate in events

#### 💎 Trading & Liquidity

- **Trade SSD**: Buy/sell tokens on [Euclid Swap](https://testnet.euclidswap.io/pools/ssd.eucl-stt)
- **Liquidity Mining**: Provide liquidity for additional rewards (coming soon)
- **Token Economics**: Drive ecosystem growth through gameplay engagement

## 🎯 How to Play

### Controls

- **Movement**: WASD or Arrow Keys
- **Shoot**: SPACE or J
- **Pause**: ESC or Pause button

### Objective

1. **Survive**: Avoid alien contact to preserve your health
2. **Shoot**: Destroy aliens to earn points
3. **Collect**: Grab power-ups for special abilities
4. **Progress**: Advance through 10 challenging levels
5. **Compete**: Set high scores on the blockchain leaderboard

### Power-ups

- ⚡ **Rapid Fire**: Increased firing rate
- 🛡️ **Energy Shield**: Temporary invincibility
- 💥 **Multi-Shot**: Fire multiple bullets
- - **Health Boost**: Restore health

### Scoring

- Basic Alien: 10 points
- Fast Alien: 20 points
- Tank Alien: 30 points
- Boss Alien: 100 points

## 🚀 Quick Start

### Option 1: Play Online (Recommended)

1. Visit the deployed game at: `[DEPLOYMENT_URL]`
2. Connect your MetaMask wallet
3. Switch to Somnia testnet (will auto-prompt)
4. Start playing and save high scores on-chain!

### Option 2: Run Locally

```bash
# Clone the repository
git clone https://github.com/[USERNAME]/somnia-hackathon-game.git
cd somnia-hackathon-game

# Serve the files (any static server works)
# Option A: Python
python -m http.server 8000

# Option B: Node.js
npx serve .

# Option C: VS Code Live Server extension
# Right-click index.html -> "Open with Live Server"

# Open browser and navigate to:
http://localhost:8000
```

## 🔧 Development Setup

### Prerequisites

- Modern web browser with MetaMask
- Somnia testnet SOM tokens (for contract deployment)
- Text editor (VS Code recommended)
- Basic knowledge of JavaScript and Solidity

### Project Structure

```
somnia-hackathon-game/
├── index.html              # Main game page
├── styles/
│   └── main.css            # Game styling
├── js/
│   ├── config.js           # Game configuration
│   ├── web3Manager.js      # Web3 wallet integration
│   ├── entities.js         # Game objects (Player, Aliens, etc.)
│   ├── gameEngine.js       # Core game logic
│   ├── levels.js           # Level management
│   └── main.js             # Application controller
├── contracts/
│   └── SomniaSpaceDefender.sol  # Smart contract
├── assets/
│   ├── audio/              # Sound effects (add your own)
│   └── images/             # Sprites (add your own)
└── README.md
```

### Smart Contract Deployment

1. **Install Dependencies**

```bash
npm init -y
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
```

2. **Create Hardhat Config**

```javascript
// hardhat.config.js
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.19",
  networks: {
    somnia: {
      url: "https://testnet.somnia.network/rpc",
      accounts: ["YOUR_PRIVATE_KEY"],
    },
  },
};
```

3. **Deploy Contract**

```bash
# Compile contract
npx hardhat compile

# Deploy to Somnia testnet
npx hardhat run --network somnia scripts/deploy.js
```

4. **Update Contract Address**

```javascript
// In js/config.js, update:
CONTRACTS: {
  GAME_SCORE: "0xYOUR_DEPLOYED_CONTRACT_ADDRESS";
}
```

## 🌐 Somnia Testnet Setup

### Add Somnia Network to MetaMask

- **Network Name**: Somnia Testnet
- **RPC URL**: `https://dream-rpc.somnia.network/rpc`
- **Chain ID**: `31337` (0x7A69)
- **Currency Symbol**: SOM
- **Block Explorer**: `https://testnet.somniaexplorer.com`

### Get Test Tokens

1. Visit the Somnia testnet faucet
2. Enter your wallet address
3. Request SOM tokens for gas fees

## 🎨 Customization

### Adding Sound Effects

1. Add audio files to `assets/audio/`
2. Update HTML audio elements in `index.html`
3. Modify `js/gameEngine.js` audio references

### Creating Custom Levels

```javascript
// In js/config.js, modify LEVELS object:
LEVELS: {
    11: {
        name: 'Custom Level',
        speedMultiplier: 3.0,
        healthMultiplier: 2.0,
        spawnRateMultiplier: 0.1,
        alienTypes: 4
    }
}
```

### Styling Changes

- Modify `styles/main.css` for visual customization
- Update color schemes, fonts, and animations
- Add particle effects and visual polish

## 📊 Technical Architecture

### Frontend

- **HTML5 Canvas**: Smooth 2D rendering
- **Vanilla JavaScript**: No framework dependencies
- **Web3.js**: Blockchain integration
- **CSS3**: Modern UI with space theme

### Backend/Blockchain

- **Solidity Smart Contract**: Score storage and leaderboards
- **Somnia Testnet**: High-performance blockchain
- **IPFS** (optional): Decentralized asset storage

### Performance Optimizations

- Entity pooling for bullets and particles
- Efficient collision detection algorithms
- Frame rate limiting and delta time calculations
- Responsive canvas scaling
- Lazy loading of assets

## 🏆 Competition Criteria

### ✅ Creativity & Originality

- Modern take on classic space shooter genre
- Unique 10-level progression system
- Innovative Web3 integration with achievements

### ✅ Technical Excellence

- Deployed on Somnia testnet with smart contract
- Production-ready code with error handling
- Optimized performance for smooth gameplay

### ✅ User Experience

- Intuitive controls and clear objectives
- Responsive design for all devices
- Professional UI with space-themed aesthetics

### ✅ On-chain Impact

- Scores and achievements stored on blockchain
- Global leaderboard with transparent ranking
- Minimal off-chain dependencies

### ✅ Community Fit

- Easy to learn, hard to master gameplay
- Competitive leaderboard system
- Achievement system encourages replay

## 🚀 Deployment

### Hosting Options

1. **GitHub Pages** (Free)
2. **Vercel** (Recommended for production)
3. **Netlify** (Good for static sites)
4. **IPFS** (Fully decentralized)

### Deployment Steps

```bash
# Build for production (if using build tools)
npm run build

# Deploy to chosen platform
# Example for Vercel:
npm install -g vercel
vercel --prod

# Update contract addresses in config
# Test thoroughly on testnet
```

## 🐛 Troubleshooting

### Common Issues

**MetaMask Connection Fails**

- Ensure MetaMask is installed and unlocked
- Check if Somnia testnet is added correctly
- Verify sufficient SOM balance for transactions

**Game Performance Issues**

- Lower the max particles/bullets in CONFIG
- Disable debug mode if enabled
- Use a modern browser with hardware acceleration

**Smart Contract Errors**

- Verify contract address is correct
- Check network connection to Somnia testnet
- Ensure wallet has enough SOM for gas

**Audio Not Playing**

- Check browser auto-play policies
- Verify audio files are in correct format
- Enable audio in game settings

## 📈 Future Enhancements

### 🚀 Upcoming Features Roadmap

#### 🏆 Phase 1 (2 weeks)

- **Tournament System**: Weekly tournaments with massive SSD prize pools
- **Enhanced Leaderboards**: Season-based rankings and rewards

#### 🎨 Phase 2 (3 weeks)

- **NFT Achievements**: Exclusive NFTs for milestone achievements
- **Collectible Spaceships**: Unique NFT spaceships with special abilities

#### 👥 Phase 3 (1 month)

- **Guild System**: Team up with friends for guild battles
- **Collaborative Challenges**: Group missions and shared rewards

#### 🏪 Phase 4 (1.5 months)

- **Advanced Marketplace**: Trade rare items and achievements
- **P2P Trading**: Direct player-to-player asset exchanges

#### 🌊 Phase 5 (2 months)

- **Liquidity Mining**: Earn bonus SSD for providing liquidity on Euclid Swap
- **Yield Farming**: Stake SSD tokens for additional rewards

#### 📱 Phase 6 (3 months)

- **Mobile App**: Native iOS/Android versions with full Web3 support
- **Cross-Platform**: Seamless progress sync across devices

### 💡 Long-term Vision

- **Multiplayer Mode**: Real-time space battles
- **VR Support**: Immersive space combat experience
- **DAO Governance**: Community-driven game development
- **Metaverse Integration**: Virtual space stations and events

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines

- Follow JavaScript ES6+ standards
- Add comments for complex logic
- Test on multiple browsers
- Optimize for performance

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Somnia team for the amazing blockchain platform
- Classic space shooter games for inspiration
- Open-source Web3 community for tools and libraries

## 📞 Contact

- **X/Twitter**: [@SomniaEco](https://x.com/SomniaEco)
- **Documentation**: [docs.somnia.network](https://docs.somnia.network/)
- **Support**: [Join Somnia Discord](https://discord.gg/somnia)

---

### 🎮 Ready to Defend the Galaxy?

**[PLAY NOW](DEPLOYMENT_URL)** | **[View Contract](CONTRACT_EXPLORER_URL)** | **[Join Leaderboard](LEADERBOARD_URL)**

_Built with ❤️ for the Somnia Hackathon_
