// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

//import "hardhat/console.sol";

contract TokenDelegator is ReentrancyGuard {
    /**
     * Execute a permit and a transferFrom in sequence for a given ERC-20 token,
     * using reentrancy protection.
     *
     * @param tokenAddress The address of the ERC-20 token.
     * @param owner The owner of the tokens.
     * @param recipient The recipient of the tokens.
     * @param amount The amount of tokens to transfer.
     * @param deadline The deadline timestamp until which the permit is valid.
     * @param v The recovery byte of the signature.
     * @param r Half of the ECDSA signature pair.
     * @param s Half of the ECDSA signature pair.
     */
    function permitAndTransfer(
        address tokenAddress,
        address owner,
        address recipient,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");
        require(owner != address(0), "Invalid owner address");
        require(recipient != address(0), "Invalid recipient address");
        require(owner != recipient, "Owner and recipient must be different");
        require(msg.sender != owner, "Sender must be different from owner");
        require(msg.sender != recipient, "Sender must be different from recipient");

        require(amount > 0, "Amount must be greater than zero");
        require(deadline > block.timestamp, "Deadline has passed");


        /*
        console.log("permitAndTransfer called with:");
        console.log("Token Addr:", tokenAddress);
        console.log("msg.sender:", msg.sender);
        console.log("Owner:     ", owner);
        console.log("Recipient: ", recipient);
        console.log("Amount:", amount);
        console.log("Deadline:", deadline);
        console.log("Signature v:", v);
        */

        // Call permit to allow this contract to spend the tokens on behalf of the owner
        IERC20Permit(tokenAddress).permit(owner, address(this), amount, deadline, v, r, s);
        
        // Ensure the token contract also implements IERC20 for transferFrom
        require(
            IERC20(tokenAddress).transferFrom(owner, recipient, amount),
            "Transfer failed"
        );
    }
}
