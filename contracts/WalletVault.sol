// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
// solhint-disable-next-line compiler-version
pragma abicoder v2;

import './modules/GuardianVault.sol';

contract WalletVault is GuardianVault {
  event Received(uint256 indexed value, address indexed sender, bytes data);

  receive() external payable {
    emit Received(msg.value, _msgSender(), _msgData());
  }
}
