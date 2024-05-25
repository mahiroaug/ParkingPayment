// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";


contract ParkingPayment is 
    Initializable,
    OwnableUpgradeable, 
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC2771ContextUpgradeable 
{
    using SafeERC20 for IERC20;

    //----------------------------------------------------------------
    // definition
    //----------------------------------------------------------------
    uint256 public ratePerMinute;
    uint256 public WITHDRAWAL_DELAY;
    
    mapping(address => mapping(address => uint256)) public deposits; // user addr -> token addr -> deposit amount
    mapping(address => bool) public validParkingOwners;
    mapping(address => address) public designatedOwner; // user addr -> parking owner addr
    mapping(address => EntryInfo) public parkingStatus;  // Mapping from user address to parking information
    mapping(address => mapping(address => bool)) private userTokenExists; // user addr -> token addr -> existence flag
    mapping(address => address[]) private userTokenList; // user addr -> list of token addresses
    mapping(address => mapping(address => uint256)) public lastDepositTime; // user addr -> token addr -> last deposit timestamp


    // Structure to hold parking entry information for each user
    struct EntryInfo {
        bool isParked;  // Current parking status
        uint256 entryTime;  // Timestamp of entry
        address tokenAddress;  // Token address used for payment
    }


    //----------------------------------------------------------------
    // init
    //----------------------------------------------------------------
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder) 
        ERC2771ContextUpgradeable(trustedForwarder)
    {}

    // initializer
    function initialize(address initialOwner, uint256 _ratePerMinute)
        public initializer
    {
        OwnableUpgradeable.__Ownable_init(initialOwner);
        UUPSUpgradeable.__UUPSUpgradeable_init();

        ratePerMinute = _ratePerMinute;
        //WITHDRAWAL_DELAY = 7 days;
        WITHDRAWAL_DELAY = 30 minutes;
    }


    //----------------------------------------------------------------
    // upgradable
    //----------------------------------------------------------------
    // updateToProxy
    function _authorizeUpgrade(address newImplementation) internal onlyOwner override{}


    //----------------------------------------------------------------
    // ERC2771 forwarder
    //----------------------------------------------------------------
    function _msgSender() internal view virtual override(ERC2771ContextUpgradeable,ContextUpgradeable) returns (address sender) {
        return ERC2771ContextUpgradeable._msgSender();
    }
    function _msgData() internal view virtual override(ERC2771ContextUpgradeable,ContextUpgradeable) returns (bytes calldata) {
        return ERC2771ContextUpgradeable._msgData();
    }
    function _contextSuffixLength() internal view virtual override(ERC2771ContextUpgradeable, ContextUpgradeable) returns (uint256) {
        return ERC2771ContextUpgradeable._contextSuffixLength();
    }
    

    //----------------------------------------------------------------
    // public function
    //----------------------------------------------------------------
    function addParkingOwner(address _parkOwner) public onlyOwner {
        validParkingOwners[_parkOwner] = true;
    }

    function removeParkingOwner(address _parkOwner) public onlyOwner {
        validParkingOwners[_parkOwner] = false;
    }
    // getter for deposit balance
    function getDepositBalance(address userAddress, address tokenAddress) public view returns (uint256) {
        return deposits[userAddress][tokenAddress];
    }

    // deposit tokens
    function depositTokens(address tokenAddress, uint256 amount, address parkingOwner) public nonReentrant {
        require(amount > 0, "Deposit amount must be greater than zero.");
        require(tokenAddress != address(0), "Token address cannot be zero.");
        require(validParkingOwners[parkingOwner], "Parking owner is not registered.");

        address sender = _msgSender();
        IERC20 token = IERC20(tokenAddress);
        // need allowance
        token.safeTransferFrom(sender, address(this), amount);


        // record deposit and designated owner
        deposits[sender][tokenAddress] += amount;
        designatedOwner[sender] = parkingOwner;
        lastDepositTime[sender][tokenAddress] = block.timestamp;

        // Add token address to the user's token list if it's not already there
        if (!userTokenExists[sender][tokenAddress]) {
            userTokenExists[sender][tokenAddress] = true;
            userTokenList[sender].push(tokenAddress);
        }

        emit DepositMade(sender, tokenAddress, amount, parkingOwner);
    }

    // Function to record a parking entry
    function recordEntry(address userAddress, address tokenAddress) public nonReentrant {
        address sender = _msgSender();

        require(userAddress != address(0), "User address cannot be zero.");
        require(tokenAddress != address(0), "Token address cannot be zero.");
        require(validParkingOwners[sender], "Only valid parking owners can record entry.");
        require(sender == designatedOwner[userAddress], "Only designated parking owner can record entry.");
        require(deposits[userAddress][tokenAddress] > 0, "No deposits found for given token and user.");
        require(!parkingStatus[userAddress].isParked, "User already parked.");

        parkingStatus[userAddress] = EntryInfo({
            isParked: true,
            entryTime: block.timestamp,  // Use current block timestamp
            tokenAddress: tokenAddress
        });

        emit EntryRecorded(userAddress, tokenAddress, block.timestamp);
    }


    // Function to record a parking exit and handle payment
    function recordExit(address userAddress) public nonReentrant {
        require(userAddress != address(0), "User address cannot be zero.");
        require(_msgSender() == designatedOwner[userAddress], "Only designated parking owner can record exit.");
        require(parkingStatus[userAddress].isParked, "User is not currently parked.");

        // Calculate parked minutes based on current time and recorded entry time
        uint256 parkedMinutes = (block.timestamp - parkingStatus[userAddress].entryTime) / 60;  // Convert to minutes

        // Calculate the parking fee based on the parked minutes
        uint256 parkingFee = calculateFee(parkedMinutes);

        // Get the token information
        address tokenAddress = parkingStatus[userAddress].tokenAddress;
        require(tokenAddress != address(0), "Invalid token address.");
        require(deposits[userAddress][tokenAddress] >= parkingFee, "Insufficient funds for payment.");

        // Ensure the designated owner is a valid address
        require(designatedOwner[userAddress] != address(0), "Invalid designated owner address.");

        // Calculate the system fee (e.g., 3%)
        uint256 systemFee = parkingFee * 3 / 100;
        uint256 netParkingFee = parkingFee - systemFee;

        // Transfer net parking fee and system fee in a single transaction
        deposits[userAddress][tokenAddress] -= parkingFee;
        IERC20(tokenAddress).safeTransfer(designatedOwner[userAddress], netParkingFee);
        IERC20(tokenAddress).safeTransfer(owner(), systemFee);


        // Reset parking status for future reuse
        parkingStatus[userAddress] = EntryInfo({
            isParked: false,
            entryTime: 0,
            tokenAddress: address(0)
        });

        emit ExitRecorded(userAddress, tokenAddress, parkedMinutes, netParkingFee, systemFee);
    }

    // Function to allow users or contract owner to withdraw their remaining deposit funds after the parking period and required delay
    function withdrawRemainingFunds(address userAddress, address tokenAddress) public nonReentrant {
        address sender = _msgSender();

        require(userAddress != address(0), "User address cannot be zero.");
        require(tokenAddress != address(0), "Token address cannot be zero.");
        require(deposits[userAddress][tokenAddress] > 0, "No remaining funds to withdraw.");
        require(sender == userAddress || sender == owner(), "Only the user or the contract owner can perform this action.");
        if (sender == userAddress) {
            require(block.timestamp >= lastDepositTime[userAddress][tokenAddress] + WITHDRAWAL_DELAY, "Cannot withdraw before delay period.");
            require(!parkingStatus[userAddress].isParked, "Cannot withdraw while parked.");
        }
         
        IERC20 token = IERC20(tokenAddress);
        uint256 remainingFunds = deposits[userAddress][tokenAddress];

       // Reset the user's deposit for the specified token to zero
        deposits[userAddress][tokenAddress] = 0;

        // Ensure the contract has enough tokens to cover the withdrawal
        require(token.balanceOf(address(this)) >= remainingFunds, "Insufficient funds in the contract.");

        // Check if all deposits for the user are zero
        bool hasDeposits = false;
        for (uint256 i = 0; i < userTokenList[userAddress].length; i++) {
            if (deposits[userAddress][userTokenList[userAddress][i]] > 0) {
                hasDeposits = true;
                break;
            }
        }

        // Reset designatedOwner only if all deposits are zero
        if (!hasDeposits) {
            designatedOwner[userAddress] = address(0);
        }

        // Remove the token address from the user's token list if the deposit is zero
        if (deposits[userAddress][tokenAddress] == 0) {
            userTokenExists[userAddress][tokenAddress] = false;
            for (uint256 i = 0; i < userTokenList[userAddress].length; i++) {
                if (userTokenList[userAddress][i] == tokenAddress) {
                    userTokenList[userAddress][i] = userTokenList[userAddress][userTokenList[userAddress].length - 1];
                    userTokenList[userAddress].pop();
                    break;
                }
            }
        }

        token.safeTransfer(userAddress, remainingFunds);

        emit FundsWithdrawn(userAddress, tokenAddress, remainingFunds);
    }

    // Function to set the parking rate, restricted to owner
    function setParkingRate(uint256 newRate) public onlyOwner {
        ratePerMinute = newRate;
    }

    // Modified calculateFee function using variable rate
    function calculateFee(uint256 useMinutes) private view returns (uint256) {
        return useMinutes * ratePerMinute;
    }

    /// @notice Change the withdrawal delay period
    /// @param newDelay New delay time in seconds
    function setWithdrawalDelay(uint256 newDelay) public onlyOwner {
        WITHDRAWAL_DELAY = newDelay;
    }



    // event declarations
    event DepositMade(address indexed user, address indexed tokenAddress, uint256 amount, address parkingOwner);
    event EntryRecorded(address indexed user, address indexed tokenAddress, uint256 entryTime);
    event ExitRecorded(address indexed user, address indexed tokenAddress, uint256 parkedMinutes, uint256 netParkingFee, uint256 systemFee);
    event FundsWithdrawn(address indexed user, address indexed tokenAddress, uint256 amount);

}
