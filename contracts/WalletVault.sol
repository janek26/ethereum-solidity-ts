// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
// solhint-disable-next-line compiler-version
pragma abicoder v2;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Address.sol';

contract WalletVault is Ownable {
  using SafeMath for uint256;
  using Address for address;

  event Received(uint256 indexed value, address indexed sender, bytes data);
  event Invoked(address indexed target, uint256 indexed value, bytes data);

  receive() external payable {
    emit Received(msg.value, _msgSender(), _msgData());
  }

  function invoke(
    address _target,
    uint256 _value,
    bytes calldata _data
  ) external onlyOwner returns (bytes memory _result) {
    emit Invoked(_target, _value, _data);
    return _target.functionCallWithValue(_data, _value);
  }
}
