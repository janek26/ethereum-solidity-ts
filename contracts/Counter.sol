// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

import '@openzeppelin/contracts-upgradeable/proxy/Initializable.sol';
import 'hardhat/console.sol';

contract Counter is Initializable {
  uint256 public count;

  event CountedTo(uint256 number);

  function initialize(uint256 _count) public initializer {
    count = _count;
  }

  function getCount() public view returns (uint256) {
    return count;
  }

  function countUp() public returns (uint256) {
    console.log('countUp: count =', count);
    uint256 newCount = count + 1;
    require(newCount > count, 'Uint256 overflow');

    count = newCount;

    emit CountedTo(count);
    return count;
  }

  function countDown() public returns (uint256) {
    console.log('countDown: count =', count);
    uint256 newCount = count - 1;
    require(newCount < count, 'Uint256 underflow');

    count = newCount;

    emit CountedTo(count);
    return count;
  }
}
