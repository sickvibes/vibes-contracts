// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SeedPool.sol";

/*

  https://sickvibes.xyz

  https://docs.sickvibes.xyz

*/

contract VIBESInfusionPool is SeedPool {

  string public constant name = 'VIBES Infusion Pool';

  constructor(NFTTokenFaucetV3 faucet, Constraints memory constraints) SeedPool(faucet, constraints) { }

}
