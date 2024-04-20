// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract PPT is ERC20, ERC20Permit, Ownable, ERC2771Context {
    constructor(address initialOwner, address trustedForwarder)
        ERC20("ParkPayToken", "PPT")
        ERC20Permit("ParkPayToke")
        Ownable(initialOwner)
        ERC2771Context(trustedForwarder)
    {
        //_mint(_msgSender(), 1000000 * 10 ** decimals());
        _mint(initialOwner, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _msgSender() internal view virtual override(ERC2771Context,Context) returns (address sender) {
        return ERC2771Context._msgSender();
    }
    function _msgData() internal view virtual override(ERC2771Context,Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
    function _contextSuffixLength() internal view virtual override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }
}