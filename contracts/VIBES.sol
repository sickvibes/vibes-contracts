// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CoreERC20.sol";

contract Vibes is CoreERC20 {
  constructor() CoreERC20("VIBES", "VIBES") { }
}
