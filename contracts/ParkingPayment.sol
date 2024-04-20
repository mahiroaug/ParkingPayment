// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract ParkingPayment is Ownable{
    address internal owner;
    uint256 public ratePerMinute;
    uint256 public WITHDRAWAL_DELAY;
    
    mapping(address => mapping(address => uint256)) public deposits; // user addr -> token addr -> deposit amount
    mapping(address => bool) public validParkingOwners;
    mapping(address => address) public designatedOwner; // user addr -> parking owner addr
    mapping(address => EntryInfo) public parkingStatus;  // Mapping from user address to parking information

    // Structure to hold parking entry information for each user
    struct EntryInfo {
        bool isParked;  // Current parking status
        uint256 entryTime;  // Timestamp of entry
        address tokenAddress;  // Token address used for payment
    }

    constructor(address initialOwner, uint256 _ratePerMinute)
        Ownable(initialOwner)
    {
        owner = initialOwner;
        ratePerMinute = _ratePerMinute;
        //WITHDRAWAL_DELAY = 7 days;
        WITHDRAWAL_DELAY = 30 minutes;
    }

    function addParkingOwner(address _parkOwner) public onlyOwner {
        validParkingOwners[_parkOwner] = true;
    }

    function removeParkingOwner(address _parkOwner) public onlyOwner {
        validParkingOwners[_parkOwner] = false;
    }

    // deposit tokens
    function depositTokens(address tokenAddress, uint256 amount, address parkingOwner) public {
        require(amount > 0, "Deposit amount must be greater than zero.");
        require(tokenAddress != address(0), "Token address cannot be zero.");
        require(validParkingOwners[parkingOwner], "Parking owner is not registered.");

        IERC20 token = IERC20(tokenAddress);
        // need allowance
        bool sent = token.transferFrom(msg.sender, address(this), amount);
        require(sent, "Token transfer failed.");

        // record deposit and designated owner
        deposits[msg.sender][tokenAddress] += amount;
        designatedOwner[msg.sender] = parkingOwner;

        emit DepositMade(msg.sender, tokenAddress, amount, parkingOwner);
    }

    // Function to record a parking entry
    function recordEntry(address userAddress, address tokenAddress) public {
        require(userAddress != address(0), "User address cannot be zero.");
        require(tokenAddress != address(0), "Token address cannot be zero.");
        require(validParkingOwners[msg.sender], "Only valid parking owners can record entry.");
        require(msg.sender == designatedOwner[userAddress], "Only designated parking owner can record entry.");
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
    function recordExit(address userAddress) public {
        require(userAddress != address(0), "User address cannot be zero.");
        require(msg.sender == designatedOwner[userAddress], "Only designated parking owner can record exit.");
        require(parkingStatus[userAddress].isParked, "User is not currently parked.");

        // Calculate parked minutes based on current time and recorded entry time
        uint256 parkedMinutes = (block.timestamp - parkingStatus[userAddress].entryTime) / 60;  // Convert to minutes

        // Calculate the parking fee based on the parked minutes
        uint256 parkingFee = calculateFee(parkedMinutes);

        // Get the token information
        address tokenAddress = parkingStatus[userAddress].tokenAddress;
        require(deposits[userAddress][tokenAddress] >= parkingFee, "Insufficient funds for payment.");

        // Calculate the system fee (e.g., 3%)
        uint256 systemFee = parkingFee * 3 / 100;
        uint256 netParkingFee = parkingFee - systemFee;

        // Transfer net parking fee
        bool success;
        success = IERC20(tokenAddress).transfer(designatedOwner[userAddress], netParkingFee);
        require(success, "Payment to parking owner failed.");
        success = IERC20(tokenAddress).transfer(owner, systemFee);
        require(success, "Payment of system fee failed.");

        deposits[userAddress][tokenAddress] -= parkingFee;

        // Reset parking status for future reuse
        parkingStatus[userAddress] = EntryInfo({
            isParked: false,
            entryTime: 0,
            tokenAddress: address(0)
        });

        emit ExitRecorded(userAddress, tokenAddress, parkedMinutes, netParkingFee, systemFee);

    }

    // Function to allow users or contract owner to withdraw their remaining deposit funds after the parking period and required delay
    function withdrawRemainingFunds(address userAddress, address tokenAddress) public {
        require(userAddress != address(0), "User address cannot be zero.");
        require(tokenAddress != address(0), "Token address cannot be zero.");
        require(deposits[userAddress][tokenAddress] > 0, "No remaining funds to withdraw.");
        require(msg.sender == userAddress || msg.sender == owner, "Only the user or the contract owner can perform this action.");
        if (msg.sender == userAddress) {
            require(block.timestamp >= parkingStatus[userAddress].entryTime + WITHDRAWAL_DELAY, "Cannot withdraw before delay period.");
        }
         
        uint256 amountToWithdraw = deposits[userAddress][tokenAddress];
        IERC20 token = IERC20(tokenAddress);

        // Ensure the contract has enough tokens to cover the withdrawal
        require(token.balanceOf(address(this)) >= amountToWithdraw, "Insufficient funds in the contract.");

        // Transfer the remaining funds to the user
        bool success = token.transfer(userAddress, amountToWithdraw);
        require(success, "Withdrawal failed.");

        // Reset the deposit balance and designated owner for the user and token
        deposits[userAddress][tokenAddress] = 0;
        designatedOwner[userAddress] = address(0);

        emit FundsWithdrawn(userAddress, tokenAddress, amountToWithdraw);
    }

    // Function to set the parking rate, restricted to owner
    function setParkingRate(uint256 newRate) public onlyOwner {
        ratePerMinute = newRate;
    }

    // Modified calculateFee function using variable rate
    function calculateFee(uint256 useMinutes) private view returns (uint256) {
        return useMinutes * ratePerMinute;
    }

    // event declarations
    event DepositMade(address indexed user, address indexed tokenAddress, uint256 amount, address parkingOwner);
    event EntryRecorded(address indexed user, address indexed tokenAddress, uint256 entryTime);
    event ExitRecorded(address indexed user, address indexed tokenAddress, uint256 parkedMinutes, uint256 netParkingFee, uint256 systemFee);
    event FundsWithdrawn(address indexed user, address indexed tokenAddress, uint256 amount);

}
