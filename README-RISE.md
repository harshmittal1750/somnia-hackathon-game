# 🚀 Space Defender - Multi-Chain Web3 Game

Welcome to **Space Defender**, an addictive 2D space shooter game with Web3 integration, featuring the revolutionary **SD (Space Defender) Token** with multi-chain bridging capabilities on the RISE Network.

## 🌟 What's New in v2.0

### 🌉 Multi-Chain SD Token

- **Cross-Chain Bridging**: Bridge your SD tokens between supported chains
- **Universal Token**: Use SD tokens across multiple networks
- **Future-Ready**: Easy integration with new chains as they become available

### 🚀 RISE Network Integration

- **Primary Network**: Built for RISE Testnet
- **Fast Transactions**: Low fees and quick confirmations
- **Scalable**: Ready for mainnet deployment

### 🎮 Enhanced Gaming Experience

- **Improved Rewards**: Earn SD tokens for every alien defeated
- **Cross-Chain Shop**: Purchase power-ups with SD tokens from any supported chain
- **Bridge UI**: Seamless token bridging directly from the game

## 🎯 Game Features

### 🕹️ Core Gameplay

- **10 Challenging Levels**: From Rookie to INSANE difficulty
- **Multiple Alien Types**: Each with unique abilities and behaviors
- **Power-Up System**: Collect various power-ups to enhance your ship
- **Advanced Weapons**: Lightning, Fire, Wave, Plasma, and Ice bullets
- **Dynamic Particle Effects**: Stunning visual effects and explosions

### 💰 SD Token Economy

- **Play-to-Earn**: Earn 0.01 SD tokens per alien defeated
- **Social Rewards**: Get 1 SD token for Twitter verification
- **In-Game Shop**: Purchase boosts and power-ups with SD tokens
- **Multi-Chain**: Bridge tokens between supported networks

### 🏆 Competitive Features

- **Global Leaderboard**: Compete with players worldwide
- **Achievement System**: Unlock various achievements
- **Anti-Cheat Protection**: On-chain validation ensures fair play
- **Real-Time Stats**: Track your progress and earnings

## 🌐 Supported Networks

### Primary Network: RISE Testnet

- **Chain ID**: 11155931 (0xaa39db)
- **RPC URL**: https://testnet.riselabs.xyz
- **Explorer**: https://explorer.testnet.riselabs.xyz
- **Bridge UI**: https://bridge-ui.testnet.riselabs.xyz
- **Faucet**: https://faucet.testnet.riselabs.xyz

### Future Networks

The SD token is designed to be bridgeable to any EVM-compatible chain. Additional networks will be added based on community demand and technical feasibility.

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** (v16 or higher)
- **MetaMask** or compatible Web3 wallet
- **RISE Testnet** added to your wallet

### 2. Add RISE Testnet to MetaMask

```
Network Name: RISE Testnet
Chain ID: 11155931
Currency Symbol: ETH
RPC URL: https://testnet.riselabs.xyz
Block Explorer: https://explorer.testnet.riselabs.xyz
```

### 3. Get Test ETH

