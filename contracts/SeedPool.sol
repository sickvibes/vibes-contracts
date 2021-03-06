// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./NFTTokenFaucetV3.sol";

struct Allowance {
  address seeder;
  uint256 amount;
}

struct PoolView {
  uint256 balance;
  Constraints constraints;
  Allowance[] allowances;
}

struct Constraints {
  uint256 minDailyRate;
  uint256 maxDailyRate;
  uint256 minValue;
  uint256 maxValue;
  bool requireOwnedNft;
  uint256 minGrant;
}

// manage per-address seeding allowances that use pooled tokens to seed
contract SeedPool is AccessControlEnumerable, Pausable {
  using EnumerableSet for EnumerableSet.AddressSet;

  // the token faucet
  NFTTokenFaucetV3 public faucet;

  // seeder -> allowed amount
  mapping (address => uint256) public allowances;

  // limitations on seeding or grants
  Constraints public constraints;

  // set of all aproved seeders
  EnumerableSet.AddressSet private _seeders;

  // admin updated constraints
  event ConstraintsSet(
    address indexed admin,
    Constraints constraints);

  // seeder executed grant
  event AllowanceGranted(
    address indexed granter,
    address indexed grantee,
    uint256 amount);

  // admin set seeder allowance
  event AllowanceSet(
    address indexed admin,
    address indexed seeder,
    uint256 amount);

  constructor(NFTTokenFaucetV3 faucet_, Constraints memory initialConstraints) {
    faucet = faucet_;
    constraints = initialConstraints;

    // deployer = admin
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

    // approve faucet to move the pool's tokens
    faucet.token().approve(address(faucet), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
  }

  // ---
  // views
  // ---

  // get pool info
  function getInfo() external view returns (PoolView memory) {
    Allowance[] memory allowances_ = new Allowance[](_seeders.length());

    for (uint256 i = 0; i < _seeders.length(); i++) {
      address seeder = _seeders.at(i);
      allowances_[i] = Allowance({ seeder: seeder, amount: allowances[seeder] });
    }

    return PoolView({
      balance: faucet.token().balanceOf(address(this)),
      allowances: allowances_,
      constraints: constraints
    });
  }

  // ---
  // seeders
  // ---

  // seed as msg.sender, asserting all checks pass
  function seed(IERC721 nft, uint256 tokenId, uint256 dailyRate, uint256 totalDays) external whenNotPaused {
    uint256 amount = totalDays * dailyRate;

    require(allowances[msg.sender] >= amount, "insufficient allowance");
    require(faucet.token().balanceOf(address(this)) >= amount, "insufficient pool balance");
    require(!constraints.requireOwnedNft || nft.ownerOf(tokenId) == msg.sender, "not token owner");
    require(dailyRate >= constraints.minDailyRate, "daily rate too low");
    require(dailyRate <= constraints.maxDailyRate, "daily rate too high");
    require(amount >= constraints.minValue, "lifetime value too low");
    require(amount <= constraints.maxValue, "lifetime value too high");

    _seeders.add(msg.sender);

    allowances[msg.sender] -= amount; // reverts on overflow
    faucet.seed(SeedInput({
      nft: nft,
      tokenId: tokenId,
      seeder: msg.sender,
      dailyRate: dailyRate,
      totalDays: totalDays
    }));

    // no seed event, just check the downstream wellspring for info
  }

  // transfer allowance from msg.sender to another address
  function grant(address seeder, uint256 amount) external whenNotPaused {
    require(allowances[msg.sender] >= amount, "insufficient allowance");
    require(amount >= constraints.minGrant, "grant amount too low");

    _seeders.add(seeder);
    allowances[msg.sender] -= amount; // reverts on overflow
    allowances[seeder] += amount;

    emit AllowanceGranted(msg.sender, seeder, amount);
  }

  // ---
  // admin
  // ---

  modifier isAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "requires DEFAULT_ADMIN_ROLE");
    _;
  }

  // set allowed amount by address
  function setAllowances(Allowance[] memory allowances_) external isAdmin whenNotPaused {
    for (uint256 i = 0; i < allowances_.length; i++) {
      address seeder = allowances_[i].seeder;
      uint256 amount = allowances_[i].amount;

      _seeders.add(seeder);
      allowances[seeder] = amount;

      emit AllowanceSet(msg.sender, seeder, amount);
    }
  }

  // set new constraints
  function setConstraints(Constraints memory newConstraints) external isAdmin whenNotPaused {
    constraints = newConstraints;
    emit ConstraintsSet(msg.sender, newConstraints);
  }

  // withdraw pool balance, can be called when paused
  function shutdown() external isAdmin {
    IERC20 token = faucet.token();
    token.transfer(msg.sender, token.balanceOf(address(this)));
  }

  function pause() external isAdmin {
    _pause();
  }

  function unpause() external isAdmin {
    _unpause();
  }

}
