// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SD Token - Multi-Chain Space Defender Token
 * @dev ERC20 token with bridging capabilities for the Space Defender game
 * @author harshmittal.dev
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract SDToken is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals;
    address public owner;

    // Bridge-related state
    mapping(address => bool) public authorizedBridges;
    mapping(uint256 => bool) public supportedChains;
    uint256[] public chainList;

    // Events for bridging
    event BridgeAuthorized(address indexed bridge, bool authorized);
    event ChainAdded(uint256 indexed chainId);
    event ChainRemoved(uint256 indexed chainId);
    event TokensBurned(
        address indexed from,
        uint256 amount,
        uint256 targetChainId
    );
    event TokensMinted(
        address indexed to,
        uint256 amount,
        uint256 sourceChainId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorizedBridge() {
        require(
            authorizedBridges[msg.sender],
            "Only authorized bridge can call this function"
        );
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
        _totalSupply = _initialSupply * 10 ** _decimals;
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        address owner = msg.sender;
        _transfer(owner, to, amount);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) public override returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
        require(
            fromBalance >= amount,
            "ERC20: transfer amount exceeds balance"
        );
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(
                currentAllowance >= amount,
                "ERC20: insufficient allowance"
            );
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    // Bridge Functions

    /**
     * @dev Burn tokens for bridging to another chain
     */
    function burnForBridge(
        address from,
        uint256 amount,
        uint256 targetChainId
    ) external onlyAuthorizedBridge {
        require(supportedChains[targetChainId], "Target chain not supported");
        require(_balances[from] >= amount, "Insufficient balance");

        _balances[from] -= amount;
        _totalSupply -= amount;

        emit Transfer(from, address(0), amount);
        emit TokensBurned(from, amount, targetChainId);
    }

    /**
     * @dev Mint tokens when bridging from another chain
     */
    function mintFromBridge(
        address to,
        uint256 amount,
        uint256 sourceChainId
    ) external onlyAuthorizedBridge {
        require(supportedChains[sourceChainId], "Source chain not supported");
        require(to != address(0), "Cannot mint to zero address");

        _balances[to] += amount;
        _totalSupply += amount;

        emit Transfer(address(0), to, amount);
        emit TokensMinted(to, amount, sourceChainId);
    }

    // Admin Functions

    /**
     * @dev Authorize or deauthorize a bridge contract
     */
    function authorizeBridge(
        address bridge,
        bool authorized
    ) external onlyOwner {
        authorizedBridges[bridge] = authorized;
        emit BridgeAuthorized(bridge, authorized);
    }

    /**
     * @dev Add a supported chain for bridging
     */
    function addSupportedChain(uint256 chainId) external onlyOwner {
        if (!supportedChains[chainId]) {
            supportedChains[chainId] = true;
            chainList.push(chainId);
            emit ChainAdded(chainId);
        }
    }

    /**
     * @dev Remove a supported chain for bridging
     */
    function removeSupportedChain(uint256 chainId) external onlyOwner {
        if (supportedChains[chainId]) {
            supportedChains[chainId] = false;

            // Remove from chainList
            for (uint i = 0; i < chainList.length; i++) {
                if (chainList[i] == chainId) {
                    chainList[i] = chainList[chainList.length - 1];
                    chainList.pop();
                    break;
                }
            }

            emit ChainRemoved(chainId);
        }
    }

    /**
     * @dev Mint new tokens (owner only, for game rewards)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");

        _balances[to] += amount;
        _totalSupply += amount;

        emit Transfer(address(0), to, amount);
    }

    /**
     * @dev Burn tokens (owner only)
     */
    function burn(uint256 amount) external onlyOwner {
        require(_balances[owner] >= amount, "Insufficient balance to burn");

        _balances[owner] -= amount;
        _totalSupply -= amount;

        emit Transfer(owner, address(0), amount);
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    // View Functions

    /**
     * @dev Get all supported chains
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return chainList;
    }

    /**
     * @dev Check if a chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    /**
     * @dev Check if an address is an authorized bridge
     */
    function isBridgeAuthorized(address bridge) external view returns (bool) {
        return authorizedBridges[bridge];
    }

    /**
     * @dev Get token info
     */
    function getTokenInfo()
        external
        view
        returns (
            string memory tokenName,
            string memory tokenSymbol,
            uint8 tokenDecimals,
            uint256 tokenTotalSupply,
            address tokenOwner,
            uint256 supportedChainCount
        )
    {
        return (name, symbol, decimals, _totalSupply, owner, chainList.length);
    }
}
