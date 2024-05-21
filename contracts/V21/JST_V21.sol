// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract JST_V21 is 
    Initializable,
    ERC20Upgradeable, 
    ERC20PermitUpgradeable, 
    OwnableUpgradeable, 
    UUPSUpgradeable,  
    ERC2771ContextUpgradeable 
{

    //----------------------------------------------------------------
    // definition
    //----------------------------------------------------------------
    mapping(address => bool) private _minters;

    modifier onlyMinter() {
        require(_minters[_msgSender()], "Caller is not a minter");
        _;
    }

    //----------------------------------------------------------------
    // init
    //----------------------------------------------------------------
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder) 
        ERC2771ContextUpgradeable(trustedForwarder)
    {}

    // initializer
    function initialize(address initialOwner) public initializer {
        ERC20Upgradeable.__ERC20_init("ParkPayCoinV2", "PPC");
        ERC20PermitUpgradeable.__ERC20Permit_init("ParkPayCoinV2");
        OwnableUpgradeable.__Ownable_init(initialOwner);
        UUPSUpgradeable.__UUPSUpgradeable_init();

        _mint(initialOwner, 1000000 * 10 ** decimals());
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
    // manage minter and mint function
    //----------------------------------------------------------------
    function addMinter(address minter) public onlyOwner {
        require(minter != address(0), "Minter address cannot be 0");
        _minters[minter] = true;
        emit MinterAdded(minter);
    }

    function deleteMinter(address minter) public onlyOwner {
        require(_minters[minter], "Not a minter");
        _minters[minter] = false;
        emit MinterRemoved(minter);
    }

    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
        emit MintEvent(to,amount);
    }

    function batchMint(address[] memory to_addresses, uint256[] memory amounts) public onlyMinter {
        require(to_addresses.length == amounts.length, "Addresses and amounts do not match in length");

        for (uint i = 0; i < to_addresses.length; i++) {
            require(to_addresses[i] != address(0), "Invalid address.");
            require(amounts[i] > 0, "Mint amount must be greater than zero");

            _mint(to_addresses[i], amounts[i]);
            emit MintEvent(to_addresses[i], amounts[i]);
        }
    }



    //----------------------------------------------------------------
    // event
    //----------------------------------------------------------------
    event MintEvent(address indexed to,uint256 indexed amount); 
    event MinterAdded(address indexed newMinter);
    event MinterRemoved(address indexed minter);

}