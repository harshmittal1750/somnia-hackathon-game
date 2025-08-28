// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Space Defender with SD Token Integration
 * @dev Smart contract for on-chain game scoring, leaderboards, and SD rewards with multi-chain bridging
 * @author harshmittal.dev
 */

// Interface for SD Token (Multi-chain compatible)
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

// Interface for bridge functionality
interface IBridge {
    function bridgeTokens(
        address token,
        uint256 amount,
        uint256 targetChainId,
        address recipient
    ) external;

    function isSupportedChain(uint256 chainId) external view returns (bool);
}

contract RISESpaceDefender {
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

    // SD Token specific events
    event SDRewardClaimed(
        address indexed player,
        uint256 aliensKilled,
        uint256 sdAmount
    );
    event TwitterRewardClaimed(
        address indexed player,
        string twitterHandle,
        uint256 sdAmount
    );
    event TokensBridged(
        address indexed user,
        uint256 amount,
        uint256 targetChainId
    );
    event BridgeConfigUpdated(address indexed bridge, bool isActive);

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
        bool[] achievementsUnlocked;
    }

    struct Achievement {
        string name;
        string description;
        uint256 requirement;
        uint8 achievementType; // 0: Score, 1: Level, 2: Aliens, 3: Games
        bool isActive;
    }

    struct BridgeConfig {
        address bridgeContract;
        bool isActive;
        uint256[] supportedChains;
        mapping(uint256 => bool) chainSupported;
    }

    // State variables
    mapping(address => PlayerStats) public playerStats;
    mapping(address => GameScore[]) public playerScores;
    mapping(uint256 => Achievement) public achievements;

    GameScore[] public globalLeaderboard;
    address[] public activePlayers;

    // Anti-cheat state variables
    mapping(address => uint256) public lastSubmissionTime;
    uint256 public constant SUBMISSION_COOLDOWN = 5 seconds;

    // SD Token Integration
    IERC20 public sdToken;
    uint256 public constant SD_PER_KILL = 10000000000000000; // 0.01 SD (18 decimals)
    mapping(address => uint256) public sdEarned;
    mapping(address => uint256) public sdSpent;

    // Bridge configuration
    BridgeConfig public bridgeConfig;

    // Shop System
    struct ShopItem {
        string name;
        uint256 price;
        uint256 duration;
        bool active;
    }

    mapping(uint256 => ShopItem) public shopItems;
    mapping(address => mapping(uint256 => uint256)) public playerBoosts;
    uint256 public shopItemCount;

    // Social Media Integration
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

    constructor(address _sdTokenAddress) {
        owner = msg.sender;
        gameActive = true;
        gameStartTime = block.timestamp;
        sdToken = IERC20(_sdTokenAddress);
        initializeAchievements();
        initializeShop();
        initializeBridge();
    }

    /**
     * @dev Initialize bridge configuration
     */
    function initializeBridge() private {
        bridgeConfig.isActive = false; // Will be activated when bridge contract is set
        // Supported chains will be added via admin functions
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
        shopItems[0] = ShopItem(
            "2x Score Multiplier",
            15000000000000000000,
            1800,
            true
        ); // 15 SD
        shopItems[1] = ShopItem("Rapid Fire", 10000000000000000000, 3600, true); // 10 SD
        shopItems[2] = ShopItem(
            "Energy Shield",
            12000000000000000000,
            2700,
            true
        ); // 12 SD
        shopItems[3] = ShopItem("Multi-Shot", 8000000000000000000, 1800, true); // 8 SD
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
        require(
            _validateScore(_score, _level, _aliensKilled),
            "Score validation failed"
        );
        require(_checkSubmissionRate(msg.sender), "Submission rate exceeded");

        address player = msg.sender;

        // SD REWARDS FOR ALIEN KILLS
        uint256 sdReward = _aliensKilled * SD_PER_KILL;
        if (sdReward > 0 && address(sdToken) != address(0)) {
            sdToken.transfer(player, sdReward);
            sdEarned[player] += sdReward;
            emit SDRewardClaimed(player, _aliensKilled, sdReward);
        }

        // Register new player if needed
        if (playerStats[player].totalGames == 0) {
            activePlayers.push(player);
            totalPlayersRegistered++;
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
     * @dev Claim SD reward for alien kills (external function for backend integration)
     */
    function claimSDReward(
        address player,
        uint16 aliensKilled
    ) external onlyOwner {
        uint256 sdReward = aliensKilled * SD_PER_KILL;
        if (sdReward > 0 && address(sdToken) != address(0)) {
            require(
                sdToken.balanceOf(address(this)) >= sdReward,
                "Insufficient contract balance"
            );
            sdToken.transfer(player, sdReward);
            sdEarned[player] += sdReward;
            emit SDRewardClaimed(player, aliensKilled, sdReward);
        }
    }

    /**
     * @dev Bridge SD tokens to another chain
     */
    function bridgeTokens(uint256 amount, uint256 targetChainId) external {
        require(bridgeConfig.isActive, "Bridge not active");
        require(
            bridgeConfig.chainSupported[targetChainId],
            "Target chain not supported"
        );
        require(
            sdToken.balanceOf(msg.sender) >= amount,
            "Insufficient balance"
        );

        // Transfer tokens to bridge contract
        sdToken.transferFrom(msg.sender, bridgeConfig.bridgeContract, amount);

        // Call bridge contract
        IBridge(bridgeConfig.bridgeContract).bridgeTokens(
            address(sdToken),
            amount,
            targetChainId,
            msg.sender
        );

        emit TokensBridged(msg.sender, amount, targetChainId);
    }

    /**
     * @dev Get bridge information
     */
    function getBridgeInfo()
        external
        view
        returns (bool isActive, uint256[] memory supportedChains)
    {
        return (bridgeConfig.isActive, bridgeConfig.supportedChains);
    }

    /**
     * @dev Verify Twitter account and claim reward
     */
    function verifyTwitter(string memory _twitterHandle) external {
        require(!twitterVerified[msg.sender], "Already verified");
        require(bytes(_twitterHandle).length > 0, "Invalid handle");

        twitterVerified[msg.sender] = true;
        twitterHandles[msg.sender] = _twitterHandle;

        // Reward SD tokens for verification
        if (address(sdToken) != address(0)) {
            sdToken.transfer(msg.sender, TWITTER_REWARD);
            sdEarned[msg.sender] += TWITTER_REWARD;
            emit TwitterRewardClaimed(
                msg.sender,
                _twitterHandle,
                TWITTER_REWARD
            );
        }
    }

    /**
     * @dev Get player's SD statistics
     */
    function getPlayerSDStats(
        address _player
    ) external view returns (uint256 earned, uint256 spent, uint256 balance) {
        earned = sdEarned[_player];
        spent = sdSpent[_player];
        balance = address(sdToken) != address(0)
            ? sdToken.balanceOf(_player)
            : 0;
    }

    // Bridge Admin Functions

    /**
     * @dev Set bridge contract (admin only)
     */
    function setBridgeContract(address _bridgeContract) external onlyOwner {
        bridgeConfig.bridgeContract = _bridgeContract;
        bridgeConfig.isActive = _bridgeContract != address(0);
        emit BridgeConfigUpdated(_bridgeContract, bridgeConfig.isActive);
    }

    /**
     * @dev Add supported chain for bridging (admin only)
     */
    function addSupportedChain(uint256 _chainId) external onlyOwner {
        if (!bridgeConfig.chainSupported[_chainId]) {
            bridgeConfig.supportedChains.push(_chainId);
            bridgeConfig.chainSupported[_chainId] = true;
        }
    }

    /**
     * @dev Remove supported chain for bridging (admin only)
     */
    function removeSupportedChain(uint256 _chainId) external onlyOwner {
        bridgeConfig.chainSupported[_chainId] = false;

        // Remove from array
        for (uint i = 0; i < bridgeConfig.supportedChains.length; i++) {
            if (bridgeConfig.supportedChains[i] == _chainId) {
                bridgeConfig.supportedChains[i] = bridgeConfig.supportedChains[
                    bridgeConfig.supportedChains.length - 1
                ];
                bridgeConfig.supportedChains.pop();
                break;
            }
        }
    }

    // [Include all other functions from the original contract...]
    // Anti-cheat, leaderboard, achievements, shop functions remain the same

    /**
     * @dev Update global leaderboard
     */
    function _updateGlobalLeaderboard(GameScore memory _score) private {
        if (globalLeaderboard.length == 0) {
            globalLeaderboard.push(_score);
            return;
        }

        uint256 insertIndex = globalLeaderboard.length;

        for (uint256 i = 0; i < globalLeaderboard.length; i++) {
            if (_score.score > globalLeaderboard[i].score) {
                insertIndex = i;
                break;
            }
        }

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
                playerValue = stats.highScore;
            } else if (achievements[i].achievementType == 1) {
                playerValue = stats.maxLevelReached;
            } else if (achievements[i].achievementType == 2) {
                playerValue = stats.totalAliensKilled;
            } else if (achievements[i].achievementType == 3) {
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
     * @dev Validate score against game rules
     */
    function _validateScore(
        uint256 _score,
        uint8 _level,
        uint16 _aliensKilled
    ) internal pure returns (bool) {
        if (_score > 1000000) return false;
        if (_aliensKilled > 10000) return false;

        if (_aliensKilled > 0) {
            uint256 scorePerAlien = _score / _aliensKilled;
            if (scorePerAlien < 5 || scorePerAlien > 150) return false;
        } else if (_score > 100) {
            return false;
        }

        uint256[10] memory maxScorePerLevel = [
            uint256(1000),
            3000,
            6000,
            10000,
            15000,
            25000,
            40000,
            60000,
            100000,
            200000
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

    function _emitLeaderboardUpdate(address _player) private {
        uint256 rank = getPlayerRank(_player);
        emit LeaderboardUpdated(_player, rank);
    }

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

    // View functions
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

    function getPlayerScores(
        address _player
    ) external view returns (GameScore[] memory) {
        return playerScores[_player];
    }

    function getPlayerStats(
        address _player
    ) external view returns (PlayerStats memory) {
        return playerStats[_player];
    }

    function getAllAchievements() external view returns (Achievement[] memory) {
        Achievement[] memory allAchievements = new Achievement[](
            achievementCount
        );
        for (uint256 i = 0; i < achievementCount; i++) {
            allAchievements[i] = achievements[i];
        }
        return allAchievements;
    }

    function getPlayerAchievements(
        address _player
    ) external view returns (bool[] memory) {
        return playerStats[_player].achievementsUnlocked;
    }

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

    function getActivePlayers() external view returns (address[] memory) {
        return activePlayers;
    }

    function getContractInfo()
        external
        view
        returns (
            address contractOwner,
            bool isActive,
            address tokenAddress,
            uint256 contractBalance,
            string memory version
        )
    {
        return (
            owner,
            gameActive,
            address(sdToken),
            address(sdToken) != address(0)
                ? sdToken.balanceOf(address(this))
                : 0,
            "2.0.0-RISE"
        );
    }

    function isTwitterVerified(address _player) external view returns (bool) {
        return twitterVerified[_player];
    }

    // Admin functions
    function toggleGameActive() external onlyOwner {
        gameActive = !gameActive;
    }

    function addAchievement(
        string memory _name,
        string memory _description,
        uint256 _requirement,
        uint8 _type
    ) external onlyOwner {
        _addAchievement(_name, _description, _requirement, _type);
    }

    function deactivateAchievement(uint256 _achievementId) external onlyOwner {
        require(_achievementId < achievementCount, "Invalid achievement ID");
        achievements[_achievementId].isActive = false;
    }

    function emergencyPause() external onlyOwner {
        gameActive = false;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    function updateSDToken(address _newTokenAddress) external onlyOwner {
        sdToken = IERC20(_newTokenAddress);
    }

    function withdrawSD(uint256 _amount) external onlyOwner {
        require(address(sdToken) != address(0), "SD token not set");
        sdToken.transfer(owner, _amount);
    }

    function fundContract(uint256 amount) external onlyOwner {
        sdToken.transferFrom(msg.sender, address(this), amount);
    }
}
