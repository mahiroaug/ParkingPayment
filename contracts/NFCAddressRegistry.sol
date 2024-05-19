// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NFCAddressRegistry is Ownable {
    // Mapping of NFC card IDs (as strings) to addresses
    mapping(string => address) public idMap;
    // Reverse mapping to find ID by address
    mapping(address => string) private reverseIdMap;

    // Events
    event IdAdded(string indexed id, address addr);
    event IdRemoved(string indexed id);

    // Constructor
    constructor(address initialOwner)Ownable(initialOwner){}

    // Link NFC card ID (as a string) to an address
    function addId(string memory id, address addr) public onlyOwner {
        require(bytes(id).length > 0, "ID cannot be empty");
        require(addr != address(0), "Address cannot be zero address");
        require(idMap[id] == address(0), "ID already linked");
        require(bytes(reverseIdMap[addr]).length == 0, "Address already linked to another ID");

        idMap[id] = addr;
        reverseIdMap[addr] = id;
        emit IdAdded(id, addr);
    }

    // Unlink NFC card ID (as a string) from its address
    function removeId(string memory id) public onlyOwner {
        require(bytes(id).length > 0, "ID cannot be empty");
        address addr = idMap[id];
        require(addr != address(0), "ID does not exist");

        delete reverseIdMap[addr];
        delete idMap[id];
        emit IdRemoved(id);
    }

    // Retrieve the address linked to an NFC card ID (as a string)
    function getMapAddress(string memory id) public view returns (address) {
        require(bytes(id).length > 0, "ID cannot be empty");
        return idMap[id];
    }

    // Retrieve the ID (as a string) linked to an address
    function getMapId(address addr) public view returns (string memory) {
        require(addr != address(0), "Address cannot be zero address");
        string memory linkedId = reverseIdMap[addr];
        require(bytes(linkedId).length > 0, "No ID linked to this address");
        return linkedId;
    }
}