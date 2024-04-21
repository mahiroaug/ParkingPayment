// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract Token is ERC20, ERC20Permit, Ownable{
    constructor(address initialOwner)
        ERC20("ParkPayToken", "PPT")
        ERC20Permit("ParkPayToken")
        Ownable(initialOwner)
    {
        //_mint(_msgSender(), 1000000 * 10 ** decimals());
        _mint(initialOwner, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

}