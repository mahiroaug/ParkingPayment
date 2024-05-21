// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract NFCAddressRegistry is 
    Initializable,
    OwnableUpgradeable, 
    UUPSUpgradeable,  
    ERC2771ContextUpgradeable 
{


    //----------------------------------------------------------------
    // definition
    //----------------------------------------------------------------
    // Mapping of NFC card IDs (as strings) to addresses
    mapping(string => address) public idMap;
    // Reverse mapping to find ID by address
    mapping(address => string) private reverseIdMap;

    // Events
    event IdAdded(string indexed id, address addr);
    event IdRemoved(string indexed id);



    //----------------------------------------------------------------
    // init
    //----------------------------------------------------------------
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder) 
        ERC2771ContextUpgradeable(trustedForwarder)
    {}

    // initializer
    function initialize(address initialOwner)
        public initializer
    {
        OwnableUpgradeable.__Ownable_init(initialOwner);
        UUPSUpgradeable.__UUPSUpgradeable_init();
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