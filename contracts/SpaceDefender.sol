// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Space Defender with SD Token Integration
 * @dev Smart contract for on-chain game scoring, leaderboards, and SD rewards
 * @author harshmittal.dev
 */

// Interface for SD Token
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract SpaceDefender {
    // Events
    event ScoreSubmitted(
        address indexed player,
        uint256 score,
        uint8 level,
        uint256 timestamp
    );
    event NewHighScore(address indexed player, uint256 score);
    event AchievementUnlocked(address indexed player, string achievement);
    event LeaderboardUpdated(address indexed player, uint256 rank);

    // Structs
    struct GameScore {
        address player;
        uint256 score;
        uint8 level;
        uint256 timestamp;
        uint16 aliensKilled;
        string gameMode;
    }

    struct PlayerStats {
        uint256 highScore;
        uint256 totalGames;
        uint256 totalAliensKilled;
        uint8 maxLevelReached;
        uint256 totalPlayTime;
        bool[] achievementsUnlocked; // Bitmap for achievements
    }

    struct Achievement {
        string name;
        string description;
        uint256 requirement;
        uint8 achievementType; // 0: Score, 1: Level, 2: Aliens, 3: Games
        bool isActive;
    }

    // State variables
    mapping(address => PlayerStats) public playerStats;
    mapping(address => GameScore[]) public playerScores;
    mapping(uint256 => Achievement) public achievements;

    GameScore[] public globalLeaderboard;
    address[] public activePlayers;

    // 🛡️ Anti-cheat state variables
    mapping(address => uint256) public lastSubmissionTime;
    uint256 public constant SUBMISSION_COOLDOWN = 5 seconds;

    // 🎮 SD Token Integration
    IERC20 public ssdToken;
    uint256 public constant SSD_PER_KILL = 10000000000000000; // 0.01 SD (18 decimals)
    mapping(address => uint256) public ssdEarned;
    mapping(address => uint256) public ssdSpent;

    // 🛍️ Shop System
    struct ShopItem {
        string name;
        uint256 price;
        uint256 duration; // in seconds, 0 for permanent
        bool active;
    }

    mapping(uint256 => ShopItem) public shopItems;
    mapping(address => mapping(uint256 => uint256)) public playerBoosts; // player -> itemId -> expiry
    uint256 public shopItemCount;

    // 📱 Social Media Integration
    mapping(address => bool) public twitterVerified;
    mapping(address => string) public twitterHandles;
    uint256 public constant TWITTER_REWARD = 1000000000000000000; // 1 SD

    uint256 public constant MAX_LEADERBOARD_SIZE = 100;
    uint256 public achievementCount;
    uint256 public totalGamesPlayed;
    uint256 public totalPlayersRegistered;

    address public owner;
    bool public gameActive;
    uint256 public gameStartTime;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier gameIsActive() {
        require(gameActive, "Game is not active");
        _;
    }

    modifier validLevel(uint8 _level) {
        require(_level >= 1 && _level <= 10, "Invalid level");
        _;
    }

    modifier validScore(uint256 _score) {
        require(_score > 0, "Score must be greater than 0");
        _;
    }

    constructor(address _ssdTokenAddress) {
        owner = msg.sender;
        gameActive = true;
        gameStartTime = block.timestamp;
        ssdToken = IERC20(_ssdTokenAddress);
        initializeAchievements();
        initializeShop();
    }

    /**
     * @dev Initialize predefined achievements
     */
    function initializeAchievements() private {
        // Score-based achievements
        _addAchievement("Space Cadet", "Score 1,000 points", 1000, 0);
        _addAchievement("Space Pilot", "Score 5,000 points", 5000, 0);
        _addAchievement("Space Ace", "Score 10,000 points", 10000, 0);
        _addAchievement("Space Legend", "Score 25,000 points", 25000, 0);
        _addAchievement("Space Master", "Score 50,000 points", 50000, 0);
        _addAchievement("Galactic Champion", "Score 100,000 points", 100000, 0);

        // Level-based achievements
        _addAchievement("Veteran Pilot", "Reach Level 5", 5, 1);
        _addAchievement("Elite Commander", "Reach Level 8", 8, 1);
        _addAchievement("INSANE Pilot", "Beat Level 10", 10, 1);

        // Alien kill achievements
        _addAchievement("Alien Hunter", "Kill 50 aliens", 50, 2);
        _addAchievement("Alien Slayer", "Kill 100 aliens", 100, 2);
        _addAchievement("Alien Destroyer", "Kill 250 aliens", 250, 2);
        _addAchievement("Alien Annihilator", "Kill 500 aliens", 500, 2);

        // Game count achievements
        _addAchievement("Dedicated Defender", "Play 10 games", 10, 3);
        _addAchievement("Persistent Pilot", "Play 50 games", 50, 3);
        _addAchievement("Obsessed Guardian", "Play 100 games", 100, 3);
    }

    /**
     * @dev Add a new achievement
     */
    function _addAchievement(
        string memory _name,
        string memory _description,
        uint256 _requirement,
        uint8 _type
    ) private {
        achievements[achievementCount] = Achievement({
            name: _name,
            description: _description,
            requirement: _requirement,
            achievementType: _type,
            isActive: true
        });
        achievementCount++;
    }

    /**
     * @dev Initialize shop items
     */
    function initializeShop() private {
        // Score Multiplier 2x (30 minutes)
        shopItems[0] = ShopItem(
            "2x Score Multiplier",
            15000000000000000000,
            1800,
            true
        ); // 15 SD

        // Rapid Fire (1 hour)
        shopItems[1] = ShopItem("Rapid Fire", 10000000000000000000, 3600, true); // 10 SD

        // Energy Shield (45 minutes)
        shopItems[2] = ShopItem(
            "Energy Shield",
            12000000000000000000,
            2700,
            true
        ); // 12 SD

        // Multi-Shot (30 minutes)
        shopItems[3] = ShopItem("Multi-Shot", 8000000000000000000, 1800, true); // 8 SD

        // Extra Life (permanent until used)
        shopItems[4] = ShopItem("Extra Life", 25000000000000000000, 0, true); // 25 SD

        shopItemCount = 5;
    }

    /**
     * @dev Submit a game score with anti-cheat validation and SD rewards
     */
    function submitScore(
        uint256 _score,
        uint8 _level,
        uint16 _aliensKilled,
        string memory _gameMode
    ) external gameIsActive validLevel(_level) validScore(_score) {
        // 🛡️ ON-CHAIN ANTI-CHEAT VALIDATION
        require(
            _validateScore(_score, _level, _aliensKilled),
            "Score validation failed"
        );
        require(_checkSubmissionRate(msg.sender), "Submission rate exceeded");
        address player = msg.sender;

        // 🎮 SD REWARDS FOR ALIEN KILLS
        uint256 ssdReward = _aliensKilled * SSD_PER_KILL;
        if (ssdReward > 0 && address(ssdToken) != address(0)) {
            ssdToken.transfer(player, ssdReward);
            ssdEarned[player] += ssdReward;
        }

        // Register new player if needed
        if (playerStats[player].totalGames == 0) {
            activePlayers.push(player);
            totalPlayersRegistered++;
            // Initialize achievements array
            playerStats[player].achievementsUnlocked = new bool[](
                achievementCount
            );
        }

        // Create game score record
        GameScore memory newScore = GameScore({
            player: player,
            score: _score,
            level: _level,
            timestamp: block.timestamp,
            aliensKilled: _aliensKilled,
            gameMode: _gameMode
        });

        // Update player stats
        PlayerStats storage stats = playerStats[player];
        stats.totalGames++;
        stats.totalAliensKilled += _aliensKilled;
        totalGamesPlayed++;

        if (_level > stats.maxLevelReached) {
            stats.maxLevelReached = _level;
        }

        bool isNewHighScore = false;
        if (_score > stats.highScore) {
            stats.highScore = _score;
            isNewHighScore = true;
            emit NewHighScore(player, _score);
        }

        // Store the score
        playerScores[player].push(newScore);

        // Update global leaderboard
        _updateGlobalLeaderboard(newScore);

        // Check for achievements
        _checkAchievements(player);

        emit ScoreSubmitted(player, _score, _level, block.timestamp);

        if (isNewHighScore) {
            _emitLeaderboardUpdate(player);
        }
    }

    /**
     * @dev Update global leaderboard
     */
    function _updateGlobalLeaderboard(GameScore memory _score) private {
        // Insert score in the correct position (sorted by score descending)
        if (globalLeaderboard.length == 0) {
            globalLeaderboard.push(_score);
            return;
        }

        uint256 insertIndex = globalLeaderboard.length;

        // Find insertion point
        for (uint256 i = 0; i < globalLeaderboard.length; i++) {
            if (_score.score > globalLeaderboard[i].score) {
                insertIndex = i;
                break;
            }
        }

        // Insert at the correct position
        if (insertIndex < globalLeaderboard.length) {
            globalLeaderboard.push(
                globalLeaderboard[globalLeaderboard.length - 1]
            );
            for (
                uint256 i = globalLeaderboard.length - 1;
                i > insertIndex;
                i--
            ) {
                globalLeaderboard[i] = globalLeaderboard[i - 1];
            }
            globalLeaderboard[insertIndex] = _score;
        } else {
            globalLeaderboard.push(_score);
        }

        // Keep only top scores
        if (globalLeaderboard.length > MAX_LEADERBOARD_SIZE) {
            globalLeaderboard.pop();
        }
    }

    /**
     * @dev Check and unlock achievements for a player
     */
    function _checkAchievements(address _player) private {
        PlayerStats storage stats = playerStats[_player];

        for (uint256 i = 0; i < achievementCount; i++) {
            if (!achievements[i].isActive || stats.achievementsUnlocked[i]) {
                continue;
            }

            bool unlocked = false;
            uint256 playerValue = 0;

            if (achievements[i].achievementType == 0) {
                // Score
                playerValue = stats.highScore;
            } else if (achievements[i].achievementType == 1) {
                // Level
                playerValue = stats.maxLevelReached;
            } else if (achievements[i].achievementType == 2) {
                // Aliens
                playerValue = stats.totalAliensKilled;
            } else if (achievements[i].achievementType == 3) {
                // Games
                playerValue = stats.totalGames;
            }

            if (playerValue >= achievements[i].requirement) {
                stats.achievementsUnlocked[i] = true;
                unlocked = true;
                emit AchievementUnlocked(_player, achievements[i].name);
            }
        }
    }

    /**
     * @dev Emit leaderboard update event
     */
    function _emitLeaderboardUpdate(address _player) private {
        uint256 rank = getPlayerRank(_player);
        emit LeaderboardUpdated(_player, rank);
    }

    /**
     * @dev Get player's current rank on global leaderboard
     */
    function getPlayerRank(address _player) public view returns (uint256) {
        uint256 playerHighScore = playerStats[_player].highScore;
        if (playerHighScore == 0) return 0;

        for (uint256 i = 0; i < globalLeaderboard.length; i++) {
            if (
                globalLeaderboard[i].player == _player &&
                globalLeaderboard[i].score == playerHighScore
            ) {
                return i + 1;
            }
        }
        return 0;
    }

    /**
     * @dev Get top N scores from global leaderboard
     */
    function getTopScores(
        uint256 _count
    ) external view returns (GameScore[] memory) {
        uint256 count = _count > globalLeaderboard.length
            ? globalLeaderboard.length
            : _count;
        GameScore[] memory topScores = new GameScore[](count);

        for (uint256 i = 0; i < count; i++) {
            topScores[i] = globalLeaderboard[i];
        }

        return topScores;
    }

    /**
     * @dev Get player's score history
     */
    function getPlayerScores(
        address _player
    ) external view returns (GameScore[] memory) {
        return playerScores[_player];
    }

    /**
     * @dev Get player's statistics
     */
    function getPlayerStats(
        address _player
    ) external view returns (PlayerStats memory) {
        return playerStats[_player];
    }

    /**
     * @dev Get all achievements
     */
    function getAllAchievements() external view returns (Achievement[] memory) {
        Achievement[] memory allAchievements = new Achievement[](
            achievementCount
        );
        for (uint256 i = 0; i < achievementCount; i++) {
            allAchievements[i] = achievements[i];
        }
        return allAchievements;
    }

    /**
     * @dev Get player's unlocked achievements
     */
    function getPlayerAchievements(
        address _player
    ) external view returns (bool[] memory) {
        return playerStats[_player].achievementsUnlocked;
    }

    /**
     * @dev Get game statistics
     */
    function getGameStats()
        external
        view
        returns (
            uint256 totalGames,
            uint256 totalPlayers,
            uint256 leaderboardSize,
            uint256 gameAge
        )
    {
        return (
            totalGamesPlayed,
            totalPlayersRegistered,
            globalLeaderboard.length,
            block.timestamp - gameStartTime
        );
    }

    /**
     * @dev Get active players list
     */
    function getActivePlayers() external view returns (address[] memory) {
        return activePlayers;
    }

    // Admin functions

    /**
     * @dev Toggle game active state
     */
    function toggleGameActive() external onlyOwner {
        gameActive = !gameActive;
    }

    /**
     * @dev Add custom achievement (admin only)
     */
    function addAchievement(
        string memory _name,
        string memory _description,
        uint256 _requirement,
        uint8 _type
    ) external onlyOwner {
        _addAchievement(_name, _description, _requirement, _type);
    }

    /**
     * @dev Deactivate achievement (admin only)
     */
    function deactivateAchievement(uint256 _achievementId) external onlyOwner {
        require(_achievementId < achievementCount, "Invalid achievement ID");
        achievements[_achievementId].isActive = false;
    }

    /**
     * @dev Emergency pause (admin only)
     */
    function emergencyPause() external onlyOwner {
        gameActive = false;
    }

    /**
     * @dev Transfer ownership (admin only)
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    // View functions for debugging and statistics

    function getLeaderboardSize() external view returns (uint256) {
        return globalLeaderboard.length;
    }

    function getTotalAchievements() external view returns (uint256) {
        return achievementCount;
    }

    function isPlayerRegistered(address _player) external view returns (bool) {
        return playerStats[_player].totalGames > 0;
    }

    /**
     * @dev Get contract info
     */
    function getContractInfo()
        external
        view
        returns (
            address contractOwner,
            bool isGameActive,
            uint256 startTime,
            string memory version
        )
    {
        return (owner, gameActive, gameStartTime, "1.0.0");
    }

    // 🛡️ ANTI-CHEAT VALIDATION FUNCTIONS

    /**
     * @dev Validate score against game rules
     */
    function _validateScore(
        uint256 _score,
        uint8 _level,
        uint16 _aliensKilled
    ) internal pure returns (bool) {
        // 1. Basic bounds checking
        if (_score > 1000000) return false; // Max 1M points
        if (_aliensKilled > 10000) return false; // Max 10K aliens

        // 2. Score-to-aliens ratio validation
        if (_aliensKilled > 0) {
            uint256 scorePerAlien = _score / _aliensKilled;
            if (scorePerAlien < 5 || scorePerAlien > 150) return false;
        } else if (_score > 100) {
            return false; // Can't have high score with 0 aliens
        }

        // 3. Level-based maximum score validation
        uint256[10] memory maxScorePerLevel = [
            uint256(1000), // Level 1
            3000, // Level 2
            6000, // Level 3
            10000, // Level 4
            15000, // Level 5
            25000, // Level 6
            40000, // Level 7
            60000, // Level 8
            100000, // Level 9
            200000 // Level 10
        ];

        if (_score > maxScorePerLevel[_level - 1]) return false;

        return true;
    }

    /**
     * @dev Check submission rate limiting
     */
    function _checkSubmissionRate(address _player) internal returns (bool) {
        if (
            block.timestamp < lastSubmissionTime[_player] + SUBMISSION_COOLDOWN
        ) {
            return false;
        }
        lastSubmissionTime[_player] = block.timestamp;
        return true;
    }

    // 🛍️ SHOP SYSTEM FUNCTIONS

    /**
     * @dev Purchase shop item with SD tokens
     */
    function buyShopItem(uint256 _itemId) external {
        require(_itemId < shopItemCount, "Invalid item ID");
        require(shopItems[_itemId].active, "Item not available");

        uint256 price = shopItems[_itemId].price;
        require(
            ssdToken.transferFrom(msg.sender, address(this), price),
            "Payment failed"
        );

        ssdSpent[msg.sender] += price;

        if (shopItems[_itemId].duration > 0) {
            // Temporary boost
            playerBoosts[msg.sender][_itemId] =
                block.timestamp +
                shopItems[_itemId].duration;
        } else {
            // Permanent item (like extra life)
            playerBoosts[msg.sender][_itemId] = type(uint256).max;
        }
    }

    /**
     * @dev Check if player has active boost
     */
    function hasActiveBoost(
        address _player,
        uint256 _itemId
    ) external view returns (bool) {
        return playerBoosts[_player][_itemId] > block.timestamp;
    }

    /**
     * @dev Get shop item details
     */
    function getShopItem(
        uint256 _itemId
    ) external view returns (ShopItem memory) {
        require(_itemId < shopItemCount, "Invalid item ID");
        return shopItems[_itemId];
    }

    /**
     * @dev Get all shop items
     */
    function getAllShopItems() external view returns (ShopItem[] memory) {
        ShopItem[] memory items = new ShopItem[](shopItemCount);
        for (uint256 i = 0; i < shopItemCount; i++) {
            items[i] = shopItems[i];
        }
        return items;
    }

    // 📱 SOCIAL MEDIA FUNCTIONS

    /**
     * @dev Verify Twitter account and claim reward
     */
    function verifyTwitter(string memory _twitterHandle) external {
        require(!twitterVerified[msg.sender], "Already verified");
        require(bytes(_twitterHandle).length > 0, "Invalid handle");

        twitterVerified[msg.sender] = true;
        twitterHandles[msg.sender] = _twitterHandle;

        // Reward SD tokens for verification
        if (address(ssdToken) != address(0)) {
            ssdToken.transfer(msg.sender, TWITTER_REWARD);
            ssdEarned[msg.sender] += TWITTER_REWARD;
        }
    }

    /**
     * @dev Check if player is Twitter verified
     */
    function isTwitterVerified(address _player) external view returns (bool) {
        return twitterVerified[_player];
    }

    /**
     * @dev Get player's SD statistics
     */
    function getPlayerSSDStats(
        address _player
    ) external view returns (uint256 earned, uint256 spent, uint256 balance) {
        earned = ssdEarned[_player];
        spent = ssdSpent[_player];
        balance = address(ssdToken) != address(0)
            ? ssdToken.balanceOf(_player)
            : 0;
    }

    // 👑 ADMIN FUNCTIONS

    /**
     * @dev Add new shop item (admin only)
     */
    function addShopItem(
        string memory _name,
        uint256 _price,
        uint256 _duration
    ) external onlyOwner {
        shopItems[shopItemCount] = ShopItem(_name, _price, _duration, true);
        shopItemCount++;
    }

    /**
     * @dev Update SD token contract (admin only)
     */
    function updateSSDToken(address _newTokenAddress) external onlyOwner {
        ssdToken = IERC20(_newTokenAddress);
    }

    /**
     * @dev Withdraw accumulated SD tokens (admin only)
     */
    function withdrawSSD(uint256 _amount) external onlyOwner {
        require(address(ssdToken) != address(0), "SD token not set");
        ssdToken.transfer(owner, _amount);
    }
}