Visit the [RISE Testnet Faucet](https://faucet.testnet.riselabs.xyz) to get test ETH for transactions.

### 4. Play the Game

1. Visit the game URL (or run locally)
2. Connect your wallet
3. Start playing and earning SD tokens!

## 🛠️ Development Setup

### Frontend Development

```bash
# Clone the repository
git clone https://github.com/your-repo/rise-space-defender.git
cd rise-space-defender

# Install dependencies
npm install

# Start development server
npm run dev
```

### Smart Contract Deployment

```bash
# Compile contracts
npm run compile

# Deploy to RISE Testnet
npm run deploy:contract

# Verify contracts
npm run verify:rise
```

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Configure your environment variables
# Add your private key, contract addresses, etc.

# Start the backend
npm run dev
```

## 📋 Environment Configuration

### Frontend Config (`js/config.js`)

```javascript
NETWORK: {
  chainId: "0xaa39db", // RISE Testnet
  chainName: "RISE Testnet",
  rpcUrls: ["https://testnet.riselabs.xyz"],
  blockExplorerUrls: ["https://explorer.testnet.riselabs.xyz"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
},

CONTRACTS: {
  GAME_SCORE: "YOUR_GAME_CONTRACT_ADDRESS",
  SD_TOKEN: "YOUR_SD_TOKEN_ADDRESS",
},
```

### Backend Config (`.env`)

```env
# RISE Network Configuration
RISE_RPC_URL=https://testnet.riselabs.xyz
CONTRACT_ADDRESS=your_game_contract_address
SD_TOKEN_ADDRESS=your_sd_token_address
PRIVATE_KEY=your_private_key_here

# Database
MONGODB_URI=mongodb://localhost:27017/rise-space-defender
```

## 🌉 Bridging SD Tokens

### How to Bridge

1. **In-Game Bridge**: Use the bridge button in the game interface
2. **External Bridge**: Visit the RISE Bridge UI
3. **Programmatic**: Use the `BridgeManager` class

### Bridge Process

1. **Select Target Chain**: Choose where to send your tokens
2. **Enter Amount**: Specify how many SD tokens to bridge
3. **Pay Fees**: Small ETH fee for the bridge transaction
4. **Wait**: Tokens arrive on target chain in 5-10 minutes

### Example Bridge Usage

```javascript
// Bridge 100 SD tokens to another chain
await bridgeManager.bridgeTokens("0x1", "100"); // Chain ID, Amount
```

## 🏗️ Architecture

### Smart Contracts

- **RISESpaceDefender.sol**: Main game contract with scoring and rewards
- **SDToken.sol**: Multi-chain compatible ERC20 token
- **Bridge Integration**: Compatible with standard bridge protocols

### Frontend Components

- **GameEngine**: Core game logic and rendering
- **Web3Manager**: Blockchain interaction and wallet management
- **BridgeManager**: Multi-chain token bridging
- **UI Components**: Game interface and HUD

### Backend Services

- **Game API**: Score submission and leaderboards
- **Web3 Service**: Blockchain interaction
- **Anti-Cheat**: Server-side validation
- **Analytics**: Player statistics and achievements

## 🎮 Game Controls

### Desktop

- **WASD** or **Arrow Keys**: Move your ship
- **Space**: Shoot
- **P**: Pause game
- **M**: Mute/unmute

### Mobile

- **Touch Controls**: Tap and drag to move
- **Auto-Shoot**: Automatic firing
- **Touch UI**: Mobile-optimized interface

## 🏆 Achievements

### Score-Based

- **Space Cadet**: Score 1,000 points
- **Space Pilot**: Score 5,000 points
- **Space Ace**: Score 10,000 points
- **Space Legend**: Score 25,000 points
- **Space Master**: Score 50,000 points
- **Galactic Champion**: Score 100,000 points

### Level-Based

- **Veteran Pilot**: Reach Level 5
- **Elite Commander**: Reach Level 8
- **INSANE Pilot**: Beat Level 10

### Combat-Based

- **Alien Hunter**: Kill 50 aliens
- **Alien Slayer**: Kill 100 aliens
- **Alien Destroyer**: Kill 250 aliens
- **Alien Annihilator**: Kill 500 aliens

## 💰 SD Token Economics

### Earning SD Tokens

- **Gameplay**: 0.01 SD per alien defeated
- **Social**: 1 SD for Twitter verification
- **Achievements**: Bonus rewards for milestones

### Spending SD Tokens

- **2x Score Multiplier**: 15 SD (30 minutes)
- **Rapid Fire**: 10 SD (1 hour)
- **Energy Shield**: 12 SD (45 minutes)
- **Multi-Shot**: 8 SD (30 minutes)
- **Extra Life**: 25 SD (permanent until used)

### Bridge Economics

- **Base Fee**: ~0.001 ETH per transaction
- **Percentage Fee**: 0.1% of bridged amount
- **Time**: 5-10 minutes for completion

## 🔒 Security Features

### Anti-Cheat Protection

- **On-Chain Validation**: Scores validated by smart contract
- **Rate Limiting**: Prevents spam submissions
- **Bounds Checking**: Realistic score and kill counts
- **Session Tracking**: Monitors game sessions for anomalies

### Smart Contract Security

- **Audited Code**: Based on OpenZeppelin standards
- **Access Controls**: Owner-only administrative functions
- **Emergency Pause**: Can halt contract in emergencies
- **Upgrade Path**: Prepared for future improvements

## 📊 Analytics & Monitoring

### Player Statistics

- **High Scores**: Personal and global leaderboards
- **SD Earnings**: Track token rewards over time
- **Achievement Progress**: Monitor unlock progress
- **Bridge History**: View all cross-chain transactions

### Game Metrics

- **Active Players**: Real-time player count
- **Token Distribution**: SD token circulation stats
- **Network Usage**: Transaction volume and fees
- **Performance**: Game and contract performance metrics

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Areas

- **Game Features**: New levels, enemies, and power-ups
- **Bridge Integration**: Support for additional chains
- **UI/UX**: Interface improvements and mobile optimization
- **Backend**: API enhancements and optimization

## 📞 Support & Community

### Get Help

- **Documentation**: Check our comprehensive docs
- **Discord**: Join our community server
- **GitHub Issues**: Report bugs and request features
- **Email**: contact@risespacdefender.com

### Social Links

- **Twitter**: [@RiseSpaceDefender](https://twitter.com/RiseSpaceDefender)
- **Discord**: [Join our server](https://discord.gg/risespacdefender)
- **GitHub**: [Source code](https://github.com/your-repo/rise-space-defender)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **RISE Network**: For providing the infrastructure and support
- **OpenZeppelin**: For secure smart contract templates
- **Community**: For feedback, testing, and contributions

---

**Ready to defend the galaxy and earn SD tokens? Start playing now!** 🚀👾

_Built with ❤️ for the RISE Network ecosystem_
