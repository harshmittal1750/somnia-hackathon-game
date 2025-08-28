// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Space Defender - Minimal Contract for SD Rewards & Shop
 * @dev Gas-optimized contract focusing only on token rewards and shop functionality
 * @author Somnia Hackathon Team
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

contract SomniaSpaceDefenderMinimal {
    // Events
    event SSDRewardClaimed(
        address indexed player,
        uint256 aliensKilled,
        uint256 ssdAmount
    );
    event ShopItemPurchased(
        address indexed player,
        uint256 itemId,
        uint256 price
    );
    event TwitterRewardClaimed(
        address indexed player,
        string twitterHandle,
        uint256 reward
    );

    // 🎮 SD Token Integration
    IERC20 public ssdToken;
    uint256 public constant SSD_PER_KILL = 10000000000000000; // 0.01 SD (18 decimals)
    uint256 public constant TWITTER_REWARD = 1000000000000000000; // 1 SD

    // Track rewards and spending
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

    // Admin
    address public owner;
    bool public contractActive;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier contractIsActive() {
        require(contractActive, "Contract is not active");
        _;
    }

    constructor(address _ssdTokenAddress) {
        owner = msg.sender;
        contractActive = true;
        ssdToken = IERC20(_ssdTokenAddress);
        initializeShop();
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
     * @dev Submit score and claim SD rewards (called directly by players)
     */
    function submitScore(
        uint256 _score,
        uint8 _level,
        uint16 _aliensKilled
    ) external contractIsActive returns (bool success) {
        require(_score > 0, "Score must be greater than 0");
        require(_level >= 1 && _level <= 10, "Invalid level");
        require(_aliensKilled > 0, "No aliens killed");

        // Calculate and transfer SD reward
        uint256 ssdReward = _aliensKilled * SSD_PER_KILL;
        require(ssdToken.transfer(msg.sender, ssdReward), "SD transfer failed");

        // Update player's earned SD
        ssdEarned[msg.sender] += ssdReward;

        // Emit reward event
        emit SSDRewardClaimed(msg.sender, _aliensKilled, ssdReward);

        return true;
    }

    /**
     * @dev Claim SD rewards for aliens killed (called by backend after score validation)
     */
    function claimSSDReward(
        address player,
        uint16 aliensKilled
    ) external onlyOwner contractIsActive {
        require(aliensKilled > 0, "No aliens killed");

        uint256 ssdReward = aliensKilled * SSD_PER_KILL;
        require(ssdToken.transfer(player, ssdReward), "SD transfer failed");

        ssdEarned[player] += ssdReward;
        emit SSDRewardClaimed(player, aliensKilled, ssdReward);
    }

    /**
     * @dev Purchase shop item with SD tokens
     */
    function buyShopItem(uint256 _itemId) external contractIsActive {
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

        emit ShopItemPurchased(msg.sender, _itemId, price);
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

    /**
     * @dev Verify Twitter account and claim reward
     */
    function verifyTwitter(
        string memory _twitterHandle
    ) external contractIsActive {
        require(!twitterVerified[msg.sender], "Already verified");
        require(bytes(_twitterHandle).length > 0, "Invalid handle");

        twitterVerified[msg.sender] = true;
        twitterHandles[msg.sender] = _twitterHandle;

        // Reward SD tokens for verification
        require(
            ssdToken.transfer(msg.sender, TWITTER_REWARD),
            "Twitter reward transfer failed"
        );
        ssdEarned[msg.sender] += TWITTER_REWARD;

        emit TwitterRewardClaimed(msg.sender, _twitterHandle, TWITTER_REWARD);
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
        balance = ssdToken.balanceOf(_player);
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
     * @dev Toggle shop item availability (admin only)
     */
    function toggleShopItem(uint256 _itemId) external onlyOwner {
        require(_itemId < shopItemCount, "Invalid item ID");
        shopItems[_itemId].active = !shopItems[_itemId].active;
    }

    /**
     * @dev Fund contract with SD tokens (admin only)
     */
    function fundContract(uint256 _amount) external onlyOwner {
        require(
            ssdToken.transferFrom(msg.sender, address(this), _amount),
            "Funding failed"
        );
    }

    /**
     * @dev Withdraw SD tokens (admin only)
     */
    function withdrawSSD(uint256 _amount) external onlyOwner {
        require(ssdToken.transfer(owner, _amount), "Withdrawal failed");
    }

    /**
     * @dev Update SD token contract (admin only)
     */
    function updateSSDToken(address _newTokenAddress) external onlyOwner {
        ssdToken = IERC20(_newTokenAddress);
    }

    /**
     * @dev Toggle contract active state (admin only)
     */
    function toggleContractActive() external onlyOwner {
        contractActive = !contractActive;
    }

    /**
     * @dev Transfer ownership (admin only)
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    /**
     * @dev Get contract info
     */
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
            contractActive,
            address(ssdToken),
            ssdToken.balanceOf(address(this)),
            "2.0.0-minimal"
        );
    }
}
