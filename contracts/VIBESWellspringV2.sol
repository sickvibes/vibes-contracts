// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NFTTokenFaucetV3.sol";

/*

 __      _______ ____  ______  _____
 \ \    / /_   _|  _ \|  ____|/ ____|
  \ \  / /  | | | |_) | |__  | (___
   \ \/ /   | | |  _ <|  __|  \___ \
    \  /   _| |_| |_) | |____ ____) |
 __  \/   |_____|____/|______|_____/ _____ _____  _____  _____ _   _  _____  __      _____
 \ \        / /  ____| |    | |     / ____|  __ \|  __ \|_   _| \ | |/ ____| \ \    / /__ \
  \ \  /\  / /| |__  | |    | |    | (___ | |__) | |__) | | | |  \| | |  __   \ \  / /   ) |
   \ \/  \/ / |  __| | |    | |     \___ \|  ___/|  _  /  | | | . ` | | |_ |   \ \/ /   / /
    \  /\  /  | |____| |____| |____ ____) | |    | | \ \ _| |_| |\  | |__| |    \  /   / /_
     \/  \/   |______|______|______|_____/|_|    |_|  \_\_____|_| \_|\_____|     \/   |____|


  https://sickvibes.xyz

  https://docs.sickvibes.xyz

*/

contract VIBESWellspringV2 is NFTTokenFaucetV3 {

  string public constant name = 'VIBES Wellspring V2';

  constructor(FaucetContractOptions memory options) NFTTokenFaucetV3(options) { }

}
